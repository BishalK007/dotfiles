import { Gtk } from "astal/gtk4"
import { Binding, Variable } from "astal"
import AstalHyprland from "gi://AstalHyprland"
// import style from "./style.scss"

const hyprland = AstalHyprland.get_default()
const currWorkspaceNumber = Variable(hyprland.focused_monitor.get_active_workspace().get_id())

// listen for workspace change events
hyprland.connect('event', (self, ev, data) => {
    if (ev === 'workspacev2') {
        const newWsId = parseInt(data, 10)
        log(`Workspace switched to ${newWsId}`)
        currWorkspaceNumber.set(newWsId)
    }
})

const switchToNextWorkspace = () => {
    hyprland.message(`dispatch workspace +1`);
}
const switchToPrevWorkspace = () => {
    hyprland.message(`dispatch workspace -1`);
}

export default function WorkspaceWidget() {

    return (
        <box
            orientation={Gtk.Orientation.HORIZONTAL}
            spacing={0}
            homogeneous
            cssClasses={["workspace"]}
            vexpand={false}
            valign={Gtk.Align.CENTER}
            halign={Gtk.Align.CENTER} >
            <button
                onClicked={() => { switchToPrevWorkspace() }}
                halign={Gtk.Align.START}
                valign={Gtk.Align.CENTER}>
                <label label="" cssClasses={["workspace-back-button-label"]} /> 
            </button>
            <label
                label={currWorkspaceNumber(id => `${id}`)}
                cssClasses={["workspace-center-label"]}
                halign={Gtk.Align.CENTER} 
                valign={Gtk.Align.CENTER} />
            <button
                onClicked={() => { switchToNextWorkspace() }}
                halign={Gtk.Align.END}
                valign={Gtk.Align.CENTER}>
                <label label="" cssClasses={["workspace-front-button-label"]} />
            </button>
        </box>
    )
}