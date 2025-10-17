import { Gtk } from "astal/gtk4";
import Gio from "gi://Gio";
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

    // Allow only anchor links in body, strip other HTML tags
    const sanitizeBodyToGtkMarkup = (html: string): string => {
        // Remove all tags except <a ...> and </a>
        let out = html.replace(/<(?!\/?a(\s|>|$))[^>]*>/gi, "");
        // Basic cleanup of anchor tags: ensure href remains quoted
        out = out.replace(/<a([^>]*)>/gi, (m, attrs) => {
            const hrefMatch = attrs.match(/href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
            const href = hrefMatch ? (hrefMatch[2] || hrefMatch[3] || hrefMatch[4] || "") : "";
            const safeHref = href.replace(/"/g, "&quot;");
            return `<a href="${safeHref}">`;
        });
        // Auto-link bare URLs only if there are no existing <a> tags
        if (!/<a\s/i.test(out)) {
            out = out.replace(/\b((?:https?|file):\/\/[^\s<]+)\b/gi, '<a href="$1">$1</a>');
        }
        return out;
    };

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
                        // Render limited markup so <a href> links are clickable
                        useMarkup={true}
                        label={sanitizeBodyToGtkMarkup(body)}
                        cssClasses={["notification-card-body"]}
                        halign={Gtk.Align.START}
                        wrap={true}
                        lines={3}
                        selectable={true}
                        onActivateLink={(_, uri: string) => {
                            try { Gio.AppInfo.launch_default_for_uri(uri, null); } catch { /* ignore */ }
                            return true;
                        }}
                    />
                )}
            </box>
        </box>
    );
}
