pub mod widgets {
    pub mod workspaces {
        pub mod functions;
    }
}

use std::{
    fs,
    io::{Read, Write},
    os::unix::net::{UnixListener, UnixStream},
    path::Path,
    process::Command,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    thread,
    time::Duration,
};
use dotenvy::dotenv;

use widgets::workspaces::functions::start_workspace_updater_thread;
use widgets::workspaces::functions::initialize_workspace_numbers;

// This function handles a single client connection.
fn handle_client(mut socket: UnixStream, shutdown_flag: Arc<AtomicBool>, eww_config_loc: &str) -> std::io::Result<()> {
    let mut buffer = [0; 1024];
    loop {
        let n = socket.read(&mut buffer)?;
        if n == 0 {
            println!("Client disconnected.");
            return Ok(());
        }

        let message = String::from_utf8_lossy(&buffer[..n]);
        println!("Received: {}", message);
        if message.trim() == "test" {
            start_workspace_updater_thread(&eww_config_loc.to_string());
        }
        if message.trim() == "start-eww" {
            // Start the eww daemon and open the eww-bar
            let start_daemon = Command::new("eww")
                .arg("daemon")
                .arg("-c")
                .arg(&eww_config_loc)
                .status();

            let open_bar = Command::new("eww")
                .arg("open")
                .arg("eww-bar")
                .arg("-c")
                .arg(&eww_config_loc)
                .status();

            match (start_daemon, open_bar) {
                (Ok(_), Ok(_)) => println!("eww daemon and bar started successfully."),
                (Err(e), _) => eprintln!("Failed to start eww daemon: {}", e),
                (_, Err(e)) => eprintln!("Failed to open eww-bar: {}", e),
            }
            
            // This functions initialise the workspace numbers then runs a thread that updates them on socket update
            initialize_workspace_numbers(&eww_config_loc.to_string());
            start_workspace_updater_thread(&eww_config_loc.to_string());
        }
        if message.trim() == "stop-eww" {
            let close_bar = Command::new("eww")
                .arg("close")
                .arg("eww-bar")
                .arg("-c")
                .arg(&eww_config_loc)
                .status();
            match close_bar {
                Ok(_) => println!("eww daemon stopped successfully."),
                Err(e) => eprintln!("Failed to stop eww daemon: {}", e),
            }
        }
        // If the message is "exit", set the shutdown flag.
        if message.trim() == "exit" {
            println!("'exit' command received — requesting server shutdown...");
            shutdown_flag.store(true, Ordering::SeqCst);
            return Ok(());
        }

        // Echo the message back, or do whatever else you like:
        socket.write_all(&buffer[..n])?;
    }
}

// This function runs in a separate thread, accepting connections and spawning client-handler threads.
// It checks `shutdown_flag` each loop iteration to see if it should stop.
fn accept_connections(
    listener: UnixListener,
    shutdown_flag: Arc<AtomicBool>,
    eww_config_loc: &str,
) -> std::io::Result<()> {
    // Set non-blocking so we can periodically check `shutdown_flag` in a loop
    listener.set_nonblocking(true)?;

    // We'll keep track of client threads in a vector so we can join them before exiting.
    let mut client_threads = vec![];

    while !shutdown_flag.load(Ordering::SeqCst) {
        match listener.accept() {
            Ok((socket, _addr)) => {
                println!("Client connected.");

                // Clone the Arc so the client thread can see the same flag:
                let flag_for_client = shutdown_flag.clone();
                let config_loc = eww_config_loc.to_string();
                let handle = thread::spawn(move || {
                    if let Err(e) = handle_client(socket, flag_for_client, &config_loc) {
                        eprintln!("Error in client thread: {}", e);
                    }
                });
                client_threads.push(handle);
            }
            Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                // No pending connection right now; just keep going.
                // Sleep briefly to avoid burning 100% CPU in this loop.
                thread::sleep(Duration::from_millis(50));
            }
            Err(e) => {
                eprintln!("Accept error: {}", e);
                // You might decide to break or continue here depending on your use-case.
                break;
            }
        }
    }

    println!("Accept thread: shutdown flag set or error encountered. Stopping accept loop.");

    // Join all remaining client threads so they can finish cleanly.
    for handle in client_threads {
        let _ = handle.join();
    }

    Ok(())
}

fn main() -> std::io::Result<()> {
    // Load the .env file
    dotenv().expect("Failed to load .env file");

    let eww_config_loc = std::env::var("EWW_CONFIG_LOC").expect("EWW_CONFIG_LOC must be set.");

    let socket_path = "/tmp/multi_unix_socket.sock";

    // Remove the socket file if it already exists.
    if Path::new(socket_path).exists() {
        fs::remove_file(socket_path)?;
    }

    // Bind to the Unix socket
    let listener = UnixListener::bind(socket_path)?;
    println!("Server listening on {}", socket_path);

    // Shared atomic boolean for shutdown
    let shutdown_flag = Arc::new(AtomicBool::new(false));

    // Clone the Arc for the accept thread
    let flag_for_accept_thread = shutdown_flag.clone();
    // Spawn the accept thread
    let accept_thread = thread::spawn(move || {
        if let Err(e) = accept_connections(listener, flag_for_accept_thread, &eww_config_loc) {
            eprintln!("Error in accept thread: {}", e);
        }
    });

    // The main thread here can do any other tasks you want. For a simple demo, we'll
    // just wait until the accept thread finishes (i.e., after "exit" is received).
    if let Err(e) = accept_thread.join() {
        eprintln!("Accept thread panicked: {:?}", e);
    }

    // Once we're here, the accept thread has exited. Clean up the socket.
    fs::remove_file(socket_path)?;
    println!("Server has exited gracefully.");

    Ok(())
}
