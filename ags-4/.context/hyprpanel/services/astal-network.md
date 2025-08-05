# AstalNetwork Service Documentation

## Table of Contents
- [Service Overview](#service-overview)
- [Service Initialization](#service-initialization)
- [Core Properties](#core-properties)
- [WiFi Management](#wifi-management)
- [Ethernet Management](#ethernet-management)
- [Signal System](#signal-system)
- [Integration Patterns](#integration-patterns)
- [Network Menu Implementation](#network-menu-implementation)
- [Connection Management](#connection-management)

## Service Overview

AstalNetwork provides a comprehensive interface to NetworkManager, handling both WiFi and Ethernet connections. It manages network state, device enumeration, access point scanning, and connection operations, serving as the primary network management layer for HyprPanel.

### Key Responsibilities
- **Connection State Management**: Track primary connection type (WiFi/Ethernet), connectivity status, and network state
- **WiFi Operations**: Access point scanning, connection management, signal strength monitoring
- **Ethernet Management**: Wired connection status, speed monitoring, device state tracking
- **Device Control**: Enable/disable network interfaces, connection switching
- **Security Handling**: WPA/WEP authentication, password management

## Service Initialization

### Singleton Pattern
```typescript
import AstalNetwork from 'gi://AstalNetwork?version=0.1';

// Service instance (singleton)
const networkService = AstalNetwork.get_default();
```

### Service Availability Check
```typescript
// WiFi service availability
if (networkService.wifi) {
    // WiFi operations available
    const isEnabled = networkService.wifi.enabled;
    const accessPoints = networkService.wifi.accessPoints;
}

// Wired service availability  
if (networkService.wired) {
    // Ethernet operations available
    const state = networkService.wired.state;
    const speed = networkService.wired.speed;
}
```

## Core Properties

### Primary Connection Properties
```typescript
// Primary connection type
networkService.primary: AstalNetwork.Primary
// Values: AstalNetwork.Primary.WIRED | AstalNetwork.Primary.WIFI

// Overall network state
networkService.state: AstalNetwork.State
// Values: CONNECTED, CONNECTING, DISCONNECTED, etc.

// Internet connectivity status
networkService.connectivity: AstalNetwork.Connectivity
// Values: FULL, LIMITED, PORTAL, NONE

// Primary connection binding
const iconBinding = Variable.derive(
    [bind(networkService, 'primary'), bind(wiredIcon), bind(wirelessIcon)],
    (primaryNetwork, wiredIcon, wifiIcon) => {
        return primaryNetwork === AstalNetwork.Primary.WIRED ? wiredIcon : wifiIcon;
    },
);
```

### Network State Monitoring
```typescript
// Comprehensive network status
const networkLabel = Variable.derive(
    [
        bind(networkService, 'primary'),
        bind(networkService, 'state'),
        bind(networkService, 'connectivity'),
        ...(networkService.wifi ? [bind(networkService.wifi, 'enabled')] : []),
    ],
    (primaryNetwork, state, connectivity, wifiEnabled) => {
        if (primaryNetwork === AstalNetwork.Primary.WIRED) {
            return formatWiredStatus(state, connectivity);
        } else if (wifiEnabled && networkService.wifi) {
            return formatWifiStatus(networkService.wifi, state, connectivity);
        }
        return 'Disconnected';
    },
);
```

## WiFi Management

### WiFi Service Properties
```typescript
interface AstalNetwork.Wifi {
    enabled: boolean;           // WiFi radio state
    scanning: boolean;          // Currently scanning for networks
    accessPoints: AccessPoint[]; // Available networks
    activeAccessPoint: AccessPoint | null; // Currently connected AP
    strength: number;           // Signal strength (0-100)
    frequency: number;          // Connection frequency (MHz)
    ssid: string;              // Connected network name
    iconName: string;          // Icon identifier
    
    // Methods
    set_enabled(enabled: boolean): void;
    scan(): void;
    connect_access_point(ap: AccessPoint): void;
}
```

### Access Point Data Structure
```typescript
interface AstalNetwork.AccessPoint {
    bssid: string;             // MAC address
    ssid: string;              // Network name
    strength: number;          // Signal strength (0-100)
    frequency: number;         // Frequency (MHz)
    security: string[];        // Security protocols (WPA, WEP, etc.)
    active: boolean;           // Currently connected
    lastSeen: number;          // Last seen timestamp
}
```

### WiFi State Tracking
```typescript
// WiFi enabled state
export const isWifiEnabled: Variable<boolean> = Variable(false);
let wifiEnabledBinding: Variable<void> | undefined;

Variable.derive([bind(networkService, 'wifi')], () => {
    wifiEnabledBinding?.drop();
    wifiEnabledBinding = undefined;

    if (!networkService.wifi) {
        return;
    }

    wifiEnabledBinding = Variable.derive([bind(networkService.wifi, 'enabled')], (isEnabled) => {
        isWifiEnabled.set(isEnabled);
    });
});
```

### Access Point Management
```typescript
// Access point list tracking
export const wifiAccessPoints: Variable<AstalNetwork.AccessPoint[]> = Variable([]);
let accessPointBinding: Variable<void> | undefined;

const accessPoints = (): void => {
    accessPointBinding?.drop();
    accessPointBinding = undefined;

    if (!networkService.wifi) {
        return;
    }

    accessPointBinding = Variable.derive([bind(networkService.wifi, 'accessPoints')], (axsPoints) => {
        wifiAccessPoints.set(axsPoints);
    });
};
```

### WiFi Connection Operations
```typescript
// Connect to access point
export const connectToAP = (accessPoint: AstalNetwork.AccessPoint, event: Astal.ClickEvent): void => {
    if (accessPoint.bssid === connecting.get() || isApActive(accessPoint) || !isPrimaryClick(event)) {
        return;
    }

    connecting.set(accessPoint.bssid || '');
    execAsync(`nmcli device wifi connect ${accessPoint.bssid}`)
        .then(() => {
            connecting.set('');
            staging.set({} as AstalNetwork.AccessPoint);
        })
        .catch((err) => {
            connecting.set('');
            if (err.message?.toLowerCase().includes('secrets were required, but not provided')) {
                staging.set(accessPoint); // Show password dialog
            } else {
                Notify({
                    summary: 'Network',
                    body: err.message,
                });
            }
        });
};

// Password-protected connection
const connectWithPassword = (accessPoint: AstalNetwork.AccessPoint, password: string): void => {
    connecting.set(accessPoint.bssid ?? '');
    
    const connectCommand = `nmcli device wifi connect "${accessPoint.ssid}" password "${password}"`;
    
    execAsync(connectCommand)
        .then(() => {
            connecting.set('');
            staging.set({} as AstalNetwork.AccessPoint);
        })
        .catch((err) => {
            connecting.set('');
            Notify({
                summary: 'Network',
                body: err.message,
            });
        });
};
```

### WiFi Control Components
```typescript
// WiFi toggle switch
export const WifiSwitch = (): JSX.Element => (
    <switch
        className="menu-switch network"
        valign={Gtk.Align.CENTER}
        tooltipText="Toggle Wifi"
        active={networkService.wifi?.enabled}
        setup={(self) => {
            self.connect('notify::active', () => {
                networkService.wifi?.set_enabled(self.active);
            });
        }}
    />
);

// Network refresh button
export const RefreshButton = (): JSX.Element => (
    <button
        className="menu-icon-button"
        tooltipText="Refresh Networks"
        onClick={() => {
            if (networkService.wifi) {
                networkService.wifi.scan();
            }
        }}
    >
        <icon icon="view-refresh-symbolic" />
    </button>
);
```

## Ethernet Management

### Ethernet Service Properties
```typescript
interface AstalNetwork.Wired {
    state: AstalNetwork.DeviceState;    // Connection state
    speed: number;                      // Link speed (Mbps)
    iconName: string;                   // Icon identifier
    internet: AstalNetwork.Internet;    // Internet connectivity
}
```

### Ethernet State Tracking
```typescript
// Wired connection state
export const wiredState: Variable<AstalNetwork.DeviceState> = Variable(AstalNetwork.DeviceState.UNKNOWN);
export const wiredInternet: Variable<AstalNetwork.Internet> = Variable(AstalNetwork.Internet.DISCONNECTED);
export const wiredIcon: Variable<string> = Variable('');
export const wiredSpeed: Variable<number> = Variable(0);

// Wired state monitoring
let wiredBinding: Variable<void> | undefined;

Variable.derive([bind(networkService, 'wired')], () => {
    wiredBinding?.drop();
    wiredBinding = undefined;

    if (!networkService.wired) {
        return;
    }

    wiredBinding = Variable.derive(
        [
            bind(networkService.wired, 'state'),
            bind(networkService.wired, 'internet'),
            bind(networkService.wired, 'iconName'),
            bind(networkService.wired, 'speed'),
        ],
        (state, internet, iconName, speed) => {
            wiredState.set(state);
            wiredInternet.set(internet);
            wiredIcon.set(iconName || 'network-wired-symbolic');
            wiredSpeed.set(speed);
        },
    );
});
```

### Device State Constants
```typescript
// Device state mapping
export const DEVICE_STATES = {
    [AstalNetwork.DeviceState.UNKNOWN]: 'Unknown',
    [AstalNetwork.DeviceState.UNMANAGED]: 'Unmanaged',
    [AstalNetwork.DeviceState.UNAVAILABLE]: 'Unavailable',
    [AstalNetwork.DeviceState.DISCONNECTED]: 'Disconnected',
    [AstalNetwork.DeviceState.PREPARE]: 'Prepare',
    [AstalNetwork.DeviceState.CONFIG]: 'Config',
    [AstalNetwork.DeviceState.NEED_AUTH]: 'Need Authentication',
    [AstalNetwork.DeviceState.IP_CONFIG]: 'IP Configuration',
    [AstalNetwork.DeviceState.IP_CHECK]: 'IP Check',
    [AstalNetwork.DeviceState.SECONDARIES]: 'Secondaries',
    [AstalNetwork.DeviceState.ACTIVATED]: 'Activated',
    [AstalNetwork.DeviceState.DEACTIVATING]: 'Deactivating',
    [AstalNetwork.DeviceState.FAILED]: 'Failed',
};
```

## Signal System

### Network State Signals
```typescript
// Primary connection changes
networkService.connect('notify::primary', () => {
    // Handle primary connection type change
    updateNetworkIcon();
});

// Connectivity changes
networkService.connect('notify::connectivity', () => {
    // Handle internet connectivity changes
    updateNetworkStatus();
});

// Overall state changes
networkService.connect('notify::state', () => {
    // Handle network state changes
    updateConnectionStatus();
});
```

### WiFi-Specific Signals
```typescript
// WiFi enable/disable
networkService.wifi?.connect('notify::enabled', () => {
    // Handle WiFi radio state change
    updateWifiControls();
});

// Access point list changes
networkService.wifi?.connect('notify::accessPoints', () => {
    // Handle new access points discovered
    refreshAccessPointList();
});

// Scanning state changes
networkService.wifi?.connect('notify::scanning', () => {
    // Handle scan start/stop
    updateScanningIndicator();
});
```

## Integration Patterns

### Bar Module Integration
```typescript
// Network bar module
export const Network = (): BarBoxChild => {
    const iconBinding = Variable.derive(
        [bind(networkService, 'primary'), bind(wiredIcon), bind(wirelessIcon)],
        (primaryNetwork, wiredIcon, wifiIcon) => {
            return primaryNetwork === AstalNetwork.Primary.WIRED ? wiredIcon : wifiIcon;
        },
    );

    const networkLabel = Variable.derive(
        [bind(networkService, 'primary'), bind(label), bind(truncation_size), bind(showWifiInfo)],
        (primaryNetwork, showLabel, tSize, showWifiInfo) => {
            if (!showLabel) return '';
            
            if (primaryNetwork === AstalNetwork.Primary.WIRED) {
                return 'Wired'.substring(0, tSize);
            }
            
            const wifi = networkService.wifi;
            if (wifi && wifi.enabled) {
                const ssid = wifi.ssid || 'Unknown';
                const strength = wifi.strength || 0;
                
                if (showWifiInfo) {
                    return `${ssid} (${strength}%)`.substring(0, tSize);
                }
                return ssid.substring(0, tSize);
            }
            
            return 'Disconnected'.substring(0, tSize);
        },
    );

    return Module({
        textIcon: iconBinding(),
        label: networkLabel(),
        tooltipText: bind(networkService.wifi, 'ssid').as((ssid) => 
            formatWifiInfo(networkService.wifi)
        ),
        boxClass: 'network',
        props: {
            setup: (self: Astal.Button) => {
                // Event handlers for click, scroll, etc.
            },
            onDestroy: () => {
                iconBinding.drop();
                networkLabel.drop();
            },
        },
    });
};
```

### Network Statistics Integration
```typescript
// Network usage monitoring
export const Netstat = (): BarBoxChild => {
    const iconBinding = Variable.derive(
        [bind(networkService, 'primary'), bind(networkService, 'wifi'), bind(networkService, 'wired')],
        (primary, wifi, wired) => {
            if (primary === AstalNetwork.Primary.WIRED) {
                return wired?.iconName;
            }
            return wifi?.iconName;
        },
    );

    // Network usage data polling
    const networkUsage = Variable<NetworkResourceData>(GET_DEFAULT_NETSTAT_DATA(rateUnit.get()));
    
    const netstatPoller = new FunctionPoller(
        networkUsage,
        [bind(rateUnit), bind(networkInterface), bind(round)],
        bind(pollingInterval),
        computeNetwork,
    );

    return Module({
        textIcon: iconBinding(),
        label: bind(networkUsage).as((usage) => 
            `↓ ${usage.in} ↑ ${usage.out}`
        ),
        boxClass: 'netstat',
    });
};
```

## Network Menu Implementation

### Access Point List Component
```typescript
const AccessPointList = (): JSX.Element => {
    return (
        <scrollable className={'menu-items-section'} vexpand maxContentHeight={300}>
            <box vertical>
                {bind(wifiAccessPoints).as((accessPoints) =>
                    accessPoints
                        .sort((a, b) => b.strength - a.strength)
                        .map((ap) => (
                            <AccessPointItem key={ap.bssid} accessPoint={ap} />
                        ))
                )}
            </box>
        </scrollable>
    );
};

// Individual access point item
const AccessPointItem = ({ accessPoint }: { accessPoint: AstalNetwork.AccessPoint }): JSX.Element => {
    const isActive = bind(networkService.wifi, 'activeAccessPoint').as(
        (active) => active?.bssid === accessPoint.bssid
    );

    const isConnecting = bind(connecting).as((bssid) => bssid === accessPoint.bssid);

    return (
        <button
            className={isActive.as((active) => `menu-item network-item ${active ? 'active' : ''}`)}
            onClick={(_, event) => connectToAP(accessPoint, event)}
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
                {isConnecting() && (
                    <spinner className={'menu-item-spinner'} />
                )}
            </box>
        </button>
    );
};
```

### Password Input Dialog
```typescript
const PasswordInput = (): JSX.Element => {
    return (
        <box className="network-password-input-container" halign={Gtk.Align.FILL} hexpand>
            <entry
                className="network-password-input"
                hexpand
                visibility={false} // Password field
                placeholderText="Enter Password"
                onKeyPressEvent={(self, event) => {
                    const keyPressed = event.get_keyval()[1];

                    if (keyPressed === Gdk.KEY_Return) {
                        const accessPoint = staging.get();
                        if (accessPoint) {
                            connectWithPassword(accessPoint, self.text);
                            self.text = '';
                        }
                    }
                }}
            />
        </box>
    );
};
```

## Connection Management

### WiFi Information Formatting
```typescript
export const formatWifiInfo = (wifi: AstalNetwork.Wifi): string => {
    if (!wifi || !wifi.ssid) {
        return 'No WiFi Connection';
    }

    return `Network: ${wifi.ssid}
Signal Strength: ${wifi.strength}%
Frequency: ${formatFrequency(wifi.frequency)}
Security: ${wifi.activeAccessPoint?.security.join(', ') || 'Open'}`;
};

const formatFrequency = (frequency: number): string => {
    if (frequency >= 1000) {
        return `${(frequency / 1000).toFixed(1)} GHz`;
    }
    return `${frequency} MHz`;
};
```

### Connection State Management
```typescript
// Connection staging for password input
export const staging = Variable<AstalNetwork.AccessPoint | undefined>(undefined);
export const connecting = Variable<string>(''); // BSSID of connecting AP

// Check if access point is currently active
export const isApActive = (accessPoint: AstalNetwork.AccessPoint): boolean => {
    return networkService.wifi?.activeAccessPoint?.bssid === accessPoint.bssid;
};

// Forget network connection
export const forgetAP = (accessPoint: AstalNetwork.AccessPoint): void => {
    connecting.set(accessPoint.bssid || '');
    
    execAsync('nmcli connection show --active').then((res: string) => {
        const connectionId = getIdFromSsid(accessPoint.ssid || '', res);

        if (connectionId === undefined) {
            console.error(`Error while forgetting "${accessPoint.ssid}": Connection ID not found`);
            return;
        }

        execAsync(`nmcli connection delete ${connectionId} "${accessPoint.ssid}"`)
            .then(() => {
                connecting.set('');
            })
            .catch((err: unknown) => {
                connecting.set('');
                console.error(`Error while forgetting "${accessPoint.ssid}": ${err}`);
            });
    });
};
```

This comprehensive AstalNetwork integration enables HyprPanel to provide full network management capabilities, including WiFi scanning and connection, ethernet monitoring, and seamless network state tracking across all UI components.
