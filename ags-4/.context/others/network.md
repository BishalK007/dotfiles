# From HyprPanel

# Network Module Documentation

## Table of Contents
1. [Network Module Architecture](#network-module-architecture)
2. [Service Integration](#service-integration)
3. [Component Breakdown](#component-breakdown)
4. [Event Handling](#event-handling)
5. [Menu Integration](#menu-integration)
6. [Helper Functions](#helper-functions)
7. [Data Flow Analysis](#data-flow-analysis)

## Network Module Architecture

### Main Component Structure

The network module is implemented as a functional component that returns a `BarBoxChild` object, following the standardized bar module pattern used throughout HyprPanel.

````tsx path=src/components/bar/modules/network/index.tsx mode=EXCERPT
const Network = (): BarBoxChild => {
    const iconBinding = Variable.derive(
        [bind(networkService, 'primary'), bind(wiredIcon), bind(wirelessIcon)],
        (primaryNetwork, wiredIcon, wifiIcon) => {
            return primaryNetwork === AstalNetwork.Primary.WIRED ? wiredIcon : wifiIcon;
        },
    );

    const NetworkIcon = (): JSX.Element => <icon className={'bar-button-icon network-icon'} icon={iconBinding()} />;

    // Component implementation...

    return {
        component,
        isVisible: true,
        boxClass: 'network',
        props: {
            setup: (self: Astal.Button): void => {
                // Event handler setup
            },
        },
    };
};
````

### Integration with Bar System

The network module integrates with the bar system through:

- **BarBoxChild Interface**: Returns standardized object with `component`, `isVisible`, `boxClass`, and `props`
- **Event Handler Setup**: Configures click and scroll handlers in the `setup` function
- **Dynamic Styling**: Uses `componentClassName` binding for responsive CSS classes
- **Menu Integration**: Opens network menu on primary click events

## Service Integration

### AstalNetwork Service Overview

The module uses the AstalNetwork service as its primary data source:

````tsx path=src/components/bar/modules/network/index.tsx mode=EXCERPT
import AstalNetwork from 'gi://AstalNetwork?version=0.1';

const networkService = AstalNetwork.get_default();
````

### Primary Network Detection

The service provides a `primary` property that indicates whether the active connection is wired or wireless:

````tsx path=src/components/bar/modules/network/index.tsx mode=EXCERPT
const iconBinding = Variable.derive(
    [bind(networkService, 'primary'), bind(wiredIcon), bind(wirelessIcon)],
    (primaryNetwork, wiredIcon, wifiIcon) => {
        return primaryNetwork === AstalNetwork.Primary.WIRED ? wiredIcon : wifiIcon;
    },
);
````

**Primary Network States:**
- `AstalNetwork.Primary.WIRED`: Ethernet connection is primary
- `AstalNetwork.Primary.WIRELESS`: WiFi connection is primary

### WiFi State Monitoring

The module monitors multiple WiFi-related properties:

````tsx path=src/components/bar/modules/network/index.tsx mode=EXCERPT
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
        // Label logic implementation
    },
);
````

**Monitored Properties:**
- `networkService.state`: Overall network state
- `networkService.connectivity`: Internet connectivity status
- `networkService.wifi.enabled`: WiFi radio state
- `networkService.wifi.ssid`: Connected network name
- `networkService.wifi.active_access_point`: Current access point

### Network Connectivity Tracking

The service provides real-time connectivity information through:
- **State Changes**: Connection/disconnection events
- **Connectivity Status**: Internet reachability
- **Access Point Management**: Active WiFi connection details

## Component Breakdown

### Network Icon Logic

The network icon dynamically switches between wired and wireless icons based on the primary connection type:

````tsx path=src/components/bar/modules/network/helpers.ts mode=EXCERPT
export const wiredIcon: Variable<string> = Variable('');
export const wirelessIcon: Variable<string> = Variable('');

const handleWiredIcon = (): void => {
    wiredIconBinding?.drop();
    wiredIconBinding = undefined;

    if (!networkService.wired) {
        return;
    }

    wiredIconBinding = Variable.derive([bind(networkService.wired, 'iconName')], (icon) => {
        wiredIcon.set(icon);
    });
};

const handleWirelessIcon = (): void => {
    wirelessIconBinding?.drop();
    wirelessIconBinding = undefined;

    if (!networkService.wifi) {
        return;
    }

    wirelessIconBinding = Variable.derive([bind(networkService.wifi, 'iconName')], (icon) => {
        wirelessIcon.set(icon);
    });
};
````

**Icon Management Features:**
- **Dynamic Binding**: Icons update automatically when network devices change
- **Resource Cleanup**: Previous bindings are properly dropped to prevent memory leaks
- **Device Availability**: Handles cases where wired or wireless devices are unavailable
- **Icon Names**: Uses system-provided icon names from NetworkManager

### Network Label Display

The network label provides contextual information about the current connection:

````tsx path=src/components/bar/modules/network/index.tsx mode=EXCERPT
const networkLabel = Variable.derive(
    [/* bindings */],
    (primaryNetwork, showLabel, trunc, tSize, showWifiInfo) => {
        if (!showLabel) {
            return <box />;
        }
        if (primaryNetwork === AstalNetwork.Primary.WIRED) {
            return <label className={'bar-button-label network-label'} label={'Wired'.substring(0, tSize)} />;
        }
        const networkWifi = networkService.wifi;
        if (networkWifi != null) {
            if (!networkWifi.enabled) {
                return <label className={'bar-button-label network-label'} label="Off" />;
            }

            return (
                <label
                    className={'bar-button-label network-label'}
                    label={
                        networkWifi.active_access_point
                            ? `${trunc ? networkWifi.ssid.substring(0, tSize) : networkWifi.ssid}`
                            : '--'
                    }
                    tooltipText={showWifiInfo && networkWifi.active_access_point ? formatWifiInfo(networkWifi) : ''}
                />
            );
        }
        return <box />;
    },
);
````

**Label Display Logic:**
1. **Visibility Control**: Returns empty box if labels are disabled
2. **Wired Connection**: Shows "Wired" (truncated if needed)
3. **WiFi Disabled**: Shows "Off" when WiFi radio is disabled
4. **WiFi Connected**: Shows SSID name (truncated if configured)
5. **WiFi Disconnected**: Shows "--" when no access point is active
6. **Tooltip Information**: Displays detailed WiFi info when enabled

### Truncation Handling

The module supports text truncation for long network names:

```tsx
label={
    networkWifi.active_access_point
        ? `${trunc ? networkWifi.ssid.substring(0, tSize) : networkWifi.ssid}`
        : '--'
}
```

**Truncation Features:**
- **Configurable**: Controlled by `truncation` option
- **Size Limit**: Uses `truncation_size` for character limit
- **Conditional**: Only applies when truncation is enabled

### WiFi Information Formatting

````tsx path=src/components/bar/modules/network/helpers.ts mode=EXCERPT
export const formatWifiInfo = (wifi: AstalNetwork.Wifi): string => {
    return `Network: ${wifi.ssid} \nSignal Strength: ${wifi.strength}% \nFrequency: ${formatFrequency(wifi.frequency)}`;
};

const formatFrequency = (frequency: number): string => {
    return `${(frequency / 1000).toFixed(2)}MHz`;
};
````

**Information Displayed:**
- **Network Name**: SSID of connected network
- **Signal Strength**: Percentage-based signal quality
- **Frequency**: WiFi frequency in MHz (converted from kHz)

## Event Handling

### Network State Change Events

The module automatically responds to network state changes through reactive bindings:

````tsx path=src/components/bar/modules/network/helpers.ts mode=EXCERPT
Variable.derive([bind(networkService, 'state'), bind(networkService, 'connectivity')], () => {
    handleWiredIcon();
    handleWirelessIcon();
});
````

**Monitored Events:**
- **State Changes**: Connection/disconnection events
- **Connectivity Changes**: Internet reachability status
- **Device Availability**: Wired/wireless device presence

### User Interaction Handling

The network module supports various user interactions:

````tsx path=src/components/bar/modules/network/index.tsx mode=EXCERPT
setup: (self: Astal.Button): void => {
    let disconnectFunctions: (() => void)[] = [];

    Variable.derive(
        [
            bind(rightClick),
            bind(middleClick),
            bind(scrollUp),
            bind(scrollDown),
            bind(options.bar.scrollSpeed),
        ],
        () => {
            disconnectFunctions.forEach((disconnect) => disconnect());
            disconnectFunctions = [];

            const throttledHandler = throttledScrollHandler(options.bar.scrollSpeed.get());

            disconnectFunctions.push(
                onPrimaryClick(self, (clicked, event) => {
                    openMenu(clicked, event, 'networkmenu');
                }),
            );

            disconnectFunctions.push(
                onSecondaryClick(self, (clicked, event) => {
                    runAsyncCommand(rightClick.get(), { clicked, event });
                }),
            );

            disconnectFunctions.push(
                onMiddleClick(self, (clicked, event) => {
                    runAsyncCommand(middleClick.get(), { clicked, event });
                }),
            );

            disconnectFunctions.push(onScroll(self, throttledHandler, scrollUp.get(), scrollDown.get()));
        },
    );
},
````

**Interaction Types:**
- **Primary Click**: Opens network menu
- **Secondary Click**: Executes configured command
- **Middle Click**: Executes configured command
- **Scroll Events**: Executes configured scroll commands
- **Throttling**: Prevents excessive scroll event handling

### Dynamic Event Handler Management

The module uses a sophisticated event handler management system:

1. **Dynamic Reconfiguration**: Event handlers are recreated when options change
2. **Cleanup Management**: Previous handlers are properly disconnected
3. **Throttling**: Scroll events are throttled based on configuration
4. **Command Execution**: Supports custom commands for different interaction types

## Menu Integration

### Network Menu Connection

The network module integrates with the network menu system:

````tsx path=src/components/menus/network/index.tsx mode=EXCERPT
export default (): JSX.Element => {
    return (
        <DropdownMenu
            name={'networkmenu'}
            transition={bind(options.menus.transition).as((transition) => RevealerTransitionMap[transition])}
        >
            <box className={'menu-items network'}>
                <box className={'menu-items-container network'} vertical hexpand>
                    <Ethernet />
                    {bind(networkService, 'wifi').as((wifi) => {
                        if (wifi === null) {
                            return <NoWifi />;
                        }
                        return <Wifi />;
                    })}
                </box>
            </box>
        </DropdownMenu>
    );
};
````

**Menu Features:**
- **Dropdown Interface**: Uses standardized dropdown menu component
- **Dynamic Content**: Shows different components based on WiFi availability
- **Ethernet Section**: Always visible for wired network management
- **WiFi Section**: Conditionally rendered based on WiFi device presence

### Menu Triggering

````tsx path=src/components/bar/modules/network/index.tsx mode=EXCERPT
onPrimaryClick(self, (clicked, event) => {
    openMenu(clicked, event, 'networkmenu');
}),
````

The network module opens the menu using the `openMenu` utility function, which:
- Positions the menu relative to the clicked element
- Manages menu visibility state
- Handles menu transitions and animations

## Helper Functions

### Icon Management Helpers

````tsx path=src/components/bar/modules/network/helpers.ts mode=EXCERPT
const handleWiredIcon = (): void => {
    wiredIconBinding?.drop();
    wiredIconBinding = undefined;

    if (!networkService.wired) {
        return;
    }

    wiredIconBinding = Variable.derive([bind(networkService.wired, 'iconName')], (icon) => {
        wiredIcon.set(icon);
    });
};
````

**Helper Functions:**
- **handleWiredIcon()**: Manages wired network icon binding
- **handleWirelessIcon()**: Manages wireless network icon binding
- **Resource Management**: Properly cleans up previous bindings
- **Device Availability**: Handles missing network devices gracefully

### WiFi Information Utilities

````tsx path=src/components/bar/modules/network/helpers.ts mode=EXCERPT
const formatFrequency = (frequency: number): string => {
    return `${(frequency / 1000).toFixed(2)}MHz`;
};

export const formatWifiInfo = (wifi: AstalNetwork.Wifi): string => {
    return `Network: ${wifi.ssid} \nSignal Strength: ${wifi.strength}% \nFrequency: ${formatFrequency(wifi.frequency)}`;
};
````

**Utility Features:**
- **Frequency Conversion**: Converts kHz to MHz with proper formatting
- **Information Aggregation**: Combines multiple WiFi properties into readable format
- **Consistent Formatting**: Provides standardized display format

## Data Flow Analysis

### Network State Change Flow

```
Network Hardware Change
         ↓
NetworkManager Detection
         ↓
AstalNetwork Service Update
         ↓
GObject Property Change Signal
         ↓
Variable.derive() Callback
         ↓
Component Re-render
         ↓
Visual Update in Bar
```

### Icon Update Flow

```
Network Device State Change
         ↓
AstalNetwork.wired/wifi.iconName Update
         ↓
handleWiredIcon()/handleWirelessIcon() Callback
         ↓
wiredIcon/wirelessIcon Variable Update
         ↓
iconBinding Variable.derive() Callback
         ↓
NetworkIcon Component Re-render
```

### Label Update Flow

```
WiFi Connection Change
         ↓
AstalNetwork.wifi Properties Update
         ↓
networkLabel Variable.derive() Callback
         ↓
Label Content Calculation
         ↓
Component Re-render with New Label
```

### User Interaction Flow

```
User Click on Network Module
         ↓
onPrimaryClick Event Handler
         ↓
openMenu('networkmenu') Call
         ↓
Network Menu Display
         ↓
Menu Component Rendering
```

This comprehensive architecture provides a robust, reactive network monitoring system that automatically updates the bar display based on real-time network changes while supporting rich user interactions and detailed network management through the integrated menu system.
