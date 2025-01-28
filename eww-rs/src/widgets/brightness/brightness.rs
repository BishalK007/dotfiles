use std::{
    fmt::{Display, Formatter},
    process::{Command},
    str::FromStr,
};

#[derive(Debug, PartialEq, Eq)]
pub enum BrightnessAction {
    BrightnessUp,
    BrightnessDown,
}

impl FromStr for BrightnessAction {
    type Err = String; // Custom error type for invalid strings

    fn from_str(s: &str) -> core::result::Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "brightnessup" => Ok(BrightnessAction::BrightnessUp),
            "brightness-up" => Ok(BrightnessAction::BrightnessUp),
            "brightnessdown" => Ok(BrightnessAction::BrightnessDown),
            "brightness-down" => Ok(BrightnessAction::BrightnessDown),
            _ => Err(format!("Invalid widget state: {}", s)),
        }
    }
}


// Helper function to get current volume and muted status
fn get_brightness_level() -> Option<f32> {
    let output = Command::new("brightnessctl")
        .args(["-m"])
        .output()
        .ok()?;

    let output_str = String::from_utf8_lossy(&output.stdout);
    let brightness_str = output_str.split(',').nth(3)?.trim_end_matches('%');
    let brightness = brightness_str.parse::<f32>().ok()?;

    Some(brightness)
}

pub fn change_brightness(brightness_action: BrightnessAction, eww_config_loc: &str) {

    // Execute the command and check success
    let status = match brightness_action {
        BrightnessAction::BrightnessUp => Command::new("brightnessctl")
            .args(vec!["set", "+5%"])
            .status()
            .ok(),
        BrightnessAction::BrightnessDown => {
            let curr_brightness = get_brightness_level().unwrap_or(0.0);
            if curr_brightness <= 5.0 {
            Command::new("brightnessctl")
                .args(vec!["set", "5%"])
                .status()
                .ok()
            } else {
            Command::new("brightnessctl")
                .args(vec!["set", "5%-"])
                .status()
                .ok()
            }
        },
        
    };
    if status.is_none() {
        eprintln!(" Error on Action :: wpctl");
        return;
    }
    if let Some(brightness) = get_brightness_level() {
        eww_updater(eww_config_loc, brightness);
    } else {
        eprintln!("Failed to get current brightness level");
    }
}

pub fn initialize_brightness(eww_config_loc: &str) {
    // Get volume state
    let state = match get_brightness_level() {
        Some(state) => state,
        None => {
            eprintln!("Failed to get old curr vol state");
            return;
        }
    };
    eww_updater(eww_config_loc,state);
}

fn eww_updater(eww_config_loc: &str, brightness_level: f32) {
    let brightness_dropdown_rel_loc = std::env::var("brightness_DROPDOWN_WIDGET_RELATIVE_LOCATION")
        .unwrap_or_else(|_| String::from("/widgets/brightness/brightness-dropdown"));

    // Update brightness slider and boost (always update these)
    let eww_command = format!(
        "eww -c {}{} update brightness_slider_val=\"{}\"",
        &eww_config_loc, &brightness_dropdown_rel_loc, brightness_level,
    );
    let _ = Command::new("sh")
        .arg("-c")
        .arg(eww_command)
        .spawn()
        .expect("Failed to update brightness slider and boost in eww bar");

}
