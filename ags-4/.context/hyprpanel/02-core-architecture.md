# Core Architecture

## Table of Contents
- [Application Entry Point](#application-entry-point)
- [Initialization Flow](#initialization-flow)
- [Main Application Structure](#main-application-structure)
- [Component Lifecycle](#component-lifecycle)
- [Monitor Management](#monitor-management)
- [Event System](#event-system)
- [CLI Integration](#cli-integration)

## Application Entry Point

The application starts in `app.ts`, which serves as the main orchestrator for all system components.

### Import Structure
```typescript
// Session and styling
import './src/lib/session';
import './src/scss/style';

// Global utilities and state
import './src/globals/useTheme';
import './src/globals/wallpaper';
import './src/globals/systray';
import './src/globals/dropdown';
import './src/globals/utilities';

// Side effects and behaviors
import './src/components/bar/utils/sideEffects';

// Core services
import AstalHyprland from 'gi://AstalHyprland?version=0.1';
const hyprland = AstalHyprland.get_default();

// Main components
import { Bar } from './src/components/bar';
import { DropdownMenus, StandardWindows } from './src/components/menus/exports';
import Notifications from './src/components/notifications';
import SettingsDialog from './src/components/settings/index';
import OSD from 'src/components/osd/index';
```

## Initialization Flow

### Startup Sequence
```
1. Import Dependencies & Side Effects
   ├── Session management
   ├── SCSS compilation and hot reload
   ├── Global state initialization
   └── Service bindings

2. App.start() Execution
   ├── Instance name: 'hyprpanel'
   ├── CLI request handler setup
   └── Main initialization function

3. Main Initialization (async)
   ├── Startup scripts (Python bluetooth script)
   ├── Notifications system
   ├── OSD system
   ├── Bar creation for all monitors
   ├── Settings dialog
   ├── Menu initialization
   └── System behaviors

4. Monitor Event Handling
   └── Dynamic monitor addition/removal
```

### Detailed Initialization Code
```typescript
App.start({
    instanceName: 'hyprpanel',
    requestHandler(request: string, res: (response: unknown) => void) {
        runCLI(request, res);
    },
    async main() {
        // 1. Initialize startup scripts
        initializeStartupScripts();

        // 2. Core UI components
        Notifications();
        OSD();

        // 3. Multi-monitor bar setup
        const barsForMonitors = await forMonitors(Bar);
        barsForMonitors.forEach((bar: JSX.Element) => bar);

        // 4. Additional UI
        SettingsDialog();
        initializeMenus();

        // 5. System behaviors
        initializeSystemBehaviors();
    },
});
```

## Main Application Structure

### Component Hierarchy
```
App (Astal Application)
├── Bars (Per Monitor)
│   ├── Left Modules
│   ├── Center Modules
│   └── Right Modules
├── Dropdown Menus
│   ├── Audio Menu
│   ├── Network Menu
│   ├── Bluetooth Menu
│   ├── Media Menu
│   ├── Notifications Menu
│   ├── Calendar Menu
│   ├── Energy Menu
│   ├── Dashboard Menu
│   └── Power Dropdown
├── Standard Windows
│   ├── Power Menu
│   └── Verification Dialog
├── Notifications System
├── OSD System
└── Settings Dialog
```

### Menu Initialization Process
```typescript
const initializeMenus = (): void => {
    // Create standard windows (non-dropdown)
    StandardWindows.forEach((window) => {
        return window();
    });

    // Create dropdown menus
    DropdownMenus.forEach((window) => {
        return window();
    });

    // Setup dropdown menu behaviors
    DropdownMenus.forEach((window) => {
        const windowName = window.name.replace('_default', '').concat('menu').toLowerCase();

        if (!isDropdownMenu(windowName)) {
            return;
        }

        handleRealization(windowName);
    });
};
```

## Component Lifecycle

### Bar Component Lifecycle
```typescript
export const Bar = async (monitor: number): Promise<JSX.Element> => {
    // 1. Monitor mapping
    const gdkMonitorMapper = new GdkMonitorMapper();
    const hyprlandMonitor = gdkMonitorMapper.getHyprlandMonitor(monitor);

    // 2. Layout computation
    const leftBinding = Variable.derive([bind(layouts)], (currentLayouts) => {
        const foundLayout = getLayoutForMonitor(hyprlandMonitor, currentLayouts);
        return foundLayout.left
            .filter((mod) => Object.keys(widgets).includes(mod))
            .map((w) => widgets[w](hyprlandMonitor));
    });

    // 3. Component creation
    return (
        <window
            name={`bar-${hyprlandMonitor}`}
            namespace={`bar-${hyprlandMonitor}`}
            monitor={monitor}
            onDestroy={() => {
                // Cleanup bindings
                leftBinding.drop();
                middleBinding.drop();
                rightBinding.drop();
            }}
        >
            {/* Bar content */}
        </window>
    );
};
```

### Widget Container Pattern
```typescript
export const WidgetContainer = (child: BarBoxChild): JSX.Element => {
    const buttonClassName = bind(options.theme.bar.buttons.style).as((style) => {
        const styleMap = {
            default: 'style1',
            split: 'style2',
            wave: 'style3',
            wave2: 'style4',
        };
        return `bar_item_box_visible ${styleMap[style]} ${child.boxClass}`;
    });

    if (child.isBox) {
        return (
            <eventbox visible={computeVisible(child)} {...child.props}>
                <box className={buttonClassName}>{child.component}</box>
            </eventbox>
        );
    }

    return (
        <button className={buttonClassName} visible={computeVisible(child)} {...child.props}>
            {child.component}
        </button>
    );
};
```

## Monitor Management

### Multi-Monitor Support
```typescript
export async function forMonitors(widget: (monitor: number) => Promise<JSX.Element>): Promise<JSX.Element[]> {
    const n = Gdk.Display.get_default()?.get_n_monitors() || 1;
    return Promise.all(range(n, 0).map(widget));
}
```

### Monitor Event Handling
```typescript
hyprland.connect('monitor-added', () => {
    const { restartCommand } = options.hyprpanel;

    if (options.hyprpanel.restartAgs.get()) {
        bash(restartCommand.get());
    }
});
```

### GDK Monitor Mapping
The `GdkMonitorMapper` class handles the translation between GDK monitor indices and Hyprland monitor names, ensuring proper bar placement across different monitor configurations.

## Event System

### Signal Connections
HyprPanel uses GObject signals for reactive programming:

```typescript
// Service signal binding
const iconBinding = Variable.derive(
    [bind(networkService, 'primary'), bind(wiredIcon), bind(wirelessIcon)],
    (primaryNetwork, wiredIcon, wifiIcon) => {
        return primaryNetwork === AstalNetwork.Primary.WIRED ? wiredIcon : wifiIcon;
    },
);

// Component cleanup
onDestroy={() => {
    iconBinding.drop();
    networkLabel.drop();
    componentClassName.drop();
}}
```

### Variable System
Astal's Variable system provides reactive state management:

```typescript
// Derived variables
const componentClassName = Variable.derive(
    [bind(options.theme.bar.buttons.style), bind(options.bar.network.label)],
    (style, showLabel) => {
        const styleMap = { /* ... */ };
        return `network-container ${styleMap[style]} ${!showLabel ? 'no-label' : ''}`;
    },
);
```

## CLI Integration

### Request Handler
```typescript
App.start({
    requestHandler(request: string, res: (response: unknown) => void) {
        runCLI(request, res);
    },
    // ...
});
```

### Command System
The CLI system supports various commands for:
- Appearance management
- Utility functions  
- Window management
- Configuration changes

### Command Registry
```typescript
const registry = new CommandRegistry();
initializeCommands(registry);

const parser = new CommandParser(registry);
const handler = new RequestHandler(parser);

export function runCLI(input: string, response: ResponseCallback): void {
    handler.initializeRequestHandler(input, response).catch((err) => {
        response({ error: err instanceof Error ? err.message : String(err) });
    });
}
```

This architecture provides a solid foundation for the modular, reactive, and extensible nature of HyprPanel.
