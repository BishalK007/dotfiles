import { App, Astal, Gtk, Gdk } from "astal/gtk4"
import { GLib, Variable } from "astal"
import WorkspaceWidget from "./workspace"
import { scaleSizeNumber } from "../utils/utils"
import Clock from "./clock"
import CalendarWidget from "./calendar"
import PowerAndSystray from "./power_and_systray"
import SoundAndBrightness from "./sound_and_brightness"
import PowerAndBattery from "./power_and_battery"
import Cpu from "./cpu"
import Memory from "./memory"
import Bluetooth from "./bluetooth"


const time = Variable("").poll(1000, "date")

export default function Bar(gdkmonitor: Gdk.Monitor) {
    const { TOP, LEFT, RIGHT } = Astal.WindowAnchor

    return <window
        visible
        cssClasses={["Bar"]}
        gdkmonitor={gdkmonitor}
        exclusivity={Astal.Exclusivity.EXCLUSIVE}
        anchor={TOP | LEFT | RIGHT}
        application={App}>

        <centerbox cssName="centerbox">
            <box
                orientation={Gtk.Orientation.HORIZONTAL}
                spacing={scaleSizeNumber(5)}
            >
                {/* 
                    ************ Workspace Widget ************
                */}
                <WorkspaceWidget />
                {/* 
                    ************ Home Widget ************
                */}
                <button
                    onClicked={() => {
                        // Try to get FILE_MANAGER env variable and HOME, then spawn the file manager
                        const fileManager = GLib.getenv("FILE_MANAGER");
                        const homeDir = GLib.getenv("HOME") || "";
                        if (fileManager) {
                            try {
                                imports.gi.Gio.Subprocess.new(
                                    [fileManager, homeDir],
                                    imports.gi.Gio.SubprocessFlags.NONE
                                );
                            } catch (e) {
                                console.error(`Failed to launch file manager: ${e}`);
                            }
                        } else {
                            console.error("FILE_MANAGER environment variable not set");
                        }
                    }}
                    valign={Gtk.Align.CENTER}
                    cssClasses={["home-button"]}
                >
                    <label label="" cssClasses={["home-button-label"]} valign={Gtk.Align.CENTER} halign={Gtk.Align.CENTER} />
                </button>
                {/* 
                    ************ Clock Widget ************
                */}
                <Clock />
                {/* 
                    ************ Calendar Widget ************
                */}
                <CalendarWidget
                    dateFormat="DdMmmYyyy"
                    dayFormat="ABBREVIATED"
                />

            </box>
            <box />
            <box
                orientation={Gtk.Orientation.HORIZONTAL}
                spacing={scaleSizeNumber(5)}
            >
                {/* 
                    ************ Bluetooth Widget ************
                */}
                <Bluetooth />
                {/* 
                    ************ Power And Battery Widget ************
                */}
                <PowerAndBattery />
                {/* 
                    ************ sound and Brightness Widget ************
                */}
                <SoundAndBrightness/>
                {/* 
                    ************ Cpu Widget ************
                    */}
                <Cpu />
                {/* 
                    ************ Memory Widget ************
                */}
                <Memory />
                {/* 
                    ************ Power and Systray Widget ************
                */}
                <PowerAndSystray />

            </box>

        </centerbox>
    </window>
}
