import { Variable } from "astal";
import { bind } from "astal/binding";
import { Gtk } from "astal/gtk4";
import Brightness from "../../libraries/Brightness";

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
                    brightness.screen = self.value;
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