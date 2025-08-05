import { Gtk } from "astal/gtk4";

export interface NotificationOSDProps {
    notification: any; // Using any to avoid AstalNotifd import issues
}

/**
 * Get app icon or fallback for notifications
 */
const getAppIcon = (notification: any): string => {
    const appIcon = notification.app_icon;
    if (appIcon && appIcon.length > 0) {
        return appIcon;
    }

    // Fallback icons based on app name
    const appName = notification.app_name?.toLowerCase() || "";
    if (appName.includes("discord")) return "󰙯";
    if (appName.includes("telegram")) return "󰔁";
    if (appName.includes("firefox")) return "󰈹";
    if (appName.includes("chrome")) return "󰊯";
    if (appName.includes("spotify")) return "󰓇";
    if (appName.includes("mail")) return "󰇮";
    if (appName.includes("calendar")) return "󰃭";
    if (appName.includes("volume") || appName.includes("audio")) return "󰕾";
    if (appName.includes("battery")) return "󰁹";
    if (appName.includes("network") || appName.includes("wifi")) return "󰤨";

    return "󰂞"; // Default notification icon
};

/**
 * Get urgency CSS class for notifications
 */
const getUrgencyCssClass = (urgency: number): string => {
    // Using numbers instead of enum for urgency levels
    // 0 = LOW, 1 = NORMAL, 2 = CRITICAL
    switch (urgency) {
        case 0:
            return "notification-card-urgency-low";
        case 1:
            return "notification-card-urgency-normal";
        case 2:
            return "notification-card-urgency-critical";
        default:
            return "notification-card-urgency-normal";
    }
};

/**
 * Truncate text for notification display
 */
const truncateText = (text: string, maxLength: number): string => {
    return text.length > maxLength ? text.slice(0, maxLength - 3) + "..." : text;
};

export default function NotificationOSD(props: NotificationOSDProps): JSX.Element {
    const { notification } = props;
    const icon = getAppIcon(notification);
    const urgencyClass = getUrgencyCssClass(notification.urgency || 1);
    const appName = notification.app_name || "Unknown App";
    const summary = notification.summary || "";
    const body = notification.body || "";

    // Format time
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <box 
            orientation={Gtk.Orientation.HORIZONTAL}
            spacing={12}
            cssClasses={["notification-card", urgencyClass]}
            widthRequest={350}
        >
            {/* App icon */}
            <label 
                label={icon}
                cssClasses={["notification-card-icon"]}
                halign={Gtk.Align.START}
                valign={Gtk.Align.START}
            />
            
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
                {summary && (
                    <label
                        label={truncateText(summary, 50)}
                        cssClasses={["notification-card-summary"]}
                        halign={Gtk.Align.START}
                        wrap={false}
                        maxWidthChars={50}
                    />
                )}
                
                {/* Body (if present and not too long) */}
                {body && body.length > 0 && (
                    <label
                        label={truncateText(body, 100)}
                        cssClasses={["notification-card-body"]}
                        halign={Gtk.Align.START}
                        wrap={true}
                        lines={3}
                        maxWidthChars={50}
                    />
                )}
            </box>
        </box>
    );
}
