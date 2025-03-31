use std::{fmt::{Display, Formatter}, process::Command, str::FromStr};
use std::sync::{RwLock, Once};
use lazy_static::lazy_static;
use std::sync::atomic::{AtomicBool, Ordering};

// Global instances for volume state with lazy initialization
lazy_static! {
    static ref VOLUME_STATE: RwLock<Option<VolumeState>> = RwLock::new(None);
    static ref INIT_ONCE: Once = Once::new();
    static ref IS_INITIALIZED: AtomicBool = AtomicBool::new(false);
}

/// Represents the volume state including level, boost, and mute status.
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
    /// Creates a new VolumeState ensuring level and boost are within valid ranges.
    pub fn new(_level: f64, is_muted: bool) -> Self {
        let level = _level.clamp(0.0, 1.0);
        let boost = (_level - level).clamp(0.0, 0.5);
        Self {
            level,
            boost,
            is_muted,
        }
    }
    
    /// Initializes the global volume state; safe to call multiple times.
    pub fn init() -> &'static RwLock<Option<VolumeState>> {
        // Ensure initialization logic executes only once.
        INIT_ONCE.call_once(|| {
            // Retrieve the current system volume state.
            if let Some(state) = VolumeState::query_system() {
                IS_INITIALIZED.store(true, Ordering::SeqCst);
                utils::logger::info!("VolumeState initialized with: {}", state);
                *VOLUME_STATE.write().unwrap() = Some(state);
            } else {
                utils::logger::error!("Failed to initialize VolumeState from system");
            }
        });
        
        &VOLUME_STATE
    }
    
    /// Checks if the volume state has been initialized.
    pub fn is_initialized() -> bool {
        IS_INITIALIZED.load(Ordering::SeqCst)
    }
    
    /// Retrieves the current volume state, initializing if necessary.
    pub fn get() -> Option<VolumeState> {
        VolumeState::init();
        VOLUME_STATE.read().unwrap().clone()
    }
    
    /// Updates the global volume state with the provided values.
    pub fn sync(level: f64, is_muted: bool) {
        let new_state = VolumeState::new(level, is_muted);
        *VOLUME_STATE.write().unwrap() = Some(new_state);
    }
    
    /// Refreshes the volume state by querying the system and updates the cached state.
    pub fn refresh() -> Option<VolumeState> {
        if let Some(state) = VolumeState::query_system() {
            *VOLUME_STATE.write().unwrap() = Some(state.clone());
            Some(state)
        } else {
            None
        }
    }
    
    /// Queries the system for the current volume state.
    fn query_system() -> Option<VolumeState> {
        let output = Command::new("wpctl")
            .args(["get-volume", "@DEFAULT_AUDIO_SINK@"])
            .output()
            .ok()?;

        let output_str = String::from_utf8_lossy(&output.stdout);
        let muted = output_str.contains("[MUTED]");

        // Extract and parse the volume value from the command output.
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
    
    /// Returns an icon representing the current volume state.
    pub fn get_icon(&self) -> String {
        if self.is_muted {
            "󰖁".to_string()
        } else if self.boost > 0.0 {
            "󰕾".to_string()
        } else {
            // Select icon based on volume level.
            match self.level {
                0.0 => "󰝟".to_string(),
                0.0..=0.3 => "󰕿".to_string(),
                0.3..=0.7 => "󰖀".to_string(),
                _ => "󰕾".to_string(),
            }
        }
    }
}

/// Initializes the volume state.
pub fn init_volume_state() { 
    VolumeState::init();
}

/// Retrieves the current volume state.
pub fn get_volume_state() -> Option<VolumeState> { 
    VolumeState::get()
}

/// Defines possible actions to change the volume.
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

/// Trait for changing the volume state.
pub trait VolumeChange {
    fn change_vol(self) -> Option<VolumeState>;
}

impl VolumeChange for VolumeAction {
    fn change_vol(self) -> Option<VolumeState> {
        // Ensure volume state is initialized.
        VolumeState::init();
        
        // Retrieve the current state; exit if unavailable.
        let current_state = VolumeState::get()?;
        let mut new_level = current_state.level;
        let mut new_boost = current_state.boost;
        let mut is_muted = current_state.is_muted;
        let mut total_volume = new_level + new_boost;
        
        // Determine the new state based on the action.
        match self {
            VolumeAction::VolUp => {
                total_volume = (total_volume + 0.05).min(1.5);
                if total_volume > 1.0 {
                    new_level = 1.0;
                    new_boost = total_volume - 1.0;
                } else {
                    new_level = total_volume;
                    new_boost = 0.0;
                }
            },
            VolumeAction::VolDown => {
                total_volume = (total_volume - 0.05).max(0.0);
                if total_volume > 1.0 {
                    new_level = 1.0;
                    new_boost = total_volume - 1.0;
                } else {
                    new_level = total_volume;
                    new_boost = 0.0;
                }
            },
            VolumeAction::VolMute => {
                is_muted = true;
            },
            VolumeAction::VolUnmute => {
                is_muted = false;
            },
            VolumeAction::VolMuteToggle => {
                is_muted = !is_muted;
            },
        }
        
        // Update volume level via system command for volume adjustments.
        if matches!(self, VolumeAction::VolUp | VolumeAction::VolDown) {
            let percentage = format!("{}%", (total_volume * 100.0) as i32);
            let status = Command::new("wpctl")
                .args(vec!["set-volume", "-l", "1.5", "@DEFAULT_AUDIO_SINK@", &percentage])
                .status()
                .ok();
            
            if status.is_none() {
                utils::logger::error!("Error setting volume level with wpctl");
                return None;
            }
        }
        
        // Update mute state via system command.
        if matches!(self, VolumeAction::VolMute | VolumeAction::VolUnmute | VolumeAction::VolMuteToggle) {
            let mute_arg = match self {
                VolumeAction::VolMute => "1",
                VolumeAction::VolUnmute => "0",
                VolumeAction::VolMuteToggle => "toggle",
                _ => unreachable!(),
            };
            
            let status = Command::new("wpctl")
                .args(vec!["set-mute", "@DEFAULT_AUDIO_SINK@", mute_arg])
                .status()
                .ok();
            
            if status.is_none() {
                utils::logger::error!("Error setting mute state with wpctl");
                return None;
            }
        }
        
        // Construct the new volume state.
        let new_state = VolumeState {
            level: new_level,
            boost: new_boost,
            is_muted,
        };
        
        // Update the cached state.
        *VOLUME_STATE.write().unwrap() = Some(new_state.clone());
        Some(new_state)
    }
}

impl VolumeChange for f64 {
    fn change_vol(self) -> Option<VolumeState> {
        let total_volume = self.clamp(0.0, 1.5);
        let percentage = format!("{}%", (total_volume * 100.0) as i32);
        
        // Retrieve the current mute status.
        let is_muted = VolumeState::get().map_or(false, |s| s.is_muted);
        
        // Execute the system command to update volume.
        let status = Command::new("wpctl")
            .args(vec!["set-volume", "-l", "1.5", "@DEFAULT_AUDIO_SINK@", &percentage])
            .status()
            .ok();

        if status.is_none() {
            utils::logger::error!("Error setting volume level with wpctl");
            return None;
        }
        
        // Calculate the new level and boost values.
        let level;
        let boost;
        
        if total_volume > 1.0 {
            level = 1.0;
            boost = total_volume - 1.0;
        } else {
            level = total_volume;
            boost = 0.0;
        }
        
        // Construct the new volume state.
        let new_state = VolumeState {
            level,
            boost,
            is_muted,
        };
        
        // Update the cached state.
        *VOLUME_STATE.write().unwrap() = Some(new_state.clone());
        Some(new_state)
    }
}

/// Applies a volume change based on the provided argument.
pub fn change_vol<T: VolumeChange>(arg: T) -> Option<VolumeState> {
    arg.change_vol()
}

/* 
   ========================= systray Utilities ========================= 
*/

// Global instances for systray state with lazy initialization
lazy_static! {
    static ref systray_STATE: RwLock<Option<systrayState>> = RwLock::new(None);
    static ref systray_INIT_ONCE: Once = Once::new();
    static ref systray_IS_INITIALIZED: AtomicBool = AtomicBool::new(false);
}

/// Defines possible systray actions.
#[derive(Debug, PartialEq, Eq)]
pub enum systrayAction {
    BrightUp,
    BrightDown,
    BrightToggle,
}

impl FromStr for systrayAction {
    type Err = String;

    fn from_str(s: &str) -> core::result::Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "brightup" | "bright-up" => Ok(systrayAction::BrightUp),
            "brightdown" | "bright-down" => Ok(systrayAction::BrightDown),
            "brighttoggle" | "bright-toggle" => Ok(systrayAction::BrightToggle),
            _ => Err(format!("Invalid systray action: {}", s)),
        }
    }
}

/// Represents the systray state.
#[derive(Debug, Clone, PartialEq)]
pub struct systrayState {
    pub level: f64, // Value between 0.0 and 1.0
}

impl Display for systrayState {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        write!(f, "systray :: {:.2}", self.level)
    }
}

impl systrayState {
    /// Creates a new systrayState ensuring the level is within valid bounds.
    fn new(level: f64) -> Self {
        Self {
            level: level.clamp(0.05, 1.0), // Minimum systray of 5%
        }
    }
    
    /// Initializes the global systray state; safe to call multiple times.
    pub fn init() -> &'static RwLock<Option<systrayState>> {
        // Ensure initialization logic executes only once.
        systray_INIT_ONCE.call_once(|| {
            // Retrieve the current system systray state.
            if let Some(state) = systrayState::query_system() {
                systray_IS_INITIALIZED.store(true, Ordering::SeqCst);
                utils::logger::info!("systrayState initialized with: {}", state);
                *systray_STATE.write().unwrap() = Some(state);
            } else {
                utils::logger::error!("Failed to initialize systrayState from system");
            }
        });
        
        &systray_STATE
    }
    
    /// Checks if the systray state has been initialized.
    pub fn is_initialized() -> bool {
        systray_IS_INITIALIZED.load(Ordering::SeqCst)
    }
    
    /// Retrieves the current systray state, initializing if necessary.
    pub fn get() -> Option<systrayState> {
        systrayState::init();
        systray_STATE.read().unwrap().clone()
    }
    
    /// Updates the global systray state with the provided level.
    pub fn sync(level: f64) {
        let new_state = systrayState::new(level);
        *systray_STATE.write().unwrap() = Some(new_state);
    }
    
    /// Refreshes the systray state by querying the system and updates the cached state.
    pub fn refresh() -> Option<systrayState> {
        if let Some(state) = systrayState::query_system() {
            *systray_STATE.write().unwrap() = Some(state.clone());
            Some(state)
        } else {
            None
        }
    }
    
    /// Queries the system for the current systray state.
    fn query_system() -> Option<systrayState> {
        let output = Command::new("systrayctl")
            .args(["info"])
            .output()
            .ok()?;

        let output_str = String::from_utf8_lossy(&output.stdout);
        
        // Parse the systray percentage from the command output.
        for line in output_str.lines() {
            if line.contains("Current systray:") && line.contains("%") {
                if let Some(percent_str) = line.split('(').nth(1) {
                    if let Some(percent_end) = percent_str.find('%') {
                        if let Ok(percent) = percent_str[..percent_end].parse::<f64>() {
                            return Some(systrayState::new(percent / 100.0));
                        }
                    }
                }
            }
        }

        None
    }
    
    /// Returns an icon representing the current systray level.
    pub fn get_icon(&self) -> String {
        match self.level {
            0.0..=0.25 => "󰃞".to_string(),
            0.25..=0.5 => "󰃟".to_string(),
            0.5..=0.75 => "󰃝".to_string(),
            _ => "󰃠".to_string(),
        }
    }
}

/// Retrieves the current systray state.
pub fn get_systray_state() -> Option<systrayState> { 
    systrayState::get()
}

/// Trait for changing the systray state.
pub trait systrayChange {
    fn change_systray(self) -> Option<systrayState>;
}

impl systrayChange for systrayAction {
    fn change_systray(self) -> Option<systrayState> {
        // Ensure systray state is initialized.
        systrayState::init();
        
        // Retrieve the current systray state; exit if unavailable.
        let current_state = systrayState::get()?;
        let mut new_level = current_state.level;
        
        // Determine the new systray level based on the action.
        match self {
            systrayAction::BrightUp => {
                new_level = (new_level + 0.05).min(1.0);
            },
            systrayAction::BrightDown => {
                new_level = (new_level - 0.05).max(0.05); // Enforce minimum systray of 5%
            },
            systrayAction::BrightToggle => {
                // Toggle between minimum (5%) and maximum (100%) systray.
                if new_level > 0.05 {
                    new_level = 0.05;
                } else {
                    new_level = 1.0;
                }
            },
        }
        
        // Update systray via system command.
        let percentage = format!("{}%", (new_level * 100.0) as i32);
        let status = Command::new("systrayctl")
            .args(vec!["set", &percentage])
            .status()
            .ok();
        
        if status.is_none() {
            utils::logger::error!("Error setting systray level with systrayctl");
            return None;
        }
        
        // Construct the new systray state.
        let new_state = systrayState {
            level: new_level,
        };
        
        // Update the cached state.
        *systray_STATE.write().unwrap() = Some(new_state.clone());
        Some(new_state)
    }
}

impl systrayChange for f64 {
    fn change_systray(self) -> Option<systrayState> {
        // Ensure systray state is initialized.
        systrayState::init();
        
        // Clamp the systray level to valid values (5% to 100%).
        let level = self.clamp(0.05, 1.0);
        let percentage = format!("{}%", (level * 100.0) as i32);
        
        // Execute the system command to update systray.
        let status = Command::new("systrayctl")
            .args(vec!["set", &percentage])
            .status()
            .ok();

        if status.is_none() {
            utils::logger::error!("Error setting systray level with systrayctl");
            return None;
        }
        
        // Construct the new systray state.
        let new_state = systrayState {
            level,
        };
        
        // Update the cached state.
        *systray_STATE.write().unwrap() = Some(new_state.clone());
        Some(new_state)
    }
}

/// Applies a systray change based on the provided argument.
pub fn change_systray<T: systrayChange>(arg: T) -> Option<systrayState> {
    arg.change_systray()
}
