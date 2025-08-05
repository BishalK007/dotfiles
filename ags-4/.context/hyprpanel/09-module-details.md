# Module-Specific Technical Details

## Table of Contents
- [Network Module](#network-module)
- [OSD Module](#osd-module)
- [Listener System](#listener-system)
- [Menu System](#menu-system)
- [Notification System](#notification-system)
- [Settings System](#settings-system)
- [Custom Module System](#custom-module-system)

## Network Module

### Architecture Overview
```
src/components/bar/modules/network/
├── index.tsx           # Main component
├── helpers.ts          # Icon management and utilities
└── NetworkMenu/        # Dropdown menu component
```

### Core Implementation
```typescript
// Network service binding
const networkService = AstalNetwork.get_default();

// Icon state management
export const wiredIcon: Variable<string> = Variable('');
export const wirelessIcon: Variable<string> = Variable('');

// Icon derivation logic
const iconBinding = Variable.derive(
    [bind(networkService, 'primary'), bind(wiredIcon), bind(wirelessIcon)],
    (primaryNetwork, wiredIcon, wifiIcon) => {
        return primaryNetwork === AstalNetwork.Primary.WIRED ? wiredIcon : wifiIcon;
    },
);

// Network status label
const networkLabel = Variable.derive(
    [
        bind(networkService, 'primary'),
        bind(label),
        bind(truncation),
        bind(truncation_size),
        bind(showWifiInfo),
        bind(networkService, 'state'),
        bind(networkService, 'connectivity'),
        ...(networkService.wifi ? [bind(networkService.wifi, 'enabled')] : []),
    ],
    (primaryNetwork, showLabel, trunc, tSize, showWifiInfo) => {
        if (!showLabel) return <box />;
        
        if (primaryNetwork === AstalNetwork.Primary.WIRED) {
            return <label className={'bar-button-label network-label'} label={'Wired'.substring(0, tSize)} />;
        }
        
        // WiFi label logic with SSID and signal strength
        const wifi = networkService.wifi;
        if (wifi && wifi.enabled) {
            const ssid = wifi.ssid || 'Unknown';
            const strength = wifi.strength || 0;
            
            if (showWifiInfo) {
                return <label className={'bar-button-label network-label'} 
                             label={`${ssid} (${strength}%)`.substring(0, tSize)} />;
            }
            return <label className={'bar-button-label network-label'} 
                         label={ssid.substring(0, tSize)} />;
        }
        
        return <label className={'bar-button-label network-label'} label={'Disconnected'.substring(0, tSize)} />;
    },
);
```

### WiFi Information Formatting
```typescript
export const formatWifiInfo = (wifi: AstalNetwork.Wifi): string => {
    return `Network: ${wifi.ssid} \nSignal Strength: ${wifi.strength}% \nFrequency: ${formatFrequency(wifi.frequency)}`;
};

const formatFrequency = (frequency: number): string => {
    if (frequency >= 1000) {
        return `${(frequency / 1000).toFixed(1)} GHz`;
    }
    return `${frequency} MHz`;
};
```

### Event Handling
```typescript
// Network module event setup
props: {
    setup: (self: Astal.Button): void => {
        const disconnectFunctions: (() => void)[] = [];

        // Primary click - open network menu
        disconnectFunctions.push(
            onPrimaryClick(self, () => {
                openMenu(self, rightClick.get(), 'networkmenu');
            })
        );

        // Secondary click - custom command
        disconnectFunctions.push(
            onSecondaryClick(self, () => {
                runAsyncCommand(rightClick.get());
            })
        );

        // Scroll handling - network switching
        disconnectFunctions.push(
            onScroll(self, throttledScrollHandler(scrollSpeed.get()), scrollUp.get(), scrollDown.get())
        );

        // Cleanup on destroy
        self.connect('destroy', () => {
            disconnectFunctions.forEach(disconnect => disconnect());
        });
    },
}
```

## OSD Module

### Architecture Overview
```
src/components/osd/
├── index.tsx           # Main OSD component
├── helpers.ts          # Core OSD logic
├── bar/
│   ├── index.tsx       # Progress bar component
│   └── helpers.ts      # Bar setup logic
├── icon/
│   ├── index.tsx       # Icon component
│   └── helpers.ts      # Icon logic
└── label/
    ├── index.tsx       # Label component
    └── helpers.ts      # Label logic
```

### OSD Display Logic
```typescript
// OSD visibility and positioning
const { enable, duration, active_monitor, monitor } = options.theme.osd;

let count = 0;
const showOSD = (): void => {
    const currentCount = ++count;
    
    // Show OSD
    const osdWindow = App.get_window('indicator');
    if (osdWindow) {
        osdWindow.visible = true;
    }

    // Auto-hide after duration
    timeout(duration.get(), () => {
        if (currentCount === count) {
            if (osdWindow) {
                osdWindow.visible = false;
            }
        }
    });
};

// Monitor detection for OSD placement
const getOSDMonitor = (): number => {
    if (active_monitor.get()) {
        return hyprlandService.focusedMonitor?.id || 0;
    }
    return monitor.get();
};
```

### Progress Bar Setup
```typescript
export const setupOsdBar = (self: LevelBar): void => {
    // Brightness control
    self.hook(brightnessService, 'notify::screen', () => {
        self.className = self.className.replace(/\boverflow\b/, '').trim();
        self.value = brightnessService.screen;
        showOSD();
    });

    self.hook(brightnessService, 'notify::kbd', () => {
        self.className = self.className.replace(/\boverflow\b/, '').trim();
        self.value = brightnessService.kbd;
        showOSD();
    });

    // Audio control
    self.hook(audioService.defaultSpeaker, 'notify::volume', () => {
        const volume = audioService.defaultSpeaker?.volume || 0;
        self.className = volume > 1 ? 'overflow' : self.className.replace(/\boverflow\b/, '').trim();
        self.value = Math.min(volume, 1);
        showOSD();
    });

    self.hook(audioService.defaultSpeaker, 'notify::mute', () => {
        const muted = audioService.defaultSpeaker?.mute || false;
        self.className = muted ? 'muted' : self.className.replace(/\bmuted\b/, '').trim();
        showOSD();
    });

    // Microphone control
    self.hook(audioService.defaultMicrophone, 'notify::volume', () => {
        const volume = audioService.defaultMicrophone?.volume || 0;
        self.className = volume > 1 ? 'overflow' : self.className.replace(/\boverflow\b/, '').trim();
        self.value = Math.min(volume, 1);
        showOSD();
    });
};
```

### Icon Management
```typescript
export const setupOsdIcon = (self: Icon): void => {
    // Brightness icons
    self.hook(brightnessService, 'notify::screen', () => {
        self.icon = '󰃠'; // Brightness icon
    });

    self.hook(brightnessService, 'notify::kbd', () => {
        self.icon = '󰌌'; // Keyboard brightness icon
    });

    // Volume icons
    self.hook(audioService.defaultSpeaker, 'notify::volume', () => {
        const volume = audioService.defaultSpeaker?.volume || 0;
        const muted = audioService.defaultSpeaker?.mute || false;
        
        if (muted) {
            self.icon = '󰖁';
        } else if (volume > 0.66) {
            self.icon = '󰕾';
        } else if (volume > 0.33) {
            self.icon = '󰖀';
        } else if (volume > 0) {
            self.icon = '󰕿';
        } else {
            self.icon = '󰖁';
        }
    });

    // Microphone icons
    self.hook(audioService.defaultMicrophone, 'notify::volume', () => {
        const muted = audioService.defaultMicrophone?.mute || false;
        self.icon = muted ? '󰍭' : '󰍬';
    });
};
```

## Listener System

### Auto-Hide Behavior
```typescript
// src/lib/behaviors/autoHide.ts

export function initializeAutoHide(): void {
    // Main auto-hide logic
    Variable.derive(
        [
            bind(autoHide),
            bind(hyprlandService, 'workspaces'),
            bind(forceUpdater),
            bind(hyprlandService, 'focusedWorkspace'),
        ],
        (hideMode) => {
            if (hideMode === 'never') {
                showAllBars();
            } else if (hideMode === 'single-window') {
                updateBarVisibilityByWindowCount();
            }
        },
    );

    // Fullscreen handling
    Variable.derive([bind(hyprlandService, 'focusedClient')], (currentClient) => {
        handleFullscreenClientVisibility(currentClient);
    });

    // Fullscreen mode handling
    Variable.derive([bind(autoHide)], (hideMode) => {
        if (hideMode === 'fullscreen') {
            updateBarVisibilityByFullscreen();
        }
    });
}

// Window count-based visibility
function updateBarVisibilityByWindowCount(): void {
    const monitors = hyprlandService.get_monitors();

    monitors.forEach((monitor) => {
        const workspace = hyprlandService.get_workspace(monitor.activeWorkspace.id);
        if (!workspace) return;

        const windowCount = workspace.get_clients().length;
        const shouldHide = windowCount === 1;
        
        setBarVisibility(monitor.id, !shouldHide);
    });
}

// Fullscreen state handling
function handleFullscreenClientVisibility(client: AstalHyprland.Client): void {
    if (!client) return;

    const fullscreenBinding = bind(client, 'fullscreen');

    Variable.derive([bind(fullscreenBinding)], (isFullScreen) => {
        if (autoHide.get() === 'fullscreen') {
            setBarVisibility(client.monitor.id, !isFullScreen);
        }
    });
}
```

### Battery Warning System
```typescript
// src/lib/behaviors/batteryWarning.ts

export const warnOnLowBattery = (): void => {
    const batteryService = AstalBattery.get_default();
    
    if (!batteryService) return;

    Variable.derive(
        [
            bind(batteryService, 'percentage'),
            bind(batteryService, 'charging'),
            bind(lowBatteryNotification),
            bind(lowBatteryThreshold),
        ],
        (percentage, charging, notificationEnabled, threshold) => {
            const batteryLevel = Math.round(percentage * 100);
            
            if (notificationEnabled && !charging && batteryLevel <= threshold) {
                const title = lowBatteryNotificationTitle.get();
                const body = lowBatteryNotificationText.get().replace('$POWER_LEVEL', batteryLevel.toString());
                
                Notify({
                    summary: title,
                    body: body,
                    iconName: icons.ui.warning,
                    urgency: 'critical',
                });
            }
        },
    );
};
```

## Menu System

### Dropdown Menu Architecture
```typescript
// Base dropdown menu component
export const DropdownMenu = ({ name, transition, child }: DropdownMenuProps): JSX.Element => {
    return (
        <window
            name={name}
            namespace={name}
            layer={Astal.Layer.OVERLAY}
            exclusivity={Astal.Exclusivity.IGNORE}
            keymode={Astal.Keymode.ON_DEMAND}
            visible={false}
            anchor={Astal.WindowAnchor.TOP | Astal.WindowAnchor.LEFT}
            application={App}
        >
            <box>
                <eventbox
                    onClick={() => App.get_window(name)?.set_visible(false)}
                    expand
                />
                <box className={'menu-container'}>
                    <revealer
                        transitionType={transition}
                        transitionDuration={bind(transitionTime)}
                        setup={(self) => {
                            self.hook(App, 'window-toggled', (_, windowName, visible) => {
                                if (windowName === name) {
                                    self.reveal_child = visible;
                                }
                            });
                        }}
                    >
                        {child}
                    </revealer>
                </box>
            </box>
        </window>
    );
};
```

### Audio Menu Implementation
```typescript
// Audio menu with device management
export default (): JSX.Element => {
    return (
        <DropdownMenu
            name="audiomenu"
            transition={bind(options.menus.transition).as((transition) => RevealerTransitionMap[transition])}
        >
            <box className={'menu-items audio'} halign={Gtk.Align.FILL} hexpand>
                <box className={'menu-items-container audio'} halign={Gtk.Align.FILL} vertical hexpand>
                    <VolumeSliders />
                    <AvailableDevices />
                </box>
            </box>
        </DropdownMenu>
    );
};

// Volume sliders component
const VolumeSliders = (): JSX.Element => {
    return (
        <box className={'menu-section-container'} vertical>
            <box className={'menu-label-container'}>
                <label className={'menu-label'} label={'Volume'} />
            </box>
            <box className={'menu-items-section'} vertical>
                <SpeakerSlider />
                <MicrophoneSlider />
            </box>
        </box>
    );
};

// Speaker volume control
const SpeakerSlider = (): JSX.Element => {
    const speaker = audioService.defaultSpeaker;

    return (
        <box className={'menu-item'}>
            <icon className={'menu-item-icon'} icon={bind(speaker, 'volumeIcon')} />
            <scale
                className={'menu-item-scale'}
                hexpand
                min={0}
                max={1}
                step={0.01}
                value={bind(speaker, 'volume')}
                onDragged={({ value }) => {
                    speaker.volume = value;
                }}
            />
            <label
                className={'menu-item-label'}
                label={bind(speaker, 'volume').as((volume) => `${Math.round(volume * 100)}%`)}
            />
        </box>
    );
};
```

### Network Menu with Device List
```typescript
// Network menu with available networks
const AvailableNetworks = (): JSX.Element => {
    const wifi = networkService.wifi;

    if (!wifi) {
        return <box />;
    }

    return (
        <box className={'menu-section-container'} vertical>
            <box className={'menu-label-container'}>
                <label className={'menu-label'} label={'Available Networks'} />
                <button
                    className={'menu-icon-button'}
                    onClick={() => wifi.scan()}
                    tooltipText={'Refresh Networks'}
                >
                    <icon icon={'view-refresh-symbolic'} />
                </button>
            </box>
            <scrollable className={'menu-items-section'} vexpand maxContentHeight={300}>
                <box vertical>
                    {bind(wifi, 'accessPoints').as((accessPoints) =>
                        accessPoints
                            .sort((a, b) => b.strength - a.strength)
                            .map((ap) => (
                                <NetworkItem key={ap.bssid} accessPoint={ap} />
                            ))
                    )}
                </box>
            </scrollable>
        </box>
    );
};

// Individual network item
const NetworkItem = ({ accessPoint }: { accessPoint: AstalNetwork.AccessPoint }): JSX.Element => {
    const isActive = bind(networkService.wifi, 'activeAccessPoint').as(
        (active) => active?.bssid === accessPoint.bssid
    );

    return (
        <button
            className={isActive.as((active) => `menu-item network-item ${active ? 'active' : ''}`)}
            onClick={() => {
                if (accessPoint.security.includes('WPA')) {
                    // Show password dialog
                    showPasswordDialog(accessPoint);
                } else {
                    // Connect directly
                    networkService.wifi.connect_access_point(accessPoint);
                }
            }}
        >
            <box>
                <icon
                    className={'menu-item-icon'}
                    icon={getWifiIcon(accessPoint.strength)}
                />
                <label
                    className={'menu-item-label'}
                    label={accessPoint.ssid || 'Hidden Network'}
                    hexpand
                    halign={Gtk.Align.START}
                />
                <icon
                    className={'menu-item-icon security'}
                    icon={accessPoint.security.length > 0 ? 'network-wireless-encrypted-symbolic' : ''}
                />
                <label
                    className={'menu-item-label strength'}
                    label={`${accessPoint.strength}%`}
                />
            </box>
        </button>
    );
};
```

## Notification System

### Notification Architecture
```typescript
// Main notification component
export default (): JSX.Element => {
    const { position, monitor, active_monitor } = options.notifications;

    const getMonitor = (): number => {
        if (active_monitor.get()) {
            return hyprlandService.focusedMonitor?.id || 0;
        }
        return monitor.get();
    };

    return (
        <window
            name={'notifications'}
            namespace={'notifications'}
            layer={Astal.Layer.OVERLAY}
            anchor={getAnchor(position.get())}
            monitor={getMonitor()}
            exclusivity={Astal.Exclusivity.IGNORE}
            visible={true}
            application={App}
        >
            <box className={'notifications-container'} vertical>
                {bind(notifdService, 'notifications').as((notifications) =>
                    notifications
                        .filter((n) => !options.notifications.ignore.get().includes(n.appName))
                        .slice(0, options.notifications.displayedTotal.get())
                        .map((notification) => (
                            <NotificationWidget key={notification.id} notification={notification} />
                        ))
                )}
            </box>
        </window>
    );
};
```

### Individual Notification Widget
```typescript
const NotificationWidget = ({ notification }: { notification: AstalNotifd.Notification }): JSX.Element => {
    const [isHovered, setIsHovered] = useState(false);
    const { timeout, showActionsOnHover } = options.notifications;

    // Auto-dismiss logic
    useEffect(() => {
        if (timeout.get() > 0) {
            const timer = setTimeout(() => {
                notification.dismiss();
            }, timeout.get());

            return () => clearTimeout(timer);
        }
    }, [notification.id]);

    return (
        <eventbox
            className={'notification-widget'}
            onEnter={() => setIsHovered(true)}
            onLeave={() => setIsHovered(false)}
        >
            <box className={'notification-content'} vertical>
                <box className={'notification-header'}>
                    <icon
                        className={'notification-icon'}
                        icon={notification.appIcon || notification.desktopEntry || 'dialog-information-symbolic'}
                    />
                    <box className={'notification-header-text'} vertical hexpand>
                        <label
                            className={'notification-summary'}
                            label={notification.summary}
                            halign={Gtk.Align.START}
                            truncate
                        />
                        <label
                            className={'notification-app-name'}
                            label={notification.appName}
                            halign={Gtk.Align.START}
                        />
                    </box>
                    <button
                        className={'notification-close'}
                        onClick={() => notification.dismiss()}
                    >
                        <icon icon={'window-close-symbolic'} />
                    </button>
                </box>

                <label
                    className={'notification-body'}
                    label={notification.body}
                    halign={Gtk.Align.START}
                    wrap
                />

                {showActionsOnHover.get() && isHovered && notification.actions.length > 0 && (
                    <box className={'notification-actions'}>
                        {notification.actions.map((action) => (
                            <button
                                key={action.id}
                                className={'notification-action'}
                                onClick={() => {
                                    notification.invoke(action.id);
                                    notification.dismiss();
                                }}
                            >
                                <label label={action.label} />
                            </button>
                        ))}
                    </box>
                )}
            </box>
        </eventbox>
    );
};
```

This modular architecture ensures that each component has clear responsibilities while maintaining reactive data flow throughout the system.
