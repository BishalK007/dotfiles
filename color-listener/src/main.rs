use std::env;
use anyhow::Result;
mod watchers;
use watchers::HyprpaperWatcher;
mod processor; // assuming processor.rs is in src root
use processor::Processor;
// std fs/io helpers no longer needed; Processor handles writing

#[derive(Debug, Clone, Copy)]
enum Watcher {
    Hyprpaper,
}

impl Watcher {
    fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "hyprpaper" => Some(Watcher::Hyprpaper),
            _ => None,
        }
    }
}
#[derive(Debug, Clone, Copy)]
enum Applier {
    Ags,
}

impl Applier {
    fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "ags" => Some(Applier::Ags),
            _ => None,
        }
    }
}

fn expand_tilde(path: &str) -> String {
    if let Some(rest) = path.strip_prefix("~/") {
        if let Some(home) = env::var_os("HOME") { return format!("{}/{}", home.to_string_lossy(), rest); }
    }
    path.to_string()
}

#[tokio::main]
async fn main() -> Result<()> {
    // defaults
    let default_watchfile: &str = "~/.config/hypr/hyprpaper.conf";
    let default_colorfile: &str = "~/.config/dotfiles/colors.scss";
    let default_ags_colorfile: &str = "~/.config/dotfiles/ags-4/colors.scss";
    let mut watcher = Watcher::Hyprpaper;
    let mut appliers: Vec<Applier> = vec![Applier::Ags];

    // Working copies (expand ~ lazily after arg parsing)
    let mut watchfile = default_watchfile.to_string();
    let mut colorfile = default_colorfile.to_string();
    let mut ags_colorfile = default_ags_colorfile.to_string();

    let mut args = env::args().skip(1);
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--watcher" => {
                if let Some(val) = args.next() {
                    if let Some(w) = Watcher::from_str(&val) { watcher = w; } else { eprintln!("Unknown watcher: {}", val); }
                }
            }
            "--appliers" => {
                if let Some(val) = args.next() {
                    let parsed: Vec<Applier> = val
                        .split(',')
                        .filter_map(|s| Applier::from_str(s.trim()))
                        .collect();
                    if !parsed.is_empty() { appliers = parsed; }
                    if appliers.is_empty() {
                        eprintln!("No valid appliers specified in: {}", val);
                    } else {
                        // You can store `appliers` somewhere as needed
                        println!("Using appliers: {:?}", appliers);
                        // For now, just print or assign to a variable if you add it to main
                    }
                }
            }
            "--watchfile" => { if let Some(val) = args.next() { watchfile = val; } }
            "--colorfile" => { if let Some(val) = args.next() { colorfile = val; } }
            "--ags-colorfile" => { if let Some(val) = args.next() { ags_colorfile = val; } }
            _ => {}
        }
    }

    // Expand tildes
    watchfile = expand_tilde(&watchfile);
    colorfile = expand_tilde(&colorfile);
    ags_colorfile = expand_tilde(&ags_colorfile);

    println!("Using watcher: {:?}", watcher);
    println!("Watching file: {}", watchfile);
    println!("Color file: {}", colorfile);
    println!("AGS color file: {}", ags_colorfile);

    // Start selected watcher and spawn receiver loop
    match watcher {
        Watcher::Hyprpaper => {
            let rx = HyprpaperWatcher::new(&watchfile).start().await?;
            let colorfile_path = colorfile.clone();
            let ags_colorfile_path = ags_colorfile.clone();
            let appliers_vec = appliers.clone();
            tokio::spawn(async move {
                let mut rx = rx;
                while let Some(ev) = rx.recv().await {
                    println!("[hyprpaper] new wallpaper: {} ({}x{})", ev.path.display(), ev.image.width(), ev.image.height());
                    let proc = Processor::new(&colorfile_path, &ev.path);
                    match proc.run() {
                        Ok((p,s)) => {
                            println!("[processor] wrote colors primary={} secondary={}", p,s);
                            for ap in &appliers_vec {
                                match ap {
                                    Applier::Ags => {
                                        if let Err(e) = apply_ags(&ags_colorfile_path, &p, &s) {
                                            eprintln!("[applier:ags] error: {e}");
                                        } else {
                                            println!("[applier:ags] updated {}", ags_colorfile_path);
                                        }
                                    }
                                }
                            }
                        },
                        Err(e) => eprintln!("[processor] failed: {e}"),
                    }
                }
            });
        }
    }
    // when processor sends a color chnage signal, main spawns a task to handle it
    // we use appliers here
    

    // Wait for ctrl-c signal to exit
    tokio::signal::ctrl_c().await?;
    Ok(())
}

// Local file writing helpers removed; responsibility moved into Processor

fn apply_ags(path: &str, primary_hex: &str, secondary_hex: &str) -> Result<()> {
    use std::fs;
    use std::io::Write;
    let rgba = |hex: &str, alpha: f32| -> String {
        if hex.len()==7 && hex.starts_with('#') {
            if let (Ok(r),Ok(g),Ok(b)) = (
                u8::from_str_radix(&hex[1..3],16),
                u8::from_str_radix(&hex[3..5],16),
                u8::from_str_radix(&hex[5..7],16)) { return format!("rgba({}, {}, {}, {:.2})", r,g,b,alpha); }
        }
        format!("rgba(0,0,0,{:.2})", alpha)
    };
    let transparent = rgba(primary_hex, 0.80);
    let tmp = format!("{}{}", path, ".tmp");
    let contents = format!(
        "$primary-color: {p};\n$primary-color-transparent: {pt};\n$secondary-color: {s};\n",
        p=primary_hex, pt=transparent, s=secondary_hex
    );
    {
        let mut f = fs::File::create(&tmp)?; f.write_all(contents.as_bytes())?; f.sync_all()?;
    }
    fs::rename(&tmp, path)?;
    Ok(())
}
