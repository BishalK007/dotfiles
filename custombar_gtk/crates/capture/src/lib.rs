mod popup;
pub use popup::CapturePopup;

use std::rc::Rc;
use gtk4::{prelude::*, Box, Label, Orientation, Widget};
use utils::{self, logger};

pub struct Capture {
    container: Box,
}


impl Capture {
    pub fn new() -> Rc<Self> {
        let capture_icon = Label::new(Some(""));

        // Create a horizontal container.
        let container = Box::new(Orientation::Horizontal, utils::scale_size_i32(0));

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

        // Add the labels to the container.
        container.append(&capture_icon);

        // Build the Capture instance.
        let capture = Rc::new(Capture {
            container,
        });

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


    // Handle click events.
    pub fn handle_click(&self) {
        logger::info!("Capture clicked");
        
        // Assuming `self.container` is the widget you want to attach the popover to:
        let popup = crate::popup::CapturePopup::new(&self.container);
        popup.show();
        
        // Optionally, you might want to store the popup if you need to hide it later.
    }
}
