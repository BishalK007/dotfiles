use std::collections::HashMap;
use std::fs;
use std::io::{BufRead, BufReader, Write};
use std::os::unix::net::{UnixListener, UnixStream};
use std::sync::{Arc, atomic::{AtomicBool, Ordering}};
use std::thread::{self, JoinHandle};

/// Starts a Unix socket listener in a background thread.
/// 
/// # Arguments
/// 
/// * `socket_path` - The path where the Unix socket should be created
/// * `handlers` - A map of command strings to handler functions
/// 
/// # Returns
/// 
/// A tuple containing:
/// - A thread handle to the background socket listener thread
/// - An atomic boolean that can be set to true to request the listener to terminate
pub fn start_unix_socket(
    socket_path: &str,
    handlers: HashMap<String, Box<dyn Fn() + Send + Sync>>
) -> (JoinHandle<()>, Arc<AtomicBool>) {
    // Remove any previous socket file if it exists
    let _ = fs::remove_file(socket_path);
    
    // Create a socket path string that's owned and can be moved into the thread
    let socket_path = socket_path.to_string();
    
    // Wrap handlers in an Arc for thread-safe sharing
    let handlers = Arc::new(handlers);
    
    // Create a termination flag
    let terminate = Arc::new(AtomicBool::new(false));
    let terminate_clone = Arc::clone(&terminate);
    
    // Spawn the listener thread
    let handle = thread::spawn(move || {
        // Bind the Unix socket
        let listener = match UnixListener::bind(&socket_path) {
            Ok(l) => l,
            Err(e) => {
                eprintln!("Failed to bind to the Unix socket path {}: {}", socket_path, e);
                return;
            }
        };
        
        // Set socket to non-blocking mode so we can check the terminate flag
        if let Err(e) = listener.set_nonblocking(true) {
            eprintln!("Failed to set socket to non-blocking mode: {}", e);
            return;
        }
        
        // Process incoming connections until termination is requested
        while !terminate_clone.load(Ordering::Relaxed) {
            match listener.accept() {
                Ok((stream, _)) => {
                    // Clone handlers for the spawned thread
                    let handlers = Arc::clone(&handlers);
                    thread::spawn(move || {
                        let reader = BufReader::new(stream);
                        // Process each line (message) received on the socket
                        for line in reader.lines() {
                            match line {
                                Ok(msg) => {
                                    let key = msg.trim();
                                    if let Some(handler) = handlers.get(key) {
                                        handler();
                                    }
                                }
                                Err(e) => {
                                    eprintln!("Error reading from connection: {}", e);
                                    break;
                                }
                            }
                        }
                    });
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    // No incoming connection available, sleep briefly
                    thread::sleep(std::time::Duration::from_millis(100));
                    continue;
                }
                Err(e) => {
                    eprintln!("Error accepting connection: {}", e);
                    thread::sleep(std::time::Duration::from_millis(100));
                }
            }
        }
        
        // Clean up the socket file when terminating
        let _ = fs::remove_file(&socket_path);
    });
    
    (handle, terminate)
}

pub fn send_socket_msg(
    socket_path: &str,
    msg: &str,
) -> Result<(), std::io::Error> {
    // Create a Unix stream to connect to the socket
    let mut stream = UnixStream::connect(socket_path)?;
    
    // Send the message to the socket
    stream.write_all(msg.as_bytes())?;
    
    Ok(())
}