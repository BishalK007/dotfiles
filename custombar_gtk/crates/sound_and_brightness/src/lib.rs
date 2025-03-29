mod sbutils;


mod sound_popup;
pub use sound_popup::SoundPopup;


use std::rc::Rc;
use gtk4::{
    prelude::*, Box, Label, Orientation
};

pub struct SoundAndBrightness {
    container: Box,
    sound_icon: Label,
    brightness_icon: Label,
}


impl SoundAndBrightness {
    pub fn new() -> Rc<Self> {
        let sound_icon = Label::new(Some(""));
        let brightness_icon = Label::new(Some(""));

        // Create a horizontal container.
        let container = Box::new(Orientation::Horizontal, 0);

        // Apply the CSS files.
        utils::apply_css_files(&[
            utils::scale_sizes(include_str!("style.css")),
            include_str!("../../../colors.css"),
        ]);

        // Set CSS classes.
        container.set_css_classes(&[
            "sound-and-brightness",
            "sound-and-brightness-box",
            "background-color",
            "border-color",
        ]);
        sound_icon.set_css_classes(&["sound-and-brightness", "sound-and-brightness-icon", ]);
        brightness_icon.set_css_classes(&["sound-and-brightness", "sound-and-brightness-icon", ]);

        // Set margins.
        sound_icon.set_margin_start(8);
        sound_icon.set_margin_end(12);
        brightness_icon.set_margin_start(8);
        brightness_icon.set_margin_end(12);

        // Add the labels to the container.
        container.append(&sound_icon);
        container.append(&brightness_icon);

        // Build the SoundAndBrightness instance.
        let sound_and_brightness = SoundAndBrightness {
            container,
            sound_icon,
            brightness_icon,
        };

        // Wrap the instance in an Rc and connect a click event.
        let instance = Rc::new(sound_and_brightness);
        let instance_clone = Rc::clone(&instance);
        utils::connect_clicked(&instance.sound_icon, move || {
            instance_clone.handle_click();
        });

        instance

    }
    pub fn handle_click(&self) {
        let sound_popup = SoundPopup::new(&self.container);
        sound_popup.show();
    }
    pub fn widget(&self) -> &Box {
        &self.container
    }

}