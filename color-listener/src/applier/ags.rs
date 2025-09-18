use anyhow::Result;
use std::fs;
use std::io::Write;

// Write AGS SCSS colors file with primary, transparent primary (0.80), and secondary.
// Format matches existing expectations in ags-4/colors.scss.
pub fn apply(path: &str, primary_hex: &str, secondary_hex: &str) -> Result<()> {
	let rgba = |hex: &str, alpha: f32| -> String {
		if hex.len() == 7 && hex.starts_with('#') {
			if let (Ok(r), Ok(g), Ok(b)) = (
				u8::from_str_radix(&hex[1..3], 16),
				u8::from_str_radix(&hex[3..5], 16),
				u8::from_str_radix(&hex[5..7], 16),
			) {
				return format!("rgba({}, {}, {}, {:.2})", r, g, b, alpha);
			}
		}
		format!("rgba(0,0,0,{:.2})", alpha)
	};
	let transparent = rgba(primary_hex, 0.80);
	let tmp = format!("{}{}", path, ".tmp");
	let contents = format!(
		"$primary-color: {p};\n$primary-color-transparent: {pt};\n$secondary-color: {s};\n",
		p = primary_hex,
		pt = transparent,
		s = secondary_hex
	);
	{
		let mut f = fs::File::create(&tmp)?;
		f.write_all(contents.as_bytes())?;
		f.sync_all()?;
	}
	fs::rename(&tmp, path)?;
	Ok(())
}
