use std::{env, str::FromStr, vec};

#[derive(PartialEq)]
pub enum CaptureAction {
    PhotoJPEG,
    PhotoPNG,
    VideoMP4,
    VideoMOV,
    PhotoGIF,
    RecSTOP, //Stops recording
}

impl FromStr for CaptureAction {
    type Err = String; // Custom error type for invalid strings

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "photo_jpeg" | "photojpeg" | "photo-jpeg" => Ok(CaptureAction::PhotoJPEG),
            "photo_png"| "photopng" | "photo-png" => Ok(CaptureAction::PhotoPNG),
            "video_mp4"| "videomp4" | "video-mp4" => Ok(CaptureAction::VideoMP4),
            "video_mov"| "videomov" | "video-mov" => Ok(CaptureAction::VideoMOV),
            "photo_gif"| "photogif" | "photo-gif" => Ok(CaptureAction::PhotoGIF),
            "rec_stop"| "recstop" | "rec-stop" => Ok(CaptureAction::RecSTOP),
            _ => Err(format!("Invalid widget state: {}", s)),
        }
    }
}
#[derive(PartialEq)]
pub enum CaptureCanvas {
    Fullscreen,
    Slurp,
}

impl FromStr for CaptureCanvas {
    type Err = String; // Custom error type for invalid strings

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "fullscreen" => Ok(CaptureCanvas::Fullscreen),
            "slurp" => Ok(CaptureCanvas::Slurp),
            "region" => Ok(CaptureCanvas::Slurp),
            _ => Err(format!("Invalid widget state: {}", s)),
        }
    }
}

pub fn format_time(total_seconds: u64) -> String {
    let days = total_seconds / 86400;
    let hours = (total_seconds % 86400) / 3600;
    let minutes = (total_seconds % 3600) / 60;
    let seconds = total_seconds % 60;
    let mut formatted_time = String::new();

    if days > 0 {
        formatted_time.push_str(&format!("{}d:", days));
    }

    if hours > 0 || days > 0 {
        formatted_time.push_str(&format!("{:02}h:", hours));
    }

    if minutes > 0 || hours > 0 || days > 0 {
        formatted_time.push_str(&format!("{:02}m:", minutes));
    }

    formatted_time.push_str(&format!("{:02}s", seconds));

    formatted_time
}


pub fn capture_helper(
    action: CaptureAction,
    canvas: CaptureCanvas,
    wl_copy: bool,
    open_edit: bool,
    eww_config_loc: &str,
) {
    let home = env::var("HOME").unwrap_or_else(|_| String::from("/srv/media"));
    // Set file locations
    let screenshot_location = format!("{:?}/Pictures/Screenshots", home);

    let file_id = chrono::Local::now().format("%F_%H-%M-%S").to_string();

    match action {
        CaptureAction::PhotoJPEG => {
            let mut command_args: Vec<&str> = vec!["grim"];
            if canvas == CaptureCanvas::Slurp {
                command_args.push("-g");
                command_args.push("\"$(slurp)\"");
            }
            // -t png \"$file\"
            command_args.push(format!("-t jpg {}/{}.jpg", screenshot_location, file_id).as_str());
        }
        CaptureAction::PhotoPNG => {
            let mut command_args: Vec<&str> = vec!["grim"];
            if canvas == CaptureCanvas::Slurp {
                command_args.push("-g");
                command_args.push("\"$(slurp)\"");
            }
            // -t png \"$file\"
            command_args.push(format!("-t png {}/{}.png", screenshot_location, file_id).as_str());
        }
        CaptureAction::VideoMP4 => {}
        CaptureAction::VideoMOV => {}
        CaptureAction::PhotoGIF => {}
        CaptureAction::RecSTOP => {}
    }
}
