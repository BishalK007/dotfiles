use std::io::{self, Read, Write};
use std::process::Stdio;
use std::sync::{Arc, Mutex};
use std::thread;
use std::{env, str::FromStr, vec};
use std::{
    fs::{self, File},
    io::{BufRead, BufReader},
    os::unix::net::UnixListener,
    path::Path,
    process::{Child, Command},
};

use nix::sys::signal::{kill, Signal};
use nix::unistd::Pid;

use lazy_static::lazy_static;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};

#[derive(PartialEq, Clone, Copy)]
pub enum CaptureAction {
    PhotoJPEG,
    PhotoPNG,
    VideoMP4,
    VideoMKV,
    PhotoGIF,
    RecSTOP, // Stops recording (fixed comment capitalization)
}

impl FromStr for CaptureAction {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "photo_jpeg" | "photojpeg" | "photo-jpeg" => Ok(CaptureAction::PhotoJPEG),
            "photo_jpg" | "photojpg" | "photo-jpg" => Ok(CaptureAction::PhotoJPEG),
            "photo_png" | "photopng" | "photo-png" => Ok(CaptureAction::PhotoPNG),
            "video_mp4" | "videomp4" | "video-mp4" => Ok(CaptureAction::VideoMP4),
            "video_mkv" | "videomkv" | "video-mkv" => Ok(CaptureAction::VideoMKV),
            "photo_gif" | "photogif" | "photo-gif" => Ok(CaptureAction::PhotoGIF),
            "rec_stop" | "recstop" | "rec-stop" => Ok(CaptureAction::RecSTOP),
            _ => Err(format!("Invalid capture action: {}", s)), // Fixed error message
        }
    }
}

#[derive(PartialEq, Clone, Copy)]
pub enum CaptureCanvas {
    Fullscreen,
    Slurp,
}

impl FromStr for CaptureCanvas {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "fullscreen" => Ok(CaptureCanvas::Fullscreen),
            "slurp" => Ok(CaptureCanvas::Slurp),
            "region" => Ok(CaptureCanvas::Slurp),
            _ => Err(format!("Invalid canvas type: {}", s)), // Fixed error message
        }
    }
}

fn get_slurp_output() -> String {
    Command::new("slurp")
        .output()
        .and_then(|output| {
            if output.status.success() {
                String::from_utf8(output.stdout)
                    .map(|s| s.trim_end().to_string())
                    .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))
            } else {
                Err(std::io::Error::new(
                    std::io::ErrorKind::Other,
                    "Non-zero exit status",
                ))
            }
        })
        .unwrap_or_else(|_| String::from("0,0 100x100"))
}

fn copy_file_to_clipboard(file_path: &str) -> io::Result<()> {
    let mut file = File::open(file_path)?;
    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer)?;

    let mut child = Command::new("wl-copy")
        .arg("--type")
        .arg("image/png")
        .stdin(Stdio::piped())
        .spawn()?;

    if let Some(mut stdin) = child.stdin.take() {
        stdin.write_all(&buffer)?;
    }

    let status = child.wait()?;
    if status.success() {
        Ok(())
    } else {
        Err(io::Error::new(
            io::ErrorKind::Other,
            format!("wl-copy exited with status: {}", status),
        ))
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

fn handle_capture(
    action: CaptureAction,
    canvas: CaptureCanvas,
    wl_copy: bool,
    open_edit: bool,
    screenshot_location: &str,
    file_id: &str,
    close_popup_first: bool,
) {
    println!("Capture initiated");
    let curr_time = Instant::now();
    
    if close_popup_first {
        let mut socket = std::os::unix::net::UnixStream::connect("/tmp/eww_main_socket.sock")
            .expect("Failed to connect to socket for popup toggle");
        socket
            .write_all(b"capture:widget:close\n")
            .expect("Failed to toggle popup");
    }

    if action != CaptureAction::PhotoJPEG && action != CaptureAction::PhotoPNG {
        return;
    }

    let mut command_args = vec!["grim".to_string()];
    if canvas == CaptureCanvas::Slurp {
        command_args.push("-g".to_string());
        command_args.push(get_slurp_output());
    }

    let capture_format = match action {
        CaptureAction::PhotoJPEG => "jpeg",
        _ => "png",
    };

    let file_path = format!(
        "{}/screenshot_{}.{}",
        screenshot_location, file_id, capture_format
    );

    command_args.push("-t".to_string());
    command_args.push(capture_format.to_string());
    command_args.push(file_path.clone());

    // Wait for animation (except when using region selection)
    if close_popup_first && canvas != CaptureCanvas::Slurp {
        thread::sleep(Duration::from_millis(1100) - curr_time.elapsed());
    }

    let _ = Command::new(&command_args[0])
        .args(&command_args[1..])
        .output()
        .expect("Failed to execute capture command");

    if wl_copy {
        let _ = copy_file_to_clipboard(&file_path);
    }
    if open_edit {
        let _ = Command::new("pinta")
            .arg(&file_path)
            .output()
            .expect("Failed to open image editor");
    }
}

fn handle_recording_start(
    action: CaptureAction,  // Fixed parameter name
    canvas: CaptureCanvas,  // Fixed parameter name
    screencast_location: &str,
    file_id: &str,
    close_popup_first: bool,
    start_time: Arc<Mutex<Instant>>,
) -> Result<Child, std::io::Error> {
    if action != CaptureAction::VideoMKV && action != CaptureAction::VideoMP4 {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            "Invalid capture action for recording",
        ));
    }

    let curr_time = Instant::now();
    if close_popup_first {
        let mut socket = std::os::unix::net::UnixStream::connect("/tmp/eww_main_socket.sock")
            .expect("Failed to connect to socket for popup toggle");
        socket
            .write_all(b"capture:widget:close\n")
            .expect("Failed to toggle popup");
    }

    let vid_extension = if action == CaptureAction::VideoMKV {
        "mkv"
    } else {
        "mp4"
    };

    let encoder = env::var("CAPTURE_WIDGET_VIDEO_ENCODER").map_err(|_| {
        std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "CAPTURE_WIDGET_VIDEO_ENCODER must be set",
        )
    })?;

    let mut command_args = vec![
        "wf-recorder".to_string(),
        "-c".to_string(),
        encoder,
        "-p".to_string(),
        "preset=medium".to_string(),
    ];

    if canvas == CaptureCanvas::Slurp {
        command_args.push("-g".to_string());
        command_args.push(get_slurp_output());
    }

    command_args.push("-f".to_string());
    command_args.push(format!(
        "{}/screencast_{}.{}",
        screencast_location, file_id, vid_extension
    ));

    // Wait for animation (except when using region selection)
    if close_popup_first && canvas != CaptureCanvas::Slurp {
        thread::sleep(Duration::from_millis(1100) - curr_time.elapsed());
    }

    *start_time.lock().unwrap() = Instant::now();
    Command::new(&command_args[0])
        .args(&command_args[1..])
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
}

lazy_static! {
    static ref STOP_FLAG: Mutex<Option<Arc<AtomicBool>>> = Mutex::new(None);
}

fn eww_updater_thread(
    action: &str,  // Fixed parameter name
    eww_config_loc: &str,
    start_time: Arc<Mutex<Instant>>,
) -> bool {
    //UGLY BUT FOR FUTURE USE MAYBE SO LETS KEEP IT SHALL WE??
    //UGLY let capture_dropdown_rel_loc = std::env::var("CAPTURE_DROPDOWN_WIDGET_RELATIVE_LOCATION")
    //UGLY     .unwrap_or_else(|_| String::from("/capture/capture-dropdown"));
    //UGLY let eww_capture_dropdown_real_loc =
    //UGLY     Arc::new(format!("{}{}", _eww_config_loc, capture_dropdown_rel_loc));
    //UGLY let loc_clone = Arc::clone(&eww_capture_dropdown_real_loc);

    match action {
        "start" => {
            let stop_flag = Arc::new(AtomicBool::new(false));
            let stop_flag_clone = Arc::clone(&stop_flag);
            *STOP_FLAG.lock().unwrap() = Some(stop_flag);

            let config_loc = eww_config_loc.to_string();
            let config_loc_clone = config_loc.clone();

            thread::spawn(move || {
                while !stop_flag_clone.load(Ordering::Relaxed) {
                    let duration = start_time.lock().unwrap().elapsed().as_secs();
                    let formatted_time = format_time(duration);

                    let _ = Command::new("eww")
                        .arg("update")
                        .arg(format!("stop_icon_with_duration= {}", formatted_time))
                        .arg("-c")
                        .arg(&config_loc)
                        .output();

                    thread::sleep(Duration::from_secs(1));
                }
            });

            let _ = Command::new("eww")
                .arg("update")
                .arg("show_stop_button=true")
                .arg("-c")
                .arg(config_loc_clone)
                .output();

            true
        }

        "stop" => {
            if let Some(flag) = STOP_FLAG.lock().unwrap().as_ref() {
                flag.store(true, Ordering::Relaxed);
            }
            *STOP_FLAG.lock().unwrap() = None;

            let _ = Command::new("eww")
                .arg("update")
                .arg("show_stop_button=false")
                .arg("-c")
                .arg(eww_config_loc)
                .output();

            let _ = Command::new("eww")
                .arg("update")
                .arg("stop_icon_with_duration= 0s")
                .arg("-c")
                .arg(eww_config_loc)
                .output();

            false
        }

        _ => {
            eprintln!("Invalid action: must be 'start' or 'stop'");
            false
        }
    }
}

fn convert_mp4_to_gif(
    screencast_loc: &str,
    file_id: &str,
    screenshot_loc: &str,
    fps: i32,
    scale: i32,
    palette_gen: bool,
    scaling_algorithm: &str,
    fixed_width_scaling: bool,
) {
    let mut command_args = vec!["ffmpeg".to_string()];
    let video_path = format!("{}/screencast_{}.mp4", screencast_loc, file_id);
    let gif_path = format!("{}/screencast_{}.gif", screenshot_loc, file_id);

    // Configure scaling algorithm
    let scale_filter = match scaling_algorithm {
        "bilinear" | "bicubic" | "nearest" => scaling_algorithm,
        _ => "lanczos",
    };

    command_args.extend(["-i".to_string(), video_path.clone()]);

    let mut filter_components = Vec::new();
    
    // FPS configuration
    if fps > 0 && fps <= 60 {
        filter_components.push(format!("fps={}", fps));
    } else {
        println!("FPS for GIF must be between 1 and 60");
    }

    // Scaling configuration
    if scale > 0 && scale <= 800 {
        let scale_param = if fixed_width_scaling {
            format!("scale={}:-1:flags={}", scale, scale_filter)
        } else {
            format!("scale=-1:{}:flags={}", scale, scale_filter)
        };
        filter_components.push(scale_param);
    } else {
        println!("Scale value must be between 1 and 800");
    }

    // Palette generation
    if palette_gen {
        filter_components.push("split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse".to_string());
    }

    if !filter_components.is_empty() {
        command_args.extend(["-vf".to_string(), filter_components.join(",")]);
    }

    command_args.push(gif_path.clone());

    let output = Command::new(&command_args[0])
        .args(&command_args[1..])
        .output()
        .expect("Failed to execute FFmpeg conversion");

    if !output.status.success() {
        eprintln!(
            "GIF conversion failed: {}",
            String::from_utf8_lossy(&output.stderr)
        );
    }
}

fn start_rec_thread(
    action: CaptureAction,
    canvas: CaptureCanvas,
    _wl_copy: bool,
    _open_edit: bool,
    screencast_loc: &str,
    screenshot_loc: &str,
    file_id: &str,
    eww_config_loc: &str,
    close_popup_first: bool,
) {
    if !matches!(
        action,
        CaptureAction::VideoMKV | CaptureAction::VideoMP4 | CaptureAction::PhotoGIF | CaptureAction::RecSTOP
    ) {
        return;
    }

    let socket_path = Path::new("/tmp/eww_capture.sock");
    if socket_path.exists() {
        fs::remove_file(socket_path).expect("Failed to clean up existing socket");
    }

    let listener = UnixListener::bind(socket_path).expect("Failed to create socket listener");
    let mut recorder: Option<Child> = None;
    let mut updater_active = false;

    let screencast_loc = screencast_loc.to_string();
    let screenshot_loc = screenshot_loc.to_string();
    let eww_config = eww_config_loc.to_string();
    let file_id = file_id.to_string();

    thread::spawn(move || {
        for stream in listener.incoming() {
            match stream {
                Ok(stream) => {
                    let mut reader = BufReader::new(stream);
                    let mut command = String::new();
                    
                    if reader.read_line(&mut command).is_ok() {
                        match command.trim() {
                            "start" => {
                                let start_time = Arc::new(Mutex::new(Instant::now()));
                                let start_time_clone = Arc::clone(&start_time);

                                let recording_action = match action {
                                    CaptureAction::PhotoGIF => CaptureAction::VideoMP4,
                                    _ => action,
                                };

                                if recorder.is_none() {
                                    match handle_recording_start(
                                        recording_action,
                                        canvas,
                                        &screencast_loc,
                                        &file_id,
                                        close_popup_first,
                                        start_time,
                                    ) {
                                        Ok(child) => recorder = Some(child),
                                        Err(e) => eprintln!("Recording start failed: {}", e),
                                    }
                                }

                                if !updater_active {
                                    updater_active = eww_updater_thread(
                                        "start",
                                        &eww_config,
                                        start_time_clone,
                                    );
                                }
                            }
                            "stop" => {
                                if let Some(mut process) = recorder.take() {
                                    let pid = process.id() as i32;
                                    kill(Pid::from_raw(pid), Signal::SIGINT)
                                        .expect("Failed to terminate recorder");
                                    process.wait().expect("Failed to wait for process");
                                }

                                if updater_active {
                                    updater_active = eww_updater_thread(
                                        "stop",
                                        &eww_config,
                                        Arc::new(Mutex::new(Instant::now())),
                                    );
                                }

                                // Handle GIF conversion for PhotoGIF action
                                if action == CaptureAction::PhotoGIF {
                                    // UGLY: Temporary UI updates during conversion
                                    // UGLY: Would be better to have proper state management
                                    let _ = Command::new("eww")
                                        .args(["update", "show_stop_button=true", "-c", &eww_config])
                                        .output();

                                    let _ = Command::new("eww")
                                        .args(["update", "stop_icon_with_duration=...", "-c", &eww_config])
                                        .output();

                                    convert_mp4_to_gif(
                                        &screencast_loc,
                                        &file_id,
                                        &screenshot_loc,
                                        10,
                                        800,
                                        true,
                                        "lanczos",
                                        false,
                                    );

                                    let _ = Command::new("eww")
                                        .args(["update", "show_stop_button=false", "-c", &eww_config])
                                        .output();
                                }
                            }
                            _ => eprintln!("Received unknown command"),
                        }
                    }
                }
                Err(e) => eprintln!("Socket error: {}", e),
            }
        }
    });
}

pub fn capture(
    action: CaptureAction,
    canvas: CaptureCanvas,
    wl_copy: bool,
    open_edit: bool,
    eww_config_loc: &str,
) {
    let home_dir = env::var("HOME")
        .unwrap_or_else(|_| "/srv/media".to_string());

    let screenshot_location = format!("{}/Pictures/Screenshots", home_dir);
    let screencast_location = format!("{}/Videos/Screencasts", home_dir);
    let file_id = chrono::Local::now().format("%F_%H-%M-%S").to_string();

    match action {
        CaptureAction::PhotoJPEG | CaptureAction::PhotoPNG => handle_capture(
            action,
            canvas,
            wl_copy,
            open_edit,
            &screenshot_location,
            &file_id,
            true,
        ),
        CaptureAction::VideoMP4 | CaptureAction::VideoMKV | CaptureAction::PhotoGIF => {
            start_rec_thread(
                action,
                canvas,
                wl_copy,
                open_edit,
                &screencast_location,
                &screenshot_location,
                &file_id,
                eww_config_loc,
                true,
            );

            let mut socket = std::os::unix::net::UnixStream::connect("/tmp/eww_capture.sock")
                .expect("Socket connection failed");
            socket.write_all(b"start\n").expect("Start command failed");
        }
        CaptureAction::RecSTOP => {
            let mut socket = std::os::unix::net::UnixStream::connect("/tmp/eww_capture.sock")
                .expect("Socket connection failed");
            socket.write_all(b"stop\n").expect("Stop command failed");
        }
    }
}