import { Gtk } from "astal/gtk4";
import { bind } from "astal/binding";
import AstalNotifd from "gi://AstalNotifd";
import { scaleSizeNumber } from "../../utils/utils";
import NotificationPopup from "./popup";

export default function Notification() {
    const notifd = AstalNotifd.get_default();

    /**
     * Get notification icon based on current state
     */
    const getNotificationIcon = () => {
        return bind(notifd, "notifications").as((notifications) => {
            if (notifications.length === 0) {
                return "󰂚"; // No notifications
            }
            
            // Check for urgent notifications
            const hasUrgent = notifications.some(n => n.urgency === AstalNotifd.Urgency.CRITICAL);
            if (hasUrgent) {
                return "󱅫"; // Urgent notification
            }
            
            return "󰂞"; // Has notifications
        });
    };

    /**
     * Get notification count for display
     */
    const getNotificationCount = () => {
        return bind(notifd, "notifications").as((notifications) => {
            const count = notifications.length;
            return count > 0 ? ` ${count}` : "";
        });
    };

    return (
        <menubutton
            cssClasses={["notification", "notification-box"]}
        >
            <box
                orientation={Gtk.Orientation.HORIZONTAL}
                spacing={scaleSizeNumber(0)}
                valign={Gtk.Align.CENTER}
            >
                <label
                    label={getNotificationIcon()}
                    cssClasses={["notification-icon"]}
                    valign={Gtk.Align.CENTER}
                />
                <label
                    label={getNotificationCount()}
                    cssClasses={["notification-count"]}
                    valign={Gtk.Align.CENTER}
                    visible={bind(notifd, "notifications").as(notifications => notifications.length > 0)}
                />
            </box>
            <popover
                cssClasses={["notification-popover"]}
                autohide={false}
            >
                <NotificationPopup />
            </popover>
        </menubutton>
    );
}