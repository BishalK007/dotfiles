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
    RecSTOP, //Stops recording
}

impl FromStr for CaptureAction {
    type Err = String; // Custom error type for invalid strings

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "photo_jpeg" | "photojpeg" | "photo-jpeg" => Ok(CaptureAction::PhotoJPEG),
            "photo_jpg" | "photojpg" | "photo-jpg" => Ok(CaptureAction::PhotoJPEG),
            "photo_png" | "photopng" | "photo-png" => Ok(CaptureAction::PhotoPNG),
            "video_mp4" | "videomp4" | "video-mp4" => Ok(CaptureAction::VideoMP4),
            "video_mkv" | "videomkv" | "video-mkv" => Ok(CaptureAction::VideoMKV),
            "photo_gif" | "photogif" | "photo-gif" => Ok(CaptureAction::PhotoGIF),
            "rec_stop" | "recstop" | "rec-stop" => Ok(CaptureAction::RecSTOP),
            _ => Err(format!("Invalid widget state: {}", s)),
        }
    }
}
#[derive(PartialEq, Clone, Copy)]
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
    // Read the entire screenshot file into memory
    let mut file = File::open(file_path)?;
    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer)?;

    // Start wl-copy with MIME type image/png
    let mut child = Command::new("wl-copy")
        .arg("--type")
        .arg("image/png")
        .stdin(Stdio::piped())
        .spawn()?;

    // Write the screenshot data to wl-copy's stdin
    if let Some(mut stdin) = child.stdin.take() {
        stdin.write_all(&buffer)?;
    }

    // Wait for wl-copy to finish
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
    println!("Hit Happened");
    let curr_time = Instant::now();
    // close the popup before taking the screenshot ans wait just before cmd start below ↓
    if close_popup_first {
        let mut socket = std::os::unix::net::UnixStream::connect("/tmp/eww_main_socket.sock")
            .expect("Failed to connect to socket for toggle_popup_first");
        socket
            .write_all(b"capture:widget:close\n")
            .expect("Failed to toggle_popup_first");
    }

    if action != CaptureAction::PhotoJPEG && action != CaptureAction::PhotoPNG {
        return;
    }
    let mut command_args: Vec<String> = vec!["grim".to_string()];
    if canvas == CaptureCanvas::Slurp {
        command_args.push("-g".to_string());
        command_args.push(get_slurp_output());
    }

    let capture_format = if action == CaptureAction::PhotoJPEG {
        "jpeg"
    } else {
        "png"
    };

    let file_path = format!(
        "{}/screenshot_{}.{}",
        screenshot_location, file_id, capture_format
    );
    println!("jpg path {}", file_path);

    command_args.push("-t".to_string());
    command_args.push(capture_format.to_string());
    command_args.push(file_path.to_string());

    println!("cmd :: {:?}", command_args);

    // wait a bit(for animation)
    // dont wait in slurp coz there user selects a screen-geometry so takes time anyway
    if close_popup_first && canvas != CaptureCanvas::Slurp {
        thread::sleep(Duration::from_millis(1100) - curr_time.elapsed());
    }

    let _ = std::process::Command::new(command_args[0].clone())
        .args(&command_args[1..])
        .output()
        .expect("Failed to execute command");

    if wl_copy {
        let _ = copy_file_to_clipboard(&file_path);
    }
    if open_edit {
        let _ = std::process::Command::new("pinta")
            .arg(&file_path)
            .output()
            .expect("Failed to open edit");
    }
}

fn handle_recording_start(
    _action: CaptureAction,
    _canvas: CaptureCanvas,
    screencast_location: &str,
    file_id: &str,
    close_popup_first: bool,
    start_time: Arc<Mutex<Instant>>,
) -> Result<std::process::Child, std::io::Error> {
    if _action != CaptureAction::VideoMKV && _action != CaptureAction::VideoMP4 {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            "Invalid capture action for recording",
        ));
    }
    let curr_time = Instant::now();
    // close the popup before taking the screenshot ans wait just before cmd start below ↓
    if close_popup_first {
        let mut socket = std::os::unix::net::UnixStream::connect("/tmp/eww_main_socket.sock")
            .expect("Failed to connect to socket for toggle_popup_first");
        socket
            .write_all(b"capture:widget:close\n")
            .expect("Failed to toggle_popup_first");
    }

    let vid_extention;
    if _action == CaptureAction::VideoMKV {
        vid_extention = "mkv";
    } else {
        vid_extention = "mp4";
    }
    let encoder = std::env::var("CAPTURE_WIDGET_VIDEO_ENCODER").map_err(|_| {
        std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "CAPTURE_WIDGET_VIDEO_ENCODER must be set",
        )
    })?;

    let mut command_args: Vec<String> = vec!["wf-recorder".to_string()];
    command_args.push("-c".to_string());
    command_args.push(encoder.to_string());
    command_args.push("-p".to_string());
    command_args.push("preset=medium".to_string());

    if _canvas == CaptureCanvas::Slurp {
        command_args.push("-g".to_string());
        command_args.push(get_slurp_output());
    }

    command_args.push("-f".to_string());
    command_args.push(format!(
        "{}/screencast_{}.{}",
        screencast_location, file_id, vid_extention
    ));
    command_args.push("-c".to_string());

    // wait a bit(for animation)
    // dont wait in slurp coz there user selects a screen-geometry so takes time anyway
    if close_popup_first && _canvas != CaptureCanvas::Slurp {
        thread::sleep(Duration::from_millis(1100) - curr_time.elapsed());
    }
    // for eww_updater_thread to start proper timer
    *start_time.lock().unwrap() = std::time::Instant::now();
    Command::new(command_args[0].clone())
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
    _action: &str,
    eww_config_loc: &str,
    start_time: Arc<Mutex<Instant>>,
) -> bool {
    //UGLY BUT FOR FUTURE USE MAYBE SO LETS KEEP IT SHALL WE??
    // let capture_dropdown_rel_loc = std::env::var("CAPTURE_DROPDOWN_WIDGET_RELATIVE_LOCATION")
    //     .unwrap_or_else(|_| String::from("/capture/capture-dropdown"));

    // let eww_capture_dropdown_real_loc =
    //     Arc::new(format!("{}{}", _eww_config_loc, capture_dropdown_rel_loc));
    // let loc_clone = Arc::clone(&eww_capture_dropdown_real_loc);

    match _action {
        "start" => {
            // Create a new stop flag for this thread
            let stop_flag = Arc::new(AtomicBool::new(false));
            let stop_flag_clone = Arc::clone(&stop_flag);

            // Store the flag in the global Mutex so we can access it in "stop"
            *STOP_FLAG.lock().unwrap() = Some(stop_flag);

            println!("Dropdown Loc :: {}", eww_config_loc);

            let eww_config_loc_cpy_one = eww_config_loc.to_string();
            let eww_config_loc_cpy_two = eww_config_loc.to_string();

            // Spawn the background thread
            thread::spawn(move || {
                loop {
                    // Check if we should stop
                    if stop_flag_clone.load(Ordering::Relaxed) {
                        println!("Stop flag set, ending thread loop.");
                        break;
                    }
                    let time = start_time.lock().unwrap();
                    let duration = time.elapsed().as_secs();
                    let formatted_time = format_time(duration);
                    println!("elapsed time :: {}", formatted_time);

                    // Update eww widget every second with new time
                    let _ = Command::new("eww")
                        .arg("update")
                        .arg(format!("stop_icon_with_duration= {}", formatted_time))
                        .arg("-c")
                        .arg(&eww_config_loc_cpy_one)
                        .output();

                    thread::sleep(Duration::from_secs(1));
                }
            });
            // For illustration, show a button or indicator
            let _ = Command::new("eww")
                .arg("update")
                .arg("show_stop_button=true")
                .arg("-c")
                .arg(&eww_config_loc_cpy_two)
                .output();

            return true;
        }

        "stop" => {
            // Signal the thread to stop by setting the atomic boolean
            if let Some(flag) = STOP_FLAG.lock().unwrap().as_ref() {
                flag.store(true, Ordering::Relaxed);
            }

            // Clear out our global reference (optional, but prevents reuse)
            *STOP_FLAG.lock().unwrap() = None;

            // Optionally hide or reset any eww widgets
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

            println!("Stop command processed; thread will exit on next loop check.");

            return false;
        }

        _ => {
            println!("Provide a proper action: 'start' or 'stop'.");
            return false;
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
    scaling_algo: &str, 
    is_scale_fixed_on_width: bool,
) {
    let mut command_args: Vec<String> = vec!["ffmpeg".to_string()];

    let vid_file = format!("{}/screencast_{}.mp4", screencast_loc, file_id);
    let gif_file = format!("{}/screencast_{}.gif", screenshot_loc, file_id);

    // Determine scaling algo : 
    let s_algo;
    if scaling_algo == "bilinear" || scaling_algo == "bicubic" || scaling_algo == "nearest" {
        s_algo = format!("flags={}", scaling_algo);
    } else {
        s_algo = format!("flags={}", "lanczos");
    }
    command_args.push("-i".to_string());
    command_args.push(vid_file);

    // Build the filter chain
    let mut filter_components = Vec::new();

    // Handle FPS filter
    if fps > 0 && fps <= 60 {
        filter_components.push(format!("fps={}", fps));
    } else {
        println!(" FPS for gif must be > 0 and <= 60")
    }
    
    if scale > 0 && scale <= 800 {
        if is_scale_fixed_on_width {
            filter_components.push(format!("scale=-1:{}:{}", scale, s_algo));
        } else {
            filter_components.push(format!("scale={}:-1:{}", scale, s_algo));
        }
    } else {
        println!(" scale for gif must be > 0 and <= 800")
    }

    // Handle palette generation if requested
    if palette_gen {
        filter_components.push("split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse".to_string());
    }

    // Assemble the full filtergraph
    if !filter_components.is_empty() {
        command_args.push("-vf".to_string());
        command_args.push(filter_components.join(","));
    }

    // Add output files
    command_args.push(gif_file);

    // Execute FFmpeg command
    let output = std::process::Command::new(&command_args[0])
        .args(&command_args[1..])
        .output()
        .expect("Failed to execute FFmpeg command");

    // Check for errors
    if !output.status.success() {
        eprintln!(
            "FFmpeg conversion failed with error: {}",
            String::from_utf8_lossy(&output.stderr)
        );
    }
}

fn start_rec_thread(
    action: CaptureAction,
    canvas: CaptureCanvas,
    _wl_copy: bool,
    _open_edit: bool,
    screencast_location: &str,
    screenshot_location: &str,
    file_id: &str,
    eww_config_loc: &str,
    close_popup_first: bool,
) {
    if action != CaptureAction::VideoMKV
        && action != CaptureAction::VideoMP4
        && action != CaptureAction::RecSTOP
        && action != CaptureAction::PhotoGIF
    {
        return;
    }
    let socket_path = Path::new("/tmp/eww_capture.sock");
    if socket_path.exists() {
        fs::remove_file(socket_path).expect("Failed to remove existing socket");
    }

    let listener = UnixListener::bind(socket_path).expect("Failed to bind to socket");
    let mut recorder: Option<Child> = None;
    let mut is_eww_updater_running: bool = false;

    let screencast_loc = screencast_location.to_string();
    let screenshot_loc = screenshot_location.to_string();
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
                                // let start_time = std::time::Instant::now();
                                let start_time = Arc::new(Mutex::new(std::time::Instant::now()));
                                let start_time_clone = Arc::clone(&start_time);

                                // when startting it either can be videomkv or videomp4(defaults)
                                let mut action = action;
                                if action != CaptureAction::VideoMKV {
                                    action = CaptureAction::VideoMP4
                                }
                                if recorder.is_none() {
                                    match handle_recording_start(
                                        action,
                                        canvas,
                                        &screencast_loc,
                                        &file_id,
                                        close_popup_first,
                                        start_time,
                                    ) {
                                        Ok(child) => recorder = Some(child),
                                        Err(e) => eprintln!("Failed to start recording: {}", e),
                                    };
                                }
                                println!("HI {}", is_eww_updater_running);
                                if !is_eww_updater_running {
                                    println!("HI2");
                                    is_eww_updater_running =
                                        eww_updater_thread("start", &eww_config, start_time_clone);
                                    println!("HI3 {}", is_eww_updater_running);
                                }
                            }
                            "stop" => {
                                if let Some(mut proc) = recorder.take() {
                                    let pid = proc.id() as i32;
                                    println!("Sending SIGINT to wf-recorder (pid: {})", pid);
                                    kill(Pid::from_raw(pid), Signal::SIGINT)
                                        .expect("Failed to send SIGINT");
                                    proc.wait().expect("Failed to wait on wf-recorder");
                                }
                                println!("HI11 {}", is_eww_updater_running);
                                if is_eww_updater_running {
                                    println!("HI12");
                                    is_eww_updater_running = eww_updater_thread(
                                        "stop",
                                        &eww_config,
                                        Arc::new(Mutex::new(Instant::now())),
                                    );
                                    println!("HI13 {}", is_eww_updater_running);
                                }

                                // if started using PhotoGIF need to conv mp4 into gif
                                if action == CaptureAction::PhotoGIF {
                                    convert_mp4_to_gif(
                                        &screencast_loc, 
                                        &file_id, 
                                        &screenshot_loc,
                                        10,
                                        800,
                                        true,
                                        "default",
                                        false,
                                    );
                                }
                            }
                            _ => {}
                        }
                    }
                }
                Err(e) => eprintln!("Error accepting connection: {}", e),
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
    let home = env::var("HOME")
        .unwrap_or_else(|_| String::from("/srv/media"))
        .to_string();

    // Set file locations
    let screenshot_location = format!("{}/Pictures/Screenshots", home);
    let screencast_location = format!("{}/Videos/Screencasts", home);

    let file_id = chrono::Local::now().format("%F_%H-%M-%S").to_string();

    println!("home : {}", home.as_str());
    println!("screenshot_location : {}", screenshot_location.as_str());
    println!("file id : {}", file_id.as_str());

    match action {
        CaptureAction::PhotoJPEG => {
            handle_capture(
                action,
                canvas,
                wl_copy,
                open_edit,
                &screenshot_location,
                &file_id,
                true,
            );
        }
        CaptureAction::PhotoPNG => {
            handle_capture(
                action,
                canvas,
                wl_copy,
                open_edit,
                &screenshot_location,
                &file_id,
                true,
            );
        }
        CaptureAction::VideoMP4 => {
            start_rec_thread(
                action,
                canvas,
                wl_copy,
                open_edit,
                &screencast_location,
                &screenshot_location,
                &file_id,
                &eww_config_loc,
                true,
            );
            let mut socket = std::os::unix::net::UnixStream::connect("/tmp/eww_capture.sock")
                .expect("Failed to connect to socket");
            socket
                .write_all(b"start\n")
                .expect("Failed to write to socket");
        }
        CaptureAction::VideoMKV => {
            start_rec_thread(
                action,
                canvas,
                wl_copy,
                open_edit,
                &screencast_location,
                &screenshot_location,
                &file_id,
                &eww_config_loc,
                true,
            );
            let mut socket = std::os::unix::net::UnixStream::connect("/tmp/eww_capture.sock")
                .expect("Failed to connect to socket");
            socket
                .write_all(b"start\n")
                .expect("Failed to write to socket");
        }
        CaptureAction::PhotoGIF => {
            //rec video
            start_rec_thread(
                action,
                canvas,
                wl_copy,
                open_edit,
                &screencast_location,
                &screenshot_location,
                &file_id,
                &eww_config_loc,
                true,
            );
            let mut socket = std::os::unix::net::UnixStream::connect("/tmp/eww_capture.sock")
                .expect("Failed to connect to socket");
            socket
                .write_all(b"start\n")
                .expect("Failed to write to socket");
        }
        CaptureAction::RecSTOP => {
            let mut socket = std::os::unix::net::UnixStream::connect("/tmp/eww_capture.sock")
                .expect("Failed to connect to socket");
            socket
                .write_all(b"stop\n")
                .expect("Failed to write to socket");
        }
    }
}
