use anyhow::{anyhow, Result};
use std::fs;

// Update variables in a Hyprland colors.conf-like file:
// $hyprland_active_border_color = rgba(rrrrggggbbbb aaaa)
// $hyprland_inactive_border_color = rgba(rrrrggggbbbb aaaa)
// active gets secondary, inactive gets primary.
pub fn apply(conf_path: &str, primary_hex: &str, secondary_hex: &str) -> Result<()> {
	let mut contents = fs::read_to_string(conf_path)
		.map_err(|e| anyhow!("read {}: {}", conf_path, e))?;

	let active = hex_to_rgba_packed(secondary_hex, 0xFF);
	let inactive = hex_to_rgba_packed(primary_hex, 0xAA); // use 0xAA alpha to mimic example

	contents = set_var(&contents, "$hyprland_active_border_color", &format!("rgba({})", active));
	contents = set_var(&contents, "$hyprland_inactive_border_color", &format!("rgba({})", inactive));

	let tmp = format!("{}{}", conf_path, ".tmp");
	fs::write(&tmp, contents)?;
	fs::rename(&tmp, conf_path)?;
	Ok(())
}

fn set_var(input: &str, var: &str, value: &str) -> String {
	// replace whole line starting with var = ...
	let mut out = String::with_capacity(input.len()+64);
	for line in input.lines() {
		if line.trim_start().starts_with(var) {
			out.push_str(&format!("{} = {}\n", var, value));
		} else {
			out.push_str(line);
			out.push('\n');
		}
	}
	out
}

fn hex_to_rgba_packed(hex: &str, alpha: u8) -> String {
	if hex.len()==7 && hex.starts_with('#') {
		if let (Ok(r),Ok(g),Ok(b)) = (
			u8::from_str_radix(&hex[1..3],16),
			u8::from_str_radix(&hex[3..5],16),
			u8::from_str_radix(&hex[5..7],16)) {
			return format!("{:02x}{:02x}{:02x}{:02x}", r,g,b,alpha);
		}
	}
	// default opaque black
	format!("000000{:02x}", alpha)
}

