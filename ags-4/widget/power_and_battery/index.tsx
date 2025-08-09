import { bind, Variable } from 'astal';
import { App, Gtk, Widget } from 'astal/gtk4';
import AstalBattery from "gi://AstalBattery";
import PowerProfilesPopup from './power_profiles_popup';
import { BatteryWarningOSDManager } from '../osd/BatteryWarningOSD';
import PowerAndSystrayOSD from '../power_and_systray/power_and_systray_osd';

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
        return Math.ceil(percentage * 100) + "%";
    }
);

export default function PowerAndBattery() {

    return (
        <box>
            {/* Test Button for Battery OSD */}
            <button
                cssClasses={["power-and-battery-test-button"]}
                onClicked={() => {
                    // print("Test battery OSD toggle");
                    // // Show a test battery warning OSD
                    // const testWidget = PowerAndSystrayOSD({
                    //     level: {
                    //         percentage: 75,
                    //         isCritical: true
                    //     },
                    //     currentPercentage: 75
                    // });

                    // BatteryWarningOSDManager.showOSD({
                    //     widget: testWidget,
                    //     timeout: 5000,
                    //     type: 'battery-warning'
                    // });
                }}
                child={
                    <label
                        // label="Test Battery OSD"
                        label=""
                    />
                }
            />
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
                    child={<PowerProfilesPopup />}
                />
            </menubutton>
        </box>
    )
};