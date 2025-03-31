use std::cell::RefCell;
use std::rc::Rc;

use gtk4::prelude::*;
use gtk4::{glib::object::IsA, Popover, PositionType};


#[derive(Clone)]
pub struct PowerPopup {
    popover: Popover,
}

impl PowerPopup {
    pub fn new<T: IsA<gtk4::Widget> + ?Sized>(parent: &T) -> Self {
        

        let popover = Popover::new();
        // Attach the popover to the given parent.
        popover.set_parent(parent);
        popover.set_position(PositionType::Bottom);
        popover.set_autohide(true);
        popover.add_css_class("power-popover");

        let container = gtk4::Box::new(gtk4::Orientation::Horizontal, utils::scale_size_i32(22));
        popover.set_child(Some(&container));
        container.add_css_class("power-popover-container");

        let restart_button = gtk4::CenterBox::new();
        restart_button.add_css_class("power-popover-restart-button");
        let restart_icon = gtk4::Label::new(Some(""));
        restart_icon.add_css_class("power-popover-restart-icon");
        restart_button.set_center_widget(Some(&restart_icon));

        let power_button = gtk4::CenterBox::new();
        power_button.add_css_class("power-popover-power-button");
        let power_icon = gtk4::Label::new(Some(""));
        power_icon.add_css_class("power-popover-power-icon");
        power_button.set_center_widget(Some(&power_icon));

        let lock_button = gtk4::CenterBox::new();
        lock_button.add_css_class("power-popover-lock-button");
        let lock_icon = gtk4::Label::new(Some(""));
        lock_icon.add_css_class("power-popover-lock-icon");
        lock_button.set_center_widget(Some(&lock_icon));

        container.append(&restart_button);
        container.append(&power_button);
        container.append(&lock_button);

        utils::connect_clicked(&restart_button, move || {
            // Handle restart button click event here
            PowerPopup::handle_restart_button_click();
        });
        utils::connect_clicked(&power_button, move || {
            // Handle power button click event here
            PowerPopup::handle_power_button_click();
        });
        utils::connect_clicked(&lock_button, move || {
            // Handle lock button click event here
            PowerPopup::handle_lock_button_click();
        });

        // Create powerPopup instance.
        let popup = PowerPopup {
            popover,
        };

        popup
    }
    /// Shows the popup.
    pub fn show(&self) {
        self.popover.popup();
    }

    /// Hides the popup.
    pub fn hide(&self) {
        self.popover.popdown();
    }

    /// Returns a reference to the underlying popover widget.
    pub fn widget(&self) -> &Popover {
        &self.popover
    }

    fn handle_power_button_click() {
        // Handle power button click event here
        // For example, you can call a function to shut down the system
        std::process::Command::new("shutdown").arg("-h").arg("now").spawn().unwrap();
    }
    fn handle_restart_button_click() {
        // Handle restart button click event here
        // For example, you can call a function to restart the system
        std::process::Command::new("reboot").spawn().unwrap();
    }
    fn handle_lock_button_click() {
        // Handle lock button click event here
        // For example, you can call a function to lock the screen
        std::process::Command::new("hyprlock").spawn().unwrap();
    }
    
}

