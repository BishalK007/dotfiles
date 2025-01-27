use std::{
    fmt::{Display, Formatter},
    os::unix::process::ExitStatusExt,
    process::{Command, ExitStatus},
    str::FromStr,
};

#[derive(Debug, PartialEq, Eq)]
pub enum VolumeAction {
    VolUp,
    VolDown,
    VolMute,
    VolUnmute,
    VolMuteToggle,
}

impl FromStr for VolumeAction {
    type Err = String; // Custom error type for invalid strings

    fn from_str(s: &str) -> core::result::Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "volup" => Ok(VolumeAction::VolUp),
            "vol-up" => Ok(VolumeAction::VolUp),
            "voldown" => Ok(VolumeAction::VolDown),
            "vol-down" => Ok(VolumeAction::VolDown),
            "volmute" => Ok(VolumeAction::VolMute),
            "vol-mute" => Ok(VolumeAction::VolMute),
            "volunmute" => Ok(VolumeAction::VolUnmute),
            "vol-unmute" => Ok(VolumeAction::VolUnmute),
            "volmutetoggle" => Ok(VolumeAction::VolMuteToggle),
            "vol-mutetoggle" => Ok(VolumeAction::VolMuteToggle),
            "vol-mute-toggle" => Ok(VolumeAction::VolMuteToggle),
            _ => Err(format!("Invalid widget state: {}", s)),
        }
    }
}

#[derive(Debug, PartialEq, Eq)]
enum VolumeLevel {
    NoSound,
    Low,
    Medium,
    High,
    Boosted,
}

impl VolumeLevel {
    fn from_value(level_with_boost: f32) -> Self {
        match level_with_boost {
            0.0 => Self::NoSound,
            0.0..=0.3 => Self::Low, 
            0.3..=0.7 => Self::Medium, 
            0.7..=1.0 => Self::High,
            _ => Self::Boosted,
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
struct VolumeState {
    level: f32,
    boost: f32,
    is_muted: bool,
}
impl Display for VolumeState {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        write!(f, "VOL :: {:.2} BOOST :: {:.2}", self.level, self.boost)
    }
}

impl VolumeState {
    fn new(_level: f32, is_muted: bool) -> Self {
        let level = _level.clamp(0.0, 1.0);
        let boost = (_level - level).clamp(0.0, 0.5);
        Self {
            level,
            boost,
            is_muted,
        }
    }

    fn set_level(&mut self, new_level: f32) {
        // Ensure level is within valid range (e.g., 0.0 to 1.5)
        self.level = new_level.clamp(0.0, 1.0);
        self.boost = (new_level - self.level).clamp(0.0, 0.5);
    }
    fn toggle_mute(&mut self) {
        self.is_muted = !self.is_muted;
    }
    fn get_icon(&self) -> String {
        if self.is_muted {
            "󰖁".to_string()
        } else if self.boost > 0.0 {
            "󰕾".to_string()
        } else {
            // Determine icon based on volume level
            match self.level {
                0.0 => "󰝟".to_string(),
                0.0..=0.3 => "󰕿".to_string(),
                0.3..=0.7 => "󰖀".to_string(),
                _ => "󰕾".to_string(),
            }
        }
    }
    fn is_boosted(&self) -> bool {
        self.boost > 0.0
    }
    fn will_icon_change(&self, old_state: &VolumeState) -> bool {
        self.is_muted != old_state.is_muted
            || VolumeLevel::from_value(self.level + self.boost) != VolumeLevel::from_value(old_state.level + old_state.boost)
    }
}

// Helper function to get current volume and muted status
fn get_volume_state() -> Option<VolumeState> {
    let output = Command::new("wpctl")
        .args(["get-volume", "@DEFAULT_AUDIO_SINK@"])
        .output()
        .ok()?;

    let output_str = String::from_utf8_lossy(&output.stdout);
    let muted = output_str.contains("[MUTED]");

    // Parse volume value, handling percentage format if needed
    let volume_str = output_str.split_whitespace().nth(1)?;
    let volume = volume_str
        .trim_end_matches('%')
        .parse::<f32>()
        .map(|v| {
            if volume_str.ends_with('%') {
                v / 100.0
            } else {
                v
            }
        })
        .ok()?;

    Some(VolumeState::new(volume, muted))
}

pub fn change_vol(vol_action: VolumeAction, eww_config_loc: &str) {
    // Get initial volume stat
    let old_state = match get_volume_state() {
        Some(state) => state,
        None => {
            eprintln!("Failed to get old curr vol state");
            return;
        }
    };

    // Execute the command and check success
    let status = match vol_action {
        VolumeAction::VolUp => Command::new("wpctl")
            .args(vec![
                "set-volume",
                "-l",
                "1.5",
                "@DEFAULT_AUDIO_SINK@",
                "5%+",
            ])
            .status()
            .ok(),
        VolumeAction::VolDown => Command::new("wpctl")
            .args(vec![
                "set-volume",
                "-l",
                "1.5",
                "@DEFAULT_AUDIO_SINK@",
                "5%-",
            ])
            .status()
            .ok(),
        VolumeAction::VolMute => Command::new("wpctl")
            .args(vec!["set-mute", "@DEFAULT_AUDIO_SINK@", "1"])
            .status()
            .ok(),
        VolumeAction::VolUnmute => Command::new("wpctl")
            .args(vec!["set-mute", "@DEFAULT_AUDIO_SINK@", "0"])
            .status()
            .ok(),
        VolumeAction::VolMuteToggle => Command::new("wpctl")
            .args(vec!["set-mute", "@DEFAULT_AUDIO_SINK@", "toggle"])
            .status()
            .ok(),
    };
    if status.is_none() {
        eprintln!(" Error on Action :: wpctl");
        return;
    }

    // Get new volume state after action
    let new_state = match get_volume_state() {
        Some(state) => state,
        None => {
            eprintln!("Failed to get old curr vol state");
            return;
        }
    };
    // This updates eww widget whatever is needed
    eww_updater(&eww_config_loc, Some(&old_state), &new_state, old_state.is_muted != new_state.is_muted);
}

pub fn initialize_vol(eww_config_loc: &str) {
    // Get volume state
    let state = match get_volume_state() {
        Some(state) => state,
        None => {
            eprintln!("Failed to get old curr vol state");
            return;
        }
    };
    eww_updater(eww_config_loc, None, &state, true);
}

fn eww_updater(eww_config_loc: &str, old_state: Option<&VolumeState>, new_state: &VolumeState, is_update_mute_text: bool) {
    let audio_dropdown_rel_loc = std::env::var("AUDIO_DROPDOWN_WIDGET_RELATIVE_LOCATION")
        .unwrap_or_else(|_| String::from("/widgets/audio/audio-dropdown"));

    // Update audio slider and boost (always update these)
    let eww_command = format!(
        "eww -c {}{} update audio_slider_val=\"{}\" audio_booster_val=\"{}\"",
        &eww_config_loc, &audio_dropdown_rel_loc, (new_state.level * 100.0) as i32 , (new_state.boost * 200.0 ) as i32
    );
    let _ = Command::new("sh")
        .arg("-c")
        .arg(eww_command)
        .spawn()
        .expect("Failed to update audio slider and boost in eww bar");


    // Update icon only if necessary (if old_state is provided and there's a change)
    if let Some(old_state) = old_state {
        if new_state.will_icon_change(old_state) {
            let icon_class = if new_state.is_boosted() {
                "audio-icon-red"
            } else {
                "audio-icon"
            };
            let eww_command = format!(
                "eww -c {} update audio_icon=\"(label :text '{}' :class '{}')\"",
                &eww_config_loc,
                new_state.get_icon(),
                icon_class
            );
            let _ = Command::new("sh")
                .arg("-c")
                .arg(&eww_command)
                .spawn()
                .expect("Failed to change audio icon in eww bar");
        }
    } else {
        // Update icon if no old_state is provided
        let icon_class = if new_state.is_boosted() {
            "audio-icon-red"
        } else {
            "audio-icon"
        };
        let eww_command = format!(
            "eww -c {} update audio_icon=\"(label :text '{}' :class '{}')\"",
            &eww_config_loc,
            new_state.get_icon(),
            icon_class
        );
        let _ = Command::new("sh")
            .arg("-c")
            .arg(&eww_command)
            .spawn()
            .expect("Failed to change audio icon in eww bar");
    }

    // Update mute text 
    if is_update_mute_text {
        let eww_command = format!(
            "eww -c {}{} update mute_text=\"{}\"",
            &eww_config_loc, &audio_dropdown_rel_loc, if new_state.is_muted {"UNMUTE"} else {"MUTE"}
        );
        let _ = Command::new("sh")
            .arg("-c")
            .arg(eww_command)
            .spawn()
            .expect("Failed to update audio slider and boost in eww bar");
    }
}
