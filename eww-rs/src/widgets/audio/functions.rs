use std::{process::Command, str::FromStr};

use chrono::Duration;
use lazy_static::lazy_static;

use crate::models::Monitor;

use super::audio;
use ::std::thread;
use std::sync::Mutex;
use std::time::Instant;

#[derive(Debug)] // Derive Debug for easy printing
pub enum Action {
    Open,
    Close,
    Toggle,
    AutoToggle,
    Load,
}

impl FromStr for Action {
    type Err = String; // Custom error type for invalid strings

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "open" => Ok(Action::Open),
            "close" => Ok(Action::Close),
            "toggle" => Ok(Action::Toggle),
            "autotoggle" => Ok(Action::AutoToggle),
            "auto-toggle" => Ok(Action::AutoToggle),
            "load" => Ok(Action::Load),
            _ => Err(format!("Invalid widget state: {}", s)),
        }
    }
}

pub fn start_audio_widget(
    x_pos: Option<i32>,
    y_pos: Option<i32>,
    widget_width: Option<i32>,
    show_ctrl_buttons: Option<bool>,
    close_on_hover_lost: Option<bool>,
    action: Action,
    eww_config_loc: &str,
    auto_toggle_duration: Option<Duration>,
) {
    let mut x_pos = x_pos.unwrap_or(100); // Default value is 100
    let y_pos = y_pos.unwrap_or(100); // Default value is 100
    let show_ctrl_buttons = show_ctrl_buttons.unwrap_or(true); // Default value is 100
    let close_on_hover_lost = close_on_hover_lost.unwrap_or(true); // Default value is 100
    let widget_width = widget_width.unwrap_or(300); // Default value is 300
    let auto_toggle_duration = auto_toggle_duration.unwrap_or(Duration::zero());
    // println!("audio Options ::");
    // println!("\tx_pos: {}", x_pos);
    // println!("\twidget_width: {}",widget_width);
    // println!("\taction: {:?}", action);

    let audio_dropdown_rel_loc = std::env::var("AUDIO_DROPDOWN_WIDGET_RELATIVE_LOCATION")
        .unwrap_or_else(|_| String::from("/widgets/audio/audio-dropdown"));

    // Get monitor details
    let output = Command::new("hyprctl")
        .args(["monitors", "-j"])
        .output()
        .expect("Failed to execute `hyprctl monitors -j`");

    let output_str = String::from_utf8_lossy(&output.stdout);
    let monitors: Vec<Monitor> = match serde_json::from_str(&output_str) {
        Ok(monitors) => monitors,
        Err(e) => {
            eprintln!("Failed to parse JSON from `hyprctl monitors -j`: {:#}", e);
            return;
        }
    };
    let focused_monitor = monitors.iter().find(|m| m.focused).unwrap_or(&monitors[0]);
    // println!("\tfocused_monitor {:?}", focused_monitor);
    let scale_adjusted_width =
        (focused_monitor.width as f64 / focused_monitor.scale).floor() as i32;

    //Adjust x_pos
    let adjusted_x_pos = x_pos - widget_width / 2;
    let max_x_pos = scale_adjusted_width - widget_width;

    // Check if adjusted_x_pos exceeds the available width or is less than 0
    if adjusted_x_pos > max_x_pos {
        x_pos = scale_adjusted_width - widget_width;
    } else if adjusted_x_pos < 0 {
        x_pos = 0;
    } else {
        x_pos = adjusted_x_pos;
    }

    match action {
        Action::Open => {
            Command::new("eww")
                .args(["open", "audio_dropdown", "-c"])
                .arg(format!("{}{}", eww_config_loc, audio_dropdown_rel_loc))
                .arg("--arg")
                .arg(format!("x_pos={}", x_pos))
                .arg("--arg")
                .arg(format!("y_pos={}", y_pos))
                .arg("--arg")
                .arg(format!("widget_width={}", widget_width))
                .arg("--arg")
                .arg(format!("show_ctrl_buttons={}", show_ctrl_buttons))
                .arg("--arg")
                .arg(format!("close_on_hover_lost={}", close_on_hover_lost))
                .spawn()
                .expect("Failed to open audio widget");
        }
        Action::Close => {
            Command::new("eww")
                .args(["close", "audio_dropdown", "-c"])
                .arg(format!("{}{}", eww_config_loc, audio_dropdown_rel_loc))
                .spawn()
                .expect("Failed to open audio widget");
        }

        Action::Toggle => {
            Command::new("eww")
                .args(["open", "audio_dropdown", "-c"])
                .arg(format!("{}{}", eww_config_loc, audio_dropdown_rel_loc))
                .arg("--toggle")
                .arg("--arg")
                .arg(format!("x_pos={}", x_pos))
                .arg("--arg")
                .arg(format!("y_pos={}", y_pos))
                .arg("--arg")
                .arg(format!("widget_width={}", widget_width))
                .arg("--arg")
                .arg(format!("show_ctrl_buttons={}", show_ctrl_buttons))
                .arg("--arg")
                .arg(format!("close_on_hover_lost={}", close_on_hover_lost))
                .spawn()
                .expect("Failed to open audio widget");
        }
        Action::AutoToggle => {
            handle_auto_toggle(
                auto_toggle_duration,
                x_pos,
                y_pos,
                widget_width,
                show_ctrl_buttons,
                close_on_hover_lost,
                &eww_config_loc,
                &audio_dropdown_rel_loc,
            );
        }
        Action::Load => {
            Command::new("eww")
                .args(["daemon", "-c"])
                .arg(format!("{}{}", eww_config_loc, audio_dropdown_rel_loc))
                .spawn()
                .expect("Failed to open audio widget");
        }
    }
}

pub fn initialize_audio_widget(eww_config_loc: &str) {
    audio::initialize_vol(eww_config_loc);
}

lazy_static! {
    static ref IS_THREAD_RUNNING: Mutex<bool> = Mutex::new(false);
    static ref TERMINATION_TIME_INSTANT: Mutex<Instant> = Mutex::new(Instant::now());
}

struct RunningGuard;

impl Drop for RunningGuard {
    fn drop(&mut self) {
        let mut is_running = IS_THREAD_RUNNING.lock().unwrap();
        *is_running = false;
        drop(is_running);
    }
}

pub fn handle_auto_toggle(
    duration: Duration,
    x_pos: i32,
    y_pos: i32,
    widget_width: i32,
    show_ctrl_buttons: bool,
    close_on_hover_lost: bool,
    eww_config_loc: &str,
    audio_dropdown_rel_loc: &str,
) {
    // Lock the running flag for the entire check-and-set operation
    let mut is_running = IS_THREAD_RUNNING.lock().unwrap();

    if *is_running {
        // Update termination time for existing thread
        let mut termination_time = TERMINATION_TIME_INSTANT.lock().unwrap();
        *termination_time =
            Instant::now() + std::time::Duration::from_millis(duration.num_milliseconds() as u64);
        return;
    }

    let eww_config_loc = eww_config_loc.to_string();
    let audio_dropdown_rel_loc = audio_dropdown_rel_loc.to_string();

    // Mark thread as running before spawning
    *is_running = true;
    drop(is_running); // Release lock before thread spawn

    thread::spawn(move || {
        let _guard = RunningGuard; // Will reset flag when dropped

        // Open widget
        let open_status = Command::new("eww")
            .args(["open", "audio_dropdown", "-c"])
            .arg(format!("{}{}", eww_config_loc, audio_dropdown_rel_loc))
            .arg("--arg")
            .arg(format!("x_pos={}", x_pos))
            .arg("--arg")
            .arg(format!("y_pos={}", y_pos))
            .arg("--arg")
            .arg(format!("widget_width={}", widget_width))
            .arg("--arg")
            .arg(format!("show_ctrl_buttons={}", show_ctrl_buttons))
            .arg("--arg")
            .arg(format!("close_on_hover_lost={}", close_on_hover_lost))
            .spawn();

        if let Err(e) = open_status {
            eprintln!("Failed to open audio widget: {}", e);
            return;
        }

        // Set initial termination time
        let mut target_termination_time =
            Instant::now() + std::time::Duration::from_millis(duration.num_milliseconds() as u64);
        {
            let mut termination_time = TERMINATION_TIME_INSTANT.lock().unwrap();
            *termination_time = target_termination_time;
        }

        // Main wait loop
        loop {
            let now = Instant::now();
            if now >= target_termination_time {
                break;
            }

            // Check for updated termination time
            let current_deadline = *TERMINATION_TIME_INSTANT.lock().unwrap();
            if current_deadline > target_termination_time {
                // Extend our target time if another request came in
                target_termination_time = current_deadline;
            }

            std::thread::sleep(std::time::Duration::from_millis(100));
        }

        // Close widget
        let close_status = Command::new("eww")
            .args(["close", "audio_dropdown", "-c"])
            .arg(format!("{}{}", eww_config_loc, audio_dropdown_rel_loc))
            .spawn();

        if let Err(e) = close_status {
            eprintln!("Failed to close audio widget: {}", e);
        }
    });
}
