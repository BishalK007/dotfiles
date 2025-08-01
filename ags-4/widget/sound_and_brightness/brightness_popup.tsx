import { Variable } from "astal";
import { bind } from "astal/binding";
import { Gtk } from "astal/gtk4";
import Brightness from "../../libraries/Brightness";
import { OSDManager } from "../../services/OSDManager";

const brightness = Brightness.get_default();

// Debounced brightness handler
let brightnessDebounceTimeout: any = null;

function debouncedBrightnessChange(value: number, delay: number = 100) {
    if (brightnessDebounceTimeout) {
        clearTimeout(brightnessDebounceTimeout);
    }
    
    // Block OSD updates immediately when starting brightness change from popup
    OSDManager.blockOSDUpdateAutoResume(1000);
    
    brightnessDebounceTimeout = setTimeout(() => {
        brightness.screen = value;
        brightnessDebounceTimeout = null;
    }, delay);
}

const brightnessIcon = Variable.derive(
    [bind(brightness, "screen")],
    (level: number) => {
        if (level <= 0.25) return '󰃞';
        if (level <= 0.5) return '󰃟';
        if (level <= 0.75) return '󰃝';
        return '󰃠';
    }
);

export default function BrightnessPopup() {
    return (
        <box
            orientation={Gtk.Orientation.HORIZONTAL}
            spacing={0}
            cssClasses={["brightness-popover-container"]}
            halign={Gtk.Align.CENTER}
            valign={Gtk.Align.CENTER}
        >
            <label
                label={brightnessIcon()}
                cssClasses={["brightness-popup-icon"]}
                halign={Gtk.Align.START}
            />
            <slider
                cssClasses={["brightness-popup-slider"]}
                value={bind(brightness, "screen")}
                onChangeValue={self => {
                    debouncedBrightnessChange(self.value);
                }}
                hexpand={true}
                min={0.05}
                max={1}
            />
            <label
                label={bind(brightness, "screen").as((level: number) => `${Math.round(level * 100)}%`)}
                cssClasses={["brightness-popup-label"]}
                halign={Gtk.Align.END}
            />
        </box>
    );
}