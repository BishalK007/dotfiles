import { execAsync } from "astal";
import { Gtk, Widget } from "astal/gtk4";
import { scaleSizeNumber } from "../../utils/utils";

async function handleSudoPowerOffButtonClick() {
    await execAsync(["sudo", "poweroff ", "-f"]); //works on nopasswd sudo setup
}
async function handlePowerButtonClick() {
    await execAsync(["shutdown", "-h", "now"]);
}
async function handleSudoRestartButtonClick() {
    await execAsync(["sudo", "reboot", "-f"]); //works on nopasswd sudo setup
}
async function handleRestartButtonClick() {
    await execAsync(["reboot"]);
}
async function handleLockButtonClick() {
    // await execAsync(["loginctl", "lock-session"]);
    await execAsync(["hyprlock"]);
}

export default function PowerPopup() {
    return (
        <box
            orientation={Gtk.Orientation.HORIZONTAL}
            spacing={scaleSizeNumber(10)}
            cssClasses={["power-popover", "power-popover-container"]}
            halign={Gtk.Align.CENTER}
            valign={Gtk.Align.CENTER}
        >
            <button
                onClicked={handleSudoRestartButtonClick}
                halign={Gtk.Align.CENTER}
                valign={Gtk.Align.CENTER}
            >
                <centerbox
                    cssClasses={["power-popover-sudo-restart-button"]}
                    halign={Gtk.Align.CENTER}
                    valign={Gtk.Align.CENTER}
                    centerWidget={<label
                        label="󱄌"
                        cssClasses={["power-popover-sudo-restart-icon"]}
                        halign={Gtk.Align.CENTER}
                        valign={Gtk.Align.CENTER}
                    />}
                />

            </button>
            <button
                onClicked={handleRestartButtonClick}
                halign={Gtk.Align.CENTER}
                valign={Gtk.Align.CENTER}
            >
                <centerbox
                    cssClasses={["power-popover-restart-button"]}
                    halign={Gtk.Align.CENTER}
                    valign={Gtk.Align.CENTER}
                    centerWidget={<label
                        label=""
                        cssClasses={["power-popover-restart-icon"]}
                        halign={Gtk.Align.CENTER}
                        valign={Gtk.Align.CENTER}
                    />}
                />

            </button>
            <button
                onClicked={handleSudoPowerOffButtonClick}
                halign={Gtk.Align.CENTER}
                valign={Gtk.Align.CENTER}
            >
                <centerbox
                    cssClasses={["power-popover-sudo-poweroff-button"]}
                    halign={Gtk.Align.CENTER}
                    valign={Gtk.Align.CENTER}
                    centerWidget={<label
                        label=""
                        cssClasses={["power-popover-sudo-poweroff-icon"]}
                        halign={Gtk.Align.CENTER}
                        valign={Gtk.Align.CENTER}
                    />}
                />

            </button>
            <button
                onClicked={handlePowerButtonClick}
                halign={Gtk.Align.CENTER}
                valign={Gtk.Align.CENTER}
            >
                <centerbox
                    cssClasses={["power-popover-lock-button"]}
                    halign={Gtk.Align.CENTER}
                    valign={Gtk.Align.CENTER}
                    centerWidget={<label
                        label=""
                        cssClasses={["power-popover-power-icon"]}
                        halign={Gtk.Align.CENTER}
                        valign={Gtk.Align.CENTER}
                    />}
                />
            </button>
            <button
                onClicked={handleLockButtonClick}
                halign={Gtk.Align.CENTER}
                valign={Gtk.Align.CENTER}
            >
                <centerbox
                    cssClasses={["power-popover-lock-button"]}
                    halign={Gtk.Align.CENTER}
                    valign={Gtk.Align.CENTER}
                    centerWidget={<label
                        label=""
                        cssClasses={["power-popover-lock-icon"]}
                        halign={Gtk.Align.CENTER}
                        valign={Gtk.Align.CENTER}
                    />}
                />
            </button>
        </box>
    );
}