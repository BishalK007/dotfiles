import { App, Astal, Gdk, Gtk } from "astal/gtk4"
import { bind } from "astal"
import { OSDManager } from "../../services/OSDManager"

export default function OSD(gdkmonitor: Gdk.Monitor) {
    return (
        <window
            name={`osd-${gdkmonitor.get_model()}`}
            namespace="osd"
            gdkmonitor={gdkmonitor}
            layer={Astal.Layer.OVERLAY}
            anchor={Astal.WindowAnchor.BOTTOM}
            exclusivity={Astal.Exclusivity.IGNORE}
            keymode={Astal.Keymode.NONE}
            visible={bind(OSDManager.OSDVisible)}
            clickThrough={true}
            application={App}
            cssClasses={["osd-window"]}
        >
            <revealer
                revealChild={bind(OSDManager.ODSRevealed)}
                transitionType={Gtk.RevealerTransitionType.SWING_UP}
                transitionDuration={200}
            >
                <box
                    cssClasses={[
                        "osd-container",
                    ]}
                    halign={Gtk.Align.CENTER}
                    valign={Gtk.Align.END}
                    child={bind(OSDManager.OSDContent).as(content =>
                        content ? content.widget : <label label="No content" />
                    )}
                />
            </revealer>
        </window>
    )
}