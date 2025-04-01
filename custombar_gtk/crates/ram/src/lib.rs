use std::rc::Rc;
use std::fs::File;
use std::io::{self, BufRead};
use gtk4::prelude::*;
use gtk4::{Label, Widget, Box, Orientation};
use gtk4::glib;
use utils;

#[derive(Debug, Default)]
struct RamStats {
    total: u64,      // Total RAM (KB)
    available: u64,  // Available RAM (KB, directly from MemAvailable)
}

pub struct Ram {
    container: Box,
    ram_usage: Label,
}

impl Ram {
    pub fn new() -> Rc<Self> {
        // Create labels for the ram icon and ram usage
        let ram_usage = Label::new(None);
        let ram_icon = Label::new(Some(""));
        let container = Box::new(Orientation::Horizontal, utils::scale_size_i32(0));

        // Apply the CSS files
        utils::apply_css_files(&[
            utils::scale_sizes(include_str!("style.css")),
            include_str!("../../../colors.css"),
        ]);

        // Set CSS classes.
        container.set_css_classes(&["ram", "ram-box", "background-color", "border-color"]);
        ram_usage.set_css_classes(&["ram", "ram-label", "primary-color"]);
        ram_icon.set_css_classes(&["ram", "ram-icon", "primary-color"]);

        ram_usage.set_halign(gtk4::Align::Center);

        // Add the icon and label to the container.
        container.append(&ram_icon);
        container.append(&ram_usage);

        // Build the RAM instance.
        let ram = Rc::new(Ram {
            container,
            ram_usage,
        });

        // Set the initial usage and schedule updates.
        ram.update_ram_usage();
        Ram::schedule_update(&ram);

        ram
    }

    // Return the Box (container) as the top-level widget.
    pub fn widget(&self) -> &Widget {
        self.container.upcast_ref::<Widget>()
    }

    // Parse /proc/meminfo and get RAM usage statistics
    fn get_ram_stats() -> io::Result<RamStats> {
        let file = File::open("/proc/meminfo")?;
        let reader = io::BufReader::new(file);
        let mut stats = RamStats::default();
        
        for line in reader.lines() {
            let line = line?;
            
            if line.starts_with("MemTotal:") {
                stats.total = Self::parse_mem_line(&line);
            } else if line.starts_with("MemAvailable:") {
                stats.available = Self::parse_mem_line(&line);
            }
        }
        
        Ok(stats)
    }
    
    // Helper function to parse memory values from lines like "MemTotal:    8174432 kB"
    fn parse_mem_line(line: &str) -> u64 {
        line.split_whitespace()
            .nth(1)
            .and_then(|v| v.parse::<u64>().ok())
            .unwrap_or(0)
    }

    // Calculate RAM usage percentage based on stats
    fn calculate_usage(stats: &RamStats) -> f64 {
        if stats.total == 0 {
            return 0.0;
        }
        
        // Calculate used memory using MemAvailable (more accurate)
        let used = stats.total.saturating_sub(stats.available);
        let percentage = (used as f64 * 100.0) / stats.total as f64;
        
        percentage.max(0.0).min(100.0) // Clamp between 0% and 100%
    }

    // Format the percentage to ensure 3 significant digits
    fn format_percentage(percentage: f64) -> String {
        if percentage >= 100.0 {
            // For 100%, just show "100"
            "100".to_string()
        } else if percentage >= 10.0 {
            // For values >= 10, show 2 digits before decimal and 1 after (XX.X)
            format!("{:.1}", percentage)
        } else {
            // For values < 10, show 1 digit before decimal and 2 after (X.XX)
            format!("{:.2}", percentage)
        }
    }

    // Update the displayed RAM usage
    fn update_ram_usage(&self) {
        // Get current RAM stats
        match Self::get_ram_stats() {
            Ok(stats) => {
                let usage = Self::calculate_usage(&stats);
                let formatted_usage = Self::format_percentage(usage);
                self.ram_usage.set_text(&formatted_usage);
            },
            Err(e) => {
                eprintln!("Failed to get RAM stats: {}", e);
                self.ram_usage.set_text("Err");
            }
        }
    }

    // Schedule update every 2 seconds
    fn schedule_update(ram: &Rc<Self>) {
        let ram_clone = Rc::clone(ram);
        glib::timeout_add_local(std::time::Duration::from_secs(2), move || {
            ram_clone.update_ram_usage();
            glib::ControlFlow::Continue
        });
    }
}