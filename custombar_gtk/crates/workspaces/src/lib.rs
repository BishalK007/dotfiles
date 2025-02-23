use async_channel::unbounded;
use gtk4::glib;
use gtk4::{prelude::*, CenterBox};
use gtk4::{Box, Orientation};
use gtk4::{Label, Widget};
use std::io::{BufRead, BufReader, Write};
use std::os::unix::net::UnixStream;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use utils;
use std::env;

pub struct Workspace {
    container: Box,
    workspace_label: Label,
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
        let left_arrow_box = CenterBox::new();

        let right_arrow = Label::new(Some(""));
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
        };
        
        // Start listening for updates on socket2.
        workspace.listen_for_workspace_updates();
        workspace
    }

    /// Returns the top-level widget.
    pub fn widget(&self) -> &Widget {
        self.container.upcast_ref()
    }

    /// Sends a command to change the workspace by writing to a Unix socket.
    fn workspace_change(&self, direction: i32) {
        let socket_path = format!(
            "{}/hypr/{}.socket.sock",
            std::env::var("XDG_RUNTIME_DIR").unwrap_or_default(),
            std::env::var("HYPRLAND_INSTANCE_SIGNATURE").unwrap_or_default()
        );

        let command = format!("/dispatch workspace {}", direction);

        if let Err(e) = UnixStream::connect(&socket_path)
            .and_then(|mut stream| stream.write_all(command.as_bytes()))
        {
            eprintln!("Failed to change workspace: {}", e);
        }
    }

    /// Changes to the next workspace.
    pub fn workspace_next(&self) {
        self.workspace_change(1);
    }

    /// Changes to the previous workspace.
    pub fn workspace_prev(&self) {
        self.workspace_change(-1);
    }

    fn get_hypr_socket_path(&self) -> Result<String, String> {
        let instance_sig = env::var("HYPRLAND_INSTANCE_SIGNATURE")
            .map_err(|_| "HYPRLAND_INSTANCE_SIGNATURE not set".to_string())?;
        let runtime_dir = env::var("XDG_RUNTIME_DIR")
            .map_err(|_| "XDG_RUNTIME_DIR not set".to_string())?;

        Ok(format!(
            "{}/hypr/{}/.socket2.sock",
            runtime_dir, instance_sig
        ))
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

        let socket_path =  match self.get_hypr_socket_path() {
            Ok(val) => val,
            Err(_) => {
                println!("Could not get socket path");
                "HELLO".to_string()
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
