import { Gtk, Gdk } from "astal/gtk4";
import { Variable } from "astal";
import AstalTray from "gi://AstalTray";
import GObject from "gi://GObject?version=2.0";
import { scaleSizeNumber } from "../../utils/utils";

const SYNC = GObject.BindingFlags.SYNC_CREATE;
const systemtray = AstalTray.get_default();
const trayItems = Variable(systemtray.get_items());

// Keep trayItems up to date
systemtray.connect("item-added", () => trayItems.set(systemtray.get_items()));
systemtray.connect("item-removed", () => trayItems.set(systemtray.get_items()));

function TrayButton({ item }) {
    const icon = new Gtk.Image();
    item.bind_property("gicon", icon, "gicon", SYNC);

    let popover = null;
    if (item.menu_model) {
        popover = Gtk.PopoverMenu.new_from_model(item.menu_model);
        popover.set_css_classes(["systray-popover-menu"]);
        if (item.action_group)
            popover.insert_action_group("dbusmenu", item.action_group);

        item.connect("notify::action-group", () => {
            if (item.action_group)
                popover.insert_action_group("dbusmenu", item.action_group);
        });
    }

    // Make sure the button is focusable and visible
    const button = new Gtk.Button({
        child: icon,
        receives_default: true,
        can_focus: true,
        focus_on_click: false,
        css_classes: ["systray-popover-systray-item"],
    });

    // Make sure the icon expands
    icon.set_hexpand(true);
    icon.set_vexpand(true);

    // GestureClick for mouse button events
    const gesture = new Gtk.GestureClick();
    gesture.set_button(0); // 0 = any button
    gesture.connect("pressed", (gestureClick, n_press, x, y) => {
        const buttonNum = gestureClick.get_current_button();
        if (buttonNum === 1) {
            item.activate?.(0, 0);
        } else if (buttonNum === 3 && popover) {
            popover.set_pointing_to(button.get_allocation()); 
            popover.set_parent(button);
            popover.set_autohide(true);
            popover.popup();
        }
    });
    button.add_controller(gesture);

    return button;
}

export default function Systray() {
    return (
        <box
            orientation={Gtk.Orientation.HORIZONTAL}
            spacing={scaleSizeNumber(5)}
            cssClasses={["systray-popover-container"]}
        >
                {trayItems(items => {
                    const filtered = items.filter(item => item && item.gicon);
                    // Arrange items in a grid: 2 per row
                    return filtered.map((item, idx) => (
                        <TrayButton item={item} />
                    ));
                })}
            </box>
    );
}