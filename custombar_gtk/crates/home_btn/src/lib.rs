use std::rc::Rc;
use gtk4::{prelude::*, GestureClick, Label, Widget, Box, Orientation};
use utils;

#[derive(Clone, Copy)]
pub enum TimeFormat {
    Hours24,                // HH
    HoursMinutes24,         // HH:mm
    HoursMinutesSeconds24,  // HH:mm:ss
    Hours12,                // hh (AM/PM)
    HoursMinutes12,         // hh:mm (AM/PM)
    HoursMinutesSeconds12,  // hh:mm:ss (AM/PM)
}

pub struct HomeBtn {
    container: Box,
    icon_label: Label,
}

impl HomeBtn {
    pub fn new() -> Rc<Self> {
        let home_btn_icon = Label::new(Some(""));
        let container = Box::new(Orientation::Horizontal, 0);

        // Apply the CSS files
        utils::apply_css_files(&[
            utils::scale_sizes(include_str!("style.css")), 
            include_str!("../../../colors.css")
        ]);
        
        // Set CSS classes
        container.set_css_classes(&["home_btn", "home_btn-box", "background-color", "border-color"]);
        home_btn_icon.set_css_classes(&["home_btn", "home_btn-icon", "primary-color"]);
        
        // Do some paddings and margins
        home_btn_icon.set_margin_start(8);
        home_btn_icon.set_margin_end(12);

        // Add label to container
        container.append(&home_btn_icon);

        let home_btn = Rc::new(HomeBtn {
            container,
            icon_label: home_btn_icon,
        });
        
        // Clone the Rc pointer to capture it in the closure
        let home_btn_clone = Rc::clone(&home_btn);
        home_btn.connect_clicked(move || {
            home_btn_clone.handle_click();
        });
        
        home_btn
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
        let file_manager = std::env::var("FILE_MANAGER").unwrap_or_else(|_| "thunar".to_string());
        std::process::Command::new(&file_manager)
            .arg(std::env::var("HOME").unwrap_or_default())
            .spawn()
            .ok();
    }
}
