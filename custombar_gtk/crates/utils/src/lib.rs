use gtk4::CssProvider;
use gtk4::gdk::Display;
use std::env;
use regex::Regex;
use dotenv::dotenv;
use gtk4::cairo::Matrix;
use gtk4::prelude::*;

pub mod logger;
pub mod socket;

/// Applies multiple CSS data strings. The parameter `css_files` should be a slice of the CSS content strings.
///
/// You can embed CSS files at compile time as:
/// apply_css_files(&[include_str!("style.css")]);
pub fn apply_css_files(css_files: &[&'static str]) {
    let display = Display::default().expect("Could not connect to a display.");

    for css in css_files {
        let provider = CssProvider::new();
        provider.load_from_data(css);

        gtk4::style_context_add_provider_for_display(
            &display,
            &provider,
            gtk4::STYLE_PROVIDER_PRIORITY_USER,
        );
    }
}

// thsi function will be ised to replace sizes of any kind into salce adjusted
// scale is provided inside .env as WAYLAND_MONITOR_SCALE variable
// TODO may later wanna dynamically get scale for multi monitor setup
pub fn scale_sizes(css: &'static str) -> &'static str {
    dotenv().ok();
    let scale: f64 = env::var("WAYLAND_MONITOR_SCALE")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(1.0);

    // Use `scale` as needed; for example, adjusting UI sizes:
    // adjust_size = original_size * scale;
    let re = Regex::new(r"(\d+\.?\d*)px").unwrap(); // Matches digits followed by "px"
    let result = re.replace_all(css, |caps: &regex::Captures| {
        let px_value_str = caps.get(1).unwrap().as_str();
        if let Ok(px_value) = px_value_str.parse::<f64>() {
            let mut adjusted_value = (px_value / scale).floor() as i32;
            if adjusted_value == 0 {
                adjusted_value = 1;
            }
            

            format!("{}px", adjusted_value) // Format back to "valuepx"
        } else {
            caps.get(0).unwrap().as_str().to_string() // Keep original if parse fails (unlikely for digits)
        }
    }).to_string();
    
    logger::debug!("\n\n _________ Scaled CSS ________\n{}\n _____________________________", result);
    Box::leak(result.into_boxed_str())
}


pub fn connect_clicked<F>(container: &impl IsA<gtk4::Widget>, handler: F)
where
    F: Fn() + 'static,
{
    let gesture = gtk4::GestureClick::new();
    gesture.connect_pressed(move |_, _, _, _| {
        handler();
    });
    container.add_controller(gesture);
}

