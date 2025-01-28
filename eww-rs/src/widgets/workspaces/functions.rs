// This public function listens on "$XDG_RUNTIME_DIR"/hypr/"$HYPRLAND_INSTANCE_SIGNATURE"/.socket2.sock
// and updates the workspace number
use crate::models::Monitor;

use std::env;
use std::thread;
use std::os::unix::net::UnixStream;
use std::io::{BufRead, BufReader}; 
use std::process::Command;



/// Initializes EWW workspace variables by querying the current workspace
/// from Hyprland (using `hyprctl monitors -j`) and updating EWW widgets.
pub fn initialize_workspace_numbers(eww_config_loc: &str) {
    // Run `hyprctl monitors -j` and capture the output
    let output = Command::new("hyprctl")
        .args(["monitors", "-j"])
        .output()
        .expect("Failed to execute `hyprctl monitors -j`");

    // Convert output to a String
    let output_str = String::from_utf8_lossy(&output.stdout);

    // Parse the JSON output into a Vec<Monitor>
    let monitors: Vec<Monitor> = match serde_json::from_str(&output_str) {
        Ok(monitors) => monitors,
        Err(e) => {
            eprintln!("Failed to parse JSON from `hyprctl monitors -j`: {:#}", e);
            return;
        }
    };

    // Find the currently focused monitor
    if let Some(current_monitor) = monitors.iter().find(|m| m.focused) {
        let ws_num = current_monitor.active_workspace.id;
        let prev_workspace = if ws_num > 1 { ws_num - 1 } else { 0 };
        let next_workspace = ws_num + 1;

        // Update EWW widgets (curr_workspace, prev_workspace, next_workspace)
        Command::new("eww")
            .args(["update", &format!("curr_workspace={}", ws_num)])
            .arg("-c")
            .arg(eww_config_loc)
            .spawn()
            .expect("failed to execute eww for curr_workspace");

        Command::new("eww")
            .args(["update", &format!("prev_workspace={}", prev_workspace)])
            .arg("-c")
            .arg(eww_config_loc)
            .spawn()
            .expect("failed to execute eww for prev_workspace");

        Command::new("eww")
            .args(["update", &format!("next_workspace={}", next_workspace)])
            .arg("-c")
            .arg(eww_config_loc)
            .spawn()
            .expect("failed to execute eww for next_workspace");

        println!(
            "Initialized workspaces: prev={}, current={}, next={}",
            prev_workspace, ws_num, next_workspace
        );
    } else {
        eprintln!("No monitor is currently focused, cannot initialize workspace numbers.");
    }
}


pub fn start_workspace_updater_thread(eww_config_loc: &str) {
    let config_loc = eww_config_loc.to_string();
    thread::spawn(move || {
        let xdg_runtime_dir = env::var("XDG_RUNTIME_DIR")
            .expect("XDG_RUNTIME_DIR not set");
        let hypoland_instance_signature = env::var("HYPRLAND_INSTANCE_SIGNATURE")
            .expect("HYPRLAND_INSTANCE_SIGNATURE not set");
        let socket_path = format!("{}/hypr/{}/.socket2.sock",
            xdg_runtime_dir, hypoland_instance_signature);

        match UnixStream::connect(&socket_path) {
            Ok(stream) => {
                let reader = BufReader::new(stream);
                for line_result in reader.lines() {
                    match line_result {
                        Ok(line) => {
                            if line.starts_with("workspace>>") {
                                let curr_workspace = &line["workspace>>".len()..].trim();
                                match curr_workspace.parse::<u32>() {
                                    Ok(ws_num) => {
                                        let prev_workspace = if ws_num > 1 {
                                            ws_num - 1
                                        } else {
                                            0
                                        };
                                        let next_workspace = ws_num + 1;
                                        // Update eww widgets
                                        Command::new("eww")
                                            .args(["update", &format!("curr_workspace={}", ws_num)])
                                            .arg("-c")
                                            .arg(&config_loc)
                                            .spawn()
                                            .expect("failed to execute eww");

                                        Command::new("eww")
                                            .args(["update", &format!("prev_workspace={}", prev_workspace)])
                                            .arg("-c")
                                            .arg(&config_loc)
                                            .spawn()
                                            .expect("failed to execute eww");

                                        Command::new("eww")
                                            .args(["update", &format!("next_workspace={}", next_workspace)])
                                            .arg("-c")
                                            .arg(&config_loc)
                                            .spawn()
                                            .expect("failed to execute eww");

                                        println!(
                                            "Updated workspaces: prev={}, current={}, next={}",
                                            prev_workspace, ws_num, next_workspace
                                        );
                                    },
                                    Err(_) => {
                                        eprintln!("Invalid workspace number: {}", curr_workspace);
                                    },
                                }
                            }
                        },
                        Err(e) => {
                            eprintln!("Error reading from socket: {}", e);
                            break;
                        },
                    }
                }
            },
            Err(e) => {
                eprintln!("Failed to connect to socket {}: {}", socket_path, e);
            },
        }
    });
}
