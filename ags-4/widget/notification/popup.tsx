import { bind } from "astal/binding";
import { Gtk } from "astal/gtk4";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import AstalNotifd from "gi://AstalNotifd";
import { chainedBinding, mergeBindings, scaleSizeNumber } from "../../utils/utils";
import { Binding } from "astal";
import { Scrollable } from "../../custom-widgets/scrollable";
import {
    getUrgencyCssClass,
    getAppIconFallback,
    getUrgencyText,
    getAppIcon,
    formatTime,
} from "./notification_utils";


const notifd = AstalNotifd.get_default() as AstalNotifd.Notifd;

// Global ticking clock (updates ~4x/sec) to drive countdown labels without per-item timers
let _nowTick = Date.now();
const _nowTickSubs: Array<(v: number) => void> = [];
const nowTickState = {
    get(): number { return _nowTick; },
    subscribe(cb: (v: number) => void) {
        _nowTickSubs.push(cb); return () => {
            const i = _nowTickSubs.indexOf(cb); if (i >= 0) _nowTickSubs.splice(i, 1);
        };
    },
    set(v: number) { _nowTick = v; _nowTickSubs.forEach(fn => fn(_nowTick)); }
};
const nowTick = Binding.bind(nowTickState);
let nowTickTimerId: number | null = null;
if (nowTickTimerId === null) {
    nowTickTimerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 250, () => {
        (nowTickState as any).set(Date.now());
        return GLib.SOURCE_CONTINUE;
    });
}

const formatCountdown = (ms: number): string => {
    if (ms <= 0) return "00:00";
    const totalSec = Math.ceil(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const mm = m.toString().padStart(2, '0');
    const ss = s.toString().padStart(2, '0');
    return `${mm}:${ss}`;
};

/**
 * Comprehensive Notification Management System
 */
export default function NotificationPopup() {
    // Pagination state and helpers
    const PER_PAGE_NOTIFICATION_COUNT = 25;
    let _pageValue = 1;
    const _pageSubscribers: Array<(v: number) => void> = [];
    const pageState = {
        get(): number { return _pageValue; },
        subscribe(cb: (v: number) => void) {
            _pageSubscribers.push(cb); return () => {
                const i = _pageSubscribers.indexOf(cb); if (i >= 0) _pageSubscribers.splice(i, 1);
            };
        },
        set(v: number) { _pageValue = v; _pageSubscribers.forEach(fn => fn(_pageValue)); }
    };
    const currentPage = Binding.bind(pageState);

    const setPage = (p: number) => {
        const total = Math.max(1, Math.ceil((notifd as any).notifications.length / PER_PAGE_NOTIFICATION_COUNT));
        if (p < 1) p = 1;
        if (p > total) p = total;
        (pageState as any).set(p);
    };

    // Clearing state and spinner animation
    let _clearing = false;
    const _clearingSubs: Array<(v: boolean) => void> = [];
    const clearingState = {
        get(): boolean { return _clearing; },
        subscribe(cb: (v: boolean) => void) {
            _clearingSubs.push(cb); return () => {
                const i = _clearingSubs.indexOf(cb); if (i >= 0) _clearingSubs.splice(i, 1);
            };
        },
        set(v: boolean) { _clearing = v; _clearingSubs.forEach(fn => fn(_clearing)); }
    };
    const isClearing = Binding.bind(clearingState);

    const spinnerFrames = ["  ", "  ", "  ", "  ", "  ", "  "];
    let _frame = 0;
    const _frameSubs: Array<(v: number) => void> = [];
    const frameState = {
        get(): number { return _frame; },
        subscribe(cb: (v: number) => void) {
            _frameSubs.push(cb); return () => {
                const i = _frameSubs.indexOf(cb); if (i >= 0) _frameSubs.splice(i, 1);
            };
        },
        set(v: number) { _frame = v; _frameSubs.forEach(fn => fn(_frame)); }
    };
    const frameIndex = Binding.bind(frameState);
    let spinnerTimeoutId: number | null = null;
    const startSpinner = () => {
        if (spinnerTimeoutId !== null) return;
        spinnerTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 120, () => {
            if (!_clearing) { spinnerTimeoutId = null; return GLib.SOURCE_REMOVE; }
            frameState.set((frameState.get() + 1) % spinnerFrames.length);
            return GLib.SOURCE_CONTINUE;
        });
    };

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
        // Snapshot the current list to avoid churn while iterating
        const toClear: AstalNotifd.Notification[] = [...notifd.notifications];
        if (toClear.length === 0) return;
        (clearingState as any).set(true);
        startSpinner();
        const BATCH = 50; // tune batch size as needed
        let idx = 0;
        GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            const end = Math.min(idx + BATCH, toClear.length);
            for (let i = idx; i < end; i++) {
                try { toClear[i].dismiss(); } catch { }
            }
            idx = end;
            if (idx >= toClear.length) {
                // After clearing, go back to page 1
                setPage(1);
                (clearingState as any).set(false);
                return GLib.SOURCE_REMOVE;
            }
            return GLib.SOURCE_CONTINUE;
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
            {/* Controls Section (count + clear all) */}
            <box
                orientation={Gtk.Orientation.HORIZONTAL}
                cssClasses={["notification-controls"]}
                spacing={scaleSizeNumber(8)}
                visible={mergeBindings([chainedBinding(notifd, ["notifications"]), isClearing], (notifications: AstalNotifd.Notification[], clearing: boolean) =>
                    notifications.length > 0 && !clearing
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
                    child={<label label="󰎟 Clear All" cssClasses={["notification-clear-label"]} valign={Gtk.Align.CENTER} />}
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
                            children={mergeBindings([chainedBinding(notifd, ["notifications"]), currentPage, isClearing], (notifications: AstalNotifd.Notification[], page: number, clearing: boolean) => {
                                if (clearing) {
                                    return [
                                        <box
                                            orientation={Gtk.Orientation.VERTICAL}
                                            cssClasses={["notification-list-container"]}
                                            valign={Gtk.Align.CENTER}
                                            halign={Gtk.Align.CENTER}
                                            vexpand={true}
                                            hexpand={true}
                                            spacing={scaleSizeNumber(8)}
                                        >
                                            <label
                                                label={frameIndex.as((i: number) => spinnerFrames[i])}
                                                cssClasses={["notification-empty-icon"]}
                                                halign={Gtk.Align.CENTER}
                                            />
                                            <label label="Deletion" cssClasses={["notification-empty-text"]} halign={Gtk.Align.CENTER} />
                                            <label label="In-Progress" cssClasses={["notification-empty-text"]} halign={Gtk.Align.CENTER} />
                                        </box>
                                    ];
                                }
                                const list = notifications || [];
                                if (list.length === 0) {
                                    return [
                                        <box
                                            cssClasses={["notification-empty"]}
                                            orientation={Gtk.Orientation.VERTICAL}
                                            spacing={scaleSizeNumber(8)}
                                            valign={Gtk.Align.CENTER}
                                        >
                                            <label label="󰂚" cssClasses={["notification-empty-icon"]} />
                                            <label label="No notifications" cssClasses={["notification-empty-text"]} />
                                        </box>
                                    ];
                                }
                                // Sort notifications by time in descending order (newest first)
                                const sorted = [...list].sort((a, b) => b.time - a.time);
                                const total = Math.max(1, Math.ceil(sorted.length / PER_PAGE_NOTIFICATION_COUNT));
                                const pg = Math.min(Math.max(page || 1, 1), total);
                                const start = (pg - 1) * PER_PAGE_NOTIFICATION_COUNT;
                                const end = start + PER_PAGE_NOTIFICATION_COUNT;
                                return sorted.slice(start, end).map((notification) => (
                                    <NotificationItem notification={notification} />
                                ));
                            })}
                        />
                    })
                }
            />

            {/* Pagination Navigation (visible only when more than one page and not clearing) */}
            <box
                orientation={Gtk.Orientation.HORIZONTAL}
                cssClasses={["notification-controls"]}
                spacing={scaleSizeNumber(8)}
                halign={Gtk.Align.CENTER}
                valign={Gtk.Align.CENTER}
                visible={mergeBindings([chainedBinding(notifd, ["notifications"]), isClearing], (notifications: AstalNotifd.Notification[], clearing: boolean) => {
                    const total = Math.ceil((notifications?.length || 0) / PER_PAGE_NOTIFICATION_COUNT);
                    return total > 1 && !clearing;
                })}
            >
                <button
                    cssClasses={["notification-clear-button"]}
                    onClicked={() => setPage(currentPage.get() - 1)}
                    valign={Gtk.Align.CENTER}
                    child={<label label="‹" cssClasses={["notification-clear-label"]} valign={Gtk.Align.CENTER} />}
                />
                <label
                    label={mergeBindings([chainedBinding(notifd, ["notifications"]), currentPage], (notifications: AstalNotifd.Notification[], page: number) => {
                        const total = Math.max(1, Math.ceil((notifications?.length || 0) / PER_PAGE_NOTIFICATION_COUNT));
                        const pg = Math.min(Math.max(page || 1, 1), total);
                        return `${pg}/${total}`;
                    })}
                    cssClasses={["notification-count-label"]}
                    valign={Gtk.Align.CENTER}
                />
                <button
                    cssClasses={["notification-clear-button"]}
                    onClicked={() => setPage(currentPage.get() + 1)}
                    valign={Gtk.Align.CENTER}
                    child={<label label="›" cssClasses={["notification-clear-label"]} valign={Gtk.Align.CENTER} />}
                />
            </box>
        </box>
    );
}

function NotificationItem({ notification }: { notification: AstalNotifd.Notification }) {

    // Allow only anchor links in body, strip other HTML tags and auto-link bare URLs
    const sanitizeBodyToGtkMarkup = (html: string): string => {
        if (!html) return "";
        // Remove all tags except <a ...> and </a>
        let out = html.replace(/<(?!\/?a(\s|>|$))[^>]*>/gi, "");
        // Normalize anchor tags and keep only href
        out = out.replace(/<a([^>]*)>/gi, (m, attrs) => {
            const hrefMatch = attrs.match(/href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
            const href = hrefMatch ? (hrefMatch[2] || hrefMatch[3] || hrefMatch[4] || "") : "";
            const safeHref = href.replace(/"/g, "&quot;");
            return `<a href="${safeHref}">`;
        });
        // Auto-link bare URLs if there are no anchors yet
        if (!/<a\s/i.test(out)) {
            out = out.replace(/\b((?:https?|file):\/\/[^\s<]+)\b/gi, '<a href="$1">$1</a>');
        }
        return out;
    };

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
                    orientation={Gtk.Orientation.VERTICAL}
                    cssClasses={["notification-item-info"]}
                    spacing={scaleSizeNumber(8)}
                >
                    <box
                        orientation={Gtk.Orientation.HORIZONTAL}
                        cssClasses={["notification-item-header"]}
                        spacing={scaleSizeNumber(8)}
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
                                    useMarkup={true}
                                    label={chainedBinding(notification, ["body"]).as((body: string) => sanitizeBodyToGtkMarkup(body))}
                                    cssClasses={["notification-body"]}
                                    halign={Gtk.Align.START}
                                    wrap={true}
                                    lines={5}
                                    selectable={true}
                                    onActivateLink={(_, uri: string) => {
                                        // Open http/https/file links with default handler
                                        if (/^(https?:|file:)/i.test(uri)) {
                                            try { Gio.AppInfo.launch_default_for_uri(uri, null); } catch { }
                                        }
                                        return true;
                                    }}
                                />
                            )}
                            {/* Urgency and Timer: show countdown only if expire_timeout > 0 (to creationTime + expire_timeout) */}
                            <box
                                orientation={Gtk.Orientation.HORIZONTAL}
                                spacing={scaleSizeNumber(8)}
                            >
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
                                <box
                                    orientation={Gtk.Orientation.HORIZONTAL}
                                    spacing={scaleSizeNumber(4)}
                                    cssClasses={["notification-timer-badge"]}
                                    children={mergeBindings([
                                        chainedBinding(notification, ["expire_timeout"]),
                                        chainedBinding(notification, ["time"]),
                                        nowTick
                                    ], (et: number, created: number, now: number) => {
                                        if (typeof et !== 'number' || et <= 0) return [];
                                        const createdMs = (typeof created === 'number' ? created : 0) * 1000;
                                        const end = createdMs + et;
                                        const remaining = Math.max(0, end - now);
                                        const txt = formatCountdown(remaining);
                                        return [
                                            <label label={txt}
                                                valign={Gtk.Align.CENTER}
                                                cssClasses={["notification-timer-label"]} />
                                        ];
                                    })}
                                />
                            </box>
                        </box>
                    </box>
                    <box
                        orientation={Gtk.Orientation.HORIZONTAL}
                        cssClasses={["notification-actions"]}
                        spacing={scaleSizeNumber(4)}
                        valign={Gtk.Align.START}
                        children={mergeBindings(
                            [chainedBinding(notification, ["actions"])],
                            (actions: any[]) => {
                                const btns = (actions || []).map((a: any) => (
                                    <button
                                        cssClasses={["notification-action-button"]}
                                        onClicked={() => handleActionInvoke(a.id)}
                                        child={<label label={String(a.label ?? "")} cssClasses={["notification-action-label"]} />}
                                    />
                                ));
                                btns.push(
                                    <button
                                        cssClasses={["notification-dismiss-button"]}
                                        onClicked={handleDismiss}
                                        child={<label label="󰅖" cssClasses={["notification-dismiss-icon"]} />}
                                    />
                                );
                                return btns;
                            }
                        )}
                    />
                </box>
            }
        />
    );
}
