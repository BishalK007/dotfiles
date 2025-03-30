mod sbutils;
mod sound_popup;
mod brightness_popup;

use async_channel::{unbounded, Sender};
pub use sound_popup::SoundPopup;
pub use brightness_popup::BrightnessPopup;


use std::{collections::HashMap, rc::Rc};
use gtk4::{
    glib::MainContext, prelude::*, Label, Orientation
};

pub enum ChannelMessage {
    SoundWidgetUpdate,
    SoundPopupUpdate,
    SoundPopupShow,
    SoundPopupHide,
    BrightnessWidgetUpdate,
    BrightnessPopupUpdate,
    BrightnessPopupShow,
    BrightnessPopupHide,
}


pub struct SoundAndBrightness {
    container: gtk4::Box,
    sound_icon: Label,
    brightness_icon: Label,
    sound_popup: SoundPopup,
    brightness_popup: BrightnessPopup,
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
        sound_icon.set_css_classes(&["sound-and-brightness", "sound-and-brightness-icon", "sound-icon" ]);
        brightness_icon.set_css_classes(&["sound-and-brightness", "sound-and-brightness-icon", "brightness-icon" ]);

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
        let brightness_popup = BrightnessPopup::new(&container);

        // Build the SoundAndBrightness instance.
        let sound_and_brightness = SoundAndBrightness {
            container,
            sound_icon,
            brightness_icon,
            sound_popup,
            brightness_popup,
            tx,
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
                    ChannelMessage::SoundWidgetUpdate => {
                        sbcontainer.update_widget();
                    },
                    ChannelMessage::SoundPopupUpdate => {
                        sound_popup_clone.update_popup(None);
                    },
                    ChannelMessage::SoundPopupShow => sound_popup_clone.show(),
                    ChannelMessage::SoundPopupHide => sound_popup_clone.hide(),
                    ChannelMessage::BrightnessWidgetUpdate => {
                        println!("BrightnessWidgetUpdate called in MainContext");
                        sbcontainer.update_widget();
                    },
                    ChannelMessage::BrightnessPopupUpdate => {
                        brightness_popup_clone.update_popup(None);
                    },
                    ChannelMessage::BrightnessPopupShow => brightness_popup_clone.show(),
                    ChannelMessage::BrightnessPopupHide => brightness_popup_clone.hide(),
                }
            }
        });

        let mut handlers: HashMap<String, Box<dyn Fn() + Send + Sync>> = HashMap::new();

        // Create thread-safe references to the sender
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

        // Brightness Hanglers 
        let tx_widget_update = self.get_sender();
        handlers.insert(
            "BrightnessWidgetUpdate".to_string(),
            Box::new(move || {
                println!("BrightnessWidgetUpdate called in BOX");
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

        // Start the socket listener in a background thread
        let socket_path = "/tmp/sound_and_brightness_socket";
        let (_socket_thread, _terminate_flag) =
            utils::socket::start_unix_socket(socket_path, handlers);
        

    }


    pub fn update_widget(&self) {
        // Update sound Icon
        let curr_vol_icon = sbutils::get_volume_state();
        let curr_vol_icon = match curr_vol_icon {
            Some(icon) => icon.get_icon(),
            None => "󰴸".to_string(),
        };
        self.sound_icon.set_label(curr_vol_icon.as_str());
        println!("BrightnessWidgetUpdate called");
        // Update brightness Icon
        let curr_brightness_icon = sbutils::get_brightness_state();
        let curr_brightness_icon = match curr_brightness_icon {
            Some(icon) => icon.get_icon(),
            None => "󰳲".to_string(),
        };
        println!("BrightnessWidgetUpdate called {}", curr_brightness_icon);
        // Set the label of the brightness icon
        self.brightness_icon.set_label(curr_brightness_icon.as_str()); 
    }

}