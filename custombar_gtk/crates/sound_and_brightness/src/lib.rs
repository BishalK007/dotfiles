mod brightness_popup;
mod sbutils;
mod sound_popup;

use async_channel::{unbounded, Sender};
pub use brightness_popup::BrightnessPopup;
use sbutils::{BrightnessAction, VolumeAction};
pub use sound_popup::SoundPopup;

use gtk4::{glib::MainContext, prelude::*, Label, Orientation};
use std::{cell::RefCell, collections::HashMap, rc::Rc};

pub enum ChannelMessage {
    VolUp,
    VolDown,
    VolMute,
    SoundWidgetUpdate,
    SoundPopupUpdate,
    SoundPopupShow,
    SoundPopupHide,
    SoundPopupShowAutoHide,
    BrightnessUp,
    BrightnessDown,
    BrightnessToggle,
    BrightnessWidgetUpdate,
    BrightnessPopupUpdate,
    BrightnessPopupShow,
    BrightnessPopupHide,
    BrightnessPopupShowAutoHide,
}

pub struct SoundAndBrightness {
    container: gtk4::Box,
    sound_icon: Label,
    brightness_icon: Label,
    sound_popup: SoundPopup,
    brightness_popup: BrightnessPopup,
    tx: Sender<ChannelMessage>,
    auto_hide_timeout: Rc<RefCell<Option<gtk4::glib::SourceId>>>,
}

impl SoundAndBrightness {
    pub fn new() -> Rc<Self> {
        // Initilise VolumeState
        sbutils::init_volume_state();
        // Create the channel
        let (tx, rx) = unbounded::<ChannelMessage>();

        let sound_icon = Label::new(Some(""));
        let brightness_icon = Label::new(Some(""));

        // Create a horizontal container.
        let container = gtk4::Box::new(Orientation::Horizontal, utils::scale_size_i32(0));

        // Apply the CSS files.
        utils::apply_css_files(&[
            utils::scale_sizes(include_str!("style.css")),
            include_str!("../../../colors.css"),
        ]);

        // Set CSS classes.
        container.set_css_classes(&[
            "sound-and-brightness",
            "sound-and-brightness-box",
            "background-color",
            "border-color",
        ]);
        sound_icon.set_css_classes(&[
            "sound-and-brightness",
            "sound-and-brightness-icon",
            "sound-icon",
        ]);
        brightness_icon.set_css_classes(&[
            "sound-and-brightness",
            "sound-and-brightness-icon",
            "brightness-icon",
        ]);

        // Add the labels to the container.
        container.append(&sound_icon);
        container.append(&brightness_icon);

        //sound popup
        let sound_popup = SoundPopup::new(&container);
        let brightness_popup = BrightnessPopup::new(&container);

        // Build the SoundAndBrightness instance.
        let sound_and_brightness = SoundAndBrightness {
            container,
            sound_icon,
            brightness_icon,
            sound_popup,
            brightness_popup,
            tx,
            auto_hide_timeout: Rc::new(RefCell::new(None)),
        };

        // Wrap the instance in an Rc and connect a click event.
        let instance = Rc::new(sound_and_brightness);
        let instance_clone = Rc::clone(&instance);
        utils::connect_clicked(&instance.sound_icon, move || {
            instance_clone.handle_sound_icon_click();
        });
        let instance_clone = Rc::clone(&instance);
        utils::connect_clicked(&instance.brightness_icon, move || {
            instance_clone.handle_brightness_icon_click();
        });

        let instance_for_socket = Rc::clone(&instance);
        instance_for_socket.handle_socket(rx);

        instance.update_widget();

        instance
    }
    pub fn handle_sound_icon_click(&self) {
        self.brightness_popup.hide();
        self.sound_popup.show();
    }
    pub fn handle_brightness_icon_click(&self) {
        self.sound_popup.hide();
        self.brightness_popup.show();
    }
    pub fn widget(&self) -> &gtk4::Box {
        &self.container
    }

    // This method returns a thread-safe sender that can be used from any thread
    fn get_sender(&self) -> Sender<ChannelMessage> {
        self.tx.clone()
    }
    // Function to create a handler that can process colon-separated messages
    fn create_composite_handler(
        handlers: HashMap<String, Box<dyn Fn() + Send + Sync>>,
    ) -> Box<dyn Fn(String) + Send + Sync> {
        // Take ownership of handlers instead of trying to clone them
        Box::new(move |message: String| {
            // Split the message by colon
            let commands: Vec<&str> = message.split(':').collect();

            for cmd in commands {
                // Look up the handler for this command
                if let Some(handler) = handlers.get(cmd) {
                    // Call the handler if found
                    handler();
                } else {
                   utils::logger::warn!("Warning: Unknown command '{}'", cmd);
                }
            }
        }) as Box<dyn Fn(String) + Send + Sync>
    }

    pub fn handle_socket(self: &Rc<Self>, rx: async_channel::Receiver<ChannelMessage>) {
        // Start a background thread to listen for messages
        let sbcontainer = Rc::clone(self);
        let sound_popup_clone = sbcontainer.sound_popup.clone();
        let sbcontainer = Rc::clone(self);
        let brightness_popup_clone = sbcontainer.brightness_popup.clone();

        // Set up message handler using GTK's main context
        MainContext::default().spawn_local(async move {
            while let Ok(msg) = rx.recv().await {
                match msg {
                    ChannelMessage::VolUp => {
                        sbutils::change_vol(VolumeAction::VolUp);
                    }
                    ChannelMessage::VolDown => {
                        sbutils::change_vol(VolumeAction::VolDown);
                    }
                    ChannelMessage::VolMute => {
                        sbutils::change_vol(VolumeAction::VolMuteToggle);
                    }
                    ChannelMessage::SoundWidgetUpdate => {
                        sbcontainer.update_widget();
                    }
                    ChannelMessage::SoundPopupUpdate => {
                        sound_popup_clone.update_popup(None);
                    }
                    ChannelMessage::SoundPopupShow => sound_popup_clone.show(),
                    ChannelMessage::SoundPopupHide => sound_popup_clone.hide(),
                    ChannelMessage::SoundPopupShowAutoHide => {
                        // Create show and hide functions for sound popup with cloned references
                        let sp_show = sound_popup_clone.clone();
                        let show_fn = move || sp_show.show();
                        let sp_hide = sound_popup_clone.clone();
                        let hide_fn = move || sp_hide.hide();

                        // Pass these functions to handle_show_auto_hide
                        sbcontainer.handle_show_auto_hide(show_fn, hide_fn)
                    }
                    ChannelMessage::BrightnessUp => {
                        sbutils::change_brightness(BrightnessAction::BrightUp);
                    }
                    ChannelMessage::BrightnessDown => {
                        sbutils::change_brightness(BrightnessAction::BrightDown);
                    }
                    ChannelMessage::BrightnessToggle => {
                        sbutils::change_brightness(BrightnessAction::BrightToggle); 
                    }
                    ChannelMessage::BrightnessWidgetUpdate => {
                        sbcontainer.update_widget();
                    }
                    ChannelMessage::BrightnessPopupUpdate => {
                        brightness_popup_clone.update_popup(None);
                    }
                    ChannelMessage::BrightnessPopupShow => brightness_popup_clone.show(),
                    ChannelMessage::BrightnessPopupHide => brightness_popup_clone.hide(),
                    ChannelMessage::BrightnessPopupShowAutoHide => {
                        let bp_show = brightness_popup_clone.clone();
                        let show_fn = move || bp_show.show();
                        let bp_hide = brightness_popup_clone.clone();
                        let hide_fn = move || bp_hide.hide();

                        // Pass these functions to handle_show_auto_hide
                        sbcontainer.handle_show_auto_hide(show_fn, hide_fn);
                    }
                }
            }
        });

        let mut handlers: HashMap<String, Box<dyn Fn() + Send + Sync>> = HashMap::new();

        // Create thread-safe references to the sender
        // Add these handlers right after your other handlers
        // Volume control handlers
        let tx_volup = self.get_sender();
        handlers.insert(
            "VolUp".to_string(),
            Box::new(move || {
                let _ = tx_volup.send_blocking(ChannelMessage::VolUp);
            }) as Box<dyn Fn() + Send + Sync>,
        );

        let tx_voldown = self.get_sender();
        handlers.insert(
            "VolDown".to_string(),
            Box::new(move || {
                let _ = tx_voldown.send_blocking(ChannelMessage::VolDown);
            }) as Box<dyn Fn() + Send + Sync>,
        );

        let tx_volmute = self.get_sender();
        handlers.insert(
            "VolMute".to_string(),
            Box::new(move || {
                let _ = tx_volmute.send_blocking(ChannelMessage::VolMute);
            }) as Box<dyn Fn() + Send + Sync>,
        );
        let tx_widget_update = self.get_sender();
        handlers.insert(
            "SoundWidgetUpdate".to_string(),
            Box::new(move || {
                let _ = tx_widget_update.send_blocking(ChannelMessage::SoundWidgetUpdate);
            }) as Box<dyn Fn() + Send + Sync>,
        );

        let tx_popup_update = self.get_sender();
        handlers.insert(
            "SoundPopupUpdate".to_string(),
            Box::new(move || {
                let _ = tx_popup_update.send_blocking(ChannelMessage::SoundPopupUpdate);
            }) as Box<dyn Fn() + Send + Sync>,
        );

        // Add handlers for show/hide
        let tx_show = self.get_sender();
        handlers.insert(
            "SoundPopupShow".to_string(),
            Box::new(move || {
                let _ = tx_show.send_blocking(ChannelMessage::SoundPopupShow);
            }) as Box<dyn Fn() + Send + Sync>,
        );

        let tx_hide = self.get_sender();
        handlers.insert(
            "SoundPopupHide".to_string(),
            Box::new(move || {
                let _ = tx_hide.send_blocking(ChannelMessage::SoundPopupHide);
            }) as Box<dyn Fn() + Send + Sync>,
        );
        let tx_show_auto_hide = self.get_sender();
        handlers.insert(
            "SoundPopupShowAutoHide".to_string(),
            Box::new(move || {
                let _ = tx_show_auto_hide.send_blocking(ChannelMessage::SoundPopupShowAutoHide);
            }) as Box<dyn Fn() + Send + Sync>,
        );

        let tx_brightness_up = self.get_sender();
        handlers.insert(
            "BrightnessUp".to_string(),
            Box::new(move || {
                let _ = tx_brightness_up.send_blocking(ChannelMessage::BrightnessUp);
            }) as Box<dyn Fn() + Send + Sync>,
        );

        let tx_brightness_down = self.get_sender();
        handlers.insert(
            "BrightnessDown".to_string(),
            Box::new(move || {
                let _ = tx_brightness_down.send_blocking(ChannelMessage::BrightnessDown);
            }) as Box<dyn Fn() + Send + Sync>,
        );

        let tx_brightness_toggle = self.get_sender();
        handlers.insert(
            "BrightnessToggle".to_string(),
            Box::new(move || {
                let _ = tx_brightness_toggle.send_blocking(ChannelMessage::BrightnessToggle);
            }) as Box<dyn Fn() + Send + Sync>,
        );

        // Brightness Hanglers
        let tx_widget_update = self.get_sender();
        handlers.insert(
            "BrightnessWidgetUpdate".to_string(),
            Box::new(move || {
                let _ = tx_widget_update.send_blocking(ChannelMessage::BrightnessWidgetUpdate);
            }) as Box<dyn Fn() + Send + Sync>,
        );
        let tx_popup_update = self.get_sender();
        handlers.insert(
            "BrightnessPopupUpdate".to_string(),
            Box::new(move || {
                let _ = tx_popup_update.send_blocking(ChannelMessage::BrightnessPopupUpdate);
            }) as Box<dyn Fn() + Send + Sync>,
        );
        // Add handlers for show/hide
        let tx_show = self.get_sender();
        handlers.insert(
            "BrightnessPopupShow".to_string(),
            Box::new(move || {
                let _ = tx_show.send_blocking(ChannelMessage::BrightnessPopupShow);
            }) as Box<dyn Fn() + Send + Sync>,
        );
        let tx_hide = self.get_sender();
        handlers.insert(
            "BrightnessPopupHide".to_string(),
            Box::new(move || {
                let _ = tx_hide.send_blocking(ChannelMessage::BrightnessPopupHide);
            }) as Box<dyn Fn() + Send + Sync>,
        );
        let tx_show_auto_hide = self.get_sender();
        handlers.insert(
            "BrightnessPopupShowAutoHide".to_string(),
            Box::new(move || {
                let _ =
                    tx_show_auto_hide.send_blocking(ChannelMessage::BrightnessPopupShowAutoHide);
            }) as Box<dyn Fn() + Send + Sync>,
        );

        // Create a composite message handler
        let composite_handler = Self::create_composite_handler(handlers);

        // Start the socket listener in a background thread
        let socket_path = "/tmp/sound_and_brightness_socket";
        let (_socket_thread, _terminate_flag) =
            utils::socket::start_unix_socket_with_parser(socket_path, composite_handler);
    }

    pub fn update_widget(&self) {
        // Update sound Icon
        let curr_vol_icon = sbutils::get_volume_state();
        let curr_vol_icon = match curr_vol_icon {
            Some(icon) => icon.get_icon(),
            None => "󰴸".to_string(),
        };
        self.sound_icon.set_label(curr_vol_icon.as_str());
        // Update brightness Icon
        let curr_brightness_icon = sbutils::get_brightness_state();
        let curr_brightness_icon = match curr_brightness_icon {
            Some(icon) => icon.get_icon(),
            None => "󰳲".to_string(),
        };
        // Set the label of the brightness icon
        self.brightness_icon
            .set_label(curr_brightness_icon.as_str());
    }

    fn handle_show_auto_hide<F, G>(&self, show_fn: F, hide_fn: G)
    where
        F: Fn() + 'static,
        G: Fn() + 'static,
    {
        // Call the show function immediately
        show_fn();

        // If there's already a pending timeout, cancel it
        if let Some(source_id) = self.auto_hide_timeout.borrow_mut().take() {
            source_id.remove();
        }

        // Schedule hide after 1500ms
        let hide_fn = Rc::new(hide_fn);
        let hide_fn_clone = hide_fn.clone();
        let auto_hide_timeout = self.auto_hide_timeout.clone();

        let source_id =
            gtk4::glib::timeout_add_local(std::time::Duration::from_millis(1500), move || {
                // Call the hide function after delay
                hide_fn_clone();

                // Clear the stored timeout ID
                *auto_hide_timeout.borrow_mut() = None;

                // Return false to prevent repeating
                gtk4::glib::ControlFlow::Break
            });

        // Store the new timeout ID
        *self.auto_hide_timeout.borrow_mut() = Some(source_id);
    }
}
