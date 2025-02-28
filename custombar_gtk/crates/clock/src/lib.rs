use std::rc::Rc;
use gtk4::prelude::*;
use gtk4::{Label, Widget, Box, Orientation};
use chrono::{Local, Duration as ChronoDuration, Timelike};
use gtk4::glib;
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
}

impl Clock {
    pub fn new() -> Rc<Self> {
        Self::with_format(TimeFormat::HoursMinutes24)
    }

    pub fn with_format(format: TimeFormat) -> Rc<Self> {
        // Create labels for the clock icon and time display.
        let label = Label::new(None);
        let clock_icon = Label::new(Some("󰥔"));
        let container = Box::new(Orientation::Horizontal, 0);

        // Apply the CSS files
        utils::apply_css_files(&[
            utils::scale_sizes(include_str!("style.css")),
            include_str!("../../../colors.css"),
        ]);

        // Set CSS classes.
        container.set_css_classes(&["clock", "clock-box", "background-color", "border-color"]);
        label.set_css_classes(&["clock", "clock-label", "primary-color"]);
        clock_icon.set_css_classes(&["clock", "clock-icon", "primary-color"]);

        // Set paddings and margins.
        clock_icon.set_margin_start(8);
        clock_icon.set_margin_end(12);
        label.set_margin_end(8);
        label.set_halign(gtk4::Align::Center);

        // Add the icon and label to the container.
        container.append(&clock_icon);
        container.append(&label);

        // Build the Clock instance.
        let clock = Rc::new(Clock {
            container,
            label,
            format,
        });

        // Set the initial time and schedule the first update.
        clock.update_time();
        Clock::schedule_update(&clock);

        clock
    }

    pub fn set_format(&mut self, format: TimeFormat) {
        self.format = format;
        self.update_time();
        // When changing format, it might be good to reschedule the update.
        // (If you want to allow dynamic interval changes, you can extend this.)
    }

    // Return the Box (container) as the top-level widget.
    pub fn widget(&self) -> &Widget {
        self.container.upcast_ref::<Widget>()
    }

    // Update the displayed time based on the current format.
    fn update_time(&self) {
        let now = Local::now();
        let time_str = match self.format {
            TimeFormat::Hours24 => now.format("%H").to_string(),
            TimeFormat::HoursMinutes24 => now.format("%H:%M").to_string(),
            TimeFormat::HoursMinutesSeconds24 => now.format("%H:%M:%S").to_string(),
            TimeFormat::Hours12 => now.format("%I %p").to_string(),
            TimeFormat::HoursMinutes12 => now.format("%I:%M %p").to_string(),
            TimeFormat::HoursMinutesSeconds12 => now.format("%I:%M:%S %p").to_string(),
        };
        self.label.set_text(&time_str);
    }

    // Compute the delay (in milliseconds) until the next update is needed.
    fn compute_delay(&self) -> u32 {
        let now = Local::now();
        let next_update = match self.format {
            TimeFormat::Hours24 | TimeFormat::Hours12 => {
                // Next update: beginning of the next hour.
                now.with_minute(0)
                    .and_then(|t| t.with_second(0))
                    .and_then(|t| t.with_nanosecond(0))
                    .unwrap() + ChronoDuration::hours(1)
            },
            TimeFormat::HoursMinutes24 | TimeFormat::HoursMinutes12 => {
                // Next update: beginning of the next minute.
                now.with_second(0)
                    .and_then(|t| t.with_nanosecond(0))
                    .unwrap() + ChronoDuration::minutes(1)
            },
            TimeFormat::HoursMinutesSeconds24 | TimeFormat::HoursMinutesSeconds12 => {
                // Next update: beginning of the next second.
                now.with_nanosecond(0).unwrap() + ChronoDuration::seconds(1)
            },
        };
        let delay = next_update - now;
        // Convert to milliseconds (if negative for any reason, default to 1000ms)
        if delay.num_milliseconds() > 0 {
            delay.num_milliseconds() as u32
        } else {
            1000
        }
    }

    // Schedule an update at the precise time when the display should change.
    fn schedule_update(clock: &Rc<Self>) {
        let delay_ms = clock.compute_delay();
        // Clone the Rc so we can use it inside the closure.
        let clock_clone = Rc::clone(clock);
        glib::timeout_add_local(std::time::Duration::from_millis(delay_ms as u64), move || {
            clock_clone.update_time();
            // Reschedule the next update recursively.
            Clock::schedule_update(&clock_clone);
            glib::ControlFlow::Break
        });
    }
}
