# AstalBluetooth Service Documentation

## Table of Contents
- [Service Overview](#service-overview)
- [Service Initialization](#service-initialization)
- [Core Properties](#core-properties)
- [Device Management](#device-management)
- [Pairing and Connection](#pairing-and-connection)
- [Signal System](#signal-system)
- [Integration Patterns](#integration-patterns)
- [Bluetooth Menu Implementation](#bluetooth-menu-implementation)
- [Device Control Components](#device-control-components)

## Service Overview

AstalBluetooth provides a comprehensive interface to BlueZ, the Linux Bluetooth stack, handling all Bluetooth operations in HyprPanel. It manages device discovery, pairing, connection, and provides real-time Bluetooth state monitoring.

### Key Responsibilities
- **Adapter Management**: Control Bluetooth adapter power state and discovery mode
- **Device Discovery**: Scan for and enumerate available Bluetooth devices
- **Pairing Operations**: Handle device pairing and authentication
- **Connection Management**: Connect/disconnect devices and track connection states
- **Device Information**: Provide device names, types, battery levels, and connection status

## Service Initialization

### Singleton Pattern
```typescript
import AstalBluetooth from 'gi://AstalBluetooth?version=0.1';

// Bluetooth service instance
const bluetoothService = AstalBluetooth.get_default();
```

### Service Availability Check
```typescript
// Check if Bluetooth adapter is available
if (bluetoothService.adapter) {
    // Bluetooth operations available
    const isPowered = bluetoothService.adapter.powered;
    const isDiscovering = bluetoothService.adapter.discovering;
    const devices = bluetoothService.get_devices();
}
```

## Core Properties

### Service-Level Properties
```typescript
// Bluetooth adapter power state
bluetoothService.isPowered: boolean

// Overall connection state (any device connected)
bluetoothService.isConnected: boolean

// All discovered/paired devices
bluetoothService.devices: AstalBluetooth.Device[]

// Bluetooth adapter object
bluetoothService.adapter: AstalBluetooth.Adapter | null
```

### Adapter Properties
```typescript
interface AstalBluetooth.Adapter {
    powered: boolean;           // Adapter power state
    discovering: boolean;       // Currently scanning for devices
    discoverable: boolean;      // Adapter is discoverable by other devices
    pairable: boolean;         // Adapter can pair with devices
    address: string;           // Adapter MAC address
    name: string;              // Adapter name
    
    // Methods
    set_powered(powered: boolean): void;
    start_discovery(): void;
    stop_discovery(): void;
    set_discoverable(discoverable: boolean): void;
}
```

### Bluetooth State Monitoring
```typescript
// Power state binding
const isPoweredBinding = Variable.derive(
    [bind(bluetoothService, 'isPowered')],
    (isPowered) => isPowered
);

// Connection state binding
const isConnectedBinding = Variable.derive(
    [bind(bluetoothService, 'isConnected')],
    (isConnected) => isConnected
);

// Device list binding
const devicesBinding = Variable.derive(
    [bind(bluetoothService, 'devices')],
    (devices) => devices.filter(device => device.name !== null)
);
```

## Device Management

### Device Interface
```typescript
interface AstalBluetooth.Device {
    // Device identification
    address: string;            // MAC address
    name: string;              // Device name
    alias: string;             // Device alias
    icon: string;              // Device icon name
    
    // Connection state
    connected: boolean;         // Currently connected
    paired: boolean;           // Device is paired
    trusted: boolean;          // Device is trusted
    blocked: boolean;          // Device is blocked
    
    // Device properties
    batteryLevel: number;      // Battery level (0-100, -1 if unavailable)
    rssi: number;             // Signal strength
    uuids: string[];          // Supported service UUIDs
    
    // Methods
    connect_device(callback?: (result: any) => void): void;
    disconnect_device(callback?: (result: any) => void): void;
    pair(): void;
    cancel_pairing(): void;
    set_trusted(trusted: boolean): void;
    set_blocked(blocked: boolean): void;
}
```

### Device Enumeration and Filtering
```typescript
// Get all available devices
export const getAvailableBluetoothDevices = (): AstalBluetooth.Device[] => {
    const bluetoothDevices = bluetoothService.get_devices() ?? [];

    const availableDevices = bluetoothDevices
        .filter((btDev) => btDev.name !== null)
        .sort((a, b) => {
            // Prioritize connected and paired devices
            if (a.connected || a.paired) {
                return -1;
            }

            if (b.connected || b.paired) {
                return 1;
            }

            return a.name.localeCompare(b.name);
        });

    return availableDevices;
};

// Get connected devices
export const getConnectedBluetoothDevices = (): string[] => {
    const bluetoothDevices = bluetoothService.get_devices() ?? [];
    
    return bluetoothDevices
        .filter((btDev) => btDev.connected)
        .map((btDev) => btDev.address);
};
```

### Device Discovery Control
```typescript
// Discovery state tracking
export const isDiscovering: Variable<boolean> = Variable(false);
let discoveringBinding: Variable<void> | undefined;

Variable.derive([bind(bluetoothService, 'adapter')], () => {
    discoveringBinding?.drop();
    discoveringBinding = undefined;

    if (!bluetoothService.adapter) {
        return;
    }

    discoveringBinding = Variable.derive([bind(bluetoothService.adapter, 'discovering')], (discovering) => {
        isDiscovering.set(discovering);
    });
});

// Discovery control functions
export const startDiscovery = (): void => {
    if (bluetoothService.adapter) {
        bluetoothService.adapter.start_discovery();
    }
};

export const stopDiscovery = (): void => {
    if (bluetoothService.adapter) {
        bluetoothService.adapter.stop_discovery();
    }
};
```

## Pairing and Connection

### Connection Operations
```typescript
// Connect to device
const connectToDevice = (device: AstalBluetooth.Device): void => {
    device.connect_device((result) => {
        if (result) {
            console.log(`Connected to ${device.name}`);
        } else {
            console.error(`Failed to connect to ${device.name}`);
        }
    });
};

// Disconnect from device
const disconnectFromDevice = (device: AstalBluetooth.Device): void => {
    device.disconnect_device((result) => {
        if (result) {
            console.log(`Disconnected from ${device.name}`);
        } else {
            console.error(`Failed to disconnect from ${device.name}`);
        }
    });
};
```

### Pairing Operations
```typescript
// Pair with device
const pairWithDevice = (device: AstalBluetooth.Device): void => {
    if (!device.paired) {
        device.pair();
    } else {
        // Unpair device
        device.cancel_pairing();
    }
};

// Trust device
const trustDevice = (device: AstalBluetooth.Device, trusted: boolean): void => {
    device.set_trusted(trusted);
};

// Block/unblock device
const blockDevice = (device: AstalBluetooth.Device, blocked: boolean): void => {
    device.set_blocked(blocked);
};
```

### Device Removal
```typescript
// Forget/remove device
export const forgetBluetoothDevice = (device: AstalBluetooth.Device): void => {
    execAsync(['bash', '-c', `bluetoothctl remove ${device.address}`])
        .catch((err) => console.error('Bluetooth Remove', err))
        .then(() => {
            bluetoothService.emit('device-removed', device);
        });
};
```

## Signal System

### Service-Level Signals
```typescript
// Power state changes
bluetoothService.connect('notify::isPowered', () => {
    // Handle Bluetooth power state change
    updateBluetoothIcon();
});

// Connection state changes
bluetoothService.connect('notify::isConnected', () => {
    // Handle overall connection state change
    updateConnectionStatus();
});

// Device list changes
bluetoothService.connect('notify::devices', () => {
    // Handle device list updates
    refreshDeviceList();
});

// Custom device removal signal
bluetoothService.connect('device-removed', (service, device) => {
    // Handle device removal
    console.log(`Device removed: ${device.name}`);
});
```

### Adapter Signals
```typescript
// Adapter power changes
bluetoothService.adapter?.connect('notify::powered', () => {
    // Handle adapter power change
    updateAdapterState();
});

// Discovery state changes
bluetoothService.adapter?.connect('notify::discovering', () => {
    // Handle discovery start/stop
    updateDiscoveryIndicator();
});

// Discoverability changes
bluetoothService.adapter?.connect('notify::discoverable', () => {
    // Handle discoverability change
    updateDiscoverableState();
});
```

### Device-Specific Signals
```typescript
// Device connection changes
device.connect('notify::connected', () => {
    // Handle device connection state change
    updateDeviceStatus(device);
});

// Device pairing changes
device.connect('notify::paired', () => {
    // Handle device pairing state change
    updatePairingStatus(device);
});

// Device trust changes
device.connect('notify::trusted', () => {
    // Handle device trust state change
    updateTrustStatus(device);
});

// Battery level changes
device.connect('notify::batteryLevel', () => {
    // Handle battery level updates
    updateBatteryIndicator(device);
});
```

## Integration Patterns

### Bar Module Integration
```typescript
// Bluetooth bar module
export const Bluetooth = (): BarBoxChild => {
    const componentClassName = Variable.derive(
        [bind(options.theme.bar.buttons.style), bind(options.bar.bluetooth.label)],
        (style, showLabel) => {
            const styleMap = {
                default: 'style1',
                split: 'style2',
                wave: 'style3',
                wave2: 'style3',
            };
            return `bluetooth ${styleMap[style]} ${!showLabel ? 'no-label' : ''}`;
        },
    );

    const componentBinding = Variable.derive(
        [
            bind(options.bar.bluetooth.label),
            bind(bluetoothService, 'isPowered'),
            bind(bluetoothService, 'devices'),
            bind(bluetoothService, 'isConnected'),
        ],
        (showLabel: boolean, isPowered: boolean, devices: AstalBluetooth.Device[]): JSX.Element => {
            if (showLabel) {
                return (
                    <box>
                        <BluetoothIcon isPowered={isPowered} />
                        <BluetoothLabel isPowered={isPowered} devices={devices} />
                    </box>
                );
            }

            return <BluetoothIcon isPowered={isPowered} />;
        },
    );

    return {
        component: <box className={componentClassName()}>{componentBinding()}</box>,
        isVisible: true,
        boxClass: 'bluetooth',
        props: {
            setup: (self: Astal.Button) => {
                // Event handlers
                onPrimaryClick(self, () => {
                    openMenu(self, rightClick.get(), 'bluetoothmenu');
                });

                onScroll(self, throttledScrollHandler(5), scrollUp.get(), scrollDown.get());
            },
            onDestroy: () => {
                componentClassName.drop();
                componentBinding.drop();
            },
        },
    };
};
```

### Bluetooth Icon Component
```typescript
const BluetoothIcon = ({ isPowered }: { isPowered: boolean }): JSX.Element => {
    const iconName = isPowered ? '󰂯' : '󰂲';
    
    return (
        <label
            className={'bar-button-icon bluetooth'}
            label={iconName}
        />
    );
};
```

### Bluetooth Label Component
```typescript
const BluetoothLabel = ({ 
    isPowered, 
    devices 
}: { 
    isPowered: boolean; 
    devices: AstalBluetooth.Device[] 
}): JSX.Element => {
    const getLabel = (): string => {
        if (!isPowered) {
            return 'Off';
        }

        const connectedDevices = devices.filter(device => device.connected);
        
        if (connectedDevices.length === 0) {
            return 'On';
        }

        if (connectedDevices.length === 1) {
            return connectedDevices[0].name || 'Connected';
        }

        return `${connectedDevices.length} Connected`;
    };

    return (
        <label
            className={'bar-button-label bluetooth'}
            label={getLabel()}
        />
    );
};
```

## Bluetooth Menu Implementation

### Main Menu Structure
```typescript
export default (): JSX.Element => {
    return (
        <DropdownMenu
            name="bluetoothmenu"
            transition={bind(options.menus.transition).as((transition) => RevealerTransitionMap[transition])}
        >
            <box className={'menu-items bluetooth'} halign={Gtk.Align.FILL} hexpand>
                <box className={'menu-items-container bluetooth'} halign={Gtk.Align.FILL} vertical hexpand>
                    <BluetoothHeader />
                    <BluetoothDevices />
                </box>
            </box>
        </DropdownMenu>
    );
};
```

### Header with Controls
```typescript
const BluetoothHeader = (): JSX.Element => {
    return (
        <box className={'menu-label-container bluetooth'} halign={Gtk.Align.FILL}>
            <label className={'menu-label'} halign={Gtk.Align.START} hexpand label={'Bluetooth'} />
            <ToggleSwitch />
            <RefreshButton />
        </box>
    );
};

// Bluetooth toggle switch
export const ToggleSwitch = (): JSX.Element => (
    <switch
        className="menu-switch bluetooth"
        halign={Gtk.Align.END}
        hexpand
        active={bluetoothService.isPowered}
        setup={(self) => {
            self.connect('notify::active', () => {
                bluetoothService.adapter?.set_powered(self.active);
            });
        }}
    />
);

// Discovery refresh button
const RefreshButton = (): JSX.Element => (
    <button
        className="menu-icon-button"
        tooltipText="Scan for Devices"
        onClick={() => {
            if (bluetoothService.adapter) {
                if (isDiscovering.get()) {
                    bluetoothService.adapter.stop_discovery();
                } else {
                    bluetoothService.adapter.start_discovery();
                }
            }
        }}
    >
        <icon icon={bind(isDiscovering).as((discovering) => 
            discovering ? 'process-stop-symbolic' : 'view-refresh-symbolic'
        )} />
    </button>
);
```

### Device List Component
```typescript
export const BluetoothDevices = (): JSX.Element => {
    const deviceListBinding = Variable.derive(
        [bind(bluetoothService, 'devices'), bind(bluetoothService, 'isPowered')],
        () => {
            const availableDevices = getAvailableBluetoothDevices();
            const connectedDevices = getConnectedBluetoothDevices();

            if (availableDevices.length === 0) {
                return <NoBluetoothDevices />;
            }

            if (!bluetoothService.adapter?.powered) {
                return <BluetoothDisabled />;
            }

            return availableDevices.map((btDevice) => (
                <DeviceListItem 
                    key={btDevice.address}
                    btDevice={btDevice} 
                    connectedDevices={connectedDevices} 
                />
            ));
        },
    );

    return (
        <scrollable className={'menu-items-section'} vexpand maxContentHeight={300}>
            <box vertical>
                {deviceListBinding()}
            </box>
        </scrollable>
    );
};
```

## Device Control Components

### Device List Item
```typescript
const DeviceListItem = ({ 
    btDevice, 
    connectedDevices 
}: { 
    btDevice: AstalBluetooth.Device; 
    connectedDevices: string[] 
}): JSX.Element => {
    const isConnected = connectedDevices.includes(btDevice.address);

    return (
        <button
            hexpand
            className={`bluetooth-element-item ${isConnected ? 'connected' : ''}`}
            onClick={(_, event) => {
                if (!isConnected && isPrimaryClick(event)) {
                    btDevice.connect_device((res) => {
                        console.info('Connection result:', res);
                    });
                }
            }}
        >
            <box>
                <box hexpand halign={Gtk.Align.START} className="menu-button-container">
                    <DeviceIcon device={btDevice} connectedDevices={connectedDevices} />
                    <box vertical valign={Gtk.Align.CENTER}>
                        <DeviceName device={btDevice} />
                        <DeviceStatus device={btDevice} />
                    </box>
                </box>
                <box halign={Gtk.Align.END}>
                    <DeviceControls device={btDevice} />
                </box>
            </box>
        </button>
    );
};
```

### Device Control Buttons
```typescript
// Connect/Disconnect button
export const ConnectButton = ({ device }: { device: AstalBluetooth.Device }): JSX.Element => {
    return (
        <ActionButton
            name={'disconnect'}
            tooltipText={bind(device, 'connected').as((connected) => (connected ? 'Disconnect' : 'Connect'))}
            label={bind(device, 'connected').as((connected) => (connected ? '󱘖' : ''))}
            onClick={(_, self) => {
                if (isPrimaryClick(self)) {
                    if (device.connected) {
                        device.disconnect_device((res) => {
                            console.info('Disconnect result:', res);
                        });
                    } else {
                        device.connect_device((res) => {
                            console.info('Connect result:', res);
                        });
                    }
                }
            }}
        />
    );
};

// Pair/Unpair button
export const PairButton = ({ device }: { device: AstalBluetooth.Device }): JSX.Element => {
    return (
        <ActionButton
            name={'unpair'}
            tooltipText={bind(device, 'paired').as((paired) => (paired ? 'Unpair' : 'Pair'))}
            label={bind(device, 'paired').as((paired) => (paired ? '' : ''))}
            onClick={(_, self) => {
                if (isPrimaryClick(self)) {
                    if (device.paired) {
                        device.cancel_pairing();
                    } else {
                        device.pair();
                    }
                }
            }}
        />
    );
};

// Forget device button
const ForgetButton = ({ device }: { device: AstalBluetooth.Device }): JSX.Element => {
    return (
        <ActionButton
            name={'forget'}
            tooltipText={'Forget Device'}
            label={''}
            onClick={(_, self) => {
                if (isPrimaryClick(self)) {
                    forgetBluetoothDevice(device);
                }
            }}
        />
    );
};
```

### Device Information Display
```typescript
// Device name component
const DeviceName = ({ device }: { device: AstalBluetooth.Device }): JSX.Element => {
    return (
        <label
            className={'menu-item-label device-name'}
            label={device.name || device.address}
            halign={Gtk.Align.START}
            truncate
        />
    );
};

// Device status component
const DeviceStatus = ({ device }: { device: AstalBluetooth.Device }): JSX.Element => {
    const statusText = bind(device, 'connected').as((connected) => {
        if (connected) {
            return 'Connected';
        } else if (device.paired) {
            return 'Paired';
        } else {
            return 'Available';
        }
    });

    return (
        <label
            className={'menu-item-sublabel device-status'}
            label={statusText}
            halign={Gtk.Align.START}
        />
    );
};

// Device icon with battery indicator
const DeviceIcon = ({ 
    device, 
    connectedDevices 
}: { 
    device: AstalBluetooth.Device; 
    connectedDevices: string[] 
}): JSX.Element => {
    const isConnected = connectedDevices.includes(device.address);
    const iconName = device.icon || 'bluetooth-symbolic';
    
    return (
        <box className={'menu-item-icon-container'}>
            <icon
                className={`menu-item-icon ${isConnected ? 'connected' : ''}`}
                icon={iconName}
            />
            {device.batteryLevel >= 0 && (
                <label
                    className={'battery-indicator'}
                    label={`${device.batteryLevel}%`}
                />
            )}
        </box>
    );
};
```

This comprehensive AstalBluetooth integration enables HyprPanel to provide complete Bluetooth management capabilities, including device discovery, pairing, connection management, and real-time status monitoring through both bar modules and detailed menu interfaces.
