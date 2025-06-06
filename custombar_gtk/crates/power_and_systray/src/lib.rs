mod systray_popup;
mod psutils;
mod power_popup;

pub use systray_popup::SystrayPopup;
pub use power_popup::PowerPopup;

use gtk4::{prelude::*, Label, Orientation};
use std::rc::Rc;



pub struct PowerAndSystray {
    container: gtk4::Box,
    power_icon: Label,
    systray_icon: Label,
    power_popup: PowerPopup,
    systray_popup: SystrayPopup,
}

impl PowerAndSystray {
    pub fn new() -> Rc<Self> {
        // Initilise VolumeState
        // Create the channel

        let power_icon = Label::new(Some(""));
        let systray_icon = Label::new(Some(""));

        // Create a horizontal container.
        let container = gtk4::Box::new(Orientation::Horizontal, utils::scale_size_i32(0));

        // Apply the CSS files.
        utils::apply_css_files(&[
            utils::scale_sizes(include_str!("style.css")),
            include_str!("../../../colors.css"),
        ]);

        // Set CSS classes.
        container.set_css_classes(&[
            "power-and-systray",
            "power-and-systray-box",
            "background-color",
            "border-color",
        ]);
        power_icon.set_css_classes(&[
            "power-and-systray",
            "power-and-systray-icon",
            "power-icon",
        ]);
        systray_icon.set_css_classes(&[
            "power-and-systray",
            "power-and-systray-icon",
            "systray-icon",
        ]);


        // Add the labels to the container.
        container.append(&power_icon);
        container.append(&systray_icon);

        //power popup
        let power_popup = PowerPopup::new(&container);
        let systray_popup = SystrayPopup::new(&container);

        // Build the powerAndsystray instance.
        let power_and_systray = PowerAndSystray {
            container,
            power_icon,
            systray_icon,
            power_popup,
            systray_popup,
        };

        // Wrap the instance in an Rc and connect a click event.
        let instance = Rc::new(power_and_systray);
        let instance_clone = Rc::clone(&instance);
        utils::connect_clicked(&instance.power_icon, move || {
            instance_clone.handle_power_icon_click();
        });
        let instance_clone = Rc::clone(&instance);
        utils::connect_clicked(&instance.systray_icon, move || {
            instance_clone.handle_systray_icon_click();
        });


        instance
    }
    pub fn handle_power_icon_click(&self) {
        self.systray_popup.hide();
        self.power_popup.show();
    }
    pub fn handle_systray_icon_click(&self) {
        self.power_popup.hide();
        self.systray_popup.show();
    }
    pub fn widget(&self) -> &gtk4::Box {
        &self.container
    }

}
