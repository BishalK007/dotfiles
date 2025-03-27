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
