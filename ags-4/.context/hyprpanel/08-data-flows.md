# Data Flow Architecture

## Table of Contents
- [Data Flow Overview](#data-flow-overview)
- [Reactive Programming Patterns](#reactive-programming-patterns)
- [Service to UI Data Flow](#service-to-ui-data-flow)
- [Event Propagation System](#event-propagation-system)
- [Variable Derivation Patterns](#variable-derivation-patterns)
- [Signal System](#signal-system)
- [Complete Data Flow Examples](#complete-data-flow-examples)

## Data Flow Overview

HyprPanel uses a reactive data flow architecture built on Astal's Variable system and GObject signals. Data flows from system services through reactive variables to UI components.

### High-Level Data Flow
```
System Services → Service Bindings → Variable Derivation → UI Components → User Interaction → System Commands
     ↑                                                                                              ↓
     └──────────────────────── Feedback Loop ────────────────────────────────────────────────────┘
```

### Data Flow Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                    System Layer                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │ AstalNetwork│ │ AstalAudio  │ │ AstalBattery│ │ Hyprland    ││
│  │             │ │             │ │             │ │             ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Service Layer                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │ Network     │ │ Audio       │ │ Battery     │ │ Brightness  ││
│  │ Service     │ │ Service     │ │ Service     │ │ Service     ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                 Reactive Layer                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │ Variable    │ │ Variable    │ │ Variable    │ │ Variable    ││
│  │ Bindings    │ │ Derivations │ │ Polling     │ │ Options     ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                Component Layer                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │ Bar Modules │ │ Menu        │ │ OSD         │ │ Settings    ││
│  │             │ │ Components  │ │ Components  │ │ Dialog      ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                    UI Layer                                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │ GTK Widgets │ │ CSS Styling │ │ Event       │ │ User        ││
│  │             │ │             │ │ Handlers    │ │ Interaction ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Reactive Programming Patterns

### Variable System Foundation
```typescript
// Base Variable class from Astal
export class Variable<T> {
    private _value: T;
    private _subscribers: Set<(value: T) => void> = new Set();

    constructor(initial: T) {
        this._value = initial;
    }

    get(): T {
        return this._value;
    }

    set(value: T): void {
        this._value = value;
        this._subscribers.forEach(callback => callback(value));
    }

    subscribe(callback: (value: T) => void): () => void {
        this._subscribers.add(callback);
        return () => this._subscribers.delete(callback);
    }
}
```

### Variable Derivation Pattern
```typescript
// Core derivation pattern
const derivedVariable = Variable.derive(
    [bind(source1), bind(source2), bind(source3)],
    (value1, value2, value3) => {
        // Computation logic
        return computeResult(value1, value2, value3);
    }
);

// Real example: Network icon derivation
const iconBinding = Variable.derive(
    [bind(networkService, 'primary'), bind(wiredIcon), bind(wirelessIcon)],
    (primaryNetwork, wiredIcon, wifiIcon) => {
        return primaryNetwork === AstalNetwork.Primary.WIRED ? wiredIcon : wifiIcon;
    },
);
```

### Polling Variables
```typescript
// Time-based polling
export const clock = Variable(GLib.DateTime.new_now_local()).poll(
    1000,
    (): GLib.DateTime => GLib.DateTime.new_now_local(),
);

// Command-based polling
export const uptime = Variable(0).poll(
    60_000,
    'cat /proc/uptime',
    (line): number => Number.parseInt(line.split('.')[0]) / 60,
);
```

## Service to UI Data Flow

### Network Module Data Flow
```
AstalNetwork Service
        ↓
    [Properties]
    ├── primary (WIRED/WIFI)
    ├── state (CONNECTED/DISCONNECTED)
    ├── connectivity (FULL/LIMITED/NONE)
    └── wifi.enabled (boolean)
        ↓
    [Variable Bindings]
    ├── bind(networkService, 'primary')
    ├── bind(networkService, 'state')
    └── bind(networkService, 'connectivity')
        ↓
    [Variable Derivations]
    ├── iconBinding → Determines wired/wifi icon
    ├── labelBinding → Formats network status text
    └── classNameBinding → CSS class for styling
        ↓
    [UI Components]
    ├── <icon className={...} icon={iconBinding()} />
    ├── <label className={...} label={labelBinding()} />
    └── <box className={classNameBinding()}>
        ↓
    [User Interaction]
    ├── Click → Open network menu
    ├── Scroll → Cycle networks
    └── Right-click → Custom action
```

### Audio Module Data Flow
```typescript
// Audio service integration
const wireplumber = AstalWp.get_default() as AstalWp.Wp;
const audioService = wireplumber.audio;

// Volume level binding
const volumeBinding = Variable.derive(
    [bind(audioService.defaultSpeaker, 'volume')],
    (volume) => Math.round(volume * 100)
);

// Mute state binding
const muteBinding = Variable.derive(
    [bind(audioService.defaultSpeaker, 'mute')],
    (muted) => muted
);

// Icon derivation based on volume and mute state
const iconBinding = Variable.derive(
    [volumeBinding, muteBinding],
    (volume, muted) => {
        if (muted) return '󰖁';
        if (volume > 66) return '󰕾';
        if (volume > 33) return '󰖀';
        if (volume > 0) return '󰕿';
        return '󰖁';
    }
);

// OSD integration
const setupOsdBar = (self: LevelBar): void => {
    self.hook(audioService.defaultSpeaker, 'notify::volume', () => {
        self.value = audioService.defaultSpeaker?.volume || 0;
    });

    self.hook(audioService.defaultSpeaker, 'notify::mute', () => {
        self.className = audioService.defaultSpeaker?.mute ? 'muted' : '';
    });
};
```

### Battery Module Data Flow
```typescript
const batteryService = AstalBattery.get_default();

// Battery percentage
const percentageBinding = Variable.derive(
    [bind(batteryService, 'percentage')],
    (percentage) => Math.round(percentage * 100)
);

// Charging state
const chargingBinding = Variable.derive(
    [bind(batteryService, 'charging')],
    (charging) => charging
);

// Battery icon based on level and charging state
const iconBinding = Variable.derive(
    [percentageBinding, chargingBinding],
    (percentage, charging) => {
        if (charging) return '󰂄';
        if (percentage > 90) return '󰁹';
        if (percentage > 80) return '󰂂';
        if (percentage > 70) return '󰂁';
        if (percentage > 60) return '󰂀';
        if (percentage > 50) return '󰁿';
        if (percentage > 40) return '󰁾';
        if (percentage > 30) return '󰁽';
        if (percentage > 20) return '󰁼';
        if (percentage > 10) return '󰁻';
        return '󰁺';
    }
);
```

## Event Propagation System

### GObject Signal System
```typescript
// Direct signal connections
service.connect('signal-name', (service, ...args) => {
    // Handle signal
});

// Property change notifications
service.connect('notify::property-name', () => {
    // Handle property change
});

// Example: Brightness service file monitoring
monitorFile(screenPath, async (f) => {
    const v = await readFileAsync(f);
    this.#screen = Number(v) / this.#screenMax;
    this.notify('screen'); // Triggers notify::screen signal
});
```

### Event Handler Patterns
```typescript
// Primary click handler
export function onPrimaryClick(widget: GtkWidget, handler: (self: GtkWidget, event: Gdk.Event) => void): () => void {
    const id = widget.connect('button-press-event', (self: GtkWidget, event: Gdk.Event) => {
        const eventButton = event.get_button()[1];
        if (eventButton === Gdk.BUTTON_PRIMARY) {
            handler(self, event);
        }
    });
    return () => widget.disconnect(id);
}

// Scroll event handling
export function onScroll(
    widget: GtkWidget,
    throttledHandler: ThrottleFn,
    scrollUpAction: string,
    scrollDownAction: string,
): () => void {
    const id = widget.connect('scroll-event', (self: GtkWidget, event: Gdk.Event) => {
        const [directionSuccess, direction] = event.get_scroll_direction();
        
        if (directionSuccess) {
            if (direction === Gdk.ScrollDirection.UP) {
                throttledHandler(scrollUpAction, { clicked: self, event });
            } else if (direction === Gdk.ScrollDirection.DOWN) {
                throttledHandler(scrollDownAction, { clicked: self, event });
            }
        }
    });

    return () => widget.disconnect(id);
}
```

## Variable Derivation Patterns

### Multi-Source Derivation
```typescript
// Bar layout derivation
const leftBinding = Variable.derive([bind(layouts)], (currentLayouts) => {
    const foundLayout = getLayoutForMonitor(hyprlandMonitor, currentLayouts);
    return foundLayout.left
        .filter((mod) => Object.keys(widgets).includes(mod))
        .map((w) => widgets[w](hyprlandMonitor));
});

// Component styling derivation
const componentClassName = Variable.derive(
    [bind(options.theme.bar.buttons.style), bind(options.bar.network.label)],
    (style, showLabel) => {
        const styleMap = {
            default: 'style1',
            split: 'style2',
            wave: 'style3',
            wave2: 'style3',
        };
        return `network-container ${styleMap[style]} ${!showLabel ? 'no-label' : ''}`;
    },
);
```

### Conditional Derivation
```typescript
// Auto-hide behavior
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

// Weather data derivation
Variable.derive([bind(weatherApiKey), bind(weatherInterval), bind(location)], (weatherKey, weatherInterval, loc) => {
    if (!weatherKey) {
        return globalWeatherVar.set(DEFAULT_WEATHER);
    }
    weatherIntervalFn(weatherInterval, loc, weatherKey);
})();
```

## Signal System

### Service Signal Binding
```typescript
// Brightness service signals
export default class Brightness extends GObject.Object {
    constructor() {
        super();

        monitorFile(screenPath, async (f) => {
            const v = await readFileAsync(f);
            this.#screen = Number(v) / this.#screenMax;
            this.notify('screen'); // Emits notify::screen signal
        });
    }

    set screen(percent: number) {
        sh(`brightnessctl set ${Math.round(percent * 100)}% -d ${screen} -q`).then(() => {
            this.#screen = percent;
            this.notify('screen'); // Emits notify::screen signal
        });
    }
}

// Component signal consumption
const brightnessService = Brightness.get_default();

const setupOsdBar = (self: LevelBar): void => {
    self.hook(brightnessService, 'notify::screen', () => {
        self.value = brightnessService.screen;
    });
};
```

### Wallpaper Service Signals
```typescript
@register({ GTypeName: 'Wallpaper' })
class Wallpaper extends GObject.Object {
    @signal(Boolean)
    declare changed: (event: boolean) => void;

    #wallpaper(): void {
        sh(transitionCmd)
            .then(() => {
                this.notify('wallpaper');
                this.emit('changed', true); // Custom signal emission
            });
    }
}

// Signal consumption
Wallpaper.connect('changed', () => {
    console.info('Wallpaper changed, regenerating Matugen colors...');
    if (options.theme.matugen.get()) {
        resetCss();
    }
});
```

## Complete Data Flow Examples

### CPU Monitoring Flow
```
1. System Data Collection
   └── GTop.glibtop_get_cpu() → Raw CPU data

2. Service Processing
   └── Cpu.calculateUsage() → Percentage calculation

3. Variable Updates
   └── cpuPoller.poll() → Updates cpu Variable

4. UI Binding
   └── Variable.derive([bind(cpuUsage), bind(round)]) → Formatted label

5. Component Rendering
   └── <label label={labelBinding()} /> → Visual display

6. User Interaction
   └── Click handler → Execute configured command
```

### Network Status Flow
```
1. System Events
   └── NetworkManager → Connection state changes

2. AstalNetwork Service
   └── Property updates (primary, state, connectivity)

3. Variable Derivation
   ├── iconBinding → Icon selection logic
   ├── labelBinding → Status text formatting
   └── classNameBinding → CSS class computation

4. Component Updates
   ├── Icon widget → Visual indicator
   ├── Label widget → Status text
   └── Container → Styling application

5. Menu Integration
   └── Click handler → Open network menu with device list
```

### Theme System Flow
```
1. Configuration Changes
   └── options.theme.* → Option value updates

2. SCSS Variable Generation
   └── extractVariables() → SCSS variable strings

3. Compilation Pipeline
   ├── SASS compilation → CSS generation
   └── App.apply_css() → Style application

4. Component Re-styling
   └── CSS classes → Visual updates

5. Hot Reload
   └── File monitoring → Automatic recompilation
```

This reactive data flow architecture ensures that all UI components stay synchronized with system state while maintaining clean separation of concerns and efficient update propagation.

## Module-Specific Data Flows

### Network Module Complete Flow
```
NetworkManager (System)
        ↓
AstalNetwork Service
├── primary: WIRED | WIFI
├── state: CONNECTED | DISCONNECTED
├── connectivity: FULL | LIMITED | NONE
└── wifi.enabled: boolean
        ↓
Network Module (src/components/bar/modules/network/)
├── helpers.ts
│   ├── wiredIcon: Variable<string>
│   ├── wirelessIcon: Variable<string>
│   └── formatWifiInfo()
├── index.tsx
│   ├── iconBinding: Variable.derive()
│   ├── networkLabel: Variable.derive()
│   └── componentClassName: Variable.derive()
        ↓
UI Rendering
├── <icon icon={iconBinding()} />
├── <label label={networkLabel()} />
└── Event handlers (click, scroll)
        ↓
User Actions
├── Primary click → openMenu('networkmenu')
├── Secondary click → Custom command
├── Middle click → Custom command
└── Scroll → Network switching commands
```

### OSD Module Complete Flow
```
System Events (Volume/Brightness Changes)
        ↓
Service Layer
├── AstalWp (Audio) → volume, mute properties
└── Brightness Service → screen, kbd properties
        ↓
OSD Components (src/components/osd/)
├── helpers.ts
│   ├── setupOsdBar() → LevelBar configuration
│   ├── setupOsdIcon() → Icon updates
│   └── setupOsdLabel() → Label updates
├── bar/helpers.ts → Progress bar logic
├── icon/helpers.ts → Icon selection logic
└── label/helpers.ts → Text formatting logic
        ↓
OSD Display Logic
├── Monitor detection → Active monitor selection
├── Timeout management → Auto-hide behavior
├── Animation system → Slide/fade transitions
└── Position calculation → Screen anchoring
        ↓
Visual Output
├── Progress bar → Visual level indicator
├── Icon → Status representation
├── Label → Textual information
└── Container → Positioning and styling
```

### Listener Module Architecture
```
Event Sources
├── Hyprland IPC → Window/workspace events
├── D-Bus Services → System notifications
├── File System → Configuration changes
└── User Input → Keyboard/mouse events
        ↓
Listener Layer (src/lib/behaviors/)
├── autoHide.ts
│   ├── Monitor workspace changes
│   ├── Track window count
│   ├── Handle fullscreen state
│   └── Update bar visibility
├── batteryWarning.ts
│   ├── Monitor battery level
│   ├── Check threshold values
│   └── Send notifications
└── hyprlandRules.ts
    ├── Apply window rules
    ├── Set workspace properties
    └── Configure monitor settings
        ↓
Reactive Updates
├── Variable.derive() chains
├── Signal propagation
└── Component re-rendering
        ↓
System Integration
├── Hyprland commands
├── System notifications
└── Configuration updates
```
