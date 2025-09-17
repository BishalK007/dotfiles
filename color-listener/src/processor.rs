// Cargo.toml
// [dependencies]
// image = "0.24"
// anyhow = "1.0"

use anyhow::{Context, Result};
use image::{DynamicImage, ImageReader};
use std::f32::consts::PI;
use std::path::{Path, PathBuf};

pub struct Processor {
    pub colorfile: PathBuf,
    pub wallpaper_path: PathBuf,
}

impl Processor {
    pub fn new<C: AsRef<Path>, W: AsRef<Path>>(colorfile: C, wallpaper_path: W) -> Self {
        Self { colorfile: colorfile.as_ref().to_path_buf(),
               wallpaper_path: wallpaper_path.as_ref().to_path_buf() }
    }

    /// Extract and write. Returns (primary, secondary) hex.
    pub fn run(&self) -> Result<(String, String)> {
        let img = ImageReader::open(&self.wallpaper_path)
            .with_context(|| format!("open image {}", self.wallpaper_path.display()))?
            .with_guessed_format()?
            .decode()
            .with_context(|| "decode image")?;

        let (primary, secondary) = extract_pair_from_wallpaper(&img);
        write_colors_file(&self.colorfile, &primary, &secondary)?;
        Ok((primary, secondary))
    }
}

// ----------------------- Tunables & algorithm ------------------------------

const MAX_THUMB: u32 = 256;
const HUE_BINS: usize = 72;                 // 5° per bin
const MIN_C: f32 = 0.030;                   // ignore near-gray
const CENTER_SIGMA_FRAC: f32 = 0.38;
const C_WEIGHT_GAMMA: f32 = 1.25;

// Primary target (tinted black)
const L_PRIMARY: f32       = 0.20;
const C_PRIMARY_MIN: f32   = 0.030;
const C_PRIMARY_MAX: f32   = 0.110;
const PRIMARY_LUMA_MAX: f32   = 0.11;
const PRIMARY_MAX_CHANNEL: u8 = 0x22;

// Secondary “pastel clamp” (prevents whiteness)
const L2_TARGET: f32       = 0.82;   // base lightness
const L2_MIN: f32          = 0.78;   // never whiter than this band
const L2_MAX: f32          = 0.86;
const C2_MIN: f32          = 0.08;   // more saturation than before
const C2_MAX: f32          = 0.18;
const MIN_CONTRAST: f32    = 3.0;

fn extract_pair_from_wallpaper(img: &DynamicImage) -> (String, String) {
    let rgb = img.thumbnail(MAX_THUMB, MAX_THUMB).to_rgb8();
    let (w, h) = rgb.dimensions();
    let (cx, cy) = (w as f32 / 2.0, h as f32 / 2.0);
    let sigma = CENTER_SIGMA_FRAC * (w.max(h) as f32 / 2.0);
    let inv2s2 = 1.0 / (2.0 * sigma * sigma).max(1e-6);

    // weighted hue histogram
    let mut bin_w = vec![0f32; HUE_BINS];
    let mut bin_sin = vec![0f32; HUE_BINS];
    let mut bin_cos = vec![0f32; HUE_BINS];
    let mut bin_csum = vec![0f32; HUE_BINS];

    for (y, row) in rgb.rows().enumerate() {
        for (x, p) in row.enumerate() {
            let (r, g, b) = (p[0], p[1], p[2]);
            let (_l, a, bb) = srgb8_to_oklab(r, g, b); // _l unused (we target custom L bands)
            let c = (a * a + bb * bb).sqrt();
            if c < MIN_C { continue; }

            let dx = x as f32 - cx;
            let dy = y as f32 - cy;
            let focal = (- (dx*dx + dy*dy) * inv2s2).exp();
            let weight = focal * c.powf(C_WEIGHT_GAMMA);

            let hue = bb.atan2(a);
            let bin = hue_to_bin(hue);
            bin_w[bin]   += weight;
            bin_sin[bin] += weight * hue.sin();
            bin_cos[bin] += weight * hue.cos();
            bin_csum[bin]+= weight * c;
        }
    }

    // neutral fallback
    if bin_w.iter().copied().sum::<f32>() < 1e-4 {
        let primary = "#141414".to_string();
        let secondary = "#E5E5E5".to_string();
        return (primary, secondary);
    }

    // best hue (windowed mean)
    let (best_idx, _) = bin_w.iter().enumerate()
        .max_by(|a,b| a.1.partial_cmp(b.1).unwrap()).unwrap();

    let mut sum_w = 0.0;
    let mut sum_s = 0.0;
    let mut sum_c = 0.0;
    let mut sum_cs = 0.0;
    for off in [-1isize, 0, 1] {
        let i = wrap_bin(best_idx as isize + off);
        sum_w += bin_w[i];
        sum_s += bin_sin[i];
        sum_c += bin_cos[i];
        sum_cs += bin_csum[i];
    }
    let hue = sum_s.atan2(sum_c);
    let avg_c = if sum_w > 0.0 { (sum_cs / sum_w).clamp(0.0, 0.30) } else { 0.12 };

    // PRIMARY — roll chroma down for a near-black tint
    let c_primary = ((avg_c * 0.55) + 0.03).clamp(C_PRIMARY_MIN, C_PRIMARY_MAX);
    let mut primary   = oklch_to_hex_gamut_ok(L_PRIMARY, c_primary, hue);
    primary = enforce_ultra_dark_primary(&primary);

    // SECONDARY — pastel (light but not white)
    let (l2, c2, h2) = shape_secondary_pastel(L2_TARGET, avg_c, hue);
    let mut secondary = oklch_to_hex_gamut_ok(l2, c2, h2);

    // ensure contrast without bleaching: try a bit more chroma first, then tiny lightness nudge inside clamp
    for _ in 0..6 {
        if contrast_ratio_hex(&primary, &secondary) >= MIN_CONTRAST { break; }
        let (mut l, mut c, h) = hex_to_oklch(&secondary);
        c = (c * 1.06).clamp(C2_MIN, C2_MAX);
        l = (l + 0.005).clamp(L2_MIN, L2_MAX);
        secondary = oklch_to_hex_gamut_ok(l, c, h);
    }

    (primary, secondary)
}

// Pastel shaper: clamp L and C to a “milky but colored” band
fn shape_secondary_pastel(l_target: f32, avg_c: f32, hue: f32) -> (f32, f32, f32) {
    // Give it some of the image’s chroma so it doesn’t look gray/white.
    let desired_c = (avg_c * 0.70 + 0.06).clamp(C2_MIN, C2_MAX);
    let l = l_target.clamp(L2_MIN, L2_MAX);
    (l, desired_c, hue)
}

// ---------------------------- I/O helpers ----------------------------------

fn write_colors_file(path: &Path, primary: &str, secondary: &str) -> Result<()> {
    use std::fs;
    use std::io::Write;
    let tmp = path.with_extension("tmp");
    // Convert hex (#RRGGBB) to rgba(r,g,b,1.0) string; fall back to original if parsing fails.
    let to_rgba = |hex: &str| -> String {
        if let Some((r,g,b)) = hex_to_rgb(hex) { format!("rgba({},{},{},1.0)", r,g,b) } else { hex.to_string() }
    };
    let primary_rgba = to_rgba(primary);
    let secondary_rgba = to_rgba(secondary);
    let contents = format!(
        "$primary-color: {p};\n$secondary-color: {s};\n",
        p = primary_rgba,
        s = secondary_rgba
    );
    {
        let mut f = fs::File::create(&tmp)?;
        f.write_all(contents.as_bytes())?;
        f.sync_all()?;
    }
    fs::rename(&tmp, path)?;
    Ok(())
}

// ----------------------- Color math / conversions --------------------------

fn hue_to_bin(h: f32) -> usize {
    let norm = (h + PI) / (2.0 * PI);
    (norm * HUE_BINS as f32).floor().clamp(0.0, (HUE_BINS - 1) as f32) as usize
}
fn wrap_bin(i: isize) -> usize {
    let n = HUE_BINS as isize; let mut k = i % n; if k < 0 { k += n; } k as usize
}

fn srgb_to_linear(x: f32) -> f32 {
    if x <= 0.04045 { x / 12.92 } else { ((x + 0.055) / 1.055).powf(2.4) }
}
fn linear_to_srgb(x: f32) -> f32 {
    if x <= 0.0031308 { 12.92 * x } else { 1.055 * x.powf(1.0/2.4) - 0.055 }
}

fn srgb8_to_oklab(r: u8, g: u8, b: u8) -> (f32,f32,f32) {
    let r = srgb_to_linear(r as f32 / 255.0);
    let g = srgb_to_linear(g as f32 / 255.0);
    let b = srgb_to_linear(b as f32 / 255.0);

    let l = 0.4122214708*r + 0.5363325363*g + 0.0514459929*b;
    let m = 0.2119034982*r + 0.6806995451*g + 0.1073969566*b;
    let s = 0.0883024619*r + 0.2817188376*g + 0.6299787005*b;

    let l_ = l.cbrt(); let m_ = m.cbrt(); let s_ = s.cbrt();

    let L = 0.2104542553*l_ + 0.7936177850*m_ - 0.0040720468*s_;
    let A = 1.9779984951*l_ - 2.4285922050*m_ + 0.4505937099*s_;
    let B = 0.0259040371*l_ + 0.7827717662*m_ - 0.8086757660*s_;
    (L, A, B)
}

fn oklab_to_srgb(l: f32, a: f32, b: f32) -> (f32,f32,f32) {
    let l_ = l + 0.3963377774*a + 0.2158037573*b;
    let m_ = l - 0.1055613458*a - 0.0638541728*b;
    let s_ = l - 0.0894841775*a - 1.2914855480*b;

    let l3 = l_*l_*l_;
    let m3 = m_*m_*m_;
    let s3 = s_*s_*s_;

    let r =  4.0767416621*l3 - 3.3077115913*m3 + 0.2309699292*s3;
    let g = -1.2684380046*l3 + 2.6097574011*m3 - 0.3413193965*s3;
    let b = -0.0041960863*l3 - 0.7034186147*m3 + 1.7076147010*s3;

    (linear_to_srgb(r), linear_to_srgb(g), linear_to_srgb(b))
}

fn oklch_to_hex_gamut_ok(l: f32, mut c: f32, h: f32) -> String {
    for _ in 0..12 {
        let a = c * h.cos();
        let b = c * h.sin();
        let (r, g, bb) = oklab_to_srgb(l, a, b);
        if (0.0..=1.0).contains(&r) && (0.0..=1.0).contains(&g) && (0.0..=1.0).contains(&bb) {
            return to_hex((r*255.0).round() as u8,
                          (g*255.0).round() as u8,
                          (bb*255.0).round() as u8);
        }
        c *= 0.88; // shrink chroma until inside sRGB
    }
    let a = c * h.cos(); let b = c * h.sin();
    let (r, g, bb) = oklab_to_srgb(l, a, b);
    to_hex((r.clamp(0.0,1.0)*255.0).round() as u8,
           (g.clamp(0.0,1.0)*255.0).round() as u8,
           (bb.clamp(0.0,1.0)*255.0).round() as u8)
}

fn hex_to_oklch(hex: &str) -> (f32,f32,f32) {
    let (r,g,b) = hex_to_rgb(hex).unwrap_or((127,127,127));
    let (l,a,b2) = srgb8_to_oklab(r,g,b);
    let c = (a*a + b2*b2).sqrt();
    let h = b2.atan2(a);
    (l,c,h)
}

fn to_hex(r:u8,g:u8,b:u8)->String { format!("#{:02X}{:02X}{:02X}", r,g,b) }

fn hex_to_rgb(hex: &str) -> Option<(u8,u8,u8)> {
    if hex.len()==7 && hex.starts_with('#') {
        Some((
            u8::from_str_radix(&hex[1..3],16).ok()?,
            u8::from_str_radix(&hex[3..5],16).ok()?,
            u8::from_str_radix(&hex[5..7],16).ok()?
        ))
    } else { None }
}

fn relative_luminance(rgb: (u8,u8,u8)) -> f32 {
    fn lin(c: u8) -> f32 {
        let x = c as f32 / 255.0;
        if x <= 0.04045 { x / 12.92 } else { ((x + 0.055)/1.055).powf(2.4) }
    }
    let (r,g,b) = rgb;
    0.2126*lin(r) + 0.7152*lin(g) + 0.0722*lin(b)
}
fn contrast_ratio(a: (u8,u8,u8), b: (u8,u8,u8)) -> f32 {
    let la = relative_luminance(a);
    let lb = relative_luminance(b);
    let (hi, lo) = if la > lb { (la, lb) } else { (lb, la) };
    (hi + 0.05) / (lo + 0.05)
}
fn contrast_ratio_hex(a: &str, b: &str) -> f32 {
    let ar = hex_to_rgb(a).unwrap();
    let br = hex_to_rgb(b).unwrap();
    contrast_ratio(ar, br)
}

fn enforce_ultra_dark_primary(hex: &str) -> String {
    if let Some((mut r, mut g, mut b)) = hex_to_rgb(hex) {
        if relative_luminance((r,g,b)) > PRIMARY_LUMA_MAX {
            let scale = (PRIMARY_LUMA_MAX / relative_luminance((r,g,b))).min(1.0) * 0.95;
            r = (r as f32 * scale).round().clamp(0.0, 255.0) as u8;
            g = (g as f32 * scale).round().clamp(0.0, 255.0) as u8;
            b = (b as f32 * scale).round().clamp(0.0, 255.0) as u8;
        }
        let maxc = r.max(g).max(b);
        if maxc > PRIMARY_MAX_CHANNEL {
            let rescale = (PRIMARY_MAX_CHANNEL as f32) / (maxc as f32);
            r = (r as f32 * rescale).round() as u8;
            g = (g as f32 * rescale).round() as u8;
            b = (b as f32 * rescale).round() as u8;
        }
        return to_hex(r,g,b);
    }
    hex.to_string()
}
