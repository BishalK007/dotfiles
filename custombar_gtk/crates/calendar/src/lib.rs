use std::rc::Rc;
use gtk4::{
    glib, prelude::*, Application, ApplicationWindow, Box, GestureClick, Label, Orientation, Widget
};
use chrono::{Local, Duration};
use gtk4::glib::source::timeout_add_local;
use utils::{self, logger};

pub struct Calendar {
    container: Box,
    day_label: Label,
    date_label: Label,
}

impl Calendar {
    pub fn new() -> Rc<Self> {
        Self::with_format()
    }
    pub fn with_format() -> Rc<Self> {
        // Create labels for the icon, day, and date.
        let calendar_icon = Label::new(Some(""));
        let calendar_day_label = Label::new(Some("Day"));
        let calendar_date_label = Label::new(Some("DD/MM/YYYY"));

        // Create a horizontal container.
        let container = Box::new(Orientation::Horizontal, 0);

        // Apply the CSS files.
        utils::apply_css_files(&[
            utils::scale_sizes(include_str!("style.css")),
            include_str!("../../../colors.css"),
        ]);

        // Set CSS classes.
        container.set_css_classes(&[
            "calendar",
            "calendar-box",
            "background-color",
            "border-color",
        ]);
        calendar_icon.set_css_classes(&["calendar", "calendar-icon", "primary-color"]);
        calendar_day_label.set_css_classes(&["calendar", "calendar-day-label", "primary-color"]);
        calendar_date_label.set_css_classes(&["calendar", "calendar-date-label", "primary-color"]);

        // Set margins.
        calendar_icon.set_margin_start(8);
        calendar_icon.set_margin_end(12);
        calendar_day_label.set_margin_end(8);
        calendar_date_label.set_margin_end(8);

        // Add the labels to the container.
        container.append(&calendar_icon);
        container.append(&calendar_day_label);
        container.append(&calendar_date_label);

        // Build the Calendar instance.
        let calendar = Rc::new(Calendar {
            container,
            day_label: calendar_day_label,
            date_label: calendar_date_label,
        });

        // Initialize with the current day and date.
        calendar.update_date();

        // Schedule the next update at midnight.
        calendar.schedule_update();

        // Connect a click event.
        let calendar_clone = Rc::clone(&calendar);
        let calendar_clone_two = Rc::clone(&calendar);
        utils::connect_clicked(&calendar_clone.container, move || {
            calendar_clone_two.handle_click();
        });

        calendar
    }

    // Return the top-level widget.
    pub fn widget(&self) -> &Widget {
        self.container.upcast_ref::<Widget>()
    }

    // Attach a click handler.


    // Update the day and date labels with the current local time.
    fn update_date(&self) {
        let now = Local::now();
        let day_str = now.format("%A").to_string();      // e.g., "Monday"
        let date_str = now.format("%d/%m/%Y").to_string(); // e.g., "27/02/2025"

        self.day_label.set_label(&day_str);
        self.date_label.set_label(&date_str);

        logger::debug!("Calendar updated: {} {}", day_str, date_str);
    }

    // Schedule the widget to update at the next midnight.
    fn schedule_update(self: &Rc<Self>) {
        let now = Local::now();
        // Calculate tomorrow's date.
        let tomorrow = now.date_naive() + Duration::days(1);
        // Next midnight (00:00:00).
        let next_midnight = tomorrow.and_hms_opt(0, 0, 0)
            .unwrap()
            .and_local_timezone(Local)
            .unwrap();
        let duration_until_midnight = next_midnight - now;
        // Convert duration to milliseconds (fallback to 24h if negative for any reason).
        let millis = if duration_until_midnight.num_milliseconds() > 0 {
            duration_until_midnight.num_milliseconds() as u64
        } else {
            24 * 60 * 60 * 1000
        };

        let calendar_clone = Rc::clone(self);
        timeout_add_local(std::time::Duration::from_millis(millis), move || {
            calendar_clone.update_date();
            // Reschedule the update for the following midnight.
            calendar_clone.schedule_update();
            glib::ControlFlow::Break
        });
    }

    // Handle click events.
    pub fn handle_click(&self) {
        logger::info!("Calendar clicked");
        // Additional click-handling code goes here.
    }
}
