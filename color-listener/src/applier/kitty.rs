use anyhow::{anyhow, Result};
use std::fs;
use std::io::{Read, Write};
use std::path::Path;
#[cfg(unix)]
use std::os::unix::fs::FileTypeExt;

// Apply colors to kitty by generating a managed theme file and ensuring kitty.conf includes it.
// Strategy:
// - Write ~/.config/kitty/colors-generated.conf with derived colors
// - Ensure main kitty.conf contains: include colors-generated.conf (idempotent)
// - Map: background <- primary (dark), foreground/cursor/selection/url <- secondary (accent)
// - Also set background_opacity to 0.80 if a transparent primary is desired elsewhere; we won't parse rgba here.

pub fn apply(kitty_conf: &str, primary_hex: &str, secondary_hex: &str) -> Result<()> {
	// Resolve paths
	let kitty_conf_path = Path::new(kitty_conf);
	if !kitty_conf_path.exists() {
		return Err(anyhow!("kitty.conf not found: {}", kitty_conf));
	}
	let colors_generated = kitty_conf_path
		.parent()
		.map(|p| p.join("colors-generated.conf"))
		.ok_or_else(|| anyhow!("could not resolve kitty.conf parent directory"))?;

	// 1) Write generated colors file atomically
	let theme = render_theme(primary_hex, secondary_hex);
	let tmp = colors_generated.with_extension("conf.tmp");
	fs::write(&tmp, theme)?;
	fs::rename(&tmp, &colors_generated)?;

	// 2) Ensure kitty.conf includes the generated file (idempotent)
	ensure_include(kitty_conf_path, colors_generated.file_name().unwrap().to_string_lossy().as_ref())?;

	// 2b) Ensure remote control settings exist and capture a socket target if present
	let socket_target = ensure_remote_control(kitty_conf_path)?;

	// 3) Reload colors in all existing kitty instances (best-effort)
	if let Err(e) = reload_kitty_colors(&colors_generated, socket_target.as_deref()) {
		eprintln!("[applier:kitty] warn: failed to remote reload colors: {e}");
	}

	Ok(())
}

fn ensure_include(kitty_conf_path: &Path, include_file_name: &str) -> Result<()> {
	// Read current kitty.conf
	let mut contents = String::new();
	fs::File::open(kitty_conf_path)?.read_to_string(&mut contents)?;

	let include_line = format!("include {}", include_file_name);
	if contents.lines().any(|l| l.trim() == include_line) {
		return Ok(()); // already included
	}

	// Append include to end with a separating comment
	let mut f = fs::OpenOptions::new().append(true).open(kitty_conf_path)?;
	writeln!(
		f,
		"\n# Automatically included by color-listener\n{}\n",
		include_line
	)?;
	Ok(())
}

fn render_theme(primary_hex: &str, secondary_hex: &str) -> String {
	// Fallbacks if bad hex
	let p = if is_hex_rgb(primary_hex) { primary_hex } else { "#000000" };
	let s = if is_hex_rgb(secondary_hex) { secondary_hex } else { "#ffffff" };

	// Compose kitty color section similar to the manually curated example in kitty.conf
	// Keep opacity separate; kitty uses background_opacity, not rgba.
	format!(
		"# ==============================================================================\n# Colors (managed by color-listener)\n# primary: {p}\n# secondary: {s}\n# ==============================================================================\nbackground {p}\nforeground {s}\ncursor    {s}\nselection_background {s}\nselection_foreground {p}\nurl_color            {s}\n\n# Optional basic ANSI accents to keep theme coherent\ncolor0  {p}\ncolor7  {s}\ncolor8  {darker}\ncolor15 #ffffff\n",
		p = p,
		s = s,
		darker = darken_hex(p, 0.15)
	)
}

// Ensure remote control is enabled and extract a target socket if found or added.
// Returns Some("unix:/path") if a listen_on socket is present in config, otherwise None.
fn ensure_remote_control(kitty_conf_path: &Path) -> Result<Option<String>> {
	let mut contents = String::new();
	fs::File::open(kitty_conf_path)?.read_to_string(&mut contents)?;
	let mut has_allow = false;
	let mut socket: Option<String> = None;
	for line in contents.lines() {
		let t = line.trim();
		if t.starts_with("allow_remote_control") {
			has_allow = true;
		} else if t.starts_with("listen_on ") {
			socket = Some(t["listen_on ".len()..].trim().to_string());
		}
	}

	let mut appended = String::new();
	if !has_allow {
		appended.push_str("\n# Enable remote control (added by color-listener)\nallow_remote_control yes\n");
	}
	if socket.is_none() {
		// Default to a predictable per-user socket under /tmp
		let user = std::env::var("USER").unwrap_or_else(|_| "user".to_string());
		let default_sock = format!("unix:/tmp/kitty-{}", user);
		appended.push_str(&format!("listen_on {}\n", default_sock));
		socket = Some(default_sock);
	}
	if !appended.is_empty() {
		let mut f = fs::OpenOptions::new().append(true).open(kitty_conf_path)?;
		write!(f, "{}", appended)?;
	}
	Ok(socket)
}

fn reload_kitty_colors(colors_file: &Path, socket: Option<&str>) -> Result<()> {
	use std::process::{Command, Stdio};
	// Build target list only from kitty.conf listen_on and its discovered per-PID variants
	let mut targets: Vec<String> = Vec::new();
	if let Some(cfg_to) = socket { targets.push(cfg_to.to_string()); }

	// Expand any unix:/path targets to all matching sockets (kitty appends -$PID)
	let mut expand_bases: Vec<String> = Vec::new();
	if let Some(cfg_to) = socket { expand_bases.push(cfg_to.to_string()); }
	for base in expand_bases {
		if let Some(paths) = discover_unix_socket_variants(&base) {
			for p in paths { targets.push(p); }
		}
	}

	// Try explicit targets first
	dedup_preserve(&mut targets);
	let mut success_any = false;
	let data = fs::read(colors_file)?; // reuse for stdin fallback per-target
	for to in &targets {
		// 1) Try with file path
		let status = Command::new("kitty")
			.args(["@", "--to", to, "set-colors", "--all", colors_file.to_string_lossy().as_ref()])
			.stdout(Stdio::null())
			.stderr(Stdio::null())
			.status();
		if let Ok(s) = status {
			if s.success() { success_any = true; continue; }
		}
		// 2) Per-target stdin fallback
		let mut child = Command::new("kitty")
			.args(["@", "--to", to, "set-colors", "--all"]).stdin(Stdio::piped())
			.stdout(Stdio::null()).stderr(Stdio::null()).spawn()?;
		if let Some(mut stdin) = child.stdin.take() {
			use std::io::Write as _;
			stdin.write_all(&data)?;
		}
		if let Ok(s) = child.wait() { if s.success() { success_any = true; } }
	}

	if success_any { return Ok(()); }

	// No explicit target worked; report error
	Err(anyhow!("no kitty sockets accepted set-colors"))
}

// Given a target like "unix:/tmp/kitty-bishal" or "unix:/tmp/kitty-bishal-83043"
// discover all socket files that start with the base name prefix in the same directory.
// Returns list of full "unix:/path" targets.
fn discover_unix_socket_variants(target: &str) -> Option<Vec<String>> {
	let prefix = "unix:";
	if !target.starts_with(prefix) { return None; }
	let path = &target[prefix.len()..];
	if !path.starts_with('/') { return None; } // not a filesystem path
	let p = std::path::Path::new(path);
	let parent = p.parent()?;
	let fname = p.file_name()?.to_string_lossy();
	let base_prefix = fname.split_once('-').map(|(b, _)| b).unwrap_or(&fname);
	let mut out = Vec::new();
	if let Ok(read) = fs::read_dir(parent) {
		for entry in read.flatten() {
			let name = entry.file_name();
			let name = name.to_string_lossy();
			if name.starts_with(base_prefix) {
				if let Ok(meta) = entry.file_type() {
					#[cfg(unix)]
					{
						if meta.is_socket() {
							out.push(format!("unix:{}", entry.path().to_string_lossy()));
						}
					}
				}
			}
		}
	}
	if out.is_empty() { None } else { Some(out) }
}

fn dedup_preserve(v: &mut Vec<String>) {
	let mut seen = std::collections::HashSet::new();
	v.retain(|s| seen.insert(s.clone()));
}
fn is_hex_rgb(hex: &str) -> bool {
	let h = hex.strip_prefix('#').unwrap_or(hex);
	h.len() == 6 && u32::from_str_radix(h, 16).is_ok()
}

fn darken_hex(hex: &str, amount: f32) -> String {
	let h = hex.strip_prefix('#').unwrap_or(hex);
	if h.len() != 6 || u32::from_str_radix(h, 16).is_err() {
		return hex.to_string();
	}
	let r = u8::from_str_radix(&h[0..2], 16).unwrap_or(0);
	let g = u8::from_str_radix(&h[2..4], 16).unwrap_or(0);
	let b = u8::from_str_radix(&h[4..6], 16).unwrap_or(0);
	let dr = (r as f32 * (1.0 - amount)).round().clamp(0.0, 255.0) as u8;
	let dg = (g as f32 * (1.0 - amount)).round().clamp(0.0, 255.0) as u8;
	let db = (b as f32 * (1.0 - amount)).round().clamp(0.0, 255.0) as u8;
	format!("#{:02X}{:02X}{:02X}", dr, dg, db)
}
