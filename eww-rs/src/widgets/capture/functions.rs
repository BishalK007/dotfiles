use std::{process::Command, str::FromStr};

use crate::models::Monitor;

// pub fn demo() {
//     println!("Hello from capture widget");
// }

#[derive(Debug)] // Derive Debug for easy printing
pub enum Action {
    Open,
    Close,
    Toggle,
    Load,
}


impl FromStr for Action {
    type Err = String; // Custom error type for invalid strings

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "open" => Ok(Action::Open),
            "close" => Ok(Action::Close),
            "toggle" => Ok(Action::Toggle),
            "load" => Ok(Action::Load),
            _ => Err(format!("Invalid widget state: {}", s)),
        }
    }
}

pub fn start_capture_widget(x_pos: Option<i32>, widget_width: Option<i32>, action: Action, eww_config_loc: &str) {
    let mut x_pos = x_pos.unwrap_or(100); // Default value is 100
    let widget_width = widget_width.unwrap_or(300); // Default value is 300
    // println!("capture Options ::");
    // println!("\tx_pos: {}", x_pos);
    // println!("\twidget_width: {}",widget_width);
    // println!("\taction: {:?}", action);
    
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
    let scale_adjusted_width = (focused_monitor.width as f64 / focused_monitor.scale).floor() as i32;

    let adjusted_x_pos= x_pos - widget_width / 2;
    let max_x_pos = scale_adjusted_width - widget_width;
    
    // Check if adjusted_x_pos exceeds the available width or is less than 0
    if adjusted_x_pos > max_x_pos {
        x_pos = scale_adjusted_width - widget_width;
    } else if adjusted_x_pos < 0 {
        x_pos = 0;
    } else {
        x_pos = adjusted_x_pos;
    }
    // println!("\t new x_pos: {:?}", x_pos);

    match action {
        Action::Open => {
            Command::new("eww")
                .args(["open", "capture_dropdown", "-c"])
                .arg(format!("{}/widgets/capture/capture-dropdown", eww_config_loc))
                .arg("--arg")
                .arg(format!("x_pos={}", x_pos))
                .arg("--arg")
                .arg(format!("widget_width={}", widget_width))
                .spawn()
                .expect("Failed to open capture widget");
        }
        Action::Close => {
            Command::new("eww")
                .args(["close", "capture_dropdown", "-c"])
                .arg(format!("{}/widgets/capture/capture-dropdown", eww_config_loc))
                .spawn()
                .expect("Failed to open capture widget");
        }
        Action::Toggle => {
            Command::new("eww")
                .args(["open", "capture_dropdown", "-c"])
                .arg(format!("{}/widgets/capture/capture-dropdown", eww_config_loc))
                .arg("--toggle")
                .arg("--arg")
                .arg(format!("x_pos={}", x_pos))
                .arg("--arg")
                .arg(format!("widget_width={}", widget_width))
                .spawn()
                .expect("Failed to open capture widget");
        }
        Action::Load => {
            Command::new("eww")
                .args(["daemon", "-c"])
                .arg(format!("{}/widgets/capture/capture-dropdown", eww_config_loc))
                .spawn()
                .expect("Failed to open capture widget");
        }
    }


}
