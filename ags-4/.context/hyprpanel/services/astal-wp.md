# AstalWp (WirePlumber) Service Documentation

## Table of Contents
- [Service Overview](#service-overview)
- [Service Initialization](#service-initialization)
- [Core Properties](#core-properties)
- [Audio Device Management](#audio-device-management)
- [Volume Control](#volume-control)
- [Signal System](#signal-system)
- [Integration Patterns](#integration-patterns)
- [OSD Integration](#osd-integration)
- [Audio Menu Implementation](#audio-menu-implementation)

## Service Overview

AstalWp provides a comprehensive interface to WirePlumber, the PipeWire session manager, handling all audio operations in HyprPanel. It manages audio devices, volume control, device switching, and provides real-time audio state monitoring.

### Key Responsibilities
- **Device Management**: Enumerate and manage audio input/output devices
- **Volume Control**: Handle volume levels, mute states, and volume limits
- **Device Switching**: Switch between different audio devices (speakers, headphones, microphones)
- **Real-time Monitoring**: Track audio state changes and device availability
- **OSD Integration**: Provide audio feedback through on-screen displays

## Service Initialization

### Singleton Pattern
```typescript
import AstalWp from 'gi://AstalWp?version=0.1';

// WirePlumber service instance
const wireplumber = AstalWp.get_default() as AstalWp.Wp;

// Audio service (sub-service of WirePlumber)
const audioService = wireplumber.audio;
```

### Service Availability Check
```typescript
// Check if audio service is available
if (audioService) {
    // Audio operations available
    const defaultSpeaker = audioService.defaultSpeaker;
    const defaultMicrophone = audioService.defaultMicrophone;
    const speakers = audioService.speakers;
    const microphones = audioService.microphones;
}
```

## Core Properties

### Default Device Properties
```typescript
// Default output device (speakers/headphones)
audioService.defaultSpeaker: AstalWp.Endpoint

// Default input device (microphone)
audioService.defaultMicrophone: AstalWp.Endpoint

// All available output devices
audioService.speakers: AstalWp.Endpoint[]

// All available input devices
audioService.microphones: AstalWp.Endpoint[]
```

### Device State Monitoring
```typescript
// Volume level binding (0.0 - 1.0, can exceed 1.0 if boost enabled)
const volumeBinding = Variable.derive(
    [bind(audioService.defaultSpeaker, 'volume')],
    (volume) => Math.round(volume * 100)
);

// Mute state binding
const muteBinding = Variable.derive(
    [bind(audioService.defaultSpeaker, 'mute')],
    (muted) => muted
);

// Device description binding
const deviceBinding = Variable.derive(
    [bind(audioService.defaultSpeaker, 'description')],
    (description) => description || 'Unknown Device'
);
```

## Audio Device Management

### Endpoint Interface
```typescript
interface AstalWp.Endpoint {
    // Device properties
    id: number;                    // Unique device identifier
    description: string;           // Human-readable device name
    name: string;                  // Internal device name
    iconName: string;             // Icon identifier
    volume: number;               // Volume level (0.0 - 1.5)
    mute: boolean;                // Mute state
    isDefault: boolean;           // Whether this is the default device
    
    // Methods
    set_volume(volume: number): void;
    set_mute(muted: boolean): void;
    set_is_default(isDefault: boolean): void;
}
```

### Device Enumeration
```typescript
// Get all playback devices
const playbackDevices = bind(audioService, 'speakers');

// Get all input devices  
const inputDevices = bind(audioService, 'microphones');

// Device list component
export const PlaybackDevices = (): JSX.Element => {
    return (
        <box className={'menu-items-section playback'} vertical>
            {playbackDevices.as((devices) => {
                if (!devices || devices.length === 0) {
                    return <NotFoundButton type={'playback'} />;
                }

                return devices.map((device) => (
                    <AudioDevice device={device} type={'playback'} key={device.id} />
                ));
            })}
        </box>
    );
};
```

### Device Switching
```typescript
// Set default output device
const setDefaultSpeaker = (device: AstalWp.Endpoint): void => {
    device.set_is_default(true);
};

// Set default input device
const setDefaultMicrophone = (device: AstalWp.Endpoint): void => {
    device.set_is_default(true);
};

// Device selection button
const AudioDevice = ({ device, type }: { device: AstalWp.Endpoint; type: 'playback' | 'input' }): JSX.Element => {
    const isDefault = bind(device, 'isDefault');
    
    return (
        <button
            className={isDefault.as((def) => `menu-item audio-device ${def ? 'active' : ''}`)}
            onClick={() => {
                device.set_is_default(true);
            }}
        >
            <box>
                <icon className={'menu-item-icon'} icon={device.iconName || 'audio-card'} />
                <label
                    className={'menu-item-label'}
                    label={device.description || 'Unknown Device'}
                    hexpand
                    halign={Gtk.Align.START}
                />
                {isDefault() && (
                    <icon className={'menu-item-icon active'} icon={'object-select-symbolic'} />
                )}
            </box>
        </button>
    );
};
```

## Volume Control

### Volume Slider Implementation
```typescript
// Volume slider with boost support
const VolumeSlider = ({ device, type }: { device: AstalWp.Endpoint; type: 'playback' | 'input' }): JSX.Element => {
    const { raiseMaximumVolume } = options.menus.audio;
    
    return (
        <slider
            value={bind(device, 'volume')}
            className={`menu-active-slider menu-slider ${type}`}
            drawValue={false}
            hexpand
            min={0}
            max={type === 'playback' ? bind(raiseMaximumVolume).as((raise) => (raise ? 1.5 : 1)) : 1}
            onDragged={({ value, dragging }) => {
                if (dragging) {
                    device.volume = value;
                    device.mute = false; // Unmute when adjusting volume
                }
            }}
            setup={(self) => {
                // Scroll wheel support
                self.connect('scroll-event', (_, event: Gdk.Event) => {
                    if (isScrollUp(event)) {
                        const newVolume = device.volume + 0.05;
                        const maxVolume = type === 'playback' && raiseMaximumVolume.get() ? 1.5 : 1;
                        device.set_volume(Math.min(newVolume, maxVolume));
                    }

                    if (isScrollDown(event)) {
                        const newVolume = device.volume - 0.05;
                        device.set_volume(Math.max(newVolume, 0));
                    }
                });
            }}
        />
    );
};
```

### Volume Icon Logic
```typescript
// Dynamic volume icon based on level and mute state
export const getIcon = (volume: number, muted: boolean): string => {
    if (muted) return '󰖁';
    if (volume > 66) return '󰕾';
    if (volume > 33) return '󰖀';
    if (volume > 0) return '󰕿';
    return '󰖁';
};

// Volume icon binding
const iconBinding = Variable.derive(
    [
        bind(audioService.defaultSpeaker, 'volume'),
        bind(audioService.defaultSpeaker, 'mute'),
    ],
    (volume, muted) => getIcon(Math.round(volume * 100), muted)
);
```

### Mute Toggle
```typescript
// Mute toggle button
const MuteButton = ({ device }: { device: AstalWp.Endpoint }): JSX.Element => {
    const isMuted = bind(device, 'mute');
    
    return (
        <button
            className={isMuted.as((muted) => `menu-button mute ${muted ? 'active' : ''}`)}
            onClick={() => {
                device.set_mute(!device.mute);
            }}
            tooltipText={isMuted.as((muted) => muted ? 'Unmute' : 'Mute')}
        >
            <icon icon={isMuted.as((muted) => muted ? '󰖁' : '󰕾')} />
        </button>
    );
};
```

## Signal System

### Volume Change Signals
```typescript
// Default speaker volume changes
audioService.defaultSpeaker?.connect('notify::volume', () => {
    // Handle volume change
    updateVolumeDisplay();
    showOSD();
});

// Default speaker mute changes
audioService.defaultSpeaker?.connect('notify::mute', () => {
    // Handle mute state change
    updateMuteDisplay();
    showOSD();
});

// Default microphone changes
audioService.defaultMicrophone?.connect('notify::volume', () => {
    // Handle microphone volume change
    updateMicrophoneDisplay();
});

audioService.defaultMicrophone?.connect('notify::mute', () => {
    // Handle microphone mute change
    updateMicrophoneDisplay();
});
```

### Device List Changes
```typescript
// Speaker list changes
audioService.connect('notify::speakers', () => {
    // Handle new speakers added/removed
    refreshSpeakerList();
});

// Microphone list changes
audioService.connect('notify::microphones', () => {
    // Handle new microphones added/removed
    refreshMicrophoneList();
});

// Default device changes
audioService.connect('notify::defaultSpeaker', () => {
    // Handle default speaker change
    updateDefaultSpeaker();
});

audioService.connect('notify::defaultMicrophone', () => {
    // Handle default microphone change
    updateDefaultMicrophone();
});
```

## Integration Patterns

### Bar Module Integration
```typescript
// Volume bar module
export const Volume = (): BarBoxChild => {
    const iconBinding = Variable.derive(
        [
            bind(audioService.defaultSpeaker, 'volume'),
            bind(audioService.defaultSpeaker, 'mute'),
        ],
        (volume, muted) => getIcon(Math.round(volume * 100), muted)
    );

    const labelBinding = Variable.derive(
        [bind(audioService.defaultSpeaker, 'volume')],
        (volume) => `${Math.round(volume * 100)}%`
    );

    return Module({
        textIcon: iconBinding(),
        label: labelBinding(),
        tooltipText: bind(audioService.defaultSpeaker, 'description'),
        boxClass: 'volume',
        props: {
            setup: (self: Astal.Button) => {
                // Click to open audio menu
                onPrimaryClick(self, () => {
                    openMenu(self, rightClick.get(), 'audiomenu');
                });

                // Scroll to adjust volume
                onScroll(self, throttledScrollHandler(5), scrollUp.get(), scrollDown.get());
            },
            onDestroy: () => {
                iconBinding.drop();
                labelBinding.drop();
            },
        },
    });
};
```

### Microphone Module Integration
```typescript
// Microphone bar module
export const Microphone = (): BarBoxChild => {
    const iconBinding = Variable.derive(
        [bind(audioService.defaultMicrophone, 'mute')],
        (muted) => muted ? mutedIcon.get() : unmutedIcon.get()
    );

    const labelBinding = Variable.derive(
        [
            bind(audioService.defaultMicrophone, 'volume'),
            bind(audioService.defaultMicrophone, 'mute'),
        ],
        (volume, muted) => {
            if (muted) return 'Muted';
            return `${Math.round(volume * 100)}%`;
        }
    );

    return Module({
        textIcon: iconBinding(),
        label: labelBinding(),
        tooltipText: 'Microphone',
        boxClass: 'microphone',
        showLabelBinding: bind(label),
        props: {
            setup: (self: Astal.Button) => {
                inputHandler(self, {
                    onPrimaryClick: { cmd: leftClick },
                    onSecondaryClick: { cmd: rightClick },
                    onMiddleClick: { cmd: middleClick },
                    onScrollUp: { cmd: scrollUp },
                    onScrollDown: { cmd: scrollDown },
                });
            },
            onDestroy: () => {
                iconBinding.drop();
                labelBinding.drop();
            },
        },
    });
};
```

## OSD Integration

### OSD Bar Setup
```typescript
// OSD progress bar for audio
export const setupOsdBar = (self: LevelBar): void => {
    // Speaker volume changes
    self.hook(audioService.defaultSpeaker, 'notify::volume', () => {
        const volume = audioService.defaultSpeaker?.volume || 0;
        
        // Handle volume boost (>100%)
        self.className = volume > 1 ? 'overflow' : self.className.replace(/\boverflow\b/, '').trim();
        self.value = Math.min(volume, 1); // Clamp display to 100%
        
        showOSD();
    });

    // Speaker mute changes
    self.hook(audioService.defaultSpeaker, 'notify::mute', () => {
        const muted = audioService.defaultSpeaker?.mute || false;
        self.className = muted ? 'muted' : self.className.replace(/\bmuted\b/, '').trim();
        showOSD();
    });

    // Microphone volume changes
    self.hook(audioService.defaultMicrophone, 'notify::volume', () => {
        const volume = audioService.defaultMicrophone?.volume || 0;
        self.className = volume > 1 ? 'overflow' : self.className.replace(/\boverflow\b/, '').trim();
        self.value = Math.min(volume, 1);
        showOSD();
    });

    // Microphone mute changes
    self.hook(audioService.defaultMicrophone, 'notify::mute', () => {
        const muted = audioService.defaultMicrophone?.mute || false;
        self.className = muted ? 'muted' : self.className.replace(/\bmuted\b/, '').trim();
        showOSD();
    });
};
```

### OSD Icon Setup
```typescript
// OSD icon for audio feedback
export const setupOsdIcon = (self: Icon): void => {
    // Speaker volume icon
    self.hook(audioService.defaultSpeaker, 'notify::volume', () => {
        const volume = audioService.defaultSpeaker?.volume || 0;
        const muted = audioService.defaultSpeaker?.mute || false;
        
        if (muted) {
            self.icon = '󰖁';
        } else if (volume > 0.66) {
            self.icon = '󰕾';
        } else if (volume > 0.33) {
            self.icon = '󰖀';
        } else if (volume > 0) {
            self.icon = '󰕿';
        } else {
            self.icon = '󰖁';
        }
    });

    // Speaker mute icon
    self.hook(audioService.defaultSpeaker, 'notify::mute', () => {
        const muted = audioService.defaultSpeaker?.mute || false;
        if (muted) {
            self.icon = '󰖁';
        }
    });

    // Microphone icon
    self.hook(audioService.defaultMicrophone, 'notify::volume', () => {
        const muted = audioService.defaultMicrophone?.mute || false;
        self.icon = muted ? '󰍭' : '󰍬';
    });

    self.hook(audioService.defaultMicrophone, 'notify::mute', () => {
        const muted = audioService.defaultMicrophone?.mute || false;
        self.icon = muted ? '󰍭' : '󰍬';
    });
};
```

## Audio Menu Implementation

### Volume Sliders Component
```typescript
// Main volume control section
export const VolumeSliders = (): JSX.Element => {
    return (
        <box className={'menu-section-container'} vertical>
            <box className={'menu-label-container'}>
                <label className={'menu-label'} label={'Volume'} />
            </box>
            <box className={'menu-items-section'} vertical>
                <SliderItem type={'playback'} device={audioService.defaultSpeaker} />
                <SliderItem type={'input'} device={audioService.defaultMicrophone} />
            </box>
        </box>
    );
};

// Individual slider item
const SliderItem = ({ device, type }: { device: AstalWp.Endpoint; type: 'playback' | 'input' }): JSX.Element => {
    return (
        <box className={`menu-item-container ${type}`} vertical>
            <box className={'menu-item-header'}>
                <icon className={'menu-item-icon'} icon={device?.iconName || 'audio-card'} />
                <label
                    className={'menu-item-label'}
                    label={bind(device, 'description').as((desc) => desc || `Unknown ${type} Device`)}
                    hexpand
                    halign={Gtk.Align.START}
                />
                <label
                    className={'menu-item-value'}
                    label={bind(device, 'volume').as((vol) => `${Math.round(vol * 100)}%`)}
                />
            </box>
            <VolumeSlider device={device} type={type} />
        </box>
    );
};
```

### Available Devices Section
```typescript
// Available devices menu
export const AvailableDevices = (): JSX.Element => {
    return (
        <box className={'menu-section-container'} vertical>
            <box className={'menu-label-container'}>
                <label className={'menu-label'} label={'Devices'} />
            </box>
            <stack
                className={'menu-stack'}
                transitionType={Gtk.StackTransitionType.SLIDE_LEFT_RIGHT}
                shown={bind(activeMenu)}
            >
                <PlaybackDevices />
                <InputDevices />
            </stack>
        </box>
    );
};
```

### Dashboard Audio Controls
```typescript
// Quick audio controls in dashboard
const AudioControls = (): JSX.Element => {
    return (
        <box className={'dashboard-controls audio'}>
            <button
                className={'control-button'}
                onClick={() => {
                    audioService.defaultSpeaker?.set_mute(!audioService.defaultSpeaker.mute);
                }}
                tooltipText={bind(audioService.defaultSpeaker, 'mute').as((muted) => 
                    muted ? 'Unmute' : 'Mute'
                )}
            >
                <icon icon={bind(audioService.defaultSpeaker, 'mute').as((muted) => 
                    muted ? '󰖁' : '󰕾'
                )} />
            </button>
        </box>
    );
};
```

This comprehensive AstalWp integration enables HyprPanel to provide complete audio management capabilities, including device switching, volume control with boost support, real-time OSD feedback, and intuitive menu interfaces for all audio operations.
