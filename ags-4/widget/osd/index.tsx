import { App, Astal, Gdk, Gtk } from "astal/gtk4"
import { bind } from "astal"
import { OSDManager } from "../../services/OSDManager"

export default function OSD(gdkmonitor: Gdk.Monitor) {
    // Determine anchor based on content type
    const getAnchor = (content: any) => {
        if (content?.type === 'notification') {
            return Astal.WindowAnchor.TOP | Astal.WindowAnchor.RIGHT;
        }
        return Astal.WindowAnchor.BOTTOM; // Default for volume/brightness
    };

    // Determine transition based on content type
    const getTransition = (content: any) => {
        if (content?.type === 'notification') {
            return Gtk.RevealerTransitionType.SLIDE_LEFT;
        }
        return Gtk.RevealerTransitionType.SLIDE_UP; // Default for volume/brightness
    };

    // Determine alignment based on content type
    const getAlignment = (content: any) => {
        if (content?.type === 'notification') {
            return {
                halign: Gtk.Align.END,
                valign: Gtk.Align.START
            };
        }
        return {
            halign: Gtk.Align.CENTER,
            valign: Gtk.Align.END
        };
    };

    return <window
        name={`osd-${gdkmonitor.get_model()}`}
        namespace="osd"
        gdkmonitor={gdkmonitor}
        layer={Astal.Layer.OVERLAY}
        anchor={bind(OSDManager.OSDContent).as(getAnchor)}
        exclusivity={Astal.Exclusivity.IGNORE}
        keymode={Astal.Keymode.NONE}
        visible={bind(OSDManager.OSDVisible)}
        application={App}
        cssClasses={["osd-window"]}
        child={
            <revealer
                revealChild={bind(OSDManager.ODSRevealed)}
                transitionType={bind(OSDManager.OSDContent).as(getTransition)}
                transitionDuration={200}
                child={
                    <box
                        cssClasses={bind(OSDManager.OSDContent).as(content => 
                            content?.type === 'notification' 
                                ? ["notification-osd-container"]
                                : ["osd-container"]
                        )}
                        halign={bind(OSDManager.OSDContent).as(content => getAlignment(content).halign)}
                        valign={bind(OSDManager.OSDContent).as(content => getAlignment(content).valign)}
                        child={bind(OSDManager.OSDContent).as(content =>
                            content ? content.widget : <label label="No content" />
                        )}
                    />
                }
            />
        }
    />
}