import { Gtk } from "astal/gtk4";
import { scaleSizeNumber } from "../../utils/utils";
import AstalBluetooth from "gi://AstalBluetooth"
import BluetoothPopup from "./popup";
import { bind } from "astal";

const bt = AstalBluetooth.get_default() as AstalBluetooth.Bluetooth;

export default function Bluetooth() {


    return (
        <menubutton
            cssClasses={["bluetooth", "bluetooth-box"]}
        >
            <box
                orientation={Gtk.Orientation.HORIZONTAL}
                spacing={scaleSizeNumber(0)}
                valign={Gtk.Align.CENTER}
            >
                <label
                    label=""
                    cssClasses={["bluetooth-icon"]}
                    valign={Gtk.Align.CENTER}
                />
                <label
                    valign={Gtk.Align.CENTER}
                    hexpand={true}
                    halign={Gtk.Align.END}
                    cssClasses={["bluetooth-status-label"]}
                    label={bind(bt, "is-powered").as((isTurnrdOn) => {
                        if (isTurnrdOn) {
                            return "On"
                        }
                        return "Off"
                    })}
                />

            </box>
            <popover
                cssClasses={["bluetooth-popover"]}
                autohide={false}
            >
                <BluetoothPopup />
            </popover>
        </menubutton>
    );
}