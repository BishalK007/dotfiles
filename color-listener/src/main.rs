use std::env;
use anyhow::Result;
mod watchers;
use watchers::HyprpaperWatcher;
mod processor; // assuming processor.rs is in src root
use processor::Processor;
mod applier;
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
    Hyprland,
    Kitty,
    Ps1,
}

impl Applier {
    fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "ags" => Some(Applier::Ags),
            "hyprland" => Some(Applier::Hyprland),
            "kitty" => Some(Applier::Kitty),
            "ps1" => Some(Applier::Ps1),
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
    let default_hypr_colors: &str = "~/.config/dotfiles/hypr/colors.conf";
    let default_kitty_conf: &str = "~/.config/dotfiles/kitty/kitty.conf";
    let mut watcher = Watcher::Hyprpaper;
    let mut appliers: Vec<Applier> = vec![Applier::Ags, Applier::Hyprland, Applier::Kitty, Applier::Ps1];

    // Working copies (expand ~ lazily after arg parsing)
    let mut watchfile = default_watchfile.to_string();
    let mut colorfile = default_colorfile.to_string();
    let mut ags_colorfile = default_ags_colorfile.to_string();
    let mut hypr_colors = default_hypr_colors.to_string();
    let mut kitty_conf = default_kitty_conf.to_string();
    let default_bashrc: &str = "~/.bashrc";
    let mut bashrc = default_bashrc.to_string();

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
            "--hypr-colors" => { if let Some(val) = args.next() { hypr_colors = val; } }
            "--kitty-conf" => { if let Some(val) = args.next() { kitty_conf = val; } }
            "--bashrc" => { if let Some(val) = args.next() { bashrc = val; } }
            _ => {}
        }
    }

    // Expand tildes
    watchfile = expand_tilde(&watchfile);
    colorfile = expand_tilde(&colorfile);
    ags_colorfile = expand_tilde(&ags_colorfile);
    hypr_colors = expand_tilde(&hypr_colors);
    kitty_conf = expand_tilde(&kitty_conf);
    bashrc = expand_tilde(&bashrc);

    println!("Using watcher: {:?}", watcher);
    println!("Watching file: {}", watchfile);
    println!("Color file: {}", colorfile);
    println!("AGS color file: {}", ags_colorfile);
    println!("Hypr colors file: {}", hypr_colors);
    println!("Kitty conf: {}", kitty_conf);
    println!("Bash rc: {}", bashrc);

    // Start selected watcher and spawn receiver loop
    match watcher {
        Watcher::Hyprpaper => {
            let rx = HyprpaperWatcher::new(&watchfile).start().await?;
            let colorfile_path = colorfile.clone();
            let ags_colorfile_path = ags_colorfile.clone();
            let appliers_vec = appliers.clone();
            let kitty_conf_path = kitty_conf.clone();
            let bashrc_path = bashrc.clone();
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
                                        if let Err(e) = applier::ags::apply(&ags_colorfile_path, &p, &s) {
                                            eprintln!("[applier:ags] error: {e}");
                                        } else {
                                            println!("[applier:ags] updated {}", ags_colorfile_path);
                                        }
                                    }
                                    Applier::Hyprland => {
                                        if let Err(e) = applier::hyprland::apply(&hypr_colors, &p, &s) {
                                            eprintln!("[applier:hyprland] error: {e}");
                                        } else {
                                            println!("[applier:hyprland] updated {}", hypr_colors);
                                        }
                                    }
                                    Applier::Kitty => {
                                        if let Err(e) = applier::kitty::apply(&kitty_conf_path, &p, &s) {
                                            eprintln!("[applier:kitty] error: {e}");
                                        } else {
                                            println!("[applier:kitty] updated include in {}", kitty_conf_path);
                                        }
                                    }
                                    Applier::Ps1 => {
                                        if let Err(e) = applier::ps1::apply(&bashrc_path, &p, &s) {
                                            eprintln!("[applier:ps1] error: {e}");
                                        } else {
                                            println!("[applier:ps1] updated PS1 theme and loader in {}", bashrc_path);
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

// Local file writing helpers removed; responsibility moved into Processor and appliers
