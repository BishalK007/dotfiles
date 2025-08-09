import { Gtk } from "astal/gtk4";
import {
    getAppIcon,
} from "./notification_utils";

export interface NotificationOSDProps {
    notification: any; // Using any to avoid AstalNotifd import issues
}

/**
 * Truncate text for notification display
 */
const truncateText = (text: string, maxLength: number): string => {
    return text.length > maxLength ? text.slice(0, maxLength - 3) + "..." : text;
};

export default function NotificationOSD(props: NotificationOSDProps): JSX.Element {
    const { notification } = props;
    const appName = notification.app_name;
    const summary = notification.summary || "";
    const body = notification.body || "";

    // Format time
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <box 
            orientation={Gtk.Orientation.HORIZONTAL}
            spacing={12}
            cssClasses={["notification-card"]}
            widthRequest={350}
        >
            {/* App icon */}
            {getAppIcon(notification)}
            
            {/* Content */}
            <box 
                orientation={Gtk.Orientation.VERTICAL}
                spacing={4}
                cssClasses={["notification-card-content"]}
                hexpand={true}
            >
                {/* Header with app name and time */}
                <box 
                    orientation={Gtk.Orientation.HORIZONTAL}
                    cssClasses={["notification-card-header"]}
                    spacing={8}
                >
                    <label
                        label={truncateText(appName, 20)}
                        cssClasses={["notification-card-app-name"]}
                        halign={Gtk.Align.START}
                        hexpand={true}
                    />
                    <label
                        label={timeStr}
                        cssClasses={["notification-card-time"]}
                        halign={Gtk.Align.END}
                    />
                </box>

                {/* Summary */}
                <label
                    label={truncateText(summary, 40)}
                    cssClasses={["notification-card-summary"]}
                    halign={Gtk.Align.START}
                    wrap={true}
                    lines={2}
                />

                {/* Body (if present) */}
                {body && (
                    <label
                        label={truncateText(body, 80)}
                        cssClasses={["notification-card-body"]}
                        halign={Gtk.Align.START}
                        wrap={true}
                        lines={3}
                    />
                )}
            </box>
        </box>
    );
}
