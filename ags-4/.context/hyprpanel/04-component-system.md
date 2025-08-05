# Component System Architecture

## Table of Contents
- [Component Hierarchy](#component-hierarchy)
- [Bar Module System](#bar-module-system)
- [Menu System](#menu-system)
- [Shared Components](#shared-components)
- [Widget Container Pattern](#widget-container-pattern)
- [Component Lifecycle](#component-lifecycle)
- [Custom Module System](#custom-module-system)

## Component Hierarchy

### Overall Structure
```
HyprPanel Components
├── Bar System
│   ├── Core Modules
│   │   ├── Menu (Dashboard Launcher)
│   │   ├── Workspaces
│   │   ├── ClientTitle (Window Title)
│   │   ├── Media Player
│   │   ├── Notifications
│   │   ├── Volume
│   │   ├── Network
│   │   ├── Bluetooth
│   │   ├── Battery
│   │   ├── Clock
│   │   └── SysTray
│   ├── System Modules
│   │   ├── Microphone
│   │   ├── RAM Monitor
│   │   ├── CPU Monitor
│   │   ├── CPU Temperature
│   │   ├── Storage Monitor
│   │   ├── Network Statistics
│   │   ├── Keyboard Layout
│   │   ├── Updates
│   │   ├── Submap
│   │   ├── Weather
│   │   ├── Power Controls
│   │   ├── Hyprsunset
│   │   ├── Hypridle
│   │   ├── Cava (Audio Visualizer)
│   │   └── World Clock
│   ├── Custom Modules
│   └── Module Separator
├── Menu System
│   ├── Dropdown Menus
│   │   ├── Audio Menu
│   │   ├── Network Menu
│   │   ├── Bluetooth Menu
│   │   ├── Media Menu
│   │   ├── Notifications Menu
│   │   ├── Calendar Menu
│   │   ├── Energy Menu
│   │   ├── Dashboard Menu
│   │   └── Power Dropdown
│   └── Standard Windows
│       ├── Power Menu
│       └── Verification Dialog
├── Notification System
├── OSD System
├── Settings Dialog
└── Shared Components
    ├── Module Base
    ├── Widget Container
    ├── Dropdown Base
    └── Regular Window
```

## Bar Module System

### Widget Map Registration
```typescript
let widgets: WidgetMap = {
    // Core modules
    battery: () => WidgetContainer(BatteryLabel()),
    dashboard: () => WidgetContainer(Menu()),
    workspaces: (monitor: number) => WidgetContainer(Workspaces(monitor)),
    windowtitle: () => WidgetContainer(ClientTitle()),
    media: () => WidgetContainer(Media()),
    notifications: () => WidgetContainer(Notifications()),
    volume: () => WidgetContainer(Volume()),
    network: () => WidgetContainer(Network()),
    bluetooth: () => WidgetContainer(Bluetooth()),
    clock: () => WidgetContainer(Clock()),
    systray: () => WidgetContainer(SysTray()),
    
    // System monitoring modules
    microphone: () => WidgetContainer(Microphone()),
    ram: () => WidgetContainer(Ram()),
    cpu: () => WidgetContainer(Cpu()),
    cputemp: () => WidgetContainer(CpuTemp()),
    storage: () => WidgetContainer(Storage()),
    netstat: () => WidgetContainer(Netstat()),
    kbinput: () => WidgetContainer(KbInput()),
    updates: () => WidgetContainer(Updates()),
    submap: () => WidgetContainer(Submap()),
    weather: () => WidgetContainer(Weather()),
    power: () => WidgetContainer(Power()),
    hyprsunset: () => WidgetContainer(Hyprsunset()),
    hypridle: () => WidgetContainer(Hypridle()),
    cava: () => WidgetContainer(Cava()),
    worldclock: () => WidgetContainer(WorldClock()),
    
    // Utility
    separator: () => ModuleSeparator(),
};
```

### Bar Layout System
```typescript
export const Bar = async (monitor: number): Promise<JSX.Element> => {
    const gdkMonitorMapper = new GdkMonitorMapper();
    const hyprlandMonitor = gdkMonitorMapper.getHyprlandMonitor(monitor);

    // Dynamic layout binding
    const leftBinding = Variable.derive([bind(layouts)], (currentLayouts) => {
        const foundLayout = getLayoutForMonitor(hyprlandMonitor, currentLayouts);
        return foundLayout.left
            .filter((mod) => Object.keys(widgets).includes(mod))
            .map((w) => widgets[w](hyprlandMonitor));
    });

    const middleBinding = Variable.derive([bind(layouts)], (currentLayouts) => {
        const foundLayout = getLayoutForMonitor(hyprlandMonitor, currentLayouts);
        return foundLayout.middle
            .filter((mod) => Object.keys(widgets).includes(mod))
            .map((w) => widgets[w](hyprlandMonitor));
    });

    const rightBinding = Variable.derive([bind(layouts)], (currentLayouts) => {
        const foundLayout = getLayoutForMonitor(hyprlandMonitor, currentLayouts);
        return foundLayout.right
            .filter((mod) => Object.keys(widgets).includes(mod))
            .map((w) => widgets[w](hyprlandMonitor));
    });

    return (
        <window
            name={`bar-${hyprlandMonitor}`}
            namespace={`bar-${hyprlandMonitor}`}
            monitor={monitor}
            onDestroy={() => {
                leftBinding.drop();
                middleBinding.drop();
                rightBinding.drop();
            }}
        >
            <box className={'bar-panel-container'}>
                <centerbox
                    hexpand
                    startWidget={
                        <box className={'box-left'} hexpand>
                            {leftBinding()}
                        </box>
                    }
                    centerWidget={
                        <box className={'box-center'} halign={Gtk.Align.CENTER}>
                            {middleBinding()}
                        </box>
                    }
                    endWidget={
                        <box className={'box-right'} halign={Gtk.Align.END}>
                            {rightBinding()}
                        </box>
                    }
                />
            </box>
        </window>
    );
};
```

### Module Base Component
```typescript
export const Module = ({
    icon,
    textIcon,
    useTextIcon = bind(Variable(false)),
    label,
    truncationSize = bind(Variable(-1)),
    tooltipText = '',
    boxClass,
    isVis,
    props = {},
    showLabelBinding = bind(Variable(true)),
    showIconBinding = bind(Variable(true)),
    showLabel,
    labelHook,
    hook,
}: BarModule): BarBoxChild => {
    
    // Icon widget generation
    const getIconWidget = (useTxtIcn: boolean): JSX.Element | undefined => {
        const className = `txt-icon bar-button-icon module-icon ${boxClass}`;

        const icn = typeof icon === 'string' ? icon : icon?.get();
        if (!useTxtIcn && icn?.length) {
            return <icon className={className} icon={icon} />;
        }

        const textIcn = typeof textIcon === 'string' ? textIcon : textIcon?.get();
        if (textIcn?.length) {
            return <label className={className} label={textIcon} />;
        }
    };

    // Dynamic styling
    const componentClass = Variable.derive(
        [bind(style), showLabelBinding],
        (style: BarButtonStyles, shwLabel: boolean) => {
            const shouldShowLabel = shwLabel || showLabel;
            const styleMap = {
                default: 'style1',
                split: 'style2',
                wave: 'style3',
                wave2: 'style3',
            };
            return `${boxClass} ${styleMap[style]} ${!shouldShowLabel ? 'no-label' : ''}`;
        },
    );

    // Dynamic children
    const componentChildren = Variable.derive(
        [showLabelBinding, showIconBinding, useTextIcon],
        (showLabel: boolean, showIcon: boolean, forceTextIcon: boolean): JSX.Element[] => {
            const childrenArray = [];
            const iconWidget = getIconWidget(forceTextIcon);

            if (showIcon && iconWidget !== undefined) {
                childrenArray.push(iconWidget);
            }

            if (showLabel) {
                childrenArray.push(
                    <label
                        className={`bar-button-label module-label ${boxClass}`}
                        truncate={truncationSize.as((truncSize) => truncSize > 0)}
                        maxWidthChars={truncationSize.as((truncSize) => truncSize)}
                        label={label ?? ''}
                        setup={labelHook}
                    />,
                );
            }
            return childrenArray;
        },
    );

    const component: JSX.Element = (
        <box
            tooltipText={tooltipText}
            className={componentClass()}
            setup={hook}
            onDestroy={() => {
                componentChildren.drop();
                componentClass.drop();
            }}
        >
            {componentChildren()}
        </box>
    );

    return {
        component,
        tooltip_text: tooltipText,
        isVis: isVis,
        boxClass,
        props,
    };
};
```

## Menu System

### Menu Exports Structure
```typescript
export const DropdownMenus = [
    AudioMenu,
    NetworkMenu,
    BluetoothMenu,
    MediaMenu,
    NotificationsMenu,
    CalendarMenu,
    EnergyMenu,
    DashboardMenu,
    PowerDropdown,
];

export const StandardWindows = [PowerMenu, Verification];
```

### Dropdown Menu Pattern
```typescript
export default (): JSX.Element => {
    return (
        <DropdownMenu
            name="audiomenu"
            transition={bind(options.menus.transition).as((transition) => RevealerTransitionMap[transition])}
        >
            <box className={'menu-items audio'} halign={Gtk.Align.FILL} hexpand>
                <box className={'menu-items-container audio'} halign={Gtk.Align.FILL} vertical hexpand>
                    <VolumeSliders />
                    <AvailableDevices />
                </box>
            </box>
        </DropdownMenu>
    );
};
```

### Dashboard Menu Structure
```typescript
const DashboardMenu = (): JSX.Element => {
    const isVisible = Variable.derive(
        [bind(controls), bind(shortcuts), bind(stats), bind(directories)],
        (controls, shortcuts, stats, directories) => {
            return controls || shortcuts || stats || directories;
        },
    );

    return (
        <DropdownMenu
            name="dashboardmenu"
            transition={bind(transition).as((transition) => RevealerTransitionMap[transition])}
        >
            <box
                className={'menu-items dashboard'}
                visible={isVisible()}
                onDestroy={() => isVisible.drop()}
            >
                <box className={'menu-items-container dashboard'} vertical>
                    <Profile />
                    <Shortcuts />
                    <Controls />
                    <Stats />
                    <Directories />
                </box>
            </box>
        </DropdownMenu>
    );
};
```

## Shared Components

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

        const boxClassName = Object.hasOwnProperty.call(child, 'boxClass') ? child.boxClass : '';
        return `bar_item_box_visible ${styleMap[style]} ${boxClassName}`;
    });

    const computeVisible = (child: BarBoxChild): Bind | boolean => {
        if (child.isVis !== undefined) {
            return bind(child.isVis);
        }
        return child.isVisible;
    };

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

### Regular Window Component
```typescript
export default ({ className, title, name, ...props }: RegularWindowProps): JSX.Element => {
    return (
        <window
            className={`regular-window ${className}`}
            title={title}
            name={name}
            visible={false}
            resizable={true}
            {...props}
        />
    );
};
```

## Component Lifecycle

### Initialization Flow
```
1. Component Creation
   ├── Props processing
   ├── Variable binding setup
   └── Event handler attachment

2. Rendering
   ├── JSX element creation
   ├── CSS class application
   └── Child component mounting

3. Runtime Updates
   ├── Variable change detection
   ├── Re-rendering triggers
   └── State synchronization

4. Cleanup
   ├── Variable binding disposal
   ├── Event handler removal
   └── Resource cleanup
```

### Memory Management Pattern
```typescript
const component = (
    <box
        onDestroy={() => {
            // Drop all variable bindings
            iconBinding.drop();
            labelBinding.drop();
            classNameBinding.drop();
            
            // Clean up any timers or intervals
            if (pollerId) {
                clearInterval(pollerId);
            }
            
            // Disconnect service signals
            service.disconnect(signalId);
        }}
    >
        {/* Component content */}
    </box>
);
```

## Custom Module System

### Module Container Pattern
```typescript
export const ModuleContainer = (moduleName: string): BarBoxChild => {
    const moduleConfig = options.bar.customModules[moduleName];
    const {
        icon: moduleIcon,
        label: moduleLabel,
        tooltip: moduleTooltip,
        truncation: moduleTruncation,
        hideOnEmpty: moduleHideOnEmpty,
        actions: moduleActions,
        scrollThreshold: moduleScrollThreshold,
    } = moduleConfig;

    const module = Module({
        textIcon: bind(commandOutput).as((cmdOutput) => getIcon(moduleName, cmdOutput, moduleIcon)),
        tooltipText: bind(commandOutput).as((cmdOutput) => getLabel(moduleName, cmdOutput, moduleTooltip)),
        boxClass: `cmodule-${moduleName.replace(/custom\//, '')}`,
        label: bind(commandOutput).as((cmdOutput) => getLabel(moduleName, cmdOutput, moduleLabel)),
        truncationSize: bind(Variable(typeof moduleTruncation === 'number' ? moduleTruncation : -1)),
        props: {
            setup: (self: Astal.Button) =>
                setupModuleInteractions(self, moduleActions, actionExecutionListener, moduleScrollThreshold),
            onDestroy: () => {
                commandPoller.stop();
            },
        },
        isVis: bind(commandOutput).as((cmdOutput) => (moduleHideOnEmpty ? cmdOutput.length > 0 : true)),
    });

    return module;
};
```

### Event Handler Integration
```typescript
const setupModuleInteractions = (
    self: Astal.Button,
    actions: ModuleActions,
    listener: Variable<boolean>,
    scrollThreshold: number
): void => {
    const { leftClick, rightClick, middleClick, scrollUp, scrollDown } = actions;

    self.connect('button-press-event', (_, event) => {
        if (isPrimaryClick(event)) {
            executeAction(leftClick, listener);
        } else if (isSecondaryClick(event)) {
            executeAction(rightClick, listener);
        } else if (isMiddleClick(event)) {
            executeAction(middleClick, listener);
        }
    });

    self.connect('scroll-event', throttledScrollHandler(scrollThreshold, (direction) => {
        if (direction === 'up') {
            executeAction(scrollUp, listener);
        } else if (direction === 'down') {
            executeAction(scrollDown, listener);
        }
    }));
};
```

This component system provides a flexible, reactive, and maintainable architecture for building complex UI elements in HyprPanel.
