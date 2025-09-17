use anyhow::Result;
use std::path::{Path, PathBuf};
use std::fs;
use std::sync::{Arc, Mutex};
use watchexec::Watchexec; 
// Tag enum path changed in watchexec v8: rather than importing, we inspect event debug.
use tokio::sync::mpsc;
use image::DynamicImage;
use tokio::task;

/// Message sent to main when a new wallpaper path is detected.
/// Contains the absolute resolved path and the decoded image.
pub struct WallpaperEvent { pub path: PathBuf, pub image: DynamicImage }

/// Watches a hyprpaper config file for wallpaper changes, parses the last
/// `wallpaper =` line (ignoring commented lines), and notifies via channel.
pub struct HyprpaperWatcher {
    conf_path: PathBuf,
}

impl HyprpaperWatcher {
    pub fn new<P: Into<PathBuf>>(hyprpaper_conf_path: P) -> Self {
        Self { conf_path: hyprpaper_conf_path.into() }
    }

    /// Starts watching asynchronously. Returns a receiver yielding
    /// `WallpaperEvent::Updated` events each time the last wallpaper changes.
    pub async fn start(self) -> Result<mpsc::Receiver<WallpaperEvent>> {
        let (tx, rx) = mpsc::channel(4);
        let conf_path = self.conf_path.clone();
        let last_sent: Arc<Mutex<Option<PathBuf>>> = Arc::new(Mutex::new(None));

        // Initial emit
        if let Some(wp) = parse_last_wallpaper_line(&conf_path)? { maybe_send_async(tx.clone(), last_sent.clone(), wp).await; }

        let handler_tx = tx.clone();
        let handler_conf_path = conf_path.clone();
        let handler_last = last_sent.clone();

        let wx = Watchexec::new(move | action| {
            let mut changed = false;
            for event in action.events.iter() {
                let dbg = format!("{event:?}");
                if dbg.contains("Modify") || dbg.contains("Create") { changed = true; break; }
            }
            if changed {
                let tx2 = handler_tx.clone();
                let conf2 = handler_conf_path.clone();
                let last2 = handler_last.clone();
                tokio::spawn(async move {
                    match parse_last_wallpaper_line(&conf2) {
                        Ok(Some(p)) => maybe_send_async(tx2, last2, p).await,
                        Ok(None) => {},
                        Err(e) => eprintln!("[hyprpaper watcher] parse error: {e}"),
                    }
                });
            }
            action
        })?;

        wx.config.pathset([conf_path]);

        tokio::spawn(async move {
            if let Err(e) = wx.main().await { eprintln!("[hyprpaper watcher] engine error: {e}"); }
        });

        Ok(rx)
    }
}
async fn maybe_send_async(tx: mpsc::Sender<WallpaperEvent>, last_sent: Arc<Mutex<Option<PathBuf>>>, path: PathBuf) {
    if { let last = last_sent.lock().unwrap(); last.as_ref() == Some(&path) } { return; }
    match task::spawn_blocking({ let path = path.clone(); move || image::open(&path).map(|img| (path, img)) }).await {
        Ok(Ok((p,img))) => {
            { let mut last = last_sent.lock().unwrap(); *last = Some(p.clone()); }
            if tx.send(WallpaperEvent { path: p, image: img }).await.is_err() { eprintln!("[hyprpaper watcher] receiver dropped"); }
        }
        Ok(Err(e)) => eprintln!("[hyprpaper watcher] failed to load image: {e}"),
        Err(e) => eprintln!("[hyprpaper watcher] join error: {e}"),
    }
}

/// Extract the last non-comment `wallpaper =` line, returning the resolved path.
fn parse_last_wallpaper_line(conf_path: &Path) -> Result<Option<PathBuf>> {
    let content = match fs::read_to_string(conf_path) { Ok(c)=>c, Err(e) => {
        if e.kind() == std::io::ErrorKind::NotFound { return Ok(None); } else { return Err(e.into()); }
    }};
    let mut last: Option<String> = None;
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') { continue; }
        // hyprpaper line samples: `wallpaper = , /path/to/img.jpg` or `wallpaper = monitor, /path`.
        if let Some(rest) = trimmed.strip_prefix("wallpaper") {
            // Expect format: `= ...` somewhere
            if let Some(eq_idx) = rest.find('=') {
                let after_eq = &rest[eq_idx+1..].trim();
                // Split on comma, take last segment as path (hyprpaper allows leading monitor spec)
                let path_part = after_eq.split(',').last().map(|s| s.trim());
                if let Some(p) = path_part { if !p.is_empty() { last = Some(p.to_string()); } }
            }
        }
    }
    if let Some(p) = last { return Ok(Some(resolve_path(&p))); }
    Ok(None)
}

fn resolve_path(s: &str) -> PathBuf {
    if let Some(rest) = s.strip_prefix("$HOME/") { if let Some(home) = std::env::var_os("HOME") { return PathBuf::from(home).join(rest); }}
    if let Some(rest) = s.strip_prefix("~/") { if let Some(home) = std::env::var_os("HOME") { return PathBuf::from(home).join(rest); }}
    PathBuf::from(s)
}