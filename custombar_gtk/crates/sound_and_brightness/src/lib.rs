mod sbutils;


mod sound_popup;
use async_channel::{unbounded, Sender};
pub use sound_popup::SoundPopup;


use std::{collections::HashMap, rc::Rc};
use gtk4::{
    glib::MainContext, prelude::*, Label, Orientation
};

pub enum ChannelMessage {
    SoundUpdate,
    SoundPopupShow,
    SoundPopupHide,
}


pub struct SoundAndBrightness {
    container: gtk4::Box,
    sound_icon: Label,
    brightness_icon: Label,
    sound_popup: SoundPopup,
    tx: Sender<ChannelMessage>,
}


impl SoundAndBrightness {
    pub fn new() -> Rc<Self> {
        // Create the channel
        let (tx, rx) = unbounded::<ChannelMessage>();

        let sound_icon = Label::new(Some(""));
        let brightness_icon = Label::new(Some(""));

        // Create a horizontal container.
        let container = gtk4::Box::new(Orientation::Horizontal, 0);

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
        sound_icon.set_css_classes(&["sound-and-brightness", "sound-and-brightness-icon", ]);
        brightness_icon.set_css_classes(&["sound-and-brightness", "sound-and-brightness-icon", ]);

        // Set margins.
        sound_icon.set_margin_start(8);
        sound_icon.set_margin_end(12);
        brightness_icon.set_margin_start(8);
        brightness_icon.set_margin_end(12);

        // Add the labels to the container.
        container.append(&sound_icon);
        container.append(&brightness_icon);

        //sound popup
        let sound_popup = SoundPopup::new(&container);

        // Build the SoundAndBrightness instance.
        let sound_and_brightness = SoundAndBrightness {
            container,
            sound_icon,
            brightness_icon,
            sound_popup,
            tx,
        };

        // Wrap the instance in an Rc and connect a click event.
        let instance = Rc::new(sound_and_brightness);
        let instance_clone = Rc::clone(&instance);
        utils::connect_clicked(&instance.sound_icon, move || {
            instance_clone.handle_click();
        });

        instance.handle_socket(rx);

        instance

    }
    pub fn handle_click(&self) {
        self.sound_popup.show();
    }
    pub fn widget(&self) -> &gtk4::Box {
        &self.container
    }

    // This method returns a thread-safe sender that can be used from any thread
    fn get_sender(&self) -> Sender<ChannelMessage> {
        self.tx.clone()
    }

    pub fn handle_socket(&self, rx: async_channel::Receiver<ChannelMessage>) {
        // Start a background thread to listen for messages
        let sound_popup_clone = self.sound_popup.clone();
        // Set up message handler using GTK's main context
        MainContext::default().spawn_local(async move {
            while let Ok(msg) = rx.recv().await {
                match msg {
                    ChannelMessage::SoundUpdate => sound_popup_clone.update_popup(None),
                    ChannelMessage::SoundPopupShow => sound_popup_clone.show(),
                    ChannelMessage::SoundPopupHide => sound_popup_clone.hide(),
                }
            }
        });

        let mut handlers: HashMap<String, Box<dyn Fn() + Send + Sync>> = HashMap::new();

        // Create thread-safe references to the sender
        let tx_update = self.get_sender();
        handlers.insert(
            "SoundUpdate".to_string(),
            Box::new(move || {
                let _ = tx_update.send_blocking(ChannelMessage::SoundUpdate);
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

        // Start the socket listener in a background thread
        let socket_path = "/tmp/sound_popup_socket";
        let (_socket_thread, _terminate_flag) =
            utils::socket::start_unix_socket(socket_path, handlers);
    }

}