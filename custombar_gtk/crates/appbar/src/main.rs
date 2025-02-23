use appbar::{Bar, BoxPosition};
use clock::Clock;
use gtk4::prelude::*;
use workspaces::Workspace;
use utils::logger;

fn main() {
    // Initialize the logger first thing in main
    logger::init(logger::LevelFilter::Trace);


    let bar = Bar::new();
    
    // Create clock widget and add to start position
    let workspace = Workspace::new();
    let clock = Clock::with_format(clock::TimeFormat::HoursMinutes24);
    bar.append_to(workspace.widget(), BoxPosition::Start);
    bar.append_to(clock.widget(), BoxPosition::Start);
    
    // Run the bar application
    bar.run();
}