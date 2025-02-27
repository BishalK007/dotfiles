use async_channel::unbounded;
use gtk4::{glib, EventControllerMotion};
use gtk4::{prelude::*, CenterBox};
use gtk4::{Box, Orientation};
use gtk4::{Label, Widget};
use regex::Regex;
use std::env;
use std::io::{BufRead, BufReader, Write};
use std::os::unix::net::UnixStream;
use std::thread;
use utils::{self, logger};

pub struct Workspace {
    container: Box,
    workspace_label: Label,
    // Store the arrow boxes so we can attach events later.
    left_arrow_box: CenterBox,
    right_arrow_box: CenterBox,
}

impl Workspace {
    pub fn new() -> Self {
        // Create the main horizontal container.
        let container: Box = gtk4::Box::new(Orientation::Horizontal, 0);

        // Create the workspace number label.
        let workspace_num = Label::new(Some("11"));
        let workspace_num_inner_box = gtk4::Box::new(Orientation::Horizontal, 0);
        let workspace_num_box = CenterBox::new();

        // Create arrow labels.
        let left_arrow = Label::new(Some("")); // (Flipped using CSS)
        let right_arrow = Label::new(Some(""));

        // Create arrow boxes.
        let left_arrow_box = CenterBox::new();
        let right_arrow_box = CenterBox::new();

        // Apply the CSS files.
        utils::apply_css_files(&[
            utils::scale_sizes(include_str!("style.css")),
            include_str!("../../../colors.css"),
        ]);

        // Set CSS classes for styling.
        container.set_css_classes(&[
            "workspace",
            "workspace-box",
            "background-color",
            "border-color",
        ]);
        workspace_num.set_css_classes(&[
            "workspace",
            "workspace-num",
            "background-color-primary",
            "primary-color-bg",
        ]);
        workspace_num_box.set_css_classes(&["workspace", "workspace-num-box"]);
        left_arrow.set_css_classes(&[
            "workspace",
            "workspace-arrow",
            "workspace-left-arrow",
            "primary-color",
        ]);
        left_arrow_box.set_css_classes(&[
            "workspace",
            "workspace-arrow",
            "workspace-left-arrow-box",
        ]);
        right_arrow.set_css_classes(&[
            "workspace",
            "workspace-arrow",
            "workspace-right-arrow",
            "primary-color",
        ]);
        right_arrow_box.set_css_classes(&[
            "workspace",
            "workspace-arrow",
            "workspace-right-arrow-box",
        ]);

        // Set alignment.
        workspace_num.set_valign(gtk4::Align::Center);

        // Build the hierarchy.
        workspace_num_inner_box.append(&workspace_num);
        workspace_num_box.set_center_widget(Some(&workspace_num_inner_box));
        left_arrow_box.set_center_widget(Some(&left_arrow));
        right_arrow_box.set_center_widget(Some(&right_arrow));

        container.append(&left_arrow_box);
        container.append(&workspace_num_box);
        container.append(&right_arrow_box);

        let workspace = Workspace {
            container,
            workspace_label: workspace_num,
            left_arrow_box,
            right_arrow_box,
        };

        // Attach mouse click events to the arrow boxes.
        workspace.attach_events();

        // Initialise the workspace label and start listening for updates.
        workspace.initialise_workspace_label();
        workspace.listen_for_workspace_updates();
        workspace
    }

    /// Returns the top-level widget.
    pub fn widget(&self) -> &Widget {
        self.container.upcast_ref()
    }
    fn add_hover_cursor(&self, widget: &impl IsA<Widget>) {
        // Create an EventControllerMotion to detect pointer enter/leave events.
        let motion = EventControllerMotion::new();
        // Create a weak reference to the widget.
        let weak_widget = widget.downgrade();
    
        // Connect the "enter" signal.
        motion.connect_enter(move |_controller, _x, _y| {
            if let Some(widget) = weak_widget.upgrade() {
                if let Some(root) = widget.root() {
                    if let Some(surface) = root.surface() {
                        // Create a hand pointer cursor.
                        logger::debug!("Setting cursor for surface: {:?}", surface);
                        if let Some(cursor) = gdk4::Cursor::from_name("pointer", None) {
                            logger::debug!("Setting pointer cursor: {:?}", cursor);
                            surface.set_cursor(Some(&cursor));
                        }
                    }
                }
            }
        });
        
        // Create another weak reference for the "leave" signal.
        let weak_widget = widget.downgrade();
        motion.connect_leave(move |_controller| {
            if let Some(widget) = weak_widget.upgrade() {
                if let Some(root) = widget.root() {
                    if let Some(surface) = root.surface() {
                        // Remove the cursor override.
                        logger::debug!("Cursor reset to default on widget leave event");
                        surface.set_cursor(None);
                    }
                }
            }
        });
    
        widget.add_controller(motion);
    }

    /// Sends a command to change the workspace by writing to a Unix socket.
    fn workspace_change(&self, direction: &str) {
        let socket_path = match self.get_hypr_socket_path() {
            Ok(val) => val,
            Err(e) => {
                println!("Could not get socket path :: {}", e);
                String::new()
            }
        };

        let command = format!("/dispatch workspace {}", direction);

        if let Err(e) = UnixStream::connect(&socket_path)
            .and_then(|mut stream| stream.write_all(command.as_bytes()))
        {
            eprintln!("Failed to change workspace: {}", e);
        }
    }

    fn initialise_workspace_label(&self) {
        let socket_path = match self.get_hypr_socket_path() {
            Ok(val) => val,
            Err(e) => {
                println!("Could not get socket path :: {}", e);
                return;
            }
        };

        let command = "/activeworkspace";

        if let Ok(mut stream) = UnixStream::connect(&socket_path) {
            if let Err(e) = stream.write_all(command.as_bytes()) {
                eprintln!("Failed to get curr workspace: {}", e);
                return;
            }
            let mut reader = BufReader::new(stream);
            let mut response = String::new();
            if let Ok(_) = reader.read_line(&mut response) {
                // The response is expected to look like:
                // "workspace ID 5 (5) on monitor eDP-1:"
                // Use a regex to capture the first number following "workspace ID"
                let re = Regex::new(r"workspace ID (\d+)").unwrap();
                if let Some(caps) = re.captures(&response) {
                    if let Some(id_match) = caps.get(1) {
                        let workspace_id = id_match.as_str();
                        self.workspace_label.set_text(workspace_id);
                    }
                } else {
                    eprintln!("Could not parse workspace ID from response: {}", response);
                }
            }
        } else {
            eprintln!("Failed to connect to socket at path: {}", socket_path);
        }
    }

    /// Changes to the next workspace.
    pub fn workspace_next(&self) {
        self.workspace_change("+1");
    }

    /// Changes to the previous workspace.
    pub fn workspace_prev(&self) {
        self.workspace_change("-1");
    }

    fn get_hypr_socket_path(&self) -> Result<String, String> {
        let instance_sig = env::var("HYPRLAND_INSTANCE_SIGNATURE")
            .map_err(|_| "HYPRLAND_INSTANCE_SIGNATURE not set".to_string())?;
        let runtime_dir =
            env::var("XDG_RUNTIME_DIR").map_err(|_| "XDG_RUNTIME_DIR not set".to_string())?;

        Ok(format!(
            "{}/hypr/{}/.socket.sock",
            runtime_dir, instance_sig
        ))
    }

    fn get_hypr_socket2_path(&self) -> Result<String, String> {
        let instance_sig = env::var("HYPRLAND_INSTANCE_SIGNATURE")
            .map_err(|_| "HYPRLAND_INSTANCE_SIGNATURE not set".to_string())?;
        let runtime_dir =
            env::var("XDG_RUNTIME_DIR").map_err(|_| "XDG_RUNTIME_DIR not set".to_string())?;

        Ok(format!(
            "{}/hypr/{}/.socket2.sock",
            runtime_dir, instance_sig
        ))
    }

    // Attaches mouse click events to the left and right arrow boxes.
    fn attach_events(&self) {
        // Use a GestureClick controller for the left arrow.
        let left_click = gtk4::GestureClick::new();
        // Capture a raw pointer to self.
        let self_ptr = self as *const Workspace;
        left_click.connect_pressed(move |_, _, _, _| {
            // SAFETY: the controllers are attached to widgets that are owned by self,
            // so self is guaranteed to live as long as the closures.
            unsafe {
                (*self_ptr).workspace_prev();
            }
        });
        // Pass the controller by value (remove the leading '&')
        self.left_arrow_box.add_controller(left_click);
    
        // Similarly for the right arrow.
        let right_click = gtk4::GestureClick::new();
        let self_ptr = self as *const Workspace; // rebind for the right arrow
        right_click.connect_pressed(move |_, _, _, _| {
            unsafe {
                (*self_ptr).workspace_next();
            }
        });
        self.right_arrow_box.add_controller(right_click);

        // Add hover behavior so the cursor becomes a pointer when hovering:
        self.add_hover_cursor(&self.left_arrow_box);
        self.add_hover_cursor(&self.right_arrow_box);
    }

    // Spawns a background thread that listens for updates on socket2 and
    // sends new workspace numbers to the main thread.
    fn listen_for_workspace_updates(&self) {
        // Clone your label (a gtk4::Label) so that the async task can own it.
        let workspace_label = self.workspace_label.clone();

        // Create an async channel to send String messages.
        let (sender, receiver) = unbounded::<String>();

        // Spawn an async task on the default main context to listen for messages.
        glib::MainContext::default().spawn_local(async move {
            while let Ok(new_text) = receiver.recv().await {
                // Update the label on the UI thread.
                workspace_label.set_text(&new_text);
            }
        });

        let socket_path = match self.get_hypr_socket2_path() {
            Ok(val) => val,
            Err(e) => {
                println!("Could not get socket path :: {}", e);
                String::new()
            }
        };

        // Spawn a background thread that simulates a long-running update.
        thread::spawn(move || {
            if let Ok(stream) = UnixStream::connect(&socket_path) {
                let reader = BufReader::new(stream);
                for line in reader.lines() {
                    if let Ok(line) = line {
                        match line {
                            line if line.starts_with("workspace>>") => {
                                if let Some(num) = line.strip_prefix("workspace>>") {
                                    if let Err(e) = sender.send_blocking(num.to_string()) {
                                        eprintln!("Failed to send workspace update: {}", e);
                                        break;
                                    }
                                }
                            }
                            _ => {} // Ignore other events
                        }
                    }
                }
            }
        });
    }
}
