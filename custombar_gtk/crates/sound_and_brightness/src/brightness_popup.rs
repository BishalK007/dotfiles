use std::cell::RefCell;

use crate::sbutils::{self, BrightnessAction};
use gtk4::glib::{timeout_add_local, ControlFlow};
use gtk4::prelude::*;
use gtk4::{glib::object::IsA, Popover, PositionType};
use utils::socket;

#[derive(Clone)]
pub struct BrightnessPopup {
    popover: Popover,
    brightness_icon: gtk4::Label,
    brightness_slider: gtk4::Scale,
    debounce_source: std::rc::Rc<RefCell<Option<gtk4::glib::SourceId>>>,
}

impl BrightnessPopup {
    pub fn new<T: IsA<gtk4::Widget> + ?Sized>(parent: &T) -> Self {
        let popover = Popover::new();
        // Attach the popover to the given parent.
        popover.set_parent(parent);
        popover.set_position(PositionType::Bottom);
        popover.set_autohide(true);
        popover.add_css_class("brightness-popover");

        let container = gtk4::Box::new(gtk4::Orientation::Vertical, 10);
        popover.set_child(Some(&container));
        container.add_css_class("brightness-popover-container");

        // icon and indicator
        let icon_scale_box = gtk4::Box::new(gtk4::Orientation::Horizontal, 10);
        icon_scale_box.set_valign(gtk4::Align::Center);
        icon_scale_box.add_css_class("icon-scale-box");

        let brightness_icon = gtk4::Label::new(Some(""));
        brightness_icon.add_css_class("brightness-popover-brightness-icon");

        let brightness_scale =
            gtk4::Scale::new(gtk4::Orientation::Horizontal, None::<&gtk4::Adjustment>);
        brightness_scale.set_range(5.0, 100.0);  // Set minimum to 5% instead of 0%
        brightness_scale.set_value(50.0);

        brightness_scale.set_hexpand(true);
        brightness_scale.add_css_class("brightness-popover-brightness-scale");

        icon_scale_box.append(&brightness_icon);
        icon_scale_box.append(&brightness_scale);

        container.append(&icon_scale_box);

        // Create BrightnessPopup instance.
        let popup = BrightnessPopup {
            popover,
            brightness_icon,
            brightness_slider: brightness_scale,
            debounce_source: std::rc::Rc::new(RefCell::new(None))
        };

        // Initialize the popup.
        popup.update_popup(None);

        // Add a signal handler to update the popup when the brightness changes.
        popup.add_slider_change_handler();

        let popup_clone = popup.clone();
        utils::connect_clicked(&popup.brightness_icon, move || {
            popup_clone.handle_brightness_toggle();
        });

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
    
    // basically we wanna not update the stuff in the except_list
    // if we're changing brightness from the slider itself it makes no sense to
    // set its state again
    pub fn update_popup(&self, except_list: Option<Vec<String>>) {
        let current_brightness_state = sbutils::get_brightness_state();
        let current_brightness = match current_brightness_state.as_ref() {
            Some(state) => state.level * 100.0,
            None => 5.0,  // Default to 5% if no state
        };
        let current_brightness_icon = match current_brightness_state.as_ref() {
            Some(state) => state.get_icon(),
            None => "󰃞".to_string(),
        };

        if except_list
            .as_ref()
            .map_or(true, |list| !list.contains(&"slider".to_string()))
        {
            self.brightness_slider.set_value(current_brightness);
            self.brightness_slider.set_range(5.0, 100.0);  // Ensure minimum is 5%
        }

        if except_list
            .as_ref()
            .map_or(true, |list| !list.contains(&"icon".to_string()))
        {
            self.brightness_icon.set_label(&current_brightness_icon);
        }
    }

    fn add_slider_change_handler(&self) {
        // Connect value-changed signal to update system brightness
        let brightness_slider_clone = self.brightness_slider.clone();
        let debounce_source_clone = self.debounce_source.clone();
        let popup_clone = self.clone();
        self.brightness_slider.connect_value_changed(move |_| {
            
            // Convert slider value to fraction (0.0-1.0)
            let current_value = brightness_slider_clone.value() / 100.0;
            println!(
                "Slider changed, scheduling brightness update to: {}",
                current_value
            );
            // If there's already a pending timeout, remove it.
            if let Some(source_id) = debounce_source_clone.borrow_mut().take() {
                let _ = source_id.remove();
            }
            // Schedule brightness update after 200ms
            let popup_inner_clone = popup_clone.clone();
            let debounce_source_clone_inner = debounce_source_clone.clone();
            let source_id = timeout_add_local(std::time::Duration::from_millis(200), move || {
                println!("Updating system brightness to: {}", current_value);
                sbutils::change_brightness(current_value);
                // Update all UI elements
                popup_inner_clone.update_popup(Some(vec!["slider".to_string()]));
                socket::send_socket_msg("/tmp/sound_and_brightness_socket", "BrightnessWidgetUpdate")
                    .expect("Failed to send socket message to /tmp/sound_and_brightness_socket");
                *debounce_source_clone_inner.borrow_mut() = None;
                ControlFlow::Break
            });
            *debounce_source_clone.borrow_mut() = Some(source_id);
        });
    }

    fn handle_brightness_toggle(&self) {
        // Toggle between max brightness and low brightness (5%)
        let current_brightness_state = sbutils::get_brightness_state();
        let current_level = match current_brightness_state.as_ref() {
            Some(state) => state.level,
            None => 0.05,
        };
        
        if current_level > 0.05 {
            sbutils::change_brightness(0.05);  // Set to 5% instead of 25%
        } else {
            sbutils::change_brightness(1.0);
        }
        
        socket::send_socket_msg("/tmp/sound_and_brightness_socket", "BrightnessWidgetUpdate")
            .expect("Failed to send socket message to /tmp/sound_and_brightness_socket");
        self.update_popup(None);
    }
}