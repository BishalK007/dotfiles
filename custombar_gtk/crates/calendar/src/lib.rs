mod popup;
pub use popup::CalendarPopup;

use std::rc::Rc;
use gtk4::{
    glib, prelude::*, Box, Label, Orientation, Widget
};
use chrono::{Local, Duration};
use gtk4::glib::source::timeout_add_local;
use utils::{self, logger};

pub struct Calendar {
    container: Box,
    day_label: Label,
    date_label: Label,
    day_format: CalendarDayFormat,
    date_format: CalendarDateFormat,
}

pub enum CalendarDateFormat {
    DdMmYyyy,      // 31/12/2023
    DdMmYy,        // 31/12/23
    YyyyMmDd,      // 2023/12/31
    YyMmDd,        // 23/12/31
    MmDdYyyy,      // 12/31/2023
    MmDdYy,        // 12/31/23
    DdMmmYyyy,     // 31 Dec 2023
    DdMmmYy,       // 31 Dec 23
    YyyyMmmDd,     // 2023 Dec 31
    YyMmmDd,       // 23 Dec 31
}

pub enum CalendarDayFormat {
    FULL,           // Monday
    ABBREVIATED,    // Mon
    SHORT,         // M
}

impl Calendar {
    pub fn new() -> Rc<Self> {
        Self::with_format(CalendarDayFormat::ABBREVIATED, CalendarDateFormat::DdMmmYyyy)
    }
    
    pub fn with_format(day_format: CalendarDayFormat, date_format: CalendarDateFormat) -> Rc<Self> {
        // Create labels for the icon, day, and date.
        let calendar_icon = Label::new(Some(""));
        let calendar_day_label = Label::new(Some(""));
        let calendar_date_label = Label::new(Some(""));

        // Create a horizontal container.
        let container = gtk4::Box::new(Orientation::Horizontal, utils::scale_size_i32(0));

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
        calendar_icon.set_css_classes(&["calendar", "calendar-icon", ]);
        calendar_day_label.set_css_classes(&["calendar", "calendar-day-label", ]);
        calendar_date_label.set_css_classes(&["calendar", "calendar-date-label",]);

        // Add the labels to the container.
        container.append(&calendar_icon);
        container.append(&calendar_day_label);
        container.append(&calendar_date_label);

        // Build the Calendar instance.
        let calendar = Rc::new(Calendar {
            container,
            day_label: calendar_day_label,
            date_label: calendar_date_label,
            day_format,
            date_format,
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

    // Update the day and date labels with the current local time using the chosen formats.
    fn update_date(&self) {
        let now = Local::now();

        let day_str = match self.day_format {
            CalendarDayFormat::FULL => now.format("%A").to_string(),         // Monday
            CalendarDayFormat::ABBREVIATED => now.format("%a").to_string(),    // Mon
            CalendarDayFormat::SHORT => now.format("%a").to_string().chars().next().unwrap_or_default().to_string(), // M
        };

        let date_str = match self.date_format {
            CalendarDateFormat::DdMmYyyy => now.format("%d/%m/%Y").to_string(),
            CalendarDateFormat::DdMmYy => now.format("%d/%m/%y").to_string(),
            CalendarDateFormat::YyyyMmDd => now.format("%Y/%m/%d").to_string(),
            CalendarDateFormat::YyMmDd => now.format("%y/%m/%d").to_string(),
            CalendarDateFormat::MmDdYyyy => now.format("%m/%d/%Y").to_string(),
            CalendarDateFormat::MmDdYy => now.format("%m/%d/%y").to_string(),
            CalendarDateFormat::DdMmmYyyy => now.format("%d %b %Y").to_string(),
            CalendarDateFormat::DdMmmYy => now.format("%d %b %y").to_string(),
            CalendarDateFormat::YyyyMmmDd => now.format("%Y %b %d").to_string(),
            CalendarDateFormat::YyMmmDd => now.format("%y %b %d").to_string(),
        };

        self.day_label.set_label(&day_str);
        self.date_label.set_label(&date_str);

        logger::info!("Calendar updated: {} {}", day_str, date_str);
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
        
        // Assuming `self.container` is the widget you want to attach the popover to:
        let popup = crate::popup::CalendarPopup::new(&self.container);
        popup.show();
        
        // Optionally, you might want to store the popup if you need to hide it later.
    }
}
