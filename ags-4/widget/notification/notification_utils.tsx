import AstalNotifd from "gi://AstalNotifd";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import Gtk from "gi://Gtk";
import Gdk from "gi://Gdk";
import { getCachedImagePath } from "../../services/NotificationImageCache";

/**
 * Check if file exists using GJS
 */
const fileExists = (path: string): boolean => {
    const file = Gio.File.new_for_path(path);
    return file.query_exists(null);
};

/**
 * Execute command using GJS
 */
const executeCommand = (command: string): boolean => {
    try {
        const [success] = GLib.spawn_command_line_sync(command);
        return success;
    } catch (error) {
        console.warn("Command execution failed:", error);
        return false;
    }
};

const ASSETS_PATH = "/home/bishal/.config/dotfiles/ags-4/assets";
const NOTIFICATION_PLACEHOLDER = `${ASSETS_PATH}/notification_placeholder.png`;



/**
 * Get urgency level text
 */
export const getUrgencyText = (urgency: AstalNotifd.Urgency): string => {
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
export const getUrgencyCssClass = (urgency: AstalNotifd.Urgency): string => {
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
export const formatTime = (timestamp: number): string => {
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
 * Get app icon or fallback text icon
 */
export const getAppIconFallback = (notification: AstalNotifd.Notification): string => {
    // Fallback icons based on app name
    const appName = notification.app_name?.toLowerCase() || "";
    if (appName.toLowerCase().includes("discord")) return "󰙯";
    if (appName.toLowerCase().includes("telegram")) return "󰔁";
    if (appName.toLowerCase().includes("firefox")) return "󰈹";
    if (appName.toLowerCase().includes("chrome")) return "󰊯";
    if (appName.toLowerCase().includes("spotify")) return "󰓇";
    if (appName.toLowerCase().includes("mail")) return "󰇮";
    if (appName.toLowerCase().includes("calendar")) return "󰃭";
    if (appName.toLowerCase().includes("volume") || appName.includes("audio")) return "󰕾";
    if (appName.toLowerCase().includes("battery")) return "󰁹";
    if (appName.toLowerCase().includes("network") || appName.includes("wifi")) return "󰤨";

    return "󰂞"; // Default notification icon
};

/**
 * Check if app_icon is an image file path
 */
export const checkImageFile = (iconPath: string): {
    isImage: boolean;
    type: "JPG" | "PNG" | null;
} => {
    if (!iconPath) {
        return {
            isImage: false,
            type: null,
        };
    }

    const lowercasePath = iconPath.toLowerCase();
    // print("Checking image file:", lowercasePath);

    if (lowercasePath.endsWith('.png')) {
        return {
            isImage: true,
            type: "PNG",
        };
    } else if (lowercasePath.endsWith('.jpg') || lowercasePath.endsWith('.jpeg')) {
        return {
            isImage: true,
            type: "JPG",
        };
    } else {
        return {
            isImage: false,
            type: null,
        };
    }
};

export const getAppIcon = (notification: AstalNotifd.Notification): JSX.Element => {
    // Prefer cached image if available
    const cached = getCachedImagePath(notification.id);
    if (cached && fileExists(cached)) {
        return (
            <image
                file={cached}
                cssClasses={["notification-app-icon-img"]}
                valign={Gtk.Align.START}
            />
        );
    }

    // Check if a valid app icon path is provided.
    if (notification.app_icon && checkImageFile(notification.app_icon).isImage) {
        const iconPath = Gio.File.new_for_uri(notification.app_icon).get_path();
        if (iconPath) {
            return (
                <image
                    file={iconPath}
                    cssClasses={["notification-app-icon-img"]}
                    valign={Gtk.Align.START}
                />
            );
        }
    }

    // If no valid icon is found, return a generic fallback icon from the theme.
    return (
        <label
            label={getAppIconFallback(notification)}
            cssClasses={["notification-app-icon-label"]}
            valign={Gtk.Align.START}
        />
    );
};
