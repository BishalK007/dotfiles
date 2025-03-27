use gtk4::prelude::*;
use gtk4::{Application, ApplicationWindow, Box, Orientation, Widget};
use gtk4_layer_shell::{Edge, Layer, LayerShell};
use std::rc::Rc;
use gtk4::glib;
use utils;

#[derive(Debug, Clone, Copy)]
pub enum BoxPosition {
    Start,
    Center,
    End
}


pub struct Bar {
    app: Application,
    container: Rc<Box>,
    start_box: Rc<Box>,
    center_box: Rc<Box>,
    end_box: Rc<Box>,
}

impl Bar {
    pub fn new() -> Self {
        gtk4::init().expect("Failed to initialize GTK");
        
        // Apply the CSS files
        utils::apply_css_files(&[include_str!("style.css")]);

        let app = Application::new(
            Some("com.custombar_gtk.bar"),
            Default::default()
        );

        // Create boxes
        let container = Rc::new(Box::new(Orientation::Horizontal, 0));
        container.set_css_classes(&["bar-container"]);
        let start_box = Rc::new(Box::new(Orientation::Horizontal, 5));
        start_box.set_css_classes(&["bar-box start-box"]);
        let center_box = Rc::new(Box::new(Orientation::Horizontal, 5));
        center_box.set_css_classes(&["bar-box center-box"]);
        let end_box = Rc::new(Box::new(Orientation::Horizontal, 5));
        end_box.set_css_classes(&["bar-box end-box"]);

        // Set up container layout
        container.append(&*start_box);
        container.append(&*center_box);
        container.append(&*end_box);

        container.set_margin_top(4);
        container.set_margin_start(4);
        container.set_margin_end(4);

        center_box.set_hexpand(true);
        center_box.set_halign(gtk4::Align::Center);
        end_box.set_halign(gtk4::Align::End);

        Bar {
            app,
            container,
            start_box,
            center_box,
            end_box,
        }
    }

    pub fn run(&self) {
        let container = self.container.clone();
        
        self.app.connect_activate(glib::clone!(@strong container => move |app| {
            let window = ApplicationWindow::new(app);
            window.set_css_classes(&["bar-window"]);
            window.set_child(Some(&*container));
            window.set_title(Some("Wayland Dummy Bar"));
            window.set_decorated(false);

            gtk4::Window::set_interactive_debugging(true);
            window.init_layer_shell();
            window.set_layer(Layer::Top);
            window.set_anchor(Edge::Top, true);
            window.set_anchor(Edge::Left, true);
            window.set_anchor(Edge::Right, true);
            window.set_default_size(-1, 25);
            window.auto_exclusive_zone_enable();
            window.show();
        }));
        

        self.app.run();
    }

    pub fn append_to(&self, widget: &impl IsA<Widget>, position: BoxPosition) {
        match position {
            BoxPosition::Start => self.start_box.append(widget),
            BoxPosition::Center => self.center_box.append(widget),
            BoxPosition::End => self.end_box.append(widget),
        }
    }
    pub fn clear_box(&self, position: BoxPosition) {
        let box_to_clear = match position {
            BoxPosition::Start => self.start_box.as_ref(),
            BoxPosition::Center => self.center_box.as_ref(),
            BoxPosition::End => self.end_box.as_ref()
        };

        while let Some(child) = box_to_clear.first_child() {
            box_to_clear.remove(&child);
        }
    }

    pub fn replace_box(&mut self, new_box: Box, position: BoxPosition) {
        let rc_box = Rc::new(new_box);
        match position {
            BoxPosition::Start => self.start_box = rc_box,
            BoxPosition::Center => self.center_box = rc_box,
            BoxPosition::End => self.end_box = rc_box
        }
    }
    
    pub fn replace_container(&mut self, new_container: Box) {
        self.container = Rc::new(new_container);
    }
    
    pub fn get_box(&self, position: BoxPosition) -> &Rc<Box> {
        match position {
            BoxPosition::Start => &self.start_box,
            BoxPosition::Center => &self.center_box,
            BoxPosition::End => &self.end_box
        }
    }
}
