# AstalNotifd Service Documentation

## Table of Contents
- [Service Overview](#service-overview)
- [Service Initialization](#service-initialization)
- [Core Properties](#core-properties)
- [Notification Management](#notification-management)
- [Signal System](#signal-system)
- [Integration Patterns](#integration-patterns)
- [Notification Display System](#notification-display-system)
- [Action Handling](#action-handling)
- [Filtering and Ignore System](#filtering-and-ignore-system)

## Service Overview

AstalNotifd provides a comprehensive interface to the notification daemon, handling all desktop notification operations in HyprPanel. It manages notification display, actions, persistence, and provides real-time notification state monitoring with support for Do Not Disturb mode and notification filtering.

### Key Responsibilities
- **Notification Management**: Handle incoming notifications, display, and dismissal
- **Action Processing**: Execute notification actions and handle user interactions
- **Persistence Control**: Manage notification history and auto-dismissal
- **Do Not Disturb**: Control notification visibility and behavior
- **Filtering System**: Ignore notifications from specific applications
- **Multi-Monitor Support**: Display notifications on appropriate monitors

## Service Initialization

### Singleton Pattern
```typescript
import AstalNotifd from 'gi://AstalNotifd?version=0.1';

// Notification service instance
const notifdService = AstalNotifd.get_default();
```

### Service Availability Check
```typescript
// Check if notification service is available
if (notifdService) {
    // Notification operations available
    const notifications = notifdService.notifications;
    const dndState = notifdService.dontDisturb;
    const popups = notifdService.popups;
}
```

## Core Properties

### Service-Level Properties
```typescript
interface AstalNotifd {
    // All notifications (persistent history)
    notifications: AstalNotifd.Notification[];
    
    // Currently visible popup notifications
    popups: AstalNotifd.Notification[];
    
    // Do Not Disturb state
    dontDisturb: boolean;
    
    // Methods
    get_notification(id: number): AstalNotifd.Notification | null;
    clear_notifications(): void;
    set_dont_disturb(dnd: boolean): void;
}
```

### Notification Interface
```typescript
interface AstalNotifd.Notification {
    // Identification
    id: number;                    // Unique notification ID
    app_name: string;             // Application name
    app_icon: string;             // Application icon
    
    // Content
    summary: string;              // Notification title
    body: string;                 // Notification body text
    image: string;                // Notification image path
    
    // Behavior
    urgency: AstalNotifd.Urgency; // Urgency level
    timeout: number;              // Auto-dismiss timeout (ms)
    resident: boolean;            // Persistent notification
    transient: boolean;           // Temporary notification
    
    // Timestamps
    time: number;                 // Creation timestamp
    
    // Methods
    dismiss(): void;              // Dismiss notification
    invoke(action_id: string): void; // Invoke action
    get_actions(): AstalNotifd.Action[]; // Get available actions
}
```

### Action Interface
```typescript
interface AstalNotifd.Action {
    id: string;                   // Action identifier
    label: string;                // Action display text
}
```

### Urgency Levels
```typescript
enum AstalNotifd.Urgency {
    LOW = 0,
    NORMAL = 1,
    CRITICAL = 2,
}
```

## Notification Management

### Notification Tracking
```typescript
// Track popup notifications
export const trackPopupNotifications = (popupNotifications: Variable<AstalNotifd.Notification[]>): void => {
    notifdService.connect('notified', (_, id) => {
        const notification = notifdService.get_notification(id);
        const doNotDisturb = notifdService.dontDisturb;

        if (!notification || doNotDisturb) {
            return;
        }

        // Check if notification should be ignored
        if (isNotificationIgnored(notification, ignore.get())) {
            return;
        }

        // Add to popup list
        const currentNotifications = popupNotifications.get();
        popupNotifications.set([notification, ...currentNotifications]);
    });

    notifdService.connect('resolved', (_, id) => {
        // Remove from popup list
        const currentNotifications = popupNotifications.get();
        const filteredNotifications = currentNotifications.filter(n => n.id !== id);
        popupNotifications.set(filteredNotifications);
    });
};
```

### Auto-Timeout Management
```typescript
export const trackAutoTimeout = (popupNotifications: Variable<AstalNotifd.Notification[]>): void => {
    const { timeout: popupTimeout, autoDismiss } = options.notifications;

    popupNotifications.subscribe((notifications) => {
        notifications.forEach((notification) => {
            if (autoDismiss.get() && popupTimeout.get() > 0) {
                timeout(popupTimeout.get(), () => {
                    // Check if notification still exists
                    const currentNotifications = popupNotifications.get();
                    if (currentNotifications.some(n => n.id === notification.id)) {
                        notification.dismiss();
                    }
                });
            }
        });
    });
};
```

### Monitor-Specific Display
```typescript
export const trackActiveMonitor = (): Variable<number> => {
    const { monitor, active_monitor } = options.notifications;
    
    return Variable.derive(
        [bind(monitor), bind(active_monitor), bind(hyprlandService, 'focusedMonitor')],
        (staticMonitor, useActiveMonitor, focusedMonitor) => {
            if (useActiveMonitor && focusedMonitor) {
                const gdkMonitorMapper = new GdkMonitorMapper();
                return gdkMonitorMapper.getGdkMonitor(focusedMonitor.id);
            }
            return staticMonitor;
        }
    );
};
```

## Signal System

### Notification Signals
```typescript
// New notification received
notifdService.connect('notified', (service, id: number) => {
    const notification = notifdService.get_notification(id);
    if (notification) {
        handleNewNotification(notification);
    }
});

// Notification resolved/dismissed
notifdService.connect('resolved', (service, id: number) => {
    handleNotificationResolved(id);
});

// Do Not Disturb state changed
notifdService.connect('notify::dontDisturb', () => {
    const dndState = notifdService.dontDisturb;
    updateDNDIndicator(dndState);
});

// Notification list changed
notifdService.connect('notify::notifications', () => {
    const notifications = notifdService.notifications;
    updateNotificationCount(notifications.length);
});
```

### Popup Management Signals
```typescript
// Popup list changes
notifdService.connect('notify::popups', () => {
    const popups = notifdService.popups;
    updatePopupDisplay(popups);
});
```

## Integration Patterns

### Bar Module Integration
```typescript
// Notifications bar module
export const Notifications = (): BarBoxChild => {
    const notificationCount = Variable.derive(
        [bind(notifdService, 'notifications'), bind(ignore)],
        (notifications, ignoreList) => {
            const filteredNotifications = filterNotifications(notifications, ignoreList);
            return filteredNotifications.length;
        }
    );

    const notificationIcon = Variable.derive(
        [notificationCount, bind(notifdService, 'dontDisturb')],
        (count, dnd) => {
            if (dnd) return '󰂛'; // DND icon
            if (count > 0) return '󰂚'; // Has notifications
            return '󰂜'; // No notifications
        }
    );

    const componentChildren = Variable.derive(
        [bind(show_total), notificationCount, bind(hideCountWhenZero)],
        (showTotal, count, hideWhenZero) => {
            const icon = <label className={'bar-button-icon notifications txt-icon'} label={notificationIcon()} />;
            
            const children = [icon];

            if (showTotal && !(count === 0 && hideWhenZero)) {
                const label = <label className={'bar-button-label notifications'} label={count.toString()} />;
                children.push(label);
            }

            return children;
        }
    );

    return {
        component: <box className={'notifications-container'}>{componentChildren()}</box>,
        isVisible: true,
        boxClass: 'notifications',
        props: {
            setup: (self: Astal.Button) => {
                // Event handlers
                onPrimaryClick(self, () => {
                    openMenu(self, rightClick.get(), 'notificationsmenu');
                });

                onScroll(self, throttledScrollHandler(5), scrollUp.get(), scrollDown.get());
            },
            onDestroy: () => {
                notificationCount.drop();
                notificationIcon.drop();
                componentChildren.drop();
            },
        },
    };
};
```

### Notification Filtering
```typescript
// Normalize application names for filtering
const normalizeName = (name: string): string => name.toLowerCase().replace(/\s+/g, '_');

// Check if notification should be ignored
export const isNotificationIgnored = (notification: AstalNotifd.Notification, filter: string[]): boolean => {
    const notificationFilters = new Set(filter.map(normalizeName));
    const normalizedAppName = normalizeName(notification.app_name);

    return notificationFilters.has(normalizedAppName);
};

// Filter notification list
export const filterNotifications = (
    notifications: AstalNotifd.Notification[],
    filter: string[],
): AstalNotifd.Notification[] => {
    return notifications.filter((notif: AstalNotifd.Notification) => {
        return !isNotificationIgnored(notif, filter);
    });
};
```

## Notification Display System

### Main Notification Window
```typescript
export default (): JSX.Element => {
    const { position, monitor, active_monitor, showActionsOnHover, displayedTotal } = options.notifications;
    
    const windowMonitor = trackActiveMonitor();
    const windowAnchor = getPosition(position.get());
    const windowLayer = bind(tear).as((tear) => (tear ? Astal.Layer.OVERLAY : Astal.Layer.TOP));

    const popupNotifications = Variable<AstalNotifd.Notification[]>([]);
    
    // Initialize tracking
    trackPopupNotifications(popupNotifications);
    trackAutoTimeout(popupNotifications);

    const notificationsBinding = Variable.derive(
        [bind(popupNotifications), bind(showActionsOnHover)],
        (notifications, showActions) => {
            const maxDisplayed = notifications.slice(0, displayedTotal.get());

            return maxDisplayed.map((notification) => {
                return <NotificationCard notification={notification} showActions={showActions} />;
            });
        },
    );

    return (
        <window
            name={'notifications-window'}
            namespace={'notifications-window'}
            className={'notifications-window'}
            layer={windowLayer}
            anchor={windowAnchor}
            exclusivity={Astal.Exclusivity.NORMAL}
            monitor={windowMonitor()}
            onDestroy={() => {
                windowMonitor.drop();
                notificationsBinding.drop();
            }}
        >
            <box vertical hexpand className={'notification-card-container'}>
                {notificationsBinding()}
            </box>
        </window>
    );
};
```

### Notification Card Component
```typescript
export const NotificationCard = ({ notification, showActions, ...props }: NotificationCardProps): JSX.Element => {
    const actionBox: IActionBox | null = notification.get_actions().length ? (
        <Actions notification={notification} showActions={showActions} />
    ) : null;

    return (
        <eventbox
            onClick={(_, event) => {
                if (isSecondaryClick(event)) {
                    notification.dismiss();
                }
            }}
            onHover={() => {
                if (actionBox !== null && showActions === true) {
                    actionBox.revealChild = true;
                }
            }}
            onHoverLost={() => {
                if (actionBox !== null && showActions === true) {
                    actionBox.revealChild = false;
                }
            }}
        >
            <box className={'notification-card'} {...props} hexpand valign={Gtk.Align.START}>
                <Image notification={notification} />
                <NotificationContent notification={notification} actionBox={actionBox} />
                <CloseButton notification={notification} />
            </box>
        </eventbox>
    );
};
```

### Notification Header
```typescript
const Header = ({ notification }: { notification: AstalNotifd.Notification }): JSX.Element => {
    return (
        <box className={'notification-card-header'} hexpand>
            <label
                className={'notification-card-header-label'}
                halign={Gtk.Align.START}
                label={notification.summary}
                truncate
                hexpand
            />
            <label
                className={'notification-card-header-time'}
                halign={Gtk.Align.END}
                label={formatTime(notification.time)}
            />
        </box>
    );
};
```

### Notification Body
```typescript
const Body = ({ notification }: { notification: AstalNotifd.Notification }): JSX.Element => {
    return (
        <box className={'notification-card-body'} valign={Gtk.Align.START} hexpand>
            <label
                className={'notification-card-body-label'}
                halign={Gtk.Align.START}
                label={notification.body}
                maxWidthChars={!notifHasImg(notification) ? 35 : 28}
                lines={2}
                truncate
                wrap
                justify={Gtk.Justification.LEFT}
                hexpand
                useMarkup
                onRealize={(self) => self.set_markup(notification.body)}
            />
        </box>
    );
};
```

## Action Handling

### Action Button Component
```typescript
const Actions = ({ notification, showActions }: ActionsProps): JSX.Element => {
    const actions = notification.get_actions();

    return (
        <revealer
            revealChild={!showActions}
            transitionType={Gtk.RevealerTransitionType.SLIDE_DOWN}
            transitionDuration={200}
        >
            <box className={'notification-card-actions'} vertical>
                {actions.map((action) => (
                    <button
                        key={action.id}
                        className={'notification-action-button'}
                        onClick={() => {
                            notification.invoke(action.id);
                            notification.dismiss();
                        }}
                    >
                        <label label={action.label} />
                    </button>
                ))}
            </box>
        </revealer>
    );
};
```

### Close Button
```typescript
const CloseButton = ({ notification }: { notification: AstalNotifd.Notification }): JSX.Element => {
    return (
        <button
            className={'notification-card-close-button'}
            valign={Gtk.Align.START}
            onClick={() => notification.dismiss()}
        >
            <icon icon={'window-close-symbolic'} />
        </button>
    );
};
```

## Filtering and Ignore System

### Application Ignore List
```typescript
// Configuration for ignored applications
const ignoreList = options.notifications.ignore; // string[]

// Example ignore list
const defaultIgnoreList = [
    'Spotify',
    'Discord',
    'Steam',
    'Firefox',
];
```

### Dynamic Filtering
```typescript
// Real-time notification filtering
const filteredNotifications = Variable.derive(
    [bind(notifdService, 'notifications'), bind(ignore)],
    (notifications, ignoreList) => {
        return filterNotifications(notifications, ignoreList);
    }
);

// Popup filtering
const handleNewNotification = (notification: AstalNotifd.Notification): void => {
    // Check Do Not Disturb
    if (notifdService.dontDisturb) {
        return;
    }

    // Check ignore list
    if (isNotificationIgnored(notification, ignore.get())) {
        return;
    }

    // Add to display queue
    addToPopupQueue(notification);
};
```

### Notification Menu Integration
```typescript
// Notifications menu with history
const NotificationsMenu = (): JSX.Element => {
    return (
        <DropdownMenu name="notificationsmenu">
            <box className={'menu-items notifications'} vertical>
                <NotificationHeader />
                <NotificationList />
                <NotificationControls />
            </box>
        </DropdownMenu>
    );
};

// Notification history list
const NotificationList = (): JSX.Element => {
    const filteredNotifications = Variable.derive(
        [bind(notifdService, 'notifications'), bind(ignore)],
        (notifications, ignoreList) => {
            return filterNotifications(notifications, ignoreList)
                .slice(0, 20) // Limit display
                .map(notification => (
                    <NotificationHistoryItem key={notification.id} notification={notification} />
                ));
        }
    );

    return (
        <scrollable className={'menu-items-section'} vexpand maxContentHeight={400}>
            <box vertical>
                {filteredNotifications()}
            </box>
        </scrollable>
    );
};
```

### Do Not Disturb Controls
```typescript
// DND toggle in menu
const DNDToggle = (): JSX.Element => {
    return (
        <box className={'menu-item dnd-toggle'}>
            <label className={'menu-item-label'} label={'Do Not Disturb'} hexpand />
            <switch
                className={'menu-switch'}
                active={bind(notifdService, 'dontDisturb')}
                setup={(self) => {
                    self.connect('notify::active', () => {
                        notifdService.set_dont_disturb(self.active);
                    });
                }}
            />
        </box>
    );
};

// Clear all notifications
const ClearAllButton = (): JSX.Element => {
    return (
        <button
            className={'menu-button clear-all'}
            onClick={() => {
                notifdService.clear_notifications();
            }}
        >
            <label label={'Clear All'} />
        </button>
    );
};
```

This comprehensive AstalNotifd integration enables HyprPanel to provide complete notification management capabilities, including real-time popup display, notification history, action handling, filtering systems, and Do Not Disturb functionality with full multi-monitor support.
