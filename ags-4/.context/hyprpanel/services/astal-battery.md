# AstalBattery Service Documentation

## Table of Contents
- [Service Overview](#service-overview)
- [Service Initialization](#service-initialization)
- [Core Properties](#core-properties)
- [Battery State Monitoring](#battery-state-monitoring)
- [Signal System](#signal-system)
- [Integration Patterns](#integration-patterns)
- [Battery Warning System](#battery-warning-system)
- [Power Management](#power-management)
- [Icon System](#icon-system)

## Service Overview

AstalBattery provides a comprehensive interface to UPower, the Linux power management daemon, handling all battery and power-related operations in HyprPanel. It monitors battery levels, charging states, power consumption, and provides real-time battery status updates.

### Key Responsibilities
- **Battery Monitoring**: Track battery percentage, charging state, and power consumption
- **Power State Management**: Monitor AC adapter connection and power source changes
- **Time Estimation**: Provide time-to-empty and time-to-full calculations
- **Low Battery Warnings**: Alert users when battery levels reach critical thresholds
- **Power Statistics**: Track battery health, capacity, and usage patterns

## Service Initialization

### Singleton Pattern
```typescript
import AstalBattery from 'gi://AstalBattery?version=0.1';

// Battery service instance
const batteryService = AstalBattery.get_default();
```

### Service Availability Check
```typescript
// Check if battery service is available
if (batteryService) {
    // Battery operations available
    const percentage = batteryService.percentage;
    const charging = batteryService.charging;
    const timeRemaining = batteryService.timeRemaining;
}
```

## Core Properties

### Battery State Properties
```typescript
interface AstalBattery {
    // Battery level (0.0 - 1.0)
    percentage: number;
    
    // Charging state
    charging: boolean;
    
    // Battery state enum
    state: AstalBattery.State;
    
    // Time estimates (in seconds)
    timeRemaining: number;        // Time to empty/full
    timeToEmpty: number;          // Time until battery depleted
    timeToFull: number;           // Time until fully charged
    
    // Power information
    energy: number;               // Current energy level (Wh)
    energyFull: number;          // Full energy capacity (Wh)
    energyRate: number;          // Current power consumption (W)
    
    // Battery health
    capacity: number;            // Battery health percentage
    
    // Device information
    iconName: string;            // Battery icon identifier
    isPresent: boolean;          // Battery is physically present
}
```

### Battery State Enumeration
```typescript
enum AstalBattery.State {
    UNKNOWN = 0,
    CHARGING = 1,
    DISCHARGING = 2,
    EMPTY = 3,
    FULLY_CHARGED = 4,
    PENDING_CHARGE = 5,
    PENDING_DISCHARGE = 6,
}
```

### Battery State Monitoring
```typescript
// Battery percentage binding
const percentageBinding = Variable.derive(
    [bind(batteryService, 'percentage')],
    (percentage) => Math.round(percentage * 100)
);

// Charging state binding
const chargingBinding = Variable.derive(
    [bind(batteryService, 'charging')],
    (charging) => charging
);

// Battery state binding
const stateBinding = Variable.derive(
    [bind(batteryService, 'state')],
    (state) => state
);

// Combined battery status
const batteryStatus = Variable.derive(
    [
        bind(batteryService, 'percentage'),
        bind(batteryService, 'charging'),
        bind(batteryService, 'state'),
    ],
    (percentage, charging, state) => ({
        percentage: Math.round(percentage * 100),
        charging,
        state,
        isCharged: state === AstalBattery.State.FULLY_CHARGED,
    })
);
```

## Battery State Monitoring

### Time Estimation
```typescript
// Format time for display
const formatTime = (seconds: number): Record<string, number> => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return { hours, minutes };
};

// Generate tooltip with time information
const generateTooltip = (timeSeconds: number, isCharging: boolean, isCharged: boolean): string => {
    if (isCharged === true) {
        return 'Full';
    }

    const { hours, minutes } = formatTime(timeSeconds);
    if (isCharging) {
        return `Time to full: ${hours} h ${minutes} min`;
    } else {
        return `Time to empty: ${hours} h ${minutes} min`;
    }
};

// Time remaining binding
const timeRemainingBinding = Variable.derive(
    [
        bind(batteryService, 'timeRemaining'),
        bind(batteryService, 'charging'),
        bind(batteryService, 'state'),
    ],
    (timeRemaining, charging, state) => {
        const isCharged = state === AstalBattery.State.FULLY_CHARGED;
        return generateTooltip(timeRemaining, charging, isCharged);
    }
);
```

### Power Consumption Monitoring
```typescript
// Energy rate monitoring
const powerConsumption = Variable.derive(
    [bind(batteryService, 'energyRate')],
    (energyRate) => `${energyRate.toFixed(1)} W`
);

// Battery capacity monitoring
const batteryHealth = Variable.derive(
    [bind(batteryService, 'capacity')],
    (capacity) => `${Math.round(capacity * 100)}%`
);

// Energy level monitoring
const energyStatus = Variable.derive(
    [
        bind(batteryService, 'energy'),
        bind(batteryService, 'energyFull'),
    ],
    (energy, energyFull) => ({
        current: `${energy.toFixed(1)} Wh`,
        full: `${energyFull.toFixed(1)} Wh`,
        percentage: Math.round((energy / energyFull) * 100),
    })
);
```

## Signal System

### Battery State Signals
```typescript
// Percentage changes
batteryService.connect('notify::percentage', () => {
    // Handle battery percentage change
    updateBatteryDisplay();
    checkLowBatteryWarning();
});

// Charging state changes
batteryService.connect('notify::charging', () => {
    // Handle charging state change
    updateChargingIndicator();
    resetLowBatteryWarnings();
});

// Battery state changes
batteryService.connect('notify::state', () => {
    // Handle battery state change
    updateBatteryIcon();
    handleFullyChargedState();
});

// Time remaining changes
batteryService.connect('notify::timeRemaining', () => {
    // Handle time estimate updates
    updateTimeDisplay();
});
```

### Power Management Signals
```typescript
// Energy rate changes (power consumption)
batteryService.connect('notify::energyRate', () => {
    // Handle power consumption changes
    updatePowerDisplay();
});

// Capacity changes (battery health)
batteryService.connect('notify::capacity', () => {
    // Handle battery health changes
    updateHealthIndicator();
});

// Presence changes
batteryService.connect('notify::isPresent', () => {
    // Handle battery insertion/removal
    updateBatteryAvailability();
});
```

## Integration Patterns

### Bar Module Integration
```typescript
// Battery bar module
export const BatteryLabel = (): BarBoxChild => {
    const batIcon = Variable.derive(
        [bind(batteryService, 'percentage'), bind(batteryService, 'charging'), bind(batteryService, 'state')],
        (batPercent: number, batCharging: boolean, state: AstalBattery.State) => {
            const batCharged = state === AstalBattery.State.FULLY_CHARGED;
            return getBatteryIcon(Math.floor(batPercent * 100), batCharging, batCharged);
        },
    );

    const componentClassName = Variable.derive(
        [bind(options.theme.bar.buttons.style), bind(show_label)],
        (style, showLabel) => {
            const styleMap = {
                default: 'style1',
                split: 'style2',
                wave: 'style3',
                wave2: 'style3',
            };
            return `battery-container ${styleMap[style]} ${!showLabel ? 'no-label' : ''}`;
        },
    );

    const componentChildren = Variable.derive(
        [bind(show_label), bind(batteryService, 'percentage'), bind(hideLabelWhenFull)],
        (showLabel, percentage, hideLabelWhenFull) => {
            const isCharged = Math.round(percentage * 100) === 100;

            const icon = <label className={'bar-button-icon battery txt-icon'} label={batIcon()} />;
            const label = <label className={'bar-button-label battery'} label={`${Math.floor(percentage * 100)}%`} />;

            const children = [icon];

            if (showLabel && !(isCharged && hideLabelWhenFull)) {
                children.push(label);
            }

            return children;
        },
    );

    return {
        component: <box className={componentClassName()}>{componentChildren()}</box>,
        isVisible: true,
        boxClass: 'battery',
        props: {
            setup: (self: Astal.Button) => {
                // Event handlers
                onPrimaryClick(self, () => {
                    openMenu(self, rightClick.get(), 'energymenu');
                });

                onScroll(self, throttledScrollHandler(5), scrollUp.get(), scrollDown.get());
            },
            onDestroy: () => {
                batIcon.drop();
                componentClassName.drop();
                componentChildren.drop();
            },
        },
    };
};
```

### Tooltip Integration
```typescript
// Battery tooltip with detailed information
const batteryTooltip = Variable.derive(
    [
        bind(batteryService, 'percentage'),
        bind(batteryService, 'charging'),
        bind(batteryService, 'state'),
        bind(batteryService, 'timeRemaining'),
        bind(batteryService, 'energyRate'),
        bind(batteryService, 'capacity'),
    ],
    (percentage, charging, state, timeRemaining, energyRate, capacity) => {
        const isCharged = state === AstalBattery.State.FULLY_CHARGED;
        const percentageText = `${Math.round(percentage * 100)}%`;
        
        let statusText = '';
        if (isCharged) {
            statusText = 'Fully Charged';
        } else if (charging) {
            statusText = 'Charging';
        } else {
            statusText = 'Discharging';
        }

        const timeText = generateTooltip(timeRemaining, charging, isCharged);
        const powerText = `Power: ${energyRate.toFixed(1)} W`;
        const healthText = `Health: ${Math.round(capacity * 100)}%`;

        return `${percentageText} - ${statusText}\n${timeText}\n${powerText}\n${healthText}`;
    }
);
```

## Battery Warning System

### Low Battery Notifications
```typescript
export function warnOnLowBattery(): void {
    let sentLowNotification = false;
    let sentHalfLowNotification = false;

    // Reset warnings when charging starts
    batteryService.connect('notify::charging', () => {
        if (batteryService.charging) {
            sentLowNotification = false;
            sentHalfLowNotification = false;
        }
    });

    // Monitor battery percentage for warnings
    batteryService.connect('notify::percentage', () => {
        const { 
            lowBatteryThreshold, 
            lowBatteryNotification, 
            lowBatteryNotificationText, 
            lowBatteryNotificationTitle 
        } = options.menus.power;

        if (!lowBatteryNotification.get() || batteryService.charging) {
            return;
        }

        const batteryLevel = Math.round(batteryService.percentage * 100);
        const threshold = lowBatteryThreshold.get();
        const halfThreshold = Math.round(threshold / 2);

        // Critical low battery warning
        if (batteryLevel <= halfThreshold && !sentHalfLowNotification) {
            sentHalfLowNotification = true;
            
            Notify({
                summary: lowBatteryNotificationTitle.get(),
                body: lowBatteryNotificationText.get().replace('$POWER_LEVEL', batteryLevel.toString()),
                iconName: icons.ui.warning,
                urgency: 'critical',
                timeout: 0, // Persistent notification
            });
        }
        // Low battery warning
        else if (batteryLevel <= threshold && !sentLowNotification) {
            sentLowNotification = true;
            
            Notify({
                summary: lowBatteryNotificationTitle.get(),
                body: lowBatteryNotificationText.get().replace('$POWER_LEVEL', batteryLevel.toString()),
                iconName: icons.ui.warning,
                urgency: 'normal',
            });
        }
    });
}
```

### Advanced Warning Configuration
```typescript
// Configurable warning thresholds
const batteryWarningConfig = {
    criticalThreshold: 5,     // Critical warning at 5%
    lowThreshold: 15,         // Low warning at 15%
    warningThreshold: 25,     // Warning at 25%
    
    // Notification settings
    persistentCritical: true, // Keep critical notifications visible
    soundAlerts: true,        // Play sound for warnings
    flashScreen: false,       // Flash screen for critical warnings
};

// Multi-level warning system
const checkBatteryWarnings = (percentage: number, charging: boolean): void => {
    if (charging) return;

    const level = Math.round(percentage * 100);
    
    if (level <= batteryWarningConfig.criticalThreshold) {
        showCriticalBatteryWarning(level);
    } else if (level <= batteryWarningConfig.lowThreshold) {
        showLowBatteryWarning(level);
    } else if (level <= batteryWarningConfig.warningThreshold) {
        showBatteryWarning(level);
    }
};
```

## Power Management

### Energy Menu Integration
```typescript
// Energy menu with detailed battery information
const EnergyMenu = (): JSX.Element => {
    return (
        <DropdownMenu name="energymenu">
            <box className={'menu-items energy'} vertical>
                <BatteryStatus />
                <PowerStatistics />
                <PowerSettings />
            </box>
        </DropdownMenu>
    );
};

// Battery status section
const BatteryStatus = (): JSX.Element => {
    return (
        <box className={'menu-section battery-status'} vertical>
            <box className={'status-header'}>
                <icon 
                    className={'battery-icon'} 
                    icon={bind(batteryService, 'iconName')} 
                />
                <label 
                    className={'battery-percentage'} 
                    label={bind(batteryService, 'percentage').as(p => `${Math.round(p * 100)}%`)} 
                />
                <label 
                    className={'battery-state'} 
                    label={bind(batteryService, 'charging').as(c => c ? 'Charging' : 'Discharging')} 
                />
            </box>
            
            <progressbar
                className={'battery-progress'}
                value={bind(batteryService, 'percentage')}
                showText={false}
            />
            
            <label
                className={'time-remaining'}
                label={timeRemainingBinding()}
            />
        </box>
    );
};
```

### Power Statistics Display
```typescript
const PowerStatistics = (): JSX.Element => {
    return (
        <box className={'menu-section power-stats'} vertical>
            <label className={'section-title'} label={'Power Statistics'} />
            
            <box className={'stat-item'}>
                <label className={'stat-label'} label={'Power Consumption:'} />
                <label 
                    className={'stat-value'} 
                    label={bind(batteryService, 'energyRate').as(rate => `${rate.toFixed(1)} W`)} 
                />
            </box>
            
            <box className={'stat-item'}>
                <label className={'stat-label'} label={'Battery Health:'} />
                <label 
                    className={'stat-value'} 
                    label={bind(batteryService, 'capacity').as(cap => `${Math.round(cap * 100)}%`)} 
                />
            </box>
            
            <box className={'stat-item'}>
                <label className={'stat-label'} label={'Energy Level:'} />
                <label 
                    className={'stat-value'} 
                    label={bind(batteryService, 'energy').as(energy => `${energy.toFixed(1)} Wh`)} 
                />
            </box>
        </box>
    );
};
```

## Icon System

### Battery Icon Mapping
```typescript
// Battery icon definitions
const batteryIcons: BatteryIcons = {
    0: '󰂎',   // Empty
    10: '󰁺',  // 10%
    20: '󰁻',  // 20%
    30: '󰁼',  // 30%
    40: '󰁽',  // 40%
    50: '󰁾',  // 50%
    60: '󰁿',  // 60%
    70: '󰂀',  // 70%
    80: '󰂁',  // 80%
    90: '󰂂',  // 90%
    100: '󰁹', // Full
};

// Charging battery icons
const batteryIconsCharging: BatteryIcons = {
    0: '󰢟',   // Charging empty
    10: '󰢜',  // Charging 10%
    20: '󰂆',  // Charging 20%
    30: '󰂇',  // Charging 30%
    40: '󰂈',  // Charging 40%
    50: '󰢝',  // Charging 50%
    60: '󰂉',  // Charging 60%
    70: '󰢞',  // Charging 70%
    80: '󰂊',  // Charging 80%
    90: '󰂋',  // Charging 90%
    100: '󰂅', // Charging full
};
```

### Icon Selection Logic
```typescript
export const getBatteryIcon = (percentage: number, charging: boolean, isCharged: boolean): string => {
    // Fully charged state
    if (isCharged) {
        return '󱟢'; // Fully charged icon
    }
    
    // Find appropriate icon based on percentage
    const percentages: BatteryIconKeys[] = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0];
    const foundPercentage = percentages.find((threshold) => threshold <= percentage) ?? 100;

    // Return charging or discharging icon
    return charging ? batteryIconsCharging[foundPercentage] : batteryIcons[foundPercentage];
};
```

### Dynamic Icon Binding
```typescript
// Icon with state-based selection
const batteryIconBinding = Variable.derive(
    [
        bind(batteryService, 'percentage'),
        bind(batteryService, 'charging'),
        bind(batteryService, 'state'),
    ],
    (percentage, charging, state) => {
        const isCharged = state === AstalBattery.State.FULLY_CHARGED;
        const percentageValue = Math.floor(percentage * 100);
        
        return getBatteryIcon(percentageValue, charging, isCharged);
    }
);
```

This comprehensive AstalBattery integration enables HyprPanel to provide complete battery management and monitoring capabilities, including real-time status updates, intelligent warning systems, detailed power statistics, and intuitive visual feedback through dynamic icons and progress indicators.
