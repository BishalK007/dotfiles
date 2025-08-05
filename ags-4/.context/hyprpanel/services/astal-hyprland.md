# AstalHyprland Service Documentation

## Table of Contents
- [Service Overview](#service-overview)
- [Service Initialization](#service-initialization)
- [Core Properties](#core-properties)
- [Methods and Commands](#methods-and-commands)
- [Signal System](#signal-system)
- [Integration Patterns](#integration-patterns)
- [Workspace Management](#workspace-management)
- [Client Tracking](#client-tracking)
- [Monitor Management](#monitor-management)

## Service Overview

AstalHyprland provides a comprehensive interface to the Hyprland window manager through IPC communication. It manages workspaces, clients (windows), monitors, and system state, serving as the primary bridge between HyprPanel and the Hyprland compositor.

### Key Responsibilities
- **Workspace Management**: Track active workspaces, workspace switching, and workspace-specific data
- **Client Tracking**: Monitor window states, focus changes, fullscreen status, and window properties
- **Monitor Management**: Handle multi-monitor setups, monitor addition/removal, and monitor-specific configurations
- **System Integration**: Execute Hyprland commands, apply window rules, and manage compositor settings

## Service Initialization

### Singleton Pattern
```typescript
import AstalHyprland from 'gi://AstalHyprland?version=0.1';

// Service instance (singleton)
const hyprlandService = AstalHyprland.get_default();
```

### Application Integration
```typescript
// Monitor addition handling
hyprland.connect('monitor-added', () => {
    const { restartCommand } = options.hyprpanel;
    
    if (options.hyprpanel.restartAgs.get()) {
        bash(restartCommand.get());
    }
});
```

## Core Properties

### Workspace Properties
```typescript
// Current workspaces list
hyprlandService.workspaces: AstalHyprland.Workspace[]

// Currently focused workspace
hyprlandService.focusedWorkspace: AstalHyprland.Workspace

// Workspace binding example
Variable.derive([bind(hyprlandService, 'workspaces')], (workspaces) => {
    // Handle workspace changes
    return workspaces.map(ws => ws.id);
});
```

### Client Properties
```typescript
// Currently focused client (window)
hyprlandService.focusedClient: AstalHyprland.Client

// All clients
hyprlandService.clients: AstalHyprland.Client[]

// Client tracking example
Variable.derive([bind(hyprlandService, 'focusedClient')], (client) => {
    if (client) {
        console.log(`Focused: ${client.title} (${client.class})`);
    }
});
```

### Monitor Properties
```typescript
// All monitors
hyprlandService.monitors: AstalHyprland.Monitor[]

// Focused monitor
hyprlandService.focusedMonitor: AstalHyprland.Monitor

// Monitor access methods
const monitors = hyprlandService.get_monitors();
const monitor = hyprlandService.get_monitor(monitorId);
```

## Methods and Commands

### Command Execution
```typescript
// Execute Hyprland dispatcher commands
hyprlandService.dispatch(command: string, args: string): void

// Examples:
hyprlandService.dispatch('workspace', '1');           // Switch to workspace 1
hyprlandService.dispatch('movetoworkspace', '2');     // Move window to workspace 2
hyprlandService.dispatch('fullscreen', '1');          // Toggle fullscreen
hyprlandService.dispatch('killactive', '');           // Close active window
```

### IPC Message System
```typescript
// Send raw IPC messages
hyprlandService.message(command: string): string

// Window rule application
hyprlandService.message(`keyword windowrulev2 float, title:^(hyprpanel-settings)$`);

// Get cursor position
const cursorPosition = hyprlandService.message('cursorpos');
```

### Workspace Methods
```typescript
// Get specific workspace
const workspace = hyprlandService.get_workspace(workspaceId: number): AstalHyprland.Workspace

// Workspace client access
const clients = workspace.get_clients(): AstalHyprland.Client[]
```

## Signal System

### Workspace Signals
```typescript
// Configuration reloaded
hyprlandService.connect('config-reloaded', () => {
    // Reapply window rules or update configuration
    workspaceRules.set(getWorkspaceMonitorMap());
});

// Client events
hyprlandService.connect('client-moved', () => {
    forceUpdater.set(!forceUpdater.get());
});

hyprlandService.connect('client-added', () => {
    forceUpdater.set(!forceUpdater.get());
});

hyprlandService.connect('client-removed', () => {
    forceUpdater.set(!forceUpdater.get());
});
```

### Monitor Signals
```typescript
// Monitor addition/removal
hyprlandService.connect('monitor-added', () => {
    // Handle new monitor
    if (options.hyprpanel.restartAgs.get()) {
        bash(restartCommand.get());
    }
});

hyprlandService.connect('monitor-removed', () => {
    // Handle monitor removal
});
```

### Workspace Change Signals
```typescript
// Workspace switching
hyprlandService.connect('workspace-changed', (service, workspace) => {
    // Handle workspace change
    console.log(`Switched to workspace: ${workspace.id}`);
});

// Focus change signals
hyprlandService.connect('client-focus-changed', (service, client) => {
    // Handle focus change
    updateWindowTitle(client);
});
```

## Integration Patterns

### Auto-Hide Behavior
```typescript
// Monitor workspace changes for auto-hide
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

// Fullscreen detection
Variable.derive([bind(hyprlandService, 'focusedClient')], (currentClient) => {
    handleFullscreenClientVisibility(currentClient);
});
```

### Window Title Tracking
```typescript
// Track focused client title changes
function trackClientUpdates(client: AstalHyprland.Client): void {
    clientBinding?.drop();
    clientBinding = undefined;

    if (!client) {
        return;
    }

    clientBinding = Variable.derive([bind(client, 'title')], (currentTitle) => {
        clientTitle.set(currentTitle);
    });
}

Variable.derive([bind(hyprlandService, 'focusedClient')], (client) => {
    trackClientUpdates(client);
});
```

### Workspace Button Interaction
```typescript
// Workspace switching on click
<button
    className={'workspace-button'}
    onClick={(_, event) => {
        if (isPrimaryClick(event)) {
            hyprlandService.dispatch('workspace', wsId.toString());
        }
    }}
>
    {/* Workspace content */}
</button>
```

## Workspace Management

### Workspace Data Structure
```typescript
interface AstalHyprland.Workspace {
    id: number;
    name: string;
    monitor: AstalHyprland.Monitor;
    windows: number;
    hasfullscreen: boolean;
    lastwindow: string;
    lastwindowtitle: string;
    
    // Methods
    get_clients(): AstalHyprland.Client[];
}
```

### Workspace Rules and Mapping
```typescript
// Monitor-specific workspace mapping
export const workspaceRules = Variable(getWorkspaceMonitorMap());

function getWorkspaceMonitorMap(): WorkspaceMonitorMap {
    const monitors = hyprlandService.get_monitors();
    const workspaceRules: WorkspaceMonitorMap = {};

    monitors.forEach((monitor) => {
        const monitorName = monitor.name;
        const workspaceIds = getWorkspaceIdsForMonitor(monitor);
        workspaceRules[monitorName] = workspaceIds;
    });

    return workspaceRules;
}
```

### Workspace Filtering
```typescript
// Get workspaces for specific monitor
function getWorkspacesToRender(
    totalWorkspaces: number,
    workspaceList: AstalHyprland.Workspace[],
    workspaceMonitorRules: WorkspaceMonitorMap,
    monitor: number,
    isMonitorSpecific: boolean,
    monitorList: AstalHyprland.Monitor[],
): number[] {
    const allWorkspaceIds = range(totalWorkspaces, 1);
    const activeWorkspaceIds = workspaceList.map((ws) => ws.id);
    const combinedWorkspaceIds = [...new Set([...allWorkspaceIds, ...activeWorkspaceIds])];

    if (!isMonitorSpecific) {
        return combinedWorkspaceIds.sort((a, b) => a - b);
    }

    // Filter by monitor-specific rules
    const monitorName = monitorList[monitor]?.name;
    if (!monitorName || !workspaceMonitorRules[monitorName]) {
        return combinedWorkspaceIds.sort((a, b) => a - b);
    }

    return combinedWorkspaceIds
        .filter((id) => workspaceMonitorRules[monitorName].includes(id))
        .sort((a, b) => a - b);
}
```

## Client Tracking

### Client Data Structure
```typescript
interface AstalHyprland.Client {
    address: string;
    mapped: boolean;
    hidden: boolean;
    at: [number, number];
    size: [number, number];
    workspace: AstalHyprland.Workspace;
    floating: boolean;
    monitor: AstalHyprland.Monitor;
    class: string;
    title: string;
    initialClass: string;
    initialTitle: string;
    pid: number;
    xwayland: boolean;
    pinned: boolean;
    fullscreen: boolean;
    fullscreenMode: number;
    fakeFullscreen: boolean;
    grouped: AstalHyprland.Client[];
    swallowing: string;
    focusHistoryID: number;
}
```

### Fullscreen State Handling
```typescript
function handleFullscreenClientVisibility(client: AstalHyprland.Client): void {
    if (!client) {
        return;
    }

    const fullscreenBinding = bind(client, 'fullscreen');

    Variable.derive([bind(fullscreenBinding)], (isFullScreen) => {
        if (autoHide.get() === 'fullscreen') {
            setBarVisibility(client.monitor.id, !isFullScreen);
        }
    });
}
```

### Window Count Tracking
```typescript
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
```

## Monitor Management

### Monitor Data Structure
```typescript
interface AstalHyprland.Monitor {
    id: number;
    name: string;
    description: string;
    make: string;
    model: string;
    serial: string;
    width: number;
    height: number;
    refreshRate: number;
    x: number;
    y: number;
    activeWorkspace: AstalHyprland.Workspace;
    specialWorkspace: AstalHyprland.Workspace;
    reserved: [number, number, number, number];
    scale: number;
    transform: number;
    focused: boolean;
    dpmsStatus: boolean;
    vrr: boolean;
}
```

### Multi-Monitor Bar Creation
```typescript
// Create bars for all monitors
export async function forMonitors(widget: (monitor: number) => Promise<JSX.Element>): Promise<JSX.Element[]> {
    const n = Gdk.Display.get_default()?.get_n_monitors() || 1;
    return Promise.all(range(n, 0).map(widget));
}

// Monitor-specific bar configuration
export const Bar = async (monitor: number): Promise<JSX.Element> => {
    const gdkMonitorMapper = new GdkMonitorMapper();
    const hyprlandMonitor = gdkMonitorMapper.getHyprlandMonitor(monitor);
    
    // Use hyprlandMonitor for monitor-specific logic
    return (
        <window
            name={`bar-${hyprlandMonitor}`}
            namespace={`bar-${hyprlandMonitor}`}
            monitor={monitor}
        >
            {/* Bar content */}
        </window>
    );
};
```

This comprehensive integration with AstalHyprland enables HyprPanel to provide seamless window manager integration, responsive workspace management, and intelligent bar behavior based on window states and user interactions.
