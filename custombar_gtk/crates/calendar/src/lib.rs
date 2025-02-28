use std::rc::Rc;
use gtk4::{prelude::*, Box, GestureClick, Label, Orientation, Widget};
use utils::{self, logger};



pub struct Calendar {
    container: Box,
}

impl Calendar {
    pub fn new() -> Rc<Self> {
        let calendar_icon = Label::new(Some(""));
        let calendar_day_label = Label::new(Some("Day"));
        let calendar_date_label = Label::new(Some("DD/MM/YYYY"));
        let container = Box::new(Orientation::Horizontal, 0);

        // Apply the CSS files
        utils::apply_css_files(&[
            utils::scale_sizes(include_str!("style.css")), 
            include_str!("../../../colors.css")
        ]);
        
        // Set CSS classes
        container.set_css_classes(&["calendar", "calendar-box", "background-color", "border-color"]);
        calendar_icon.set_css_classes(&["calendar", "calendar-icon", "primary-color"]);
        calendar_day_label.set_css_classes(&["calendar", "calendar-day-label", "primary-color"]);
        calendar_date_label.set_css_classes(&["calendar", "calendar-date-label", "primary-color"]);
        
        // Do some paddings and margins
        calendar_icon.set_margin_start(8);
        calendar_icon.set_margin_end(12);
        calendar_day_label.set_margin_end(8);
        calendar_date_label.set_margin_end(8);

        // Add label to container
        container.append(&calendar_icon); 
        container.append(&calendar_day_label); 
        container.append(&calendar_date_label); 

        let calendar = Rc::new(Calendar {
            container,
        });
        
        // Clone the Rc pointer to capture it in the closure
        let calendar_clone = Rc::clone(&calendar);
        calendar.connect_clicked(move || {
            calendar_clone.handle_click();
        });
        
        calendar
    }

    // Return the Box (container) as the top-level widget.
    pub fn widget(&self) -> &Widget {
        self.container.as_ref()
    }

    pub fn connect_clicked<F>(&self, handler: F)
    where
        F: Fn() + 'static,
    {
        let gesture = GestureClick::new();
        gesture.connect_pressed(move |_, _, _, _| {
            handler();
        });
        self.container.add_controller(gesture);
    }

    pub fn handle_click(&self) {
        match std::env::var("FILE_MANAGER") {
            Ok(file_manager) => {
                if let Err(e) = std::process::Command::new(&file_manager)
                    .arg(std::env::var("HOME").unwrap_or_default())
                    .spawn()
                {
                    logger::error!("Failed to launch file manager: {}", e);
                }
            },
            Err(e) => {
                logger::error!("FILE_MANAGER environment variable not set: {}", e);
            }
        }
    }
}
