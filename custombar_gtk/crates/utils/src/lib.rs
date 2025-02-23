use gtk4::CssProvider;
use gtk4::gdk::Display;
use std::env;
use regex::Regex;
use dotenv::dotenv;
use gtk4::cairo::Matrix;
use gtk4::prelude::*;

pub mod logger;

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
            gtk4::STYLE_PROVIDER_PRIORITY_APPLICATION,
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


// fn to flip a widget-


// pub fn flip_widget(widget: &gtk4::Widget, horizontal: bool, vertical: bool) -> gtk4::Widget {
//     let drawing_area = gtk4::DrawingArea::new();
//     let allocation = widget.allocation();
//     drawing_area.set_size_request(allocation.width(), allocation.height());

//     let flipped_widget = drawing_area.clone();
//     let widget_clone = widget.clone();

//     drawing_area.set_draw_func(move |_area, cr, width, height| {
//         let width = width as f64;
//         let height = height as f64;

//         cr.translate(width / 2.0, height / 2.0);

//         let x_scale = if horizontal { -1.0 } else { 1.0 };
//         let y_scale = if vertical { -1.0 } else { 1.0 };
//         let matrix = Matrix::new(x_scale, 0.0, 0.0, y_scale, 0.0, 0.0);

//         cr.transform(matrix);
//         cr.translate(-width / 2.0, -height / 2.0);

//         cr.save().expect("Failed to save cairo context");
//         gtk4::render_background(
//             &flipped_widget.style_context(),
//             cr,
//             0.0,
//             0.0,
//             width,
//             height,
//         );
//         cr.restore().expect("Failed to restore cairo context");

//         widget_clone.queue_draw();
//     });

//     drawing_area.upcast()
// }