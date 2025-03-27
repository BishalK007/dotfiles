// src/popup.rs

use gtk4::prelude::*;
use gtk4::{Calendar as GtkCalendar, Popover, PositionType, Widget};

/// A popup that shows the GTK Calendar widget.
pub struct CalendarPopup {
    popover: Popover,
}

impl CalendarPopup {
    /// Creates a new CalendarPopup with the GTK Calendar widget.
    /// `parent` is the widget the popover will be attached to.
    pub fn new<T: IsA<gtk4::Widget> + ?Sized>(parent: &T) -> Self {

        // Apply the CSS files.
        utils::apply_css_files(&[ 
            utils::scale_sizes(include_str!("style.css")),
            include_str!("../../../colors.css"),
        ]);

        // Create a new GTK Calendar widget.
        let gtk_calendar = GtkCalendar::new();
        // Create a new Popover.
        let popover = Popover::new();

        gtk_calendar.set_css_classes(&["calendar", "calendar-gtk-calendar"]);
        popover.set_css_classes(&["calendar", "calendar-popover", ]);

        // Attach the popover to the given parent.
        popover.set_parent(parent);
        popover.set_position(PositionType::Bottom);
        // Set the GTK Calendar as the child of the popover.
        popover.set_child(Some(gtk_calendar.upcast_ref::<Widget>()));
        popover.set_autohide(true);
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

