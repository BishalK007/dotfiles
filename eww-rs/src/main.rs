mod models;
mod widgets;

use widgets::audio;
use widgets::audio::functions::start_audio_widget;
use widgets::audio::functions::initialize_audio_widget;
use widgets::audio::audio::change_vol;
use widgets::capture;
use widgets::capture::capture::capture;
use widgets::capture::capture::CaptureAction;
use widgets::capture::capture::CaptureCanvas;
use widgets::capture::functions::start_capture_widget;
use widgets::workspaces::functions::initialize_workspace_numbers;
use widgets::workspaces::functions::start_workspace_updater_thread;

use dotenvy::dotenv;
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
};
use chrono::Duration;

fn parse_element<T, F>(message_vec: &[&str], index: usize, converter: F) -> Option<T>
where
    F: FnOnce(&str) -> Result<T, std::num::ParseIntError>,
{
    message_vec.get(index).and_then(|&s| {
        if s.is_empty() {
            None
        } else {
            converter(s).ok()
        }
    })
}

// This function handles a single client connection.
fn handle_client(
    mut socket: UnixStream,
    shutdown_flag: Arc<AtomicBool>,
    eww_config_loc: &str,
) -> std::io::Result<()> {
    let mut buffer = [0; 1024];
    loop {
        let n = socket.read(&mut buffer)?;
        if n == 0 {
            // println!("Client disconnected.");
            return Ok(());
        }

        let message = String::from_utf8_lossy(&buffer[..n]);
        // println!("Received: {}", message);
        let message_vec: Vec<&str> = message.trim_end().split(':').collect();
        // println!("vec: {:?}", message_vec[1]);

        if message_vec[0].to_lowercase() == "audio" {
            // audio:<widget/util>:..
            if message_vec[1].to_lowercase() == "widget" {
                // audio:widget:<Action>:<x_pos>:<y_pos>:<widget_width>:<show_ctrl_buttons(0=>false, 1=> true)>:<close_on_hover_lost(0=>false, 1=> true)>:<duration_in_millis>
                let action = message_vec[2]
                    .to_lowercase()
                    .parse::<audio::functions::Action>()
                    .unwrap();

                let x_pos = parse_element(&message_vec, 3, |s| s.parse::<i32>()); // Get the fourh element (index 3) and parse it to i32
                let y_pos = parse_element(&message_vec, 4, |s| s.parse::<i32>()); // Get the fifth element (index 4) and parse it to i32
                let widget_width = parse_element(&message_vec, 5, |s| s.parse::<i32>()); // Get the sixth element (index 5) and parse it to i32
                let show_ctrl_buttons = parse_element(&message_vec, 6, |s| {
                    // Get the seventh element (index 6) and parse it to bool
                    s.parse::<i32>().map(|n| n != 0)
                });
                let close_on_hover_lost = parse_element(&message_vec, 7, |s| {
                    // Get the eight element (index 7) and parse it to bool
                    s.parse::<i32>().map(|n| n != 0)
                });
                let duration_in_millies = parse_element(&message_vec, 8, |s| {
                    // Get the eighth element (index 8) and parse it to u64
                    s.parse::<u64>().map(|millis| Duration::milliseconds(millis as i64))
                });
                if let Some(duration) = duration_in_millies {
                    if duration.num_milliseconds() >= 1000 {
                        println!("Duration is: {} milliseconds", duration.num_milliseconds());
                    } else {
                        println!("Duration is less than 1000 milliseconds: {} milliseconds", duration.num_milliseconds());
                    }
                } else {
                    println!("Duration is not provided.");
                }
                // println!("close_on_hover_lost {:?}", close_on_hover_lost);
                start_audio_widget(
                    x_pos,
                    y_pos,
                    widget_width,
                    show_ctrl_buttons,
                    close_on_hover_lost,
                    action,
                    &eww_config_loc,
                    duration_in_millies,
                );
            }
            if message_vec[1].to_lowercase() == "util" {
                // audio:util:<VolumeAction>
                let action = match message_vec.get(2) {
                    Some(action_str) => match action_str.to_lowercase().parse::<audio::audio::VolumeAction>() {
                        Ok(action) => action,
                        Err(e) => {
                            eprintln!("Failed to parse VolumeAction: {}", e);
                            return Ok(());
                        }
                    },
                    None => {
                        eprintln!("VolumeAction not provided in the message.");
                        return Ok(());
                    }
                };
                let eww_config_loc_clone = eww_config_loc.to_string();
                // std::thread::spawn(move || {
                    change_vol(action, &eww_config_loc_clone);
                // });
            }
        }

        if message_vec[0].to_lowercase() == "capture" {
            // capture:<widget/util>:..

            if message_vec[1].to_lowercase() == "widget" {
                // capture:widget:<Action>:<x_pos>:<widget_width>
                let action = message_vec[2]
                    .to_lowercase()
                    .parse::<capture::functions::Action>()
                    .unwrap();

                // Get the fourh element (index 3) and parse it to i32
                let x_pos = parse_element(&message_vec, 3, |s| s.parse::<i32>());
                // Get the fourh element (index 4) and parse it to i32
                let widget_width = parse_element(&message_vec, 5, |s| s.parse::<i32>());

                start_capture_widget(x_pos, widget_width, action, &eww_config_loc);
            }
            if message_vec[1].to_lowercase() == "util" {
                // capture:util:<CaptureAction>:<CaptureCanvas>:wl-copy|<anything else>:open-edit|<anything else>
                let action = message_vec[2]
                    .to_lowercase()
                    .parse::<CaptureAction>()
                    .unwrap();

                let canvas_state = message_vec[3]
                    .to_lowercase()
                    .parse::<CaptureCanvas>()
                    .unwrap();

                let wl_copy = parse_element(&message_vec, 4, |s| Ok(s.to_lowercase() == "wl-copy"))
                    .unwrap_or(false);

                let open_edit =
                    parse_element(&message_vec, 5, |s| Ok(s.to_lowercase() == "open-edit"))
                        .unwrap_or(false);

                capture(action, canvas_state, wl_copy, open_edit, &eww_config_loc);
            }
        }
        if message_vec[0] == "eww" {
            if message_vec[1] == "start" {
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

                
                // This loads all other widget daemons
                // Load capture widget to daemon
                let mut message = "capture:widget:load";
                if let Ok(mut stream) = UnixStream::connect("/tmp/eww_main_socket.sock") {
                    if let Err(e) = stream.write_all(message.as_bytes()) {
                        eprintln!("Failed to send message: {}", e);
                    }
                }
                // Load audio widget to daemon
                message = "audio:widget:load";
                if let Ok(mut stream) = UnixStream::connect("/tmp/eww_main_socket.sock") {
                    if let Err(e) = stream.write_all(message.as_bytes()) {
                        eprintln!("Failed to send message: {}", e);
                    }
                }

                // This functions initialise the workspace numbers then runs a thread that updates them on socket update
                initialize_workspace_numbers(&eww_config_loc.to_string());
                start_workspace_updater_thread(&eww_config_loc.to_string());

                // Initialize the audio widget icons nd all
                initialize_audio_widget(&eww_config_loc.to_string());
            }
            if message_vec[1] == "stop" {
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
        }

        // If the message is "exit", set the shutdown flag.
        if message_vec[0] == "exit" {
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
                thread::sleep(std::time::Duration::from_millis(50));
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

    let eww_config_loc = match std::env::var("EWW_CONFIG_LOC") {
        Ok(val) => val,
        Err(_) => {
            return Err(std::io::Error::new(std::io::ErrorKind::Other, "Failed to get EWW_CONFIG_LOC environment variable"));
        }
    };

    let socket_path = "/tmp/eww_main_socket.sock";

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
