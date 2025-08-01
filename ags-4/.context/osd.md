I'll provide a comprehensive explanation of how the OSD functionality works in this codebase by tracing through the complete execution flow.

## 1. OSD Architecture Overview

The OSD system consists of several key components:
- **Main Window**: `src/components/osd/index.tsx` - The root window container
- **Revealer**: `src/components/osd/OsdRevealer.tsx` - Handles show/hide animations
- **Components**: `OSDBar`, `OSDLabel`, `OSDIcon` - Display elements
- **Helpers**: Coordinate behavior and event handling

## 2. OSD Window Creation and Lifecycle

### Initial Setup
````tsx path=src/components/osd/index.tsx mode=EXCERPT
export default (): JSX.Element => {
    return (
        <window
            monitor={getOsdMonitor()()}
            name={'indicator'}
            namespace={'indicator'}
            className={'indicator'}
            visible={true}
            layer={bind(options.tear).as((tear) => (tear ? Astal.Layer.TOP : Astal.Layer.OVERLAY))}
            anchor={bind(location).as((anchorPoint) => getPosition(anchorPoint))}
            setup={(self) => {
                getOsdMonitor().subscribe(() => {
                    self.set_click_through(true);
                });
            }}
            clickThrough
        >
            <OsdRevealer />
        </window>
    );
};
````

The window is created with:
- Monitor positioning via `getOsdMonitor()`
- Layer positioning (TOP or OVERLAY based on tear setting)
- Anchor positioning from options
- Click-through enabled
- Contains the `OsdRevealer` component

## 3. Monitor Selection Logic

````typescript path=src/components/osd/helpers.ts mode=EXCERPT
export const getOsdMonitor = (): Variable<number> => {
    const gdkMonitorMapper = new GdkMonitorMapper();

    return Variable.derive(
        [bind(hyprlandService, 'focusedMonitor'), bind(monitor), bind(active_monitor)],
        (currentMonitor, defaultMonitor, followMonitor) => {
            gdkMonitorMapper.reset();

            if (followMonitor === true) {
                const gdkMonitor = gdkMonitorMapper.mapHyprlandToGdk(currentMonitor.id);
                return gdkMonitor;
            }

            const gdkMonitor = gdkMonitorMapper.mapHyprlandToGdk(defaultMonitor);
            return gdkMonitor;
        },
    );
};
````

The monitor selection works as follows:
1. **Active Monitor Following**: If `active_monitor` is true, OSD follows the currently focused monitor
2. **Fixed Monitor**: If `active_monitor` is false, OSD displays on the configured default monitor
3. **GDK Mapping**: Converts Hyprland monitor IDs to GDK monitor indices for GTK compatibility

## 4. OSD Revealer Component Structure

````tsx path=src/components/osd/OsdRevealer.tsx mode=EXCERPT
export const OsdRevealer = (): JSX.Element => {
    const osdOrientation = bind(orientation).as((currentOrientation) => currentOrientation === 'vertical');

    return (
        <revealer transitionType={Gtk.RevealerTransitionType.CROSSFADE} revealChild={false} setup={revealerSetup}>
            <box className={'osd-container'} vertical={osdOrientation}>
                {bind(orientation).as((currentOrientation) => {
                    if (currentOrientation === 'vertical') {
                        return <VerticalOsd currentOrientation={currentOrientation} />;
                    }
                    return <HorizontalOsd currentOrientation={currentOrientation} />;
                })}
            </box>
        </revealer>
    );
};
````

The revealer:
- Starts with `revealChild={false}` (hidden)
- Uses `CROSSFADE` transition
- Dynamically switches between vertical/horizontal layouts
- Calls `revealerSetup` to configure event handling

## 5. Event Handling and Trigger Setup

````typescript path=src/components/osd/helpers.ts mode=EXCERPT
export const revealerSetup = (self: Widget.Revealer): void => {
    self.hook(enable, () => {
        handleReveal(self);
    });

    self.hook(brightnessService, 'notify::screen', () => {
        handleReveal(self);
    });

    self.hook(brightnessService, 'notify::kbd', () => {
        handleReveal(self);
    });

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

The setup hooks into multiple events:
1. **OSD Enable/Disable**: When OSD is toggled on/off
2. **Screen Brightness**: `notify::screen` signal from brightness service
3. **Keyboard Brightness**: `notify::kbd` signal from brightness service
4. **Microphone Changes**: Volume and mute status changes
5. **Speaker Changes**: Volume and mute status changes

## 6. Reveal/Hide Timing Mechanism

````typescript path=src/components/osd/helpers.ts mode=EXCERPT
let count = 0;
let isStartingUp = true;
timeout(3000, () => {
    isStartingUp = false;
});

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

The timing mechanism works as follows:

### Startup Prevention
- `isStartingUp` flag prevents OSD from showing during the first 3 seconds
- Prevents unwanted OSD display during application initialization

### Reveal Logic
1. **Guard Checks**: Skip if starting up or OSD disabled
2. **Show OSD**: Set `reveal_child = true` immediately
3. **Increment Counter**: `count++` tracks active reveal requests
4. **Schedule Hide**: After `duration` milliseconds, decrement counter
5. **Hide Condition**: Only hide when `count === 0` (no pending reveals)

### Multiple Event Handling
- If multiple events occur rapidly, each increments `count`
- OSD stays visible until all timeouts expire
- Prevents flickering from rapid consecutive events

## 7. Component Coordination Flow

### OSD Icon Component
````typescript path=src/components/osd/icon/helpers.ts mode=EXCERPT
export const setupOsdIcon = (self: Widget.Label): OSDIcon => {
    self.hook(brightnessService, 'notify::screen', () => {
        self.label = '󱍖';
    });

    self.hook(brightnessService, 'notify::kbd', () => {
        self.label = '󰥻';
    });

    const micVariable = Variable.derive(
        [bind(audioService.defaultMicrophone, 'volume'), bind(audioService.defaultMicrophone, 'mute')],
        () => {
            self.label = audioService.defaultMicrophone.mute ? '󰍭' : '󰍬';
        },
    );

    const speakerVariable = Variable.derive(
        [bind(audioService.defaultSpeaker, 'volume'), bind(audioService.defaultSpeaker, 'mute')],
        () => {
            self.label = audioService.defaultSpeaker.mute ? '󰝟' : '󰕾';
        },
    );

    return { micVariable, speakerVariable };
};
````

### OSD Bar Component
````typescript path=src/components/osd/bar/helpers.ts mode=EXCERPT
export const setupOsdBar = (self: LevelBar): void => {
    self.hook(brightnessService, 'notify::screen', () => {
        self.className = self.className.replace(/\boverflow\b/, '').trim();
        self.value = brightnessService.screen;
    });

    // Similar hooks for kbd, microphone, speaker...
};
````

### OSD Label Component
````typescript path=src/components/osd/label/helpers.ts mode=EXCERPT
export const setupOsdLabel = (self: Widget.Label): void => {
    self.hook(brightnessService, 'notify::screen', () => {
        self.className = self.className.replace(/\boverflow\b/, '').trim();
        self.label = `${Math.round(brightnessService.screen * 100)}`;
    });

    // Similar hooks for other services...
};
````

## 8. Complete Event Flow Example

Let's trace a volume change event:

### Step 1: Volume Change Occurs
- User adjusts volume via hardware keys or software
- WirePlumber audio service detects the change
- `audioService.defaultSpeaker.volume` property changes

### Step 2: Event Propagation
- `Variable.derive` in `revealerSetup` detects the volume change
- Calls `handleReveal(self)` on the revealer

### Step 3: Reveal Logic Execution
```
handleReveal() called:
├── Check isStartingUp (false after 3s)
├── Check enable.get() (must be true)
├── Set reveal_child = true (show OSD)
├── Increment count
└── Schedule timeout(duration.get(), hideCallback)
```

### Step 4: Component Updates
Simultaneously, all OSD components update:
- **Icon**: Updates to speaker icon (muted/unmuted)
- **Bar**: Updates value and overflow styling
- **Label**: Updates percentage text

### Step 5: Hide Logic
- After `duration` milliseconds (default 2500ms)
- Decrement `count`
- If `count === 0`, set `reveal_child = false`

## 9. Service Integration

### Brightness Service
````typescript path=src/services/Brightness.ts mode=EXCERPT
monitorFile(screenPath, async (f) => {
    const v = await readFileAsync(f);
    this.#screen = Number(v) / this.#screenMax;
    this.notify('screen');
});
````

- Monitors `/sys/class/backlight/*/brightness` files
- Emits `notify::screen` and `notify::kbd` signals
- OSD components hook into these signals

### Audio Service (WirePlumber)
- Provides `defaultSpeaker` and `defaultMicrophone` objects
- Properties: `volume`, `mute`, `description`
- OSD hooks into property change notifications

## 10. Styling and Positioning

- **CSS Classes**: Applied via `className` properties
- **Overflow Handling**: Special styling when volume > 100%
- **Orientation**: Dynamic layout switching (vertical/horizontal)
- **Anchoring**: Positioned via `getPosition(anchorPoint)`
- **Layer Management**: TOP layer when tearing, OVERLAY otherwise

This architecture provides a responsive, multi-event OSD system that elegantly handles timing, prevents flickering, and coordinates multiple display components while following the active monitor and respecting user preferences.
