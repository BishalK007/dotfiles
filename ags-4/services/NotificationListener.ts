import AstalNotifd from "gi://AstalNotifd";
import GLib from "gi://GLib";
import {
    cacheTempImageForNotification,
    loadExistingCache,
    pruneCacheForActiveIds,
    removeCachedForId,
} from "./NotificationImageCache";
import { NotificationOSDManager } from "../widget/osd/NotificationOSD";
import NotificationOSD from "../widget/notification/notification_osd";

class NotificationListener {
    private notifd: AstalNotifd.Notifd;
    
    constructor() {
        this.notifd = AstalNotifd.get_default() as AstalNotifd.Notifd;
        // Load any existing cached files and prune stale ones asynchronously
        loadExistingCache();
        try {
            GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                try {
                    const active = Array.isArray((this.notifd as any).notifications)
                        ? (this.notifd as any).notifications.map((n: any) => n.id)
                        : [];
                    pruneCacheForActiveIds(active);
                } catch {}
                return GLib.SOURCE_REMOVE;
            });
        } catch {}

        this.init();
    }

    private init() {
        // Listen for new notifications
    this.notifd.connect('notified', (_: any, id: number) => {
            const notification = this.notifd.get_notification(id);
            
            if (!notification) {
                return;
            }

            // Don't show OSD if Do Not Disturb is enabled
            if (this.notifd.dont_disturb) {
                return;
            }

            // Check if notification should be shown as OSD based on urgency or app
            // Attempt to cache temp file images so they persist (best-effort)
            try {
                cacheTempImageForNotification(notification.id, notification.body, notification.app_icon);
            } catch {}

            if (this.shouldShowAsOSD(notification)) {
                this.showNotificationOSD(notification);
            }
        });

        // Clean cached files when a notification is resolved
        try {
            this.notifd.connect('resolved', (_: any, resolvedId: number) => {
                try { removeCachedForId(resolvedId); } catch {}
            });
        } catch {}
    }

    private shouldShowAsOSD(notification: any): boolean {
        // Show OSD for critical notifications
        if (notification.urgency === 2) { // CRITICAL
            return true;
        }

        // Show OSD for certain types of notifications
        const appName = notification.app_name?.toLowerCase() || "";
        const summary = notification.summary?.toLowerCase() || "";
        
        // Don't show for system notifications that already have their own OSDs
        if (appName.includes("volume") || 
            appName.includes("brightness") || 
            appName.includes("battery") || 
            appName.includes("network") ||
            appName.includes("wifi") ||
            summary.includes("volume") ||
            summary.includes("brightness") ||
            summary.includes("battery")) {
            return false; // These already have their own OSDs
        }

        // Show for communication apps by default
        if (appName.includes("discord") || 
            appName.includes("telegram") || 
            appName.includes("signal") ||
            appName.includes("whatsapp") ||
            appName.includes("mail") ||
            appName.includes("thunderbird")) {
            return true;
        }

        // Show for all normal notifications unless explicitly filtered
        return notification.urgency === 1; // NORMAL
    }

    private showNotificationOSD(notification: any) {
        const widget = NotificationOSD({ notification });
        
        // Show OSD with timeout based on urgency
        let timeout = 3000; // Default 3 seconds
        
        if (notification.urgency === 2) { // CRITICAL
            timeout = 5000; // 5 seconds for critical
        } else if (notification.urgency === 0) { // LOW
            timeout = 2000; // 2 seconds for low priority
        }

        NotificationOSDManager.showOSD({
            widget: NotificationOSD({ notification }),
            timeout: 4000,
            type: 'notification'
        });
    }

    // Optional: call this from any UI action that clears all notifications
    clearAll() {
        try {
            const ids: number[] = Array.isArray((this.notifd as any).notifications)
                ? (this.notifd as any).notifications.map((n: any) => n.id)
                : [];
            for (const id of ids) {
                try { removeCachedForId(id); } catch {}
            }
        } catch {}
    }
}

// Create and export the service instance
export const notificationListener = new NotificationListener();
