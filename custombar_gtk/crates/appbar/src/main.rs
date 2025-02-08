use gtk4::prelude::*;
use gtk4::{Application, ApplicationWindow};

// Bring the gtk4-layer-shell extension traits into scope:
use gtk4_layer_shell::LayerShell;

fn main() {
    let app = Application::new(
        Some("com.example.gtk4_layer_shell_demo"),
        Default::default(),
    );

    app.connect_activate(|app| {
        let window = ApplicationWindow::new(app);
        window.set_title(Some("Wayland Dummy Bar"));
        window.set_decorated(false);

        // Initialize layer shell via the WindowExt extension trait
        window.init_layer_shell();

        // Request a "top" layer (like a panel).
        window.set_layer(gtk4_layer_shell::Layer::Top);

        // Pin (anchor) the bar to top, left, and right edges.
        window.set_anchor(gtk4_layer_shell::Edge::Top, true);
        window.set_anchor(gtk4_layer_shell::Edge::Left, true);
        window.set_anchor(gtk4_layer_shell::Edge::Right, true);

        // Set a fixed height (e.g. 30), let width expand.
        window.set_default_size(-1, 30);

        // Reserve exclusive space so other windows don’t overlap the bar.
        window.auto_exclusive_zone_enable();

        window.show();
    });

    app.run();
}
