use std::rc::Rc;
use gtk4::{prelude::*, Box, GestureClick, Label, Orientation, Widget};
use utils::{self, logger};

pub struct HomeBtn {
    container: Box,
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
        });
        
        // Clone the Rc pointer to capture it in the closure
        let home_btn_clone = Rc::clone(&home_btn);
        let home_btn_clone_two = Rc::clone(&home_btn);
        utils::connect_clicked(&home_btn_clone.container, move || {
            home_btn_clone_two.handle_click();
        });
        
        home_btn
    }

    // Return the Box (container) as the top-level widget.
    pub fn widget(&self) -> &Widget {
        self.container.as_ref()
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
