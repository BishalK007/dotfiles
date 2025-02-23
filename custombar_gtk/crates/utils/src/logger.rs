// use std::sync::Once;
// use log::{self, error, warn, info, debug, trace};
// use pretty_env_logger;

// // Re-export LevelFilter
// pub use log::LevelFilter;

// /// Global Once to ensure initialization is done only once
// static INIT_LOGGER: Once = Once::new();

// #[derive(Debug)]
// pub struct Logger {
//     level: LevelFilter,
// }

// impl Logger {
//     /// Create a new logger with the desired minimum [log::LevelFilter].
//     pub fn new(level: LevelFilter) -> Self {
//         Logger { level }
//     }

//     /// Initialize the logger only once. Subsequent calls to `init` do nothing.
//     pub fn init(&self) {
//         INIT_LOGGER.call_once(|| {
//             pretty_env_logger::formatted_builder()
//                 .filter_level(self.level)
//                 .parse_default_env()
//                 .init();
//             info!("Logger initialized at level {:?}", self.level);
//         });
//     }

//     /// Wrapper around log::error
//     pub fn error(msg: &str) {
//         error!("{}", msg);
//     }

//     /// Wrapper around log::warn
//     pub fn warn(msg: &str) {
//         warn!("{}", msg);
//     }

//     /// Wrapper around log::info
//     pub fn info(msg: &str) {
//         info!("{}", msg);
//     }

//     /// Wrapper around log::debug
//     pub fn debug(msg: &str) {
//         debug!("{}", msg);
//     }

//     /// Wrapper around log::trace
//     pub fn trace(msg: &str) {
//         trace!("{}", msg);
//     }
// }
// // pub use log::LevelFilter;

// // Example usage:
// // let logger = Logger::new(LevelFilter::Debug);
// // logger.init();
// // Logger::info("Some debug info");

use pretty_env_logger;
use std::sync::Once;

// Re-export the macros and LevelFilter from log
pub use log::{debug, error, info, trace, warn, LevelFilter};

static INIT_LOGGER: Once = Once::new();

/// Initialize logger only once
pub fn init(level: LevelFilter) {
    INIT_LOGGER.call_once(|| {
        pretty_env_logger::formatted_builder()
            .filter_level(level)
            .parse_default_env()
            .init();
        info!("Logger initialized at level {:?}", level);
    });
}
