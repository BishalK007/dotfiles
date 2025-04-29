import { Gtk, Widget } from "astal/gtk4";
import PowerPopup from "./power_popup";
import { scaleSizeNumber } from "../../utils/utils";
import Systray from "./systray_popup";

export default function PowerAndSystray() {
    return (
        <box
            orientation={Gtk.Orientation.HORIZONTAL}
            spacing={scaleSizeNumber(0)}
            cssClasses={[
                "power-and-systray",
                "power-and-systray-box",
                "background-color",
                "border-color",
            ]}
            valign={Gtk.Align.CENTER}
        >
            <menubutton
                valign={Gtk.Align.CENTER}
                cssClasses={[
                    "power-and-systray",
                    "power-and-systray-icon",
                    "power-icon",
                ]}
            >
                <label label="" />
                <popover
                    cssClasses={["power-popover"]}
                >
                    <PowerPopup/>
                </popover>
                
            </menubutton>
            <menubutton
                valign={Gtk.Align.CENTER}
                cssClasses={[
                    "power-and-systray",
                    "power-and-systray-icon",
                    "systray-icon",
                ]}
            >
                <label label="" />
                <popover
                    cssClasses={["systray-popover"]}
                    autohide={true}
                >
                    <Systray />
                </popover>
            </menubutton>
        </box>
    );
}