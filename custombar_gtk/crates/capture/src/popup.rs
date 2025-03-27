// src/popup.rs

use gtk4::ffi::GtkSwitch;
use gtk4::{prelude::*, CenterBox, Label};
use gtk4::{Box, CheckButton, Popover, PositionType};

/// A popup that shows the GTK Capture widget.
pub struct CapturePopup {
    popover: Popover,
}

impl CapturePopup {
    /// Creates a new CapturePopup with the GTK Capture widget.
    /// `parent` is the widget the popover will be attached to.
    pub fn new<T: IsA<gtk4::Widget> + ?Sized>(parent: &T) -> Self {
        let popover = Popover::new();
        // Attach the popover to the given parent.
        popover.set_parent(parent);
        popover.set_position(PositionType::Bottom);
        popover.set_autohide(true);
        popover.add_css_class("capture-popover");
        
        let container = Box::new(gtk4::Orientation::Vertical, 0);
        popover.set_child(Some(&container));
        container.add_css_class("capture-popover-container");

        



        /*
        // Image section
         */
        let img_container = Box::new(gtk4::Orientation::Vertical, 10);
        let capture_button = CenterBox::new();
        let capture_horizontal_container = Box::new(gtk4::Orientation::Horizontal, 10);
        let capture_icon = Label::new(Some(""));
        let capture_label = Label::new(Some("Capture Screen"));
        capture_horizontal_container.append(&capture_icon);
        capture_horizontal_container.append(&capture_label);
        capture_button.set_center_widget(Some(&capture_horizontal_container));
        img_container.append(&capture_button);
        // margins and stuff
        img_container.set_margin_top(16);
        img_container.set_margin_start(16);
        img_container.set_margin_end(16);
        // Img container stuff
        img_container.add_css_class("capture-popover-img-container");
        capture_button.add_css_class("capture-popover-capture-button");
        capture_label.add_css_class("capture-popover-capture-button-label");

        /*
        // Image format radio group
         */
        let img_format_box = Box::new(gtk4::Orientation::Horizontal, 16);
        img_format_box.set_halign(gtk4::Align::Center);

        let png_radio = CheckButton::with_label("PNG");
        let jpg_radio = CheckButton::with_label("JPG");
        png_radio.set_active(true);
        jpg_radio.set_group(Some(&png_radio));

        img_format_box.append(&png_radio);
        img_format_box.append(&jpg_radio);

        img_container.append(&img_format_box);
        container.append(&img_container);
        // Img radio stuff
        img_format_box.add_css_class("capture-popover-img-format-box");

        // Record section
        let record_container = Box::new(gtk4::Orientation::Vertical, 10);
        let record_button = CenterBox::new();
        let record_horizontal_container = Box::new(gtk4::Orientation::Horizontal, 10);
        let record_icon = Label::new(Some(""));
        let record_label = Label::new(Some("Record Screen"));
        record_horizontal_container.append(&record_icon);
        record_horizontal_container.append(&record_label);
        record_button.set_center_widget(Some(&record_horizontal_container));
        img_container.append(&record_button);
        // margins and stuff
        record_container.set_margin_top(16);
        record_container.set_margin_start(16);
        record_container.set_margin_end(16);
        // Record container stuff
        record_container.add_css_class("capture-popover-record-container");
        record_button.add_css_class("capture-popover-record-button");
        record_label.add_css_class("capture-popover-record-button-label");
        record_icon.add_css_class("capture-popover-record-icon");
        
        
        // Image format radio group
        let record_format_box = Box::new(gtk4::Orientation::Horizontal, 16);
        record_format_box.set_halign(gtk4::Align::Center);
        
        let png_radio = CheckButton::with_label("MKV");
        let jpg_radio = CheckButton::with_label("MP4");
        png_radio.set_active(true);
        jpg_radio.set_group(Some(&png_radio));
        
        record_format_box.append(&png_radio);
        record_format_box.append(&jpg_radio);
        
        record_container.append(&record_format_box);
        container.append(&record_container);
        // Record radio stuff
        record_format_box.add_css_class("capture-popover-record-format-box");


        /*
            Screen format radio group as segmented button
        */
        let outer_box = Box::new(gtk4::Orientation::Horizontal, 12);
        outer_box.set_margin_bottom(16);
        outer_box.set_margin_top(16);
        outer_box.set_margin_start(16); 
        outer_box.set_margin_end(16);
        outer_box.set_halign(gtk4::Align::Center);
        outer_box.add_css_class("capture-popover-screen-format-box");

        // Create toggle buttons instead of boxes
        let fs_button = gtk4::ToggleButton::new();
        fs_button.set_active(true); // Set as default selected
        let fs_box = Box::new(gtk4::Orientation::Vertical, 0);
        let fs_icon = Label::new(Some(""));
        fs_icon.set_margin_end(2);
        let fs_label = Label::new(Some("Fullscreen"));
        fs_box.append(&fs_icon);
        fs_box.append(&fs_label);
        fs_button.set_child(Some(&fs_box));
        fs_button.add_css_class("capture-mode-button");
        
        let slug_button = gtk4::ToggleButton::new();
        let slug_box = Box::new(gtk4::Orientation::Vertical, 0);
        let slug_icon = Label::new(Some(""));
        slug_icon.set_margin_end(3);
        let slug_label = Label::new(Some("Region"));
        slug_box.append(&slug_icon);
        slug_box.append(&slug_label);
        slug_button.set_child(Some(&slug_box));
        slug_button.add_css_class("capture-mode-button");

        // Group the buttons together (only one can be active at a time)
        slug_button.set_group(Some(&fs_button));

        outer_box.append(&fs_button);
        outer_box.append(&slug_button);
        container.append(&outer_box);

        /*
            Bottom horizontal box with toggle buttons
        */
        let bottom_box = Box::new(gtk4::Orientation::Horizontal, 0);
        bottom_box.set_margin_bottom(16);
        bottom_box.set_margin_start(16);
        bottom_box.set_margin_end(16);
        bottom_box.add_css_class("capture-popover-bottom-box");

        let mute_icon_box = Box::new(gtk4::Orientation::Horizontal, 8);
        mute_icon_box.add_css_class("capture-popover-mute-icon-box");
        let mute_icon = Label::new(Some(""));
        mute_icon.set_margin_end(8);
        mute_icon.add_css_class("capture-popover-mute-icon");
        let mute_switch = gtk4::Switch::new();
        mute_switch.add_css_class("capture-popover-mute-switch");
        mute_icon_box.append(&mute_icon);
        mute_icon_box.append(&mute_switch);
        mute_icon_box.set_margin_start(10);

        let mic_icon_box = Box::new(gtk4::Orientation::Horizontal, 8);
        mic_icon_box.add_css_class("capture-popover-mic-icon-box");
        let mic_icon = Label::new(Some(""));
        mic_icon.add_css_class("capture-popover-mic-icon");
        let mic_switch = gtk4::Switch::new();
        mic_switch.add_css_class("capture-popover-mic-switch");
        mic_icon_box.append(&mic_icon);
        mic_icon_box.append(&mic_switch);
        mic_icon_box.set_margin_end(10);

        // Spacer to push mute_icon_box to the left and mic_icon_box to the right.
        let spacer = Box::new(gtk4::Orientation::Horizontal, 0);
        spacer.set_hexpand(true);

        bottom_box.append(&mute_icon_box);
        bottom_box.append(&spacer);
        bottom_box.append(&mic_icon_box);
        container.append(&bottom_box);

        

        // Apply the CSS files
        utils::apply_css_files(&[
            utils::scale_sizes(include_str!("style.css")),
            include_str!("../../../colors.css"),
        ]);

        Self { popover }
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
}
