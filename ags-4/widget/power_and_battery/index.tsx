import { bind, Variable } from 'astal';
import { App, Gtk, Widget } from 'astal/gtk4';
import AstalBattery from "gi://AstalBattery";
import PowerProfilesPopup from './power_profiles_popup';

const battery_device = AstalBattery.get_default() as AstalBattery.Battery;
const icon = Variable.derive(
    [
        bind(battery_device, "is-present"),
        bind(battery_device, "percentage"),
        bind(battery_device, "charging"),
    ],
    (isPresent: boolean, percentage: number, charging: boolean) => {
        if (!isPresent) return "󰚥";
        let icon = ""
        if (charging) {
            if (percentage >= 0.99) icon = "󰂅";
            else if (percentage >= 0.9) icon = "󰂋";
            else if (percentage >= 0.8) icon = "󰂊";
            else if (percentage >= 0.7) icon = "󰢞";
            else if (percentage >= 0.6) icon = "󰂉";
            else if (percentage >= 0.5) icon = "󰢝";
            else if (percentage >= 0.4) icon = "󰂈";
            else if (percentage >= 0.3) icon = "󰂇";
            else if (percentage >= 0.2) icon = "󰂆";
            else if (percentage >= 0.1) icon = "󰢜";
            else icon = "󰢟";
        }
        else {
            if (percentage >= 0.99) icon = "󰁹";
            else if (percentage >= 0.9) icon = "󰂂";
            else if (percentage >= 0.8) icon = "󰂁";
            else if (percentage >= 0.7) icon = "󰂀";
            else if (percentage >= 0.6) icon = "󰁿";
            else if (percentage >= 0.5) icon = "󰁾";
            else if (percentage >= 0.4) icon = "󰁽";
            else if (percentage >= 0.3) icon = "󰁼";
            else if (percentage >= 0.2) icon = "󰁻";
            else if (percentage >= 0.1) icon = "󰁺";
            else icon = "󰂎";
        }
        return icon;
    })

const battery_percentage = Variable.derive(
    [
        bind(battery_device, "percentage"),
    ],
    (percentage: number) => {
        return percentage * 100 + "%";

    }
);

export default function PowerAndBattery() {

    return (
        <menubutton
            valign={Gtk.Align.CENTER}
            cssClasses={[
                // "power-and-systray",
                // "power-and-systray-icon",
                // "power-icon",
                "power-and-battery",
                "power-and-battery-box",
            ]}
        >

            <box
                orientation={Gtk.Orientation.HORIZONTAL}
                spacing={0}
                cssClasses={[]}
                valign={Gtk.Align.CENTER}
            >
                <label
                    label={icon()}
                    cssClasses={[
                        "power-and-battery",
                        "power-and-battery-icon",
                    ]}
                    valign={Gtk.Align.CENTER}
                    halign={Gtk.Align.CENTER}
                />
                <label
                    label={battery_percentage()}
                    cssClasses={[
                        "power-and-battery",
                        "power-and-battery-percentage",
                    ]}
                    valign={Gtk.Align.CENTER}
                    halign={Gtk.Align.CENTER}
                    visible={bind(battery_device, "is-present")}
                />
            </box>
            <popover
                cssClasses={["power-profile-popover"]}
            >
                <PowerProfilesPopup />
            </popover>
        </menubutton>
    )
};