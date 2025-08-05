# From HyprPanel
# Technical Report: Event-Driven Architecture for OSD Triggers

## 1. Event Source Analysis

### 1.1 Screen Brightness Monitoring

````typescript path=src/services/Brightness.ts mode=EXCERPT
const screen = exec(`bash -c "ls -w1 /sys/class/backlight | head -1"`);

constructor() {
    super();
    
    const screenPath = `/sys/class/backlight/${screen}/brightness`;
    
    monitorFile(screenPath, async (f) => {
        const v = await readFileAsync(f);
        this.#screen = Number(v) / this.#screenMax;
        this.notify('screen');
    });
}
````

**Technical Details:**
- **File Path**: `/sys/class/backlight/[device]/brightness`
- **Detection Method**: `monitorFile()` uses inotify to watch file changes
- **Processing**: Raw brightness value normalized by maximum brightness
- **Signal Emission**: `this.notify('screen')` triggers GObject signal

### 1.2 Keyboard Backlight Monitoring

````typescript path=src/services/Brightness.ts mode=EXCERPT
const kbd = exec(`bash -c "ls -w1 /sys/class/leds | grep '::kbd_backlight$' | head -1"`);

constructor() {
    const kbdPath = `/sys/class/leds/${kbd}/brightness`;
    
    monitorFile(kbdPath, async (f) => {
        const v = await readFileAsync(f);
        this.#kbd = Number(v) / this.#kbdMax;
        this.notify('kbd');
    });
}
````

**Technical Details:**
- **File Path**: `/sys/class/leds/[device]::kbd_backlight/brightness`
- **Device Discovery**: Searches for LED devices with `::kbd_backlight` suffix
- **Normalization**: Value divided by maximum keyboard brightness
- **Signal**: `notify::kbd` for keyboard-specific events

### 1.3 Audio Volume and Mute Detection

````typescript path=src/components/osd/helpers.ts mode=EXCERPT
const wireplumber = AstalWp.get_default() as AstalWp.Wp;
const audioService = wireplumber.audio;

Variable.derive(
    [bind(audioService.defaultMicrophone, 'volume'), bind(audioService.defaultMicrophone, 'mute')],
    () => {
        handleReveal(self);
    },
);

Variable.derive([bind(audioService.defaultSpeaker, 'volume'), bind(audioService.defaultSpeaker, 'mute')], () => {
    handleReveal(self);
});
````

**Technical Details:**
- **Service**: WirePlumber (PipeWire session manager)
- **Properties Monitored**: `volume` and `mute` on default devices
- **Binding Method**: `bind()` creates reactive property connections
- **Device Types**: Separate monitoring for speakers and microphones

## 2. Service Integration Architecture

### 2.1 Brightness Service Implementation

````typescript path=src/services/Brightness.ts mode=EXCERPT
@register({ GTypeName: 'Brightness' })
export default class Brightness extends GObject.Object {
    static instance: Brightness;
    
    static get_default(): Brightness {
        if (!Brightness.instance) {
            Brightness.instance = new Brightness();
        }
        return Brightness.instance;
    }

    #kbdMax = kbd?.length ? get(`--device ${kbd} max`) : 0;
    #kbd = kbd?.length ? get(`--device ${kbd} get`) : 0;
    #screenMax = screen?.length ? get(`--device ${screen} max`) : 0;
    #screen = screen?.length ? get(`--device ${screen} get`) / (get(`--device ${screen} max`) || 1) : 0;

    @property(Number)
    get screen(): number {
        return this.#screen;
    }

    @property(Number)
    get kbd(): number {
        return this.#kbd;
    }
````

**Architecture Features:**
- **Singleton Pattern**: Single instance via `get_default()`
- **GObject Integration**: Extends `GObject.Object` for signal system
- **Property Decorators**: `@property(Number)` creates bindable properties
- **Device Detection**: Runtime discovery of brightness devices
- **Initialization**: Uses `brightnessctl` for initial values

### 2.2 WirePlumber Audio Service Integration

**Service Access Pattern:**
```typescript
const wireplumber = AstalWp.get_default() as AstalWp.Wp;
const audioService = wireplumber.audio;
```

**Key Properties:**
- `audioService.defaultSpeaker.volume`: Speaker volume (0.0-1.0+)
- `audioService.defaultSpeaker.mute`: Speaker mute state (boolean)
- `audioService.defaultMicrophone.volume`: Microphone volume
- `audioService.defaultMicrophone.mute`: Microphone mute state

## 3. Event Propagation Chain

### 3.1 Complete Event Flow Diagram

```
Hardware/Software Change
         ↓
System File Update (/sys/class/backlight/*/brightness)
         ↓
inotify Event (monitorFile callback)
         ↓
Service Property Update (#screen, #kbd)
         ↓
GObject Signal Emission (notify::screen, notify::kbd)
         ↓
Event Handler Binding (.hook() method)
         ↓
handleReveal() Function Call
         ↓
OSD Component Updates (Icon, Bar, Label)
         ↓
Visual Display Update
```

### 3.2 Brightness Event Propagation

````typescript path=src/services/Brightness.ts mode=EXCERPT
monitorFile(screenPath, async (f) => {
    const v = await readFileAsync(f);           // 1. Read new value
    this.#screen = Number(v) / this.#screenMax; // 2. Update internal state
    this.notify('screen');                      // 3. Emit GObject signal
});
````

````typescript path=src/components/osd/helpers.ts mode=EXCERPT
self.hook(brightnessService, 'notify::screen', () => {  // 4. Signal handler
    handleReveal(self);                                  // 5. Trigger OSD
});
````

### 3.3 Audio Event Propagation

````typescript path=src/components/osd/helpers.ts mode=EXCERPT
Variable.derive(
    [bind(audioService.defaultSpeaker, 'volume'), bind(audioService.defaultSpeaker, 'mute')],
    () => {                                    // 1. Property change detected
        handleReveal(self);                    // 2. Trigger OSD immediately
    },
);
````

## 4. Technical Implementation Details

### 4.1 File Monitoring Mechanisms

**System Files Monitored:**
- `/sys/class/backlight/[device]/brightness` - Screen brightness
- `/sys/class/leds/[device]::kbd_backlight/brightness` - Keyboard backlight

**Monitoring Implementation:**
```typescript
monitorFile(screenPath, async (f) => {
    const v = await readFileAsync(f);
    // Process and emit signal
});
```

**Technical Features:**
- **Asynchronous**: Uses `async/await` for file operations
- **inotify-based**: Efficient kernel-level file change detection
- **Error Handling**: Graceful handling of missing devices
- **Automatic Cleanup**: File watchers managed by framework

### 4.2 Signal/Event Binding Patterns

**GObject Signal Binding:**
````typescript path=src/components/osd/helpers.ts mode=EXCERPT
self.hook(brightnessService, 'notify::screen', () => {
    handleReveal(self);
});
````

**Property Binding with Variable.derive:**
````typescript path=src/components/osd/helpers.ts mode=EXCERPT
Variable.derive(
    [bind(audioService.defaultMicrophone, 'volume'), bind(audioService.defaultMicrophone, 'mute')],
    () => {
        handleReveal(self);
    },
);
````

**Binding Patterns:**
- **Direct Signal Hooks**: `.hook(service, 'signal', callback)`
- **Property Binding**: `bind(object, 'property')`
- **Derived Variables**: `Variable.derive([bindings], callback)`
- **Automatic Cleanup**: Bindings cleaned up when widgets destroyed

### 4.3 Notification Signal System

**GObject Signal Names:**
- `notify::screen` - Screen brightness changed
- `notify::kbd` - Keyboard brightness changed
- `notify::volume` - Audio volume changed (implicit via property binding)
- `notify::mute` - Audio mute status changed (implicit via property binding)

**Signal Emission Pattern:**
```typescript
this.notify('screen');  // Emits 'notify::screen' signal
```

### 4.4 Variable.derive() Coordination

````typescript path=src/components/osd/helpers.ts mode=EXCERPT
Variable.derive(
    [bind(audioService.defaultSpeaker, 'volume'), bind(audioService.defaultSpeaker, 'mute')],
    () => {
        handleReveal(self);
    },
);
````

**Coordination Features:**
- **Multi-Property Watching**: Single callback for multiple properties
- **Automatic Dependency Tracking**: Framework manages property subscriptions
- **Efficient Updates**: Callback only fired when dependencies change
- **Memory Management**: Automatic cleanup of derived variables

## 5. Automatic Triggering Logic

### 5.1 revealerSetup() Coordination

````typescript path=src/components/osd/helpers.ts mode=EXCERPT
export const revealerSetup = (self: Widget.Revealer): void => {
    // Enable/disable hook
    self.hook(enable, () => {
        handleReveal(self);
    });

    // Brightness hooks
    self.hook(brightnessService, 'notify::screen', () => {
        handleReveal(self);
    });

    self.hook(brightnessService, 'notify::kbd', () => {
        handleReveal(self);
    });

    // Audio hooks
    Variable.derive(
        [bind(audioService.defaultMicrophone, 'volume'), bind(audioService.defaultMicrophone, 'mute')],
        () => {
            handleReveal(self);
        },
    );

    Variable.derive([bind(audioService.defaultSpeaker, 'volume'), bind(audioService.defaultSpeaker, 'mute')], () => {
        handleReveal(self);
    });
};
````

### 5.2 Unified Event Handling

**Central Handler Function:**
````typescript path=src/components/osd/helpers.ts mode=EXCERPT
export const handleReveal = (self: Widget.Revealer): void => {
    if (isStartingUp) {
        return;
    }

    if (!enable.get()) {
        return;
    }

    self.reveal_child = true;

    count++;
    timeout(duration.get(), () => {
        count--;

        if (count === 0) {
            self.reveal_child = false;
        }
    });
};
````

**Coordination Logic:**
- **Single Entry Point**: All events funnel through `handleReveal()`
- **State Guards**: Prevents unwanted triggers during startup or when disabled
- **Reference Counting**: `count` variable prevents premature hiding
- **Timeout Management**: Automatic hiding after configured duration

## 6. Asynchronous Event Handling Patterns

### 6.1 File Monitoring Async Pattern

```typescript
monitorFile(screenPath, async (f) => {
    const v = await readFileAsync(f);           // Async file read
    this.#screen = Number(v) / this.#screenMax; // Sync processing
    this.notify('screen');                      // Sync signal emission
});
```

### 6.2 Property Change Reactivity

```typescript
Variable.derive([bind(audioService.defaultSpeaker, 'volume')], () => {
    // Immediate synchronous callback
    handleReveal(self);
});
```

### 6.3 Timeout-Based Hide Logic

```typescript
timeout(duration.get(), () => {
    count--;
    if (count === 0) {
        self.reveal_child = false;
    }
});****
```

**Async Characteristics:**
- **Non-blocking**: File operations don't block UI thread
- **Event-driven**: Reactive to system changes
- **Debounced**: Multiple rapid events handled gracefully
- **Cleanup**: Automatic resource management

This event-driven architecture provides a robust, efficient system for automatically triggering OSD displays based on real-time system changes, with proper coordination between multiple event sources and graceful handling of edge cases.
****