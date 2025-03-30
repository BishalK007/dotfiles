use std::collections::HashMap;
use std::fs;
use std::io::{BufRead, BufReader, Write};
use std::os::unix::fs::PermissionsExt;
use std::os::unix::net::{UnixListener, UnixStream};
use std::sync::{Arc, atomic::{AtomicBool, Ordering}};
use std::thread::{self, JoinHandle};
use std::time::Duration;

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
// In utils/socket.rs
pub fn start_unix_socket_with_parser<F>(
    path: &str,
    message_handler: F,
) -> (JoinHandle<()>, Arc<AtomicBool>)
where
    F: Fn(String) + Send + Sync + 'static,
{
    let path = path.to_string();
    let terminate = Arc::new(AtomicBool::new(false));
    let terminate_clone = Arc::clone(&terminate);
    
    let handle = thread::spawn(move || {
        // Remove the socket if it exists
        let _ = std::fs::remove_file(&path);
        
        // Create the listener
        let listener = match UnixListener::bind(&path) {
            Ok(sock) => sock,
            Err(e) => {
                eprintln!("Failed to bind to socket {}: {}", path, e);
                return;
            }
        };
        
        // Set appropriate permissions
        if let Err(e) = std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o777)) {
            eprintln!("Failed to set socket permissions: {}", e);
        }
        
        // Make listener non-blocking
        if let Err(e) = listener.set_nonblocking(true) {
            eprintln!("Failed to set socket to non-blocking mode: {}", e);
        }
        
        while !terminate_clone.load(Ordering::SeqCst) {
            match listener.accept() {
                Ok((stream, _addr)) => {
                    let mut reader = BufReader::new(stream);
                    let mut message = String::new();
                    
                    if reader.read_line(&mut message).is_ok() {
                        let message = message.trim().to_string();
                        message_handler(message);
                    }
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    // No connection available, sleep a bit
                    thread::sleep(Duration::from_millis(100));
                }
                Err(e) => {
                    eprintln!("Error accepting connection: {}", e);
                    break;
                }
            }
        }
        
        // Clean up socket
        let _ = std::fs::remove_file(&path);
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