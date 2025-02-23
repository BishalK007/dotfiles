use gtk4::prelude::*;
use gtk4::{Label, Widget};
use chrono::{Local, DateTime};
use std::time::Duration;
use gtk4::glib;
use gtk4::{Box, Orientation};
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

pub struct Clock {
    container: Box,
    label: Label,
    format: TimeFormat,
    update_interval: Duration,
}

impl Clock {
    pub fn new() -> Self {
        Self::with_format(TimeFormat::HoursMinutes24)
    }

    pub fn with_format(format: TimeFormat) -> Self {
        let label = Label::new(None);
        let clock_icon = Label::new(Some("󰥔"));
        let container = Box::new(Orientation::Horizontal, 0);

        // Apply the CSS files
        // utils::apply_css_files(&[include_str!("style.css"), include_str!("../../../colors.css")]);
        utils::apply_css_files(&[utils::scale_sizes(include_str!("style.css")), include_str!("../../../colors.css")]);
        
        // Set CSS classes
        container.set_css_classes(&["clock", "clock-box", "background-color", "border-color"]);
        label.set_css_classes(&["clock", "clock-label", "primary-color"]);
        clock_icon.set_css_classes(&["clock", "clock-icon", "primary-color"]);
        
        // do some paddings and margins-
        clock_icon.set_margin_start(8);
        clock_icon.set_margin_end(12);
        label.set_margin_end(8);
        
        label.set_halign(gtk4::Align::Center);

        // Add label to container
        container.append(&clock_icon);
        container.append(&label);

        let clock = Clock {
            container,
            label,
            format,
            update_interval: Duration::from_secs(1),
        };
        clock.start_timer();
        clock
    }

    pub fn set_format(&mut self, format: TimeFormat) {
        self.format = format;
        self.update_time();
    }

    pub fn set_update_interval(&mut self, interval: Duration) {
        self.update_interval = interval;
    }

    // Return the Box (container) as the top-level widget.
    pub fn widget(&self) -> &Widget {
        self.container.as_ref()
    }

    fn update_time(&self) {
        let now: DateTime<Local> = Local::now();
        let time_str = match self.format {
            TimeFormat::Hours24 => now.format("%H"),
            TimeFormat::HoursMinutes24 => now.format("%H:%M"),
            TimeFormat::HoursMinutesSeconds24 => now.format("%H:%M:%S"),
            TimeFormat::Hours12 => now.format("%I %p"),
            TimeFormat::HoursMinutes12 => now.format("%I:%M %p"),
            TimeFormat::HoursMinutesSeconds12 => now.format("%I:%M:%S %p"),
        };
        self.label.set_text(&time_str.to_string());
    }

    fn start_timer(&self) {
        let label_weak = glib::WeakRef::new();
        label_weak.set(Some(&self.label));
        let format = self.format;

        glib::timeout_add_local(self.update_interval, move || {
            if let Some(label) = label_weak.upgrade() {
                let now: DateTime<Local> = Local::now();
                let time_str = match format {
                    TimeFormat::Hours24 => now.format("%H"),
                    TimeFormat::HoursMinutes24 => now.format("%H:%M"),
                    TimeFormat::HoursMinutesSeconds24 => now.format("%H:%M:%S"),
                    TimeFormat::Hours12 => now.format("%I %p"),
                    TimeFormat::HoursMinutes12 => now.format("%I:%M %p"),
                    TimeFormat::HoursMinutesSeconds12 => now.format("%I:%M:%S %p"),
                };
                label.set_text(&time_str.to_string());
            }
            glib::ControlFlow::Continue
        });
    }
}
