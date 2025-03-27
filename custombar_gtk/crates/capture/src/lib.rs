mod popup;
pub use popup::CapturePopup;

use std::rc::Rc;
use gtk4::{
    glib, prelude::*, Box, Label, Orientation, Widget
};
use chrono::{Local, Duration};
use gtk4::glib::source::timeout_add_local;
use utils::{self, logger};

pub struct Capture {
    container: Box,
}


impl Capture {
    pub fn new() -> Rc<Self> {
        let capture_icon = Label::new(Some(""));

        // Create a horizontal container.
        let container = Box::new(Orientation::Horizontal, 0);

        // Apply the CSS files.
        utils::apply_css_files(&[
            utils::scale_sizes(include_str!("style.css")),
            include_str!("../../../colors.css"),
        ]);

        // Set CSS classes.
        container.set_css_classes(&[
            "capture",
            "capture-box",
            "background-color",
            "border-color",
        ]);
        capture_icon.set_css_classes(&["capture", "capture-icon", ]);

        // Set margins.
        capture_icon.set_margin_start(8);
        capture_icon.set_margin_end(12);

        // Add the labels to the container.
        container.append(&capture_icon);

        // Build the Capture instance.
        let capture = Rc::new(Capture {
            container,
        });

        // Initialize with the current day and date.
        // capture.update_date();

        // Schedule the next update at midnight.
        // capture.schedule_update();

        // Connect a click event.
        let capture_clone = Rc::clone(&capture);
        let capture_clone_two = Rc::clone(&capture);
        utils::connect_clicked(&capture_clone.container, move || {
            capture_clone_two.handle_click();
        });

        capture
    }

    // Return the top-level widget.
    pub fn widget(&self) -> &Widget {
        self.container.upcast_ref::<Widget>()
    }

    

    // Schedule the widget to update at the next midnight.
    fn schedule_update(self: &Rc<Self>) {
        let now = Local::now();
        // Calculate tomorrow's date.
        let tomorrow = now.date_naive() + Duration::days(1);
        // Next midnight (00:00:00).
        let next_midnight = tomorrow.and_hms_opt(0, 0, 0)
            .unwrap()
            .and_local_timezone(Local)
            .unwrap();
        let duration_until_midnight = next_midnight - now;
        // Convert duration to milliseconds (fallback to 24h if negative for any reason).
        let millis = if duration_until_midnight.num_milliseconds() > 0 {
            duration_until_midnight.num_milliseconds() as u64
        } else {
            24 * 60 * 60 * 1000
        };

        let capture_clone = Rc::clone(self);
        timeout_add_local(std::time::Duration::from_millis(millis), move || {
            // capture_clone.update_date();
            // Reschedule the update for the following midnight.
            capture_clone.schedule_update();
            glib::ControlFlow::Break
        });
    }

    // Handle click events.
    pub fn handle_click(&self) {
        logger::info!("Capture clicked");
        
        // Assuming `self.container` is the widget you want to attach the popover to:
        let popup = crate::popup::CapturePopup::new(&self.container);
        popup.show();
        
        // Optionally, you might want to store the popup if you need to hide it later.
    }
}
