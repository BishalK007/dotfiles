import { bind } from "astal/binding";
import { Gtk } from "astal/gtk4";
import AstalNotifd from "gi://AstalNotifd";
import { chainedBinding, mergeBindings, scaleSizeNumber } from "../../utils/utils";
import { Scrollable } from "../../custom-widgets/scrollable";

const notifd = AstalNotifd.get_default() as AstalNotifd.Notifd;

/**
 * Get urgency level text
 */
const getUrgencyText = (urgency: AstalNotifd.Urgency): string => {
    switch (urgency) {
        case AstalNotifd.Urgency.LOW:
            return "Low";
        case AstalNotifd.Urgency.NORMAL:
            return "Normal";
        case AstalNotifd.Urgency.CRITICAL:
            return "Critical";
        default:
            return "Normal";
    }
};

/**
 * Get urgency CSS class
 */
const getUrgencyCssClass = (urgency: AstalNotifd.Urgency): string => {
    switch (urgency) {
        case AstalNotifd.Urgency.LOW:
            return "notification-urgency-low";
        case AstalNotifd.Urgency.NORMAL:
            return "notification-urgency-normal";
        case AstalNotifd.Urgency.CRITICAL:
            return "notification-urgency-critical";
        default:
            return "notification-urgency-normal";
    }
};

/**
 * Format time for display
 */
const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // Less than a minute
    if (diff < 60000) {
        return "now";
    }
    // Less than an hour
    if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes}m ago`;
    }
    // Less than a day
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours}h ago`;
    }
    // Show time
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/**
 * Get app icon or fallback
 */
const getAppIcon = (notification: AstalNotifd.Notification): string => {
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
 * Comprehensive Notification Management System
 */
export default function NotificationPopup() {

    /**
     * Handle Do Not Disturb toggle
     */
    const handleDndToggle = () => {
        notifd.dont_disturb = !notifd.dont_disturb;
    };

    /**
     * Clear all notifications
     */
    const handleClearAll = () => {
        const notifications = notifd.notifications;
        notifications.forEach((notification: AstalNotifd.Notification) => {
            notification.dismiss();
        });
    };

    return (
        <box
            orientation={Gtk.Orientation.VERTICAL}
            cssClasses={["notification-popover-container"]}
            valign={Gtk.Align.CENTER}
            halign={Gtk.Align.CENTER}
            spacing={scaleSizeNumber(12)}
        >
            {/* Header Section */}
            <box
                orientation={Gtk.Orientation.HORIZONTAL}
                cssClasses={["notification-header"]}
                valign={Gtk.Align.CENTER}
                hexpand={true}
                spacing={scaleSizeNumber(8)}
            >
                <box
                    orientation={Gtk.Orientation.HORIZONTAL}
                    spacing={scaleSizeNumber(8)}
                    hexpand={true}
                    halign={Gtk.Align.START}
                >
                    <label
                        label="󰂞"
                        cssClasses={["notification-header-icon"]}
                        valign={Gtk.Align.CENTER}
                    />
                    <label
                        label="Notifications"
                        cssClasses={["notification-header-text"]}
                        valign={Gtk.Align.CENTER}
                        hexpand={true}
                        halign={Gtk.Align.START}
                    />
                </box>
                <button
                    cssClasses={chainedBinding(notifd, ["dont_disturb"]).as((dnd: boolean) =>
                        dnd
                            ? ["notification-dnd-button", "notification-dnd-on"]
                            : ["notification-dnd-button", "notification-dnd-off"]
                    )}
                    onClicked={handleDndToggle}
                    valign={Gtk.Align.CENTER}
                    child={
                        <label
                            label={chainedBinding(notifd, ["dont_disturb"]).as((dnd: boolean) =>
                                dnd ? "󰂛 DND" : "󰂚 DND"
                            )}
                            cssClasses={["notification-dnd-label"]}
                            valign={Gtk.Align.CENTER}
                        />
                    }
                />
            </box>
            {/* Controls Section */}
            <box
                orientation={Gtk.Orientation.HORIZONTAL}
                cssClasses={["notification-controls"]}
                spacing={scaleSizeNumber(8)}
                visible={chainedBinding(notifd, ["notifications"]).as((notifications: AstalNotifd.Notification[]) =>
                    notifications.length > 0
                )}
            >
                <label
                    label={chainedBinding(notifd, ["notifications"]).as((notifications: AstalNotifd.Notification[]) =>
                        `${notifications.length} notification${notifications.length === 1 ? '' : 's'}`
                    )}
                    cssClasses={["notification-count-label"]}
                    valign={Gtk.Align.CENTER}
                    hexpand={true}
                    halign={Gtk.Align.START}
                />
                <button
                    cssClasses={["notification-clear-button"]}
                    onClicked={handleClearAll}
                    valign={Gtk.Align.CENTER}
                    child={
                        <label
                            label="󰎟 Clear All"
                            cssClasses={["notification-clear-label"]}
                            valign={Gtk.Align.CENTER}
                        />
                    }
                />
            </box>
            {/* Notifications List Section */}
            <box
                orientation={Gtk.Orientation.VERTICAL}
                cssClasses={["notification-list-section"]}
                spacing={scaleSizeNumber(4)}
                child={
                    Scrollable({
                        cssClasses: ["notification-scrollable"],
                        maxContentHeight: scaleSizeNumber(400),
                        children: <box
                            orientation={Gtk.Orientation.VERTICAL}
                            cssClasses={["notification-list-container"]}
                            spacing={scaleSizeNumber(4)}
                            children={chainedBinding(notifd, ["notifications"]).as((notifications: AstalNotifd.Notification[]) => {
                                if (notifications.length === 0) {
                                    return [
                                        <box
                                            cssClasses={["notification-empty"]}
                                            orientation={Gtk.Orientation.VERTICAL}
                                            spacing={scaleSizeNumber(8)}
                                            valign={Gtk.Align.CENTER}
                                        >
                                            <label
                                                label="󰂚"
                                                cssClasses={["notification-empty-icon"]}
                                            />
                                            <label
                                                label="No notifications"
                                                cssClasses={["notification-empty-text"]}
                                            />
                                        </box>
                                    ];
                                }
                                // Sort notifications by time in descending order (newest first)
                                const sortedNotifications = [...notifications].sort((a, b) => b.time - a.time);
                                return sortedNotifications.map((notification) => (
                                    <NotificationItem notification={notification} />
                                ));
                            })}
                        />
                    })
                }
            />
        </box>
    );
}

function NotificationItem({ notification }: { notification: AstalNotifd.Notification }) {

    /**
     * Handle notification dismiss
     */
    const handleDismiss = () => {
        notification.dismiss();
    };

    /**
     * Handle action invocation
     */
    const handleActionInvoke = (actionId: string) => {
        notification.invoke(actionId);
    };

    return (
        <box
            orientation={Gtk.Orientation.VERTICAL}
            cssClasses={chainedBinding(notification, ["urgency"]).as((urgency: AstalNotifd.Urgency) => [
                "notification-item",
                getUrgencyCssClass(urgency)
            ])}
            child={
                <box
                    orientation={Gtk.Orientation.HORIZONTAL}
                    cssClasses={["notification-item-header"]}
                    spacing={scaleSizeNumber(8)}
                >
                    <label
                        label={chainedBinding(notification, ["app_icon", "app_name"]).as(() => getAppIcon(notification))}
                        cssClasses={["notification-app-icon"]}
                        valign={Gtk.Align.START}
                    />
                    <box
                        orientation={Gtk.Orientation.VERTICAL}
                        cssClasses={["notification-content"]}
                        hexpand={true}
                        spacing={scaleSizeNumber(2)}
                    >
                        <box
                            orientation={Gtk.Orientation.HORIZONTAL}
                            spacing={scaleSizeNumber(8)}
                        >
                            <label
                                label={chainedBinding(notification, ["app_name"]).as((appName: string) => appName || "Unknown App")}
                                cssClasses={["notification-app-name"]}
                                hexpand={true}
                                halign={Gtk.Align.START}
                                ellipsize={3}
                            />
                            <label
                                label={chainedBinding(notification, ["time"]).as((time: number) => formatTime(time))}
                                cssClasses={["notification-time"]}
                                halign={Gtk.Align.END}
                            />
                        </box>
                        <label
                            label={chainedBinding(notification, ["summary"]).as((summary: string) => summary || "")}
                            cssClasses={["notification-summary"]}
                            halign={Gtk.Align.START}
                            ellipsize={3}
                            maxWidthChars={50}
                            wrap={false}
                        />
                        {chainedBinding(notification, ["body"]).as((body: string) => body && body.length > 0) && (
                            <label
                                label={chainedBinding(notification, ["body"]).as((body: string) => body)}
                                cssClasses={["notification-body"]}
                                halign={Gtk.Align.START}
                                ellipsize={3}
                                maxWidthChars={60}
                                wrap={true}
                                lines={3}
                            />
                        )}
                        {chainedBinding(notification, ["urgency"]).as((urgency: AstalNotifd.Urgency) => urgency !== AstalNotifd.Urgency.NORMAL) && (
                            <label
                                label={chainedBinding(notification, ["urgency"]).as((urgency: AstalNotifd.Urgency) => getUrgencyText(urgency))}
                                cssClasses={chainedBinding(notification, ["urgency"]).as((urgency: AstalNotifd.Urgency) => [
                                    "notification-urgency-badge",
                                    getUrgencyCssClass(urgency)
                                ])}
                                halign={Gtk.Align.START}
                            />
                        )}
                    </box>
                    <box
                        orientation={Gtk.Orientation.HORIZONTAL}
                        cssClasses={["notification-actions"]}
                        spacing={scaleSizeNumber(4)}
                        valign={Gtk.Align.START}
                        children={mergeBindings(
                            [chainedBinding(notification, ["actions"])],
                            (actions: any[]) => [
                                // Notification Actions (up to 2)
                                ...(actions && actions.length > 0
                                    ? actions.slice(0, 2).map((action: any) => (
                                        <button
                                            cssClasses={["notification-action-button"]}
                                            onClicked={() => handleActionInvoke(action.id)}
                                            child={
                                                <label
                                                    label={action.label}
                                                    cssClasses={["notification-action-label"]}
                                                />
                                            }
                                        />
                                    ))
                                    : []
                                ),
                                // Dismiss Button (always present)
                                <button
                                    cssClasses={["notification-dismiss-button"]}
                                    onClicked={handleDismiss}
                                    child={
                                        <label
                                            label="󰅖"
                                            cssClasses={["notification-dismiss-icon"]}
                                        />
                                    }
                                />
                            ]
                        )}
                    />
                </box>
            }
        />
    );
}
