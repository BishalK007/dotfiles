import { App, Gtk, Widget } from 'astal/gtk4';
import SoundPopup from './sound_popup';
import BrightnessPopup from './brightness_popup';
import { bind, Variable } from 'astal';
import AstalWp from "gi://AstalWp";
import Brightness from '../../libraries/Brightness';


const wireplumber = AstalWp.get_default() as AstalWp.Wp;
const audio = wireplumber.audio;
const soundIcon = Variable.derive(
    [
        bind(bind(audio, "default-speaker").get(), "volume"),
        bind(bind(audio, "default-speaker").get(), "mute"),
    ],
    (volume: number, mute: boolean) => {
        if (mute) return "";
        if (volume <= 0.33) return "";
        if (volume <= 0.66) return "";
        return "";
    }
);
const brightness = Brightness.get_default();

const brightnessIcon = Variable.derive(
    [bind(brightness, "screen")],
    (level: number) => {
        if (level <= 0.25) return '󰃞';
        if (level <= 0.5) return '󰃟';
        if (level <= 0.75) return '󰃝';
        return '󰃠';
    }
);

export default function SoundAndBrightness() {

    return (
        <box
            orientation={Gtk.Orientation.HORIZONTAL}
            spacing={0}
            cssClasses={[
                "sound-and-brightness",
                "sound-and-brightness-box",
            ]}
            valign={Gtk.Align.CENTER}
        >
            <menubutton
                valign={Gtk.Align.CENTER}
                cssClasses={[
                    "sound-and-brightness",
                    "sound-and-brightness-icon",
                    "sound-icon",
                ]}
            >
                <label label={soundIcon()} />
                <popover
                    cssClasses={["sound-popover"]}
                >
                    <SoundPopup />
                </popover>
            </menubutton>
            <menubutton
                valign={Gtk.Align.CENTER}
                cssClasses={[
                    "sound-and-brightness",
                    "sound-and-brightness-icon",
                    "brightness-icon",
                ]}
            >
                <label label={brightnessIcon()} />
                <popover
                    cssClasses={["brightness-popover"]}
                >
                    <BrightnessPopup />
                </popover>
            </menubutton>
        </box>
    )
};