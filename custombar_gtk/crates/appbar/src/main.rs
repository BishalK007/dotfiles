use appbar::{Bar, BoxPosition};
use capture::Capture;
use clock::Clock;
use cpu::Cpu;
use home_btn::HomeBtn;
use ram::Ram;
use sound_and_brightness::SoundAndBrightness; 
use power_and_systray::PowerAndSystray;
use workspaces::Workspace;
use calendar::Calendar;
use utils::logger;
fn main() {
    // Initialize the logger first thing in main
    logger::init(logger::LevelFilter::Trace);


    let bar = Bar::new();
    
    // Create clock widget and add to start position
    let workspace = Workspace::new();
    let home_btn = HomeBtn::new();
    let clock = Clock::with_format(clock::TimeFormat::HoursMinutes24);
    let calendar = Calendar::new();
    let capture = Capture::new();
    let cpu = Cpu::new();
    let ram = Ram::new();
    let sound_and_brightness = SoundAndBrightness::new();
    let systray_and_power = PowerAndSystray::new();
    bar.append_to(workspace.widget(), BoxPosition::Start);
    bar.append_to(home_btn.widget(), BoxPosition::Start);
    bar.append_to(calendar.widget(), BoxPosition::End);
    bar.append_to(clock.widget(), BoxPosition::Start);
    bar.append_to(capture.widget(), BoxPosition::End);
    bar.append_to(ram.widget(), BoxPosition::End);
    bar.append_to(cpu.widget(), BoxPosition::End);
    bar.append_to(sound_and_brightness.widget(), BoxPosition::End);
    bar.append_to(systray_and_power.widget(), BoxPosition::End);
    
    // Run the bar application
    bar.run();
}