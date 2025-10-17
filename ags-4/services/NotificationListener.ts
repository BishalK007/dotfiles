import AstalNotifd from "gi://AstalNotifd";
import GLib from "gi://GLib";
import {
    cacheImagePathForNotification,
    loadExistingCache,
    pruneCacheForActiveIds,
    removeCachedForId,
} from "./NotificationImageCache";
import { NotificationOSDManager } from "../widget/osd/NotificationOSD";
import NotificationOSD from "../widget/notification/notification_osd";

class NotificationListener {
    private notifd: any;
    // Track auto-removal timers per notification id
    private expiryTimers: Map<number, number> = new Map();
    
    constructor() {
    this.notifd = (AstalNotifd as any).get_default();
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
    this.notifd.connect('notified', (_: any, id: number, replaced: boolean) => {
            const notification = this.notifd.get_notification(id);
            
            if (!notification) {
                return;
            }

            // Don't show OSD if Do Not Disturb is enabled
            if (this.notifd.dont_disturb) {
                return;
            }

            // Cache only notification.image (absolute path or file:// URI)
            try {
                // @ts-ignore - property provided by AstalNotifd
                cacheImagePathForNotification(notification.id, (notification as any).image);
            } catch {}

            // Setup/refresh auto-removal timer for list based on expire_timeout
            try {
                // Clear any previous timer for this id
                const old = this.expiryTimers.get(notification.id);
                const et: number = (notification as any).expire_timeout;
                // Spec: when > 0 => auto remove from list after et ms
                //       when 0 => keep in list
                //       when -1 => keep in list (our policy)
                if (typeof et === 'number' && et > 0) {
                    // If this notification was replaced and we already have a timer, don't reset it.
                    if (replaced === true && typeof old === 'number') {
                        // keep existing timer
                    } else {
                        if (typeof old === 'number') { GLib.source_remove(old); }
                        const sourceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, et, () => {
                        try { (notification as any).dismiss?.(); } catch {}
                        // Remove from map; the resolved signal will also clear if it fires
                            const sid = this.expiryTimers.get(id);
                            if (typeof sid === 'number') this.expiryTimers.delete(id);
                            return GLib.SOURCE_REMOVE;
                        });
                        this.expiryTimers.set(notification.id, sourceId);
                    }
                }
            } catch {}

            if (this.shouldShowAsOSD(notification)) {
                this.showNotificationOSD(notification, replaced === true);
            }
        });

        // Clean cached files when a notification is resolved
        try {
            this.notifd.connect('resolved', (_: any, resolvedId: number, reason: any) => {
                // Clear any pending auto-removal timer for this id
                try {
                    const sid = this.expiryTimers.get(resolvedId);
                    if (typeof sid === 'number') {
                        GLib.source_remove(sid);
                        this.expiryTimers.delete(resolvedId);
                    }
                } catch {}
                try { removeCachedForId(resolvedId); } catch {}
                // If the currently displayed OSD matches, hide it.
                try {
                    const content = NotificationOSDManager.OSDContent.get();
                    if (content && content.type === 'notification' && (content as any).id === resolvedId) {
                        // Keep resident notifications visible on INVOKED
                        if ((content as any).resident && reason === (AstalNotifd as any).ClosedReason?.INVOKED) {
                            return;
                        }
                        NotificationOSDManager.hideOSD();
                    }
                } catch {}
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

    private showNotificationOSD(notification: any, replaced = false) {
        const widget = NotificationOSD({ notification });

    // OSD timeout: if expire_timeout > 0, use it; else fallback to default OSD hide
        const computeTimeout = (): number => {
            try {
                const et = (notification as any).expire_timeout;
        if (typeof et === 'number' && et > 0) return et;
            } catch {}
        return 4000; // default OSD auto-hide
        };

        const timeout = computeTimeout();

        NotificationOSDManager.showOSD({
            widget,
            timeout,
            type: 'notification',
            // carry id for Plan 3 resolution handling
            // @ts-ignore extend content contract with id
            id: notification.id,
            replaced,
            // @ts-ignore resident flag if provided by server hints
            resident: (notification as any).resident === true,
            // Replacements currently reuse timer per computed policy above
        } as any);
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
