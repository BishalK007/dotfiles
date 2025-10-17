import { App, Astal, Gdk, Gtk } from "astal/gtk4"
import GLib from "gi://GLib";
import { bind, Variable } from "astal"

// Separate OSD Manager for Notifications
export interface NotificationOSDContent {
    widget: JSX.Element;
    timeout: number; // ms; negative => no auto-hide
    type: 'notification';
    id?: number; // notification id for coordination
    replaced?: boolean; // if true, update content without resetting timer
    resident?: boolean; // if true, keep after action invoke
}

class NotificationOSDManagerClass {
    OSDVisible = new Variable(false);
    ODSRevealed = new Variable(false);
    OSDContent = new Variable<NotificationOSDContent | null>(null);
    
    // Shared variable to track when OSD should be hidden
    private hideTimestamp = new Variable<number | null>(null);
    private hideTimerSourceId: number | null = null;
    
    // Track animation state to handle interruptions
    private isAnimating = false;
    private animationTimeout: any = null;
    
    // OSD blocking mechanism
    private isBlocked = false;
    private blockUntilTimestamp: number | null = null;
    // No default fallback; timeout <= 0 means no auto-hide

    constructor() {
        // Start the background timer thread
        this.startHideTimer();
    }

    handleOSDVisibleToggle = () => {
        const currentVisible = this.OSDVisible.get();
        
        // Clear any existing animation timeout
        if (this.animationTimeout) {
            clearTimeout(this.animationTimeout);
            this.animationTimeout = null;
        }
        
        this.isAnimating = true;
        
        if (!currentVisible) {
            // false -> true: set visible first, then revealed
            this.OSDVisible.set(true);
            this.animationTimeout = setTimeout(() => {
                this.ODSRevealed.set(true);
                this.isAnimating = false;
                this.animationTimeout = null;
            }, 200);
        } else {
            // true -> false: set not revealed first, then not visible
            this.ODSRevealed.set(false);
            this.animationTimeout = setTimeout(() => {
                this.OSDVisible.set(false);
                this.isAnimating = false;
                this.animationTimeout = null;
            }, 200);
        }
    };

    startHideTimer = () => {
        if (this.hideTimerSourceId !== null) return; // already running
        this.hideTimerSourceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
            try {
                const hideTime = this.hideTimestamp.get();
                const currentTime = Date.now();

                // Check if blocking is active and has expired
                if (this.isBlocked && this.blockUntilTimestamp && currentTime >= this.blockUntilTimestamp) {
                    this.isBlocked = false;
                    this.blockUntilTimestamp = null;
                }

                if (!hideTime || this.isAnimating || this.isBlocked) return GLib.SOURCE_CONTINUE;

                if (currentTime >= hideTime) {
                    this.hideTimestamp.set(null);
                    this.hideOSD();
                }
            } catch {}
            return GLib.SOURCE_CONTINUE;
        });
    };

    showOSD = (content: NotificationOSDContent) => {
        console.log(`[NotificationOSDManager] showOSD called with content: ${JSON.stringify({
            type: content.type,
            timeout: content.timeout
        })}`);
        
        // Set new content
        this.OSDContent.set(content);
        
        // Calculate hide timestamp; if this is a replacement, keep existing deadline
        if (content.replaced && this.OSDVisible.get()) {
            // keep current hideTimestamp as-is
        } else {
            const t = content.timeout;
            if (typeof t === 'number' && t > 0) {
                this.hideTimestamp.set(Date.now() + t);
            } else {
                // t <= 0 or invalid -> no auto-hide
                this.hideTimestamp.set(null);
            }
        }
        
        // If not visible, show it
        if (!this.OSDVisible.get()) {
            this.handleOSDVisibleToggle();
        }
    };

    hideOSD = () => {
        console.log("[NotificationOSDManager] hideOSD called");
        
        if (this.OSDVisible.get()) {
            this.handleOSDVisibleToggle();
        }
    };

    blockOSD = (duration: number) => {
        this.isBlocked = true;
        this.blockUntilTimestamp = Date.now() + duration;
        this.hideOSD();
    };
}

// Export the manager instance
export const NotificationOSDManager = new NotificationOSDManagerClass();

// Notification OSD Component
export default function NotificationOSD(gdkmonitor: Gdk.Monitor) {
    return <window
        name={`notification-osd-${gdkmonitor.get_model()}`}
        namespace="notification-osd"
        gdkmonitor={gdkmonitor}
        layer={Astal.Layer.OVERLAY}
        anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.RIGHT}
        exclusivity={Astal.Exclusivity.IGNORE}
        keymode={Astal.Keymode.NONE}
        visible={bind(NotificationOSDManager.OSDVisible)}
        application={App}
        cssClasses={["osd-window"]}
        child={
            <revealer
                revealChild={bind(NotificationOSDManager.ODSRevealed)}
                transitionType={Gtk.RevealerTransitionType.SLIDE_LEFT}
                transitionDuration={200}
                child={
                    <box
                        cssClasses={["notification-osd-container"]}
                        halign={Gtk.Align.END}
                        valign={Gtk.Align.START}
                        child={bind(NotificationOSDManager.OSDContent).as(content =>
                            content ? content.widget : <label label="No content" />
                        )}
                    />
                }
            />
        }
    />
}
