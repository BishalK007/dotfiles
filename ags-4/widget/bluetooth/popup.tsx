import { Variable } from "astal";
import Binding, { bind } from "astal/binding";
import { Gtk } from "astal/gtk4";
import AstalBluetooth from "gi://AstalBluetooth";
import { scaleSizeNumber } from "../../utils/utils";

const bt = AstalBluetooth.get_default() as AstalBluetooth.Bluetooth;

const handleBluetoothToggle = () => {
    bt.toggle();
}



export default function BluetoothPopup() {
    return (
        <box
            orientation={Gtk.Orientation.VERTICAL}
            cssClasses={["bluetooth-popover-container"]}
            valign={Gtk.Align.CENTER}
            halign={Gtk.Align.CENTER}
        >
            <box
                orientation={Gtk.Orientation.HORIZONTAL}
                valign={Gtk.Align.CENTER}
                cssClasses={["bluetooth-top-label"]}
                hexpand={true}
            >
                <label
                    label="Bluetooth:"
                    cssClasses={["bluetooth-top-label-text"]}
                    valign={Gtk.Align.CENTER}
                    hexpand={true}
                    halign={Gtk.Align.START}
                />
                <button
                    cssClasses={["bluetooth-top-label-button"]}
                    valign={Gtk.Align.CENTER}
                    hexpand={true}
                    halign={Gtk.Align.END}
                    onClicked={handleBluetoothToggle}
                >

                    <label
                        valign={Gtk.Align.CENTER}
                        hexpand={true}
                        halign={Gtk.Align.END}
                        cssClasses={["bluetooth-top-label-icon"]}
                        label={bind(bt, "is-powered").as((isTurnrdOn) => {
                            if (isTurnrdOn) {
                                return "  On"
                            }
                            return "  Off"
                        })}
                    />
                </button>
            </box>
            <label
                label={"Paired devices: "}
                cssClasses={["bluetooth-devices-label"]}
                halign={Gtk.Align.START}
                marginBottom={scaleSizeNumber(8)}
            />
            <box
                orientation={Gtk.Orientation.VERTICAL}
                cssClasses={["bluetooth-devices-list"]}
                hexpand={true}
                halign={Gtk.Align.FILL}
                spacing={scaleSizeNumber(8)}
                children={bind(bt, "devices").as((devices) => {
                    if (!Array.isArray(devices) || devices.length === 0) {
                        return (
                            [<label
                                label="No paired devices found."
                                cssClasses={["bluetooth-no-devices"]}
                                halign={Gtk.Align.CENTER}
                                valign={Gtk.Align.CENTER}
                            />]
                        );
                    }
                    
                    return devices.map((device: AstalBluetooth.Device, index: number) => (
                        <button
                            cssClasses={["bluetooth-device-item-button"]}
                            onClicked={() => {
                                device.connect_device();
                            }}
                        >
                            <box
                                cssClasses={["bluetooth-device-item"]}
                                orientation={Gtk.Orientation.HORIZONTAL}
                                spacing={scaleSizeNumber(8)}
                                hexpand={true}
                                halign={Gtk.Align.FILL}
                            >
                                <label
                                    label={`${index + 1}. ` + device.name || "Unknown Device"}
                                    cssClasses={["bluetooth-device-name"]}
                                    hexpand={true}
                                    halign={Gtk.Align.START}
                                />
                                <label
                                    label={device.address + device.get_connected()}
                                    cssClasses={["bluetooth-device-address"]}
                                    hexpand={true}
                                    halign={Gtk.Align.END}
                                />
                            </box>
                        </button>
                    ));
                })}
            />
            <box
                orientation={Gtk.Orientation.HORIZONTAL}
                spacing={5}
            >
                {/* Additional content can be added here */}
            </box>

        </box>
    );
}