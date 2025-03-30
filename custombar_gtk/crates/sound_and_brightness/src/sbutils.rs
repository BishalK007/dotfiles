use std::{fmt::{Display, Formatter}, process::Command, str::FromStr};

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
    fn from_value(level_with_boost: f64) -> Self {
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
pub struct VolumeState {
    pub level: f64,
    pub boost: f64,
    pub is_muted: bool,
}
impl Display for VolumeState {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        write!(f, "VOL :: {:.2} BOOST :: {:.2}", self.level, self.boost)
    }
}

impl VolumeState {
    fn new(_level: f64, is_muted: bool) -> Self {
        let level = _level.clamp(0.0, 1.0);
        let boost = (_level - level).clamp(0.0, 0.5);
        Self {
            level,
            boost,
            is_muted,
        }
    }

    fn set_level(&mut self, new_level: f64) {
        // Ensure level is within valid range (e.g., 0.0 to 1.5)
        self.level = new_level.clamp(0.0, 1.0);
        self.boost = (new_level - self.level).clamp(0.0, 0.5);
    }
    fn toggle_mute(&mut self) {
        self.is_muted = !self.is_muted;
    }
    pub fn get_icon(&self) -> String {
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
pub fn get_volume_state() -> Option<VolumeState> { 
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
        .parse::<f64>()
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



pub trait VolumeChange {
    fn change_vol(self);
}

impl VolumeChange for VolumeAction {
    fn change_vol(self) {
        let status = match self {
            VolumeAction::VolUp => Command::new("wpctl")
                .args(vec!["set-volume", "-l", "1.5", "@DEFAULT_AUDIO_SINK@", "5%+"])
                .status()
                .ok(),
            VolumeAction::VolDown => Command::new("wpctl")
                .args(vec!["set-volume", "-l", "1.5", "@DEFAULT_AUDIO_SINK@", "5%-"])
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
            eprintln!("Error executing volume action with wpctl");
        }
    }
}

impl VolumeChange for f64 {
    fn change_vol(self) {
        let level = self.clamp(0.0, 1.5);
        let percentage = format!("{}%", (level * 100.0) as i32);
        let status = Command::new("wpctl")
            .args(vec!["set-volume", "-l", "1.5", "@DEFAULT_AUDIO_SINK@", &percentage])
            .status()
            .ok();

        if status.is_none() {
            eprintln!("Error setting volume level with wpctl");
        }
    }
}

pub fn change_vol<T: VolumeChange>(arg: T) {
    arg.change_vol();
}