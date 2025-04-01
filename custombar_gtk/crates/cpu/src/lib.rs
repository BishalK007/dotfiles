use std::rc::Rc;
use std::fs::File;
use std::io::{self, BufRead};
use std::cell::RefCell;
use gtk4::prelude::*;
use gtk4::{Label, Widget, Box, Orientation};
use gtk4::glib;
use utils;

struct CpuStats {
    idle: u64,
    total: u64,
}

pub struct Cpu {
    container: Box,
    cpu_usage: Label,
    prev_stats: RefCell<Option<CpuStats>>,
}

impl Cpu {
    pub fn new() -> Rc<Self> {
        // Create labels for the cpu icon and cpu usage
        let cpu_usage = Label::new(None);
        let cpu_icon = Label::new(Some(""));
        let container = Box::new(Orientation::Horizontal, utils::scale_size_i32(0));

        // Apply the CSS files
        utils::apply_css_files(&[
            utils::scale_sizes(include_str!("style.css")),
            include_str!("../../../colors.css"),
        ]);

        // Set CSS classes.
        container.set_css_classes(&["cpu", "cpu-box", "background-color", "border-color"]);
        cpu_usage.set_css_classes(&["cpu", "cpu-label", "primary-color"]);
        cpu_icon.set_css_classes(&["cpu", "cpu-icon", "primary-color"]);

        cpu_usage.set_halign(gtk4::Align::Center);

        // Add the icon and label to the container.
        container.append(&cpu_icon);
        container.append(&cpu_usage);

        // Build the CPU instance.
        let cpu = Rc::new(Cpu {
            container,
            cpu_usage,
            prev_stats: RefCell::new(None),
        });

        // Set the initial usage and schedule the first update.
        cpu.update_cpu_usage();
        Cpu::schedule_update(&cpu);

        cpu
    }

    // Return the Box (container) as the top-level widget.
    pub fn widget(&self) -> &Widget {
        self.container.upcast_ref::<Widget>()
    }

    // Parse /proc/stat and get CPU usage statistics
    fn get_cpu_stats() -> io::Result<CpuStats> {
        let file = File::open("/proc/stat")?;
        let mut reader = io::BufReader::new(file);
        let mut line = String::new();
        
        // Read the first line which contains CPU stats
        reader.read_line(&mut line)?;
        
        // Parse CPU time values
        let values: Vec<u64> = line.split_whitespace()
            .skip(1) // Skip "cpu" label
            .take(10) // Take the relevant values
            .filter_map(|s| s.parse::<u64>().ok())
            .collect();
        
        if values.len() < 4 {
            return Err(io::Error::new(io::ErrorKind::InvalidData, "Invalid CPU stats format"));
        }
        
        // Calculate idle time (idle + iowait)
        let idle = values[3] + if values.len() > 4 { values[4] } else { 0 };
        
        // Calculate total time across all types of CPU usage
        let total: u64 = values.iter().sum();
        
        Ok(CpuStats { idle, total })
    }

    // Calculate CPU usage percentage based on previous and current stats
    fn calculate_usage(prev: &CpuStats, current: &CpuStats) -> f64 {
        let idle_diff = current.idle as f64 - prev.idle as f64;
        let total_diff = current.total as f64 - prev.total as f64;
        
        if total_diff == 0.0 {
            return 0.0;
        }
        
        // Calculate percentage of CPU in use
        let usage = 100.0 * (1.0 - idle_diff / total_diff);
        usage.max(0.0).min(100.0) // Clamp between 0% and 100%
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

    // Update the displayed CPU usage
    fn update_cpu_usage(&self) {
        // Get current CPU stats
        match Self::get_cpu_stats() {
            Ok(current_stats) => {
                let mut prev = self.prev_stats.borrow_mut();
                
                // If we have previous stats, calculate and display usage
                if let Some(ref prev_stats) = *prev {
                    let usage = Self::calculate_usage(prev_stats, &current_stats);
                    let formatted_usage = Self::format_percentage(usage);
                    self.cpu_usage.set_text(&formatted_usage);
                } else {
                    // For first run, just show "..."
                    self.cpu_usage.set_text("...");
                }
                
                // Store current stats for next update
                *prev = Some(current_stats);
            },
            Err(e) => {
                eprintln!("Failed to get CPU stats: {}", e);
                self.cpu_usage.set_text("Err");
            }
        }
    }

    // Schedule update every 1 second
    fn schedule_update(cpu: &Rc<Self>) {
        let cpu_clone = Rc::clone(cpu);
        glib::timeout_add_local(std::time::Duration::from_secs(1), move || {
            cpu_clone.update_cpu_usage();
            glib::ControlFlow::Continue
        });
    }
}