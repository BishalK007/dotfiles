# Service Layer Architecture

## Table of Contents
- [Service Overview](#service-overview)
- [Custom Services](#custom-services)
- [External Astal Services](#external-astal-services)
- [Service Integration Patterns](#service-integration-patterns)
- [Event System](#event-system)
- [Polling Architecture](#polling-architecture)
- [Service Lifecycle](#service-lifecycle)

## Service Overview

HyprPanel's service layer consists of two main categories:
1. **Custom Services**: Application-specific services for system monitoring and functionality
2. **External Astal Services**: GObject-based bindings to system services

### Service Architecture
```
Service Layer
├── Custom Services
│   ├── Brightness (Screen/Keyboard)
│   ├── System Monitoring
│   │   ├── CPU Usage
│   │   ├── RAM Usage  
│   │   ├── GPU Usage
│   │   └── Storage Usage
│   ├── Wallpaper Management
│   └── Matugen (Theme Generation)
├── External Astal Services
│   ├── AstalHyprland (Window Manager)
│   ├── AstalNetwork (Network Management)
│   ├── AstalBluetooth (Bluetooth)
│   ├── AstalWp (Audio via WirePlumber)
│   ├── AstalBattery (Power Management)
│   ├── AstalNotifd (Notifications)
│   └── AstalApps (Application Launcher)
└── Service Integration
    ├── Signal Binding
    ├── Variable Derivation
    └── Event Propagation
```

## Custom Services

### Brightness Service

The Brightness service manages screen and keyboard backlight control using `brightnessctl`.

```typescript
@register({ GTypeName: 'Brightness' })
export default class Brightness extends GObject.Object {
    static instance: Brightness;
    
    static get_default(): Brightness {
        if (!Brightness.instance) {
            Brightness.instance = new Brightness();
        }
        return Brightness.instance;
    }

    // Private properties
    #kbdMax = kbd?.length ? get(`--device ${kbd} max`) : 0;
    #kbd = kbd?.length ? get(`--device ${kbd} get`) : 0;
    #screenMax = screen?.length ? get(`--device ${screen} max`) : 0;
    #screen = screen?.length ? get(`--device ${screen} get`) / (get(`--device ${screen} max`) || 1) : 0;

    @property(Number)
    get kbd(): number { return this.#kbd; }

    @property(Number)  
    get screen(): number { return this.#screen; }

    set screen(percent: number) {
        if (!screen?.length) return;
        if (percent < 0) percent = 0;
        if (percent > 1) percent = 1;

        sh(`brightnessctl set ${Math.round(percent * 100)}% -d ${screen} -q`).then(() => {
            this.#screen = percent;
            this.notify('screen');
        });
    }
}
```

#### File System Monitoring
```typescript
constructor() {
    super();
    
    const screenPath = `/sys/class/backlight/${screen}/brightness`;
    const kbdPath = `/sys/class/leds/${kbd}/brightness`;

    monitorFile(screenPath, async (f) => {
        const v = await readFileAsync(f);
        this.#screen = Number(v) / this.#screenMax;
        this.notify('screen');
    });

    monitorFile(kbdPath, async (f) => {
        const v = await readFileAsync(f);
        this.#kbd = Number(v) / this.#kbdMax;
        this.notify('kbd');
    });
}
```

### System Monitoring Services

#### CPU Service
```typescript
class Cpu {
    private updateFrequency = Variable(2000);
    private previousCpuData = new GTop.glibtop_cpu();
    private cpuPoller: FunctionPoller<number, []>;
    public cpu = Variable(0);

    constructor() {
        GTop.glibtop_get_cpu(this.previousCpuData);
        this.calculateUsage = this.calculateUsage.bind(this);
        this.cpuPoller = new FunctionPoller<number, []>(
            this.cpu, 
            [], 
            bind(this.updateFrequency), 
            this.calculateUsage
        );
        this.cpuPoller.initialize();
    }

    private calculateUsage(): number {
        const currentCpuData = new GTop.glibtop_cpu();
        GTop.glibtop_get_cpu(currentCpuData);

        const totalDiff = currentCpuData.total - this.previousCpuData.total;
        const idleDiff = currentCpuData.idle - this.previousCpuData.idle;
        
        this.previousCpuData = currentCpuData;
        
        return totalDiff > 0 ? ((totalDiff - idleDiff) / totalDiff) * 100 : 0;
    }
}
```

#### RAM Service
```typescript
class Ram {
    private updateFrequency = Variable(2000);
    private ramPoller: FunctionPoller<GenericResourceData, []>;
    public ram = Variable<GenericResourceData>({ total: 0, used: 0, percentage: 0, free: 0 });

    private calculateUsage(): GenericResourceData {
        const memInfo = new GTop.glibtop_mem();
        GTop.glibtop_get_mem(memInfo);

        const total = memInfo.total;
        const used = memInfo.used;
        const free = memInfo.free;
        const percentage = (used / total) * 100;

        return { total, used, free, percentage };
    }
}
```

#### GPU Service
```typescript
class Gpu {
    private updateFrequency = Variable(2000);
    private gpuPoller: FunctionPoller<number, []>;
    public gpuUsage = Variable<number>(0);

    private calculateUsage(): number {
        try {
            // NVIDIA GPU usage via nvidia-smi
            const output = exec('nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits');
            return parseInt(output.trim()) || 0;
        } catch {
            try {
                // AMD GPU usage via radeontop
                const output = exec('radeontop -d - -l 1');
                const match = output.match(/gpu (\d+)%/);
                return match ? parseInt(match[1]) : 0;
            } catch {
                return 0;
            }
        }
    }
}
```

### Wallpaper Service

```typescript
@register({ GTypeName: 'Wallpaper' })
class Wallpaper extends GObject.Object {
    #blockMonitor = false;
    #isRunning = false;

    @property(String)
    declare wallpaper: string;

    @signal(Boolean)
    declare changed: (event: boolean) => void;

    #wallpaper(): void {
        if (!dependencies('swww')) return;

        try {
            const cursorPosition = hyprlandService.message('cursorpos');
            const transitionCmd = [
                'swww', 'img', '--invert-y',
                '--transition-type', 'grow',
                '--transition-duration', '1.5',
                '--transition-fps', '60',
                '--transition-pos', cursorPosition.replace(' ', ''),
                WP
            ].join(' ');

            sh(transitionCmd)
                .then(() => {
                    this.notify('wallpaper');
                    this.emit('changed', true);
                })
                .catch((err) => console.error('Error setting wallpaper:', err));
        } catch (err) {
            console.error('Error getting cursor position:', err);
        }
    }

    async setWallpaper(path: string): Promise<void> {
        this.#blockMonitor = true;
        try {
            await sh(`cp ${path} ${WP}`);
            this.#wallpaper();
        } finally {
            this.#blockMonitor = false;
        }
    }
}
```

### Matugen Service (Theme Generation)

```typescript
export async function generateMatugenColors(): Promise<MatugenColors | undefined> {
    if (!matugen.get() || !dependencies('matugen')) {
        return;
    }
    
    const wallpaperPath = options.wallpaper.image.get();

    try {
        if (!wallpaperPath.length || !isAnImage(wallpaperPath)) {
            Notify({
                summary: 'Matugen Failed',
                body: "Please select a wallpaper in 'Theming > General' first.",
                iconName: icons.ui.warning,
            });
            return;
        }

        const normalizedContrast = contrast.get() > 1 ? 1 : contrast.get() < -1 ? -1 : contrast.get();
        const contents = await bash(
            `matugen image --dry-run -q ${wallpaperPath} -t scheme-${scheme_type.get()} --contrast ${normalizedContrast} --json hex`,
        );
        
        await bash(`matugen image -q ${wallpaperPath} -t scheme-${scheme_type.get()} --contrast ${normalizedContrast}`);

        return JSON.parse(contents).colors[options.theme.matugen_settings.mode.get()];
    } catch (error) {
        console.error(`An error occurred while generating matugen colors: ${error}`);
        return;
    }
}
```

## External Astal Services

### Service Initialization
```typescript
// Core service instances
const networkService = AstalNetwork.get_default();
const bluetoothService = AstalBluetooth.get_default();
const wireplumber = AstalWp.get_default() as AstalWp.Wp;
const audioService = wireplumber.audio;
const batteryService = AstalBattery.get_default();
const hyprlandService = AstalHyprland.get_default();
const notifdService = AstalNotifd.get_default();
```

### Network Service Integration
```typescript
const iconBinding = Variable.derive(
    [bind(networkService, 'primary'), bind(wiredIcon), bind(wirelessIcon)],
    (primaryNetwork, wiredIcon, wifiIcon) => {
        return primaryNetwork === AstalNetwork.Primary.WIRED ? wiredIcon : wifiIcon;
    },
);

const networkLabel = Variable.derive(
    [
        bind(networkService, 'primary'),
        bind(networkService, 'state'),
        bind(networkService, 'connectivity'),
        ...(networkService.wifi ? [bind(networkService.wifi, 'enabled')] : []),
    ],
    (primaryNetwork, state, connectivity) => {
        // Network status logic
    },
);
```

### Audio Service Integration
```typescript
// Volume control
const setupOsdBar = (self: LevelBar): void => {
    self.hook(audioService.defaultSpeaker, 'notify::volume', () => {
        self.value = audioService.defaultSpeaker?.volume || 0;
    });

    self.hook(audioService.defaultSpeaker, 'notify::mute', () => {
        self.className = audioService.defaultSpeaker?.mute ? 'muted' : '';
    });
};
```

## Service Integration Patterns

### Variable Derivation Pattern
```typescript
const componentState = Variable.derive(
    [
        bind(service, 'property1'),
        bind(service, 'property2'),
        bind(options.someOption),
    ],
    (prop1, prop2, option) => {
        // Compute derived state
        return computeState(prop1, prop2, option);
    },
);
```

### Signal Connection Pattern
```typescript
// Direct signal connection
service.connect('signal-name', (service, ...args) => {
    // Handle signal
});

// Property notification
service.connect('notify::property-name', () => {
    // Handle property change
});
```

## Polling Architecture

### FunctionPoller Implementation
```typescript
class FunctionPoller<T, Args extends unknown[]> {
    constructor(
        private variable: Variable<T>,
        private args: Args,
        private interval: Variable<number>,
        private pollingFunction: (...args: Args) => T,
    ) {}

    initialize(name?: string): void {
        const poll = () => {
            try {
                const result = this.pollingFunction(...this.args);
                this.variable.set(result);
            } catch (error) {
                console.error(`Polling error in ${name}:`, error);
            }
        };

        // Initial poll
        poll();

        // Setup interval polling
        this.interval.subscribe((interval) => {
            if (this.timeoutId) {
                clearInterval(this.timeoutId);
            }
            this.timeoutId = setInterval(poll, interval);
        });
    }
}
```

### Service Poller Initialization
```typescript
export const initializePollers = (
    cpuService: Cpu,
    ramService: Ram, 
    gpuService: Gpu,
    storageService: Storage
): void => {
    // Services automatically start polling in their constructors
    // This function can be used for additional setup if needed
};
```

## Service Lifecycle

### Service Creation Flow
```
1. Service Instantiation
   ├── Constructor execution
   ├── Property initialization
   └── Signal setup

2. Polling Setup (for monitoring services)
   ├── FunctionPoller creation
   ├── Initial data fetch
   └── Interval establishment

3. Integration
   ├── Variable binding
   ├── Component connection
   └── Event propagation

4. Cleanup (on component destroy)
   ├── Signal disconnection
   ├── Poller termination
   └── Resource cleanup
```

### Memory Management
```typescript
// Component cleanup pattern
onDestroy={() => {
    // Drop variable bindings
    iconBinding.drop();
    networkLabel.drop();
    
    // Stop pollers
    cpuPoller.stop();
    
    // Disconnect signals
    service.disconnect(signalId);
}}
```

This service layer provides a robust foundation for system integration, real-time monitoring, and reactive UI updates throughout HyprPanel.
