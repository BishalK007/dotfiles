import { Gtk } from "astal/gtk4";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import { Variable, bind } from "astal";
import { getAppIcon } from "./notification_utils";
import { NotificationOSDManager } from "../osd/NotificationOSD";
import { chainedBinding, mergeBindings, scaleSizeNumber } from "../../utils/utils";
import AstalNotifd from "gi://AstalNotifd";

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
    const expireTimeout: number = Number((notification as any).expire_timeout ?? -1);
    const createdSec: number = Number((notification as any).time ?? 0);
    const createdMs = createdSec * 1000;

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

    // Countdown support (only for timer notifications)
    const hasTimer = typeof expireTimeout === 'number' && expireTimeout > 0;
    const endMs = hasTimer ? (createdMs + expireTimeout) : 0;
    const tickVar = new Variable(Date.now());
    if (hasTimer) {
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 250, () => {
            tickVar.set(Date.now());
            return GLib.SOURCE_CONTINUE;
        });
    }

    const formatCountdown = (ms: number): string => {
        if (ms <= 0) return "00:00";
        const totalSec = Math.ceil(ms / 1000);
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <box
            orientation={Gtk.Orientation.HORIZONTAL}
            spacing={12}
            cssClasses={["notification-card"]}
            widthRequest={350}
        >
            {/* LEFT ICONS BOX */}
            <box
                orientation={Gtk.Orientation.VERTICAL}
                cssClasses={["notification-item-icons"]}
                spacing={scaleSizeNumber(8)}
                children={mergeBindings([chainedBinding(notification, ["state"])], (state: AstalNotifd.State) => {
                    let stateIcon;
                    switch (state) {
                        case AstalNotifd.State.DRAFT:
                            stateIcon = <label label="" cssClasses={["notification-state-icon", "notification-state-draft"]} />;
                            break;
                        case AstalNotifd.State.SENT:
                            stateIcon = <label label="" cssClasses={["notification-state-icon", "notification-state-sent"]} />;
                            break;
                        case AstalNotifd.State.RECEIVED:
                            stateIcon = <label label="" cssClasses={["notification-state-icon", "notification-state-received"]} />;
                            break;
                        default:
                            stateIcon = <label label="?" cssClasses={["notification-state-icon", "notification-state-unknown"]} />;
                    }
                    return [
                        // APP ICON
                        getAppIcon(notification),
                        // STATE ICON
                        stateIcon,
                    ];
                })}
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
                    <box
                        orientation={Gtk.Orientation.HORIZONTAL}
                        spacing={6}
                        cssClasses={["notification-osd-timer"]}
                        visible={hasTimer}
                        child={
                            <label
                                label={bind(tickVar).as((now: number) => formatCountdown(Math.max(0, endMs - now)))}
                                valign={Gtk.Align.CENTER}
                                vexpand={false}
                                cssClasses={["notification-osd-timer-label"]}
                            />
                        }
                    />
                    {/* Minimize button: hides OSD only */}
                    <button
                        cssClasses={["notification-osd-minimize-button"]}
                        onClicked={() => { try { NotificationOSDManager.hideOSD(); } catch { } }}
                        halign={Gtk.Align.END}
                        valign={Gtk.Align.CENTER}
                        vexpand={false}
                        child={<label label="-" cssClasses={["notification-osd-minimize-label"]} />}
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
