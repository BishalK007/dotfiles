use std::cell::RefCell;

use crate::sbutils::{self, systrayAction};
use gtk4::glib::{timeout_add_local, ControlFlow};
use gtk4::prelude::*;
use gtk4::{glib::object::IsA, Popover, PositionType};
use utils::socket;

#[derive(Clone)]
pub struct systrayPopup {
    popover: Popover,
    systray_icon: gtk4::Label,
    systray_slider: gtk4::Scale,
    debounce_source: std::rc::Rc<RefCell<Option<gtk4::glib::SourceId>>>,
}

impl systrayPopup {
    pub fn new<T: IsA<gtk4::Widget> + ?Sized>(parent: &T) -> Self {
        let popover = Popover::new();
        // Attach the popover to the given parent.
        popover.set_parent(parent);
        popover.set_position(PositionType::Bottom);
        popover.set_autohide(true);
        popover.add_css_class("systray-popover");

        let container = gtk4::Box::new(gtk4::Orientation::Vertical, 10);
        popover.set_child(Some(&container));
        container.add_css_class("systray-popover-container");

        // icon and indicator
        let icon_scale_box = gtk4::Box::new(gtk4::Orientation::Horizontal, 10);
        icon_scale_box.set_valign(gtk4::Align::Center);
        icon_scale_box.add_css_class("icon-scale-box");

        let systray_icon = gtk4::Label::new(Some(""));
        systray_icon.add_css_class("systray-popover-systray-icon");

        let systray_scale =
            gtk4::Scale::new(gtk4::Orientation::Horizontal, None::<&gtk4::Adjustment>);
        systray_scale.set_range(5.0, 100.0);  // Set minimum to 5% instead of 0%
        systray_scale.set_value(50.0);

        systray_scale.set_hexpand(true);
        systray_scale.add_css_class("systray-popover-systray-scale");

        icon_scale_box.append(&systray_icon);
        icon_scale_box.append(&systray_scale);

        container.append(&icon_scale_box);

        // Create systrayPopup instance.
        let popup = systrayPopup {
            popover,
            systray_icon,
            systray_slider: systray_scale,
            debounce_source: std::rc::Rc::new(RefCell::new(None))
        };

        // Initialize the popup.
        popup.update_popup(None);

        // Add a signal handler to update the popup when the systray changes.
        popup.add_slider_change_handler();

        let popup_clone = popup.clone();
        utils::connect_clicked(&popup.systray_icon, move || {
            popup_clone.handle_systray_toggle();
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
    // if we're changing systray from the slider itself it makes no sense to
    // set its state again
    pub fn update_popup(&self, except_list: Option<Vec<String>>) {
        let current_systray_state = sbutils::get_systray_state();
        let current_systray = match current_systray_state.as_ref() {
            Some(state) => state.level * 100.0,
            None => 5.0,  // Default to 5% if no state
        };
        let current_systray_icon = match current_systray_state.as_ref() {
            Some(state) => state.get_icon(),
            None => "󰃞".to_string(),
        };

        if except_list
            .as_ref()
            .map_or(true, |list| !list.contains(&"slider".to_string()))
        {
            self.systray_slider.set_value(current_systray);
            self.systray_slider.set_range(5.0, 100.0);  // Ensure minimum is 5%
        }

        if except_list
            .as_ref()
            .map_or(true, |list| !list.contains(&"icon".to_string()))
        {
            self.systray_icon.set_label(&current_systray_icon);
        }
    }

    fn add_slider_change_handler(&self) {
        // Connect value-changed signal to update system systray
        let systray_slider_clone = self.systray_slider.clone();
        let debounce_source_clone = self.debounce_source.clone();
        let popup_clone = self.clone();
        self.systray_slider.connect_value_changed(move |_| {
            
            // Convert slider value to fraction (0.0-1.0)
            let current_value = systray_slider_clone.value() / 100.0;
            utils::logger::info!(
                "Slider changed, scheduling systray update to: {}",
                current_value
            );
            // If there's already a pending timeout, remove it.
            if let Some(source_id) = debounce_source_clone.borrow_mut().take() {
                let _ = source_id.remove();
            }
            // Schedule systray update after 200ms
            let popup_inner_clone = popup_clone.clone();
            let debounce_source_clone_inner = debounce_source_clone.clone();
            let source_id = timeout_add_local(std::time::Duration::from_millis(200), move || {
                utils::logger::info!("Updating system systray to: {}", current_value);
                sbutils::change_systray(current_value);
                // Update all UI elements
                popup_inner_clone.update_popup(Some(vec!["slider".to_string()]));
                socket::send_socket_msg("/tmp/power_and_systray_socket", "systrayWidgetUpdate")
                    .expect("Failed to send socket message to /tmp/power_and_systray_socket");
                *debounce_source_clone_inner.borrow_mut() = None;
                ControlFlow::Break
            });
            *debounce_source_clone.borrow_mut() = Some(source_id);
        });
    }

    fn handle_systray_toggle(&self) {
        // Toggle between max systray and low systray (5%)
        let current_systray_state = sbutils::get_systray_state();
        let current_level = match current_systray_state.as_ref() {
            Some(state) => state.level,
            None => 0.05,
        };
        
        if current_level > 0.05 {
            sbutils::change_systray(0.05);  // Set to 5% instead of 25%
        } else {
            sbutils::change_systray(1.0);
        }
        
        socket::send_socket_msg("/tmp/power_and_systray_socket", "systrayWidgetUpdate")
            .expect("Failed to send socket message to /tmp/power_and_systray_socket");
        self.update_popup(None);
    }
}