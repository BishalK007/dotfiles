use std::cell::RefCell;

use crate::sbutils::{self, VolumeAction};
use gtk4::glib::{timeout_add_local, ControlFlow};
use gtk4::prelude::*;
use gtk4::{glib::object::IsA, Popover, PositionType};
use utils::socket;


#[derive(Clone)]
pub struct SoundPopup {
    popover: Popover,
    vol_icon: gtk4::Label,
    vol_slider: gtk4::Scale,
    debounce_source: std::rc::Rc<RefCell<Option<gtk4::glib::SourceId>>>,
}

impl SoundPopup {
    pub fn new<T: IsA<gtk4::Widget> + ?Sized>(parent: &T) -> Self {
        

        let popover = Popover::new();
        // Attach the popover to the given parent.
        popover.set_parent(parent);
        popover.set_position(PositionType::Bottom);
        popover.set_autohide(true);
        popover.add_css_class("sound-popover");

        let container = gtk4::Box::new(gtk4::Orientation::Vertical, 10);
        popover.set_child(Some(&container));
        container.add_css_class("sound-popover-container");

        // icon and indicator
        let icon_scale_box = gtk4::Box::new(gtk4::Orientation::Horizontal, 10);
        icon_scale_box.set_valign(gtk4::Align::Center);
        icon_scale_box.add_css_class("icon-scale-box");

        let sound_icon = gtk4::Label::new(Some(""));
        sound_icon.add_css_class("sound-popover-sound-icon");

        let sound_scale =
            gtk4::Scale::new(gtk4::Orientation::Horizontal, None::<&gtk4::Adjustment>);
        sound_scale.set_range(0.0, 150.0);
        sound_scale.set_value(50.0);

        sound_scale.set_hexpand(true);
        sound_scale.add_css_class("sound-popover-sound-scale");

        icon_scale_box.append(&sound_icon);
        icon_scale_box.append(&sound_scale);

        container.append(&icon_scale_box);
        

        // Create SoundPopup instance.
        let popup = SoundPopup {
            popover,
            vol_icon: sound_icon,
            vol_slider: sound_scale,
            debounce_source: std::rc::Rc::new(RefCell::new(None))
        };

        // Initialize the popup.
        popup.update_popup(None);

        // Add a signal handler to update the popup when the volume changes.
        popup.add_slider_change_handler();

        let popup_clone = popup.clone();
        utils::connect_clicked(&popup.vol_icon, move || {
            popup_clone.handle_vol_mute_toggle();
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
    // if were changing vol from the slider itself it makes no sence to
    // set it's state again
    pub fn update_popup(&self, except_list: Option<Vec<String>>) {
        let current_volume_state = sbutils::get_volume_state();
        let current_volume_with_boost = match current_volume_state.as_ref() {
            Some(state) => (state.level + state.boost) * 100.00,
            None => 0.0,
        };
        let current_vol_icon = match current_volume_state.as_ref() {
            Some(state) => state.get_icon(),
            None => "󰴸".to_string(),
        };

        if except_list
            .as_ref()
            .map_or(true, |list| !list.contains(&"slider".to_string()))
        {
            self.vol_slider.set_value(current_volume_with_boost);
            self.vol_slider.set_range(0.0, 150.0);
        }
        if except_list
            .as_ref()
            .map_or(true, |list| !list.contains(&"slider-class".to_string()))
        {
            self.update_volume_class(current_volume_with_boost);
        }

        if except_list
            .as_ref()
            .map_or(true, |list| !list.contains(&"icon".to_string()))
        {
            self.vol_icon.set_label(&current_vol_icon);
        }
    }
    fn update_volume_class(&self, volume: f64) {
        if volume > 100.0 {
            self.vol_slider.add_css_class("sound-popover-sound-scale-boosed");
        } else {
            self.vol_slider.remove_css_class("sound-popover-sound-scale-boosed");
        }
    }

    fn add_slider_change_handler(&self) {
        // Connect value-changed signal to update system volume
        let vol_slider_clone = self.vol_slider.clone();
        let debounce_source_clone = self.debounce_source.clone();
        let popup_clone = self.clone();
        self.vol_slider.connect_value_changed(move |_| {
            
            // Convert slider value to fraction (0.0-1.5)
            let current_value = vol_slider_clone.value() / 100.0;
            println!(
                "Slider changed, scheduling volume update to: {}",
                current_value
            );
            // If there's already a pending timeout, remove it.
            if let Some(source_id) = debounce_source_clone.borrow_mut().take() {
                let _ = source_id.remove();
            }
            // Schedule volume update after 200ms
            let popup_inner_clone = popup_clone.clone();
            let debounce_source_clone_inner = debounce_source_clone.clone();
            let source_id = timeout_add_local(std::time::Duration::from_millis(200), move || {
                println!("Updating system volume to: {}", current_value);
                sbutils::change_vol(current_value);
                // Update all UI elements
                popup_inner_clone.update_popup(Some(vec!["slider".to_string()]));
                socket::send_socket_msg("/tmp/sound_and_brightness_socket", "SoundWidgetUpdate")
                    .expect("Failed to send socket message to /tmp/sound_and_brightness_socket");
                *debounce_source_clone_inner.borrow_mut() = None;
                ControlFlow::Break
            });
            *debounce_source_clone.borrow_mut() = Some(source_id);
        });
    }

    fn handle_vol_mute_toggle(&self) {
        sbutils::change_vol(VolumeAction::VolMuteToggle);
        socket::send_socket_msg("/tmp/sound_and_brightness_socket", "SoundWidgetUpdate")
                    .expect("Failed to send socket message to /tmp/sound_and_brightness_socket");
        self.update_popup(None);
    }
    
}

