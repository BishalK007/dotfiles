# Configuration System

## Table of Contents
- [Options Architecture](#options-architecture)
- [Option Types and Structure](#option-types-and-structure)
- [Settings Management](#settings-management)
- [Configuration Persistence](#configuration-persistence)
- [Settings UI System](#settings-ui-system)
- [Theme Configuration](#theme-configuration)
- [User Customization](#user-customization)

## Options Architecture

### Core Option Class
```typescript
export class Opt<T = unknown> extends Variable<T> {
    public readonly initial: T;
    public readonly persistent: boolean;
    private _id = '';

    constructor(initial: T, { persistent = false }: OptProps = {}) {
        super(initial);
        this.initial = initial;
        this.persistent = persistent;
    }

    public get value(): T {
        return this.get();
    }

    public set value(val: T) {
        this.set(val);
    }

    public get id(): string {
        return this._id;
    }

    public set id(newId: string) {
        this._id = newId;
    }

    // Initialize from config file
    public init(config: Record<string, unknown>): void {
        const value = _findVal(config, this._id.split('.'));
        if (value !== undefined) {
            this.set(value as T, { writeDisk: false });
        }
    }

    // Set value with optional disk persistence
    public set = (value: T, { writeDisk = true }: { writeDisk?: boolean } = {}): void => {
        super.set(value);

        if (writeDisk) {
            const raw = readFile(CONFIG_FILE);
            let config: Record<string, unknown> = {};
            
            if (raw && raw.trim() !== '') {
                try {
                    config = JSON.parse(raw) as Record<string, unknown>;
                } catch (error) {
                    console.error(`Failed to load config file: ${error}`);
                    Notify({
                        summary: 'Failed to load config file',
                        body: `${error}`,
                        iconName: icons.ui.warning,
                    });
                    errorHandler(error);
                }
            }
            
            config[this._id] = value;
            writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
        }
    };
}
```

### Option Factory Function
```typescript
export function mkOptions<T extends object>(optionsObj: T): T & MkOptionsResult {
    ensureDirectory(CONFIG_FILE.split('/').slice(0, -1).join('/'));

    const rawConfig = readFile(CONFIG_FILE);
    let config: Record<string, unknown> = {};

    if (rawConfig && rawConfig.trim() !== '') {
        try {
            config = JSON.parse(rawConfig) as Record<string, unknown>;
        } catch (error) {
            console.error(`Failed to parse config file: ${error}`);
        }
    }

    // Recursively process options
    const processOptions = (obj: any, prefix = ''): void => {
        for (const key in obj) {
            if (!obj.hasOwnProperty(key)) continue;

            const value = obj[key];
            const fullKey = prefix ? `${prefix}.${key}` : key;

            if (value instanceof Opt) {
                value.id = fullKey;
                value.init(config);
            } else if (typeof value === 'object' && value !== null) {
                processOptions(value, fullKey);
            }
        }
    };

    processOptions(optionsObj);

    return {
        ...optionsObj,
        reset: () => resetOptions(optionsObj),
        resetTheme: () => resetThemeColors(optionsObj),
        handler: (deps: string[], callback: () => void) => {
            setupDependencyHandler(optionsObj, deps, callback);
        },
    };
}
```

## Option Types and Structure

### Main Configuration Tree
```typescript
const options = mkOptions({
    theme: {
        tooltip: {
            scaling: opt(100),
        },
        matugen: opt(false),
        matugen_settings: {
            mode: opt<MatugenTheme>('dark'),
            scheme_type: opt<MatugenScheme>('tonal-spot'),
            variation: opt<MatugenVariations>('standard_1'),
            contrast: opt(0.0),
        },
        font: {
            size: opt('1.2rem'),
            name: opt('Ubuntu Nerd Font'),
            style: opt<FontStyle>('normal'),
            label: opt('Ubuntu Nerd Font'),
            weight: opt(600),
        },
        // Color definitions
        rosewater: opt(colors.rosewater),
        flamingo: opt(colors.flamingo),
        pink: opt(colors.pink),
        mauve: opt(colors.mauve),
        red: opt(colors.red),
        // ... more colors
        
        bar: {
            background: opt(colors.base),
            opacity: opt(100),
            border: {
                size: opt('0.13em'),
                radius: opt('0.7em'),
                color: opt(colors.surface0),
                location: opt<BorderLocation>('full'),
            },
            buttons: {
                style: opt<BarButtonStyles>('default'),
                monochrome: opt(false),
                background: opt(colors.surface0),
                opacity: opt(100),
                radius: opt('0.5em'),
                padding: opt('0.8rem'),
                spacing: opt('0.3em'),
                text: opt(colors.text),
                icon: opt(colors.text),
            },
            // ... more bar theming
        },
        menus: {
            monochrome: opt(false),
            background: opt(colors.crust),
            opacity: opt(100),
            cards: opt(colors.base),
            card_radius: opt('0.4em'),
            border: {
                size: opt('0.13em'),
                radius: opt('0.7em'),
                color: opt(colors.surface0),
            },
            // ... more menu theming
        },
        // ... more theme sections
    },

    bar: {
        scrollSpeed: opt(5),
        autoHide: opt<AutoHide>('never'),
        layouts: opt<BarLayouts>({
            '1': {
                left: ['dashboard', 'workspaces', 'windowtitle'],
                middle: ['media'],
                right: ['volume', 'clock', 'notifications'],
            },
            '2': {
                left: ['dashboard', 'workspaces', 'windowtitle'],
                middle: ['media'],
                right: ['volume', 'clock', 'notifications'],
            },
            '0': {
                left: ['dashboard', 'workspaces', 'windowtitle'],
                middle: ['media'],
                right: ['volume', 'network', 'bluetooth', 'battery', 'systray', 'clock', 'notifications'],
            },
        }),
        
        // Module configurations
        workspaces: {
            show_icons: opt(false),
            showAllActive: opt(true),
            ignored: opt(''),
            show_numbered: opt(false),
            showWsIcons: opt(false),
            showApplicationIcons: opt(false),
            applicationIconOncePerWorkspace: opt(true),
            applicationIconMap: opt<ApplicationIcons>({}),
            applicationIconFallback: opt('󰣆'),
            applicationIconEmptyWorkspace: opt(''),
            numbered_active_indicator: opt<ActiveWsIndicator>('underline'),
            icons: {
                available: opt(''),
                active: opt(''),
                occupied: opt(''),
            },
            workspaceIconMap: opt<WorkspaceIcons | WorkspaceIconsColored>({}),
            workspaces: opt(5),
            spacing: opt(1),
            monitorSpecific: opt(true),
            workspaceMask: opt(false),
            reverse_scroll: opt(false),
            scroll_speed: opt(5),
        },

        // Custom modules
        customModules: {
            microphone: {
                label: opt(true),
                mutedIcon: opt('󰍭'),
                unmutedIcon: opt('󰍬'),
                leftClick: opt(''),
                rightClick: opt(''),
                middleClick: opt(''),
                scrollUp: opt(''),
                scrollDown: opt(''),
            },
            // ... more custom modules
        },
    },

    menus: {
        transition: opt<Transition>('crossfade'),
        transitionTime: opt(200),
        media: {
            hideAuthor: opt(false),
            hideAlbum: opt(false),
            displayTime: opt(false),
            displayTimeTooltip: opt(false),
            noMediaText: opt('No Media Currently Playing'),
        },
        power: {
            lowBatteryNotification: opt(false),
            lowBatteryThreshold: opt(20),
            lowBatteryNotificationTitle: opt('Warning: Low battery'),
            lowBatteryNotificationText: opt(
                'Your battery is running low ($POWER_LEVEL %).\n\nPlease plug in your charger.',
            ),
            showLabel: opt(true),
            confirmation: opt(true),
            sleep: opt('systemctl suspend'),
            reboot: opt('systemctl reboot'),
            logout: opt('hyprctl dispatch exit'),
            shutdown: opt('systemctl poweroff'),
        },
        dashboard: {
            powermenu: {
                confirmation: opt(true),
                sleep: opt('systemctl suspend'),
                reboot: opt('systemctl reboot'),
                logout: opt('hyprctl dispatch exit'),
                shutdown: opt('systemctl poweroff'),
                avatar: {
                    image: opt('~/.face.icon'),
                    name: opt<'system' | string>('system'),
                },
            },
            stats: {
                enabled: opt(true),
                interval: opt(2000),
                enable_gpu: opt(false),
            },
            // ... more dashboard settings
        },
    },

    notifications: {
        position: opt<NotificationAnchor>('top right'),
        ignore: opt<string[]>([]),
        displayedTotal: opt(10),
        monitor: opt(0),
        active_monitor: opt(true),
        showActionsOnHover: opt(false),
        timeout: opt(7000),
        autoDismiss: opt(false),
        cache_actions: opt(true),
        clearDelay: opt(100),
    },

    wallpaper: {
        enable: opt(true),
        image: opt(''),
        pywal: opt(false),
    },

    hyprpanel: {
        restartAgs: opt(true),
        restartCommand: opt('hyprpanel -q; hyprpanel'),
    },
});
```

## Settings Management

### Settings Dialog Structure
```typescript
export default (): JSX.Element => {
    return (
        <RegularWindow
            className={'settings-dialog'}
            visible={false}
            name={'settings-dialog'}
            title={'hyprpanel-settings'}
            application={App}
            setup={(self) => {
                self.connect('delete-event', () => {
                    self.hide();
                    return true;
                });
                self.set_default_size(200, 300);
            }}
        >
            <box className={'settings-dialog-box'} vertical>
                <Header />
                <PageContainer />
            </box>
        </RegularWindow>
    );
};
```

### Settings Page Navigation
```typescript
export const PageContainer = (): JSX.Element => {
    return (
        <box className={'settings-page-container'} halign={Gtk.Align.FILL} vertical>
            <box className={'settings-page-container2'} halign={Gtk.Align.FILL} hexpand>
                <box className="option-pages-container" halign={Gtk.Align.CENTER} hexpand>
                    {settingsPages.map((page) => {
                        return (
                            <button
                                className={bind(CurrentPage).as(
                                    (v) => `pager-button ${v === page ? 'active' : ''} category`,
                                )}
                                label={page}
                                onClick={(_, event) => {
                                    if (isPrimaryClick(event)) {
                                        LastPage.set(CurrentPage.get());
                                        CurrentPage.set(page as SettingsPage);
                                    }
                                }}
                                halign={Gtk.Align.CENTER}
                            />
                        );
                    })}
                </box>
            </box>
            <stack
                className="settings-stack"
                transitionType={bind(transition).as((transitionType) => StackTransitionMap[transitionType])}
                transitionDuration={bind(transitionTime)}
                shown={bind(CurrentPage)}
                vexpand
            >
                <ConfigMenu />
                <ThemesMenu />
            </stack>
        </box>
    );
};
```

### Settings Header with Reset
```typescript
export const Header = (): JSX.Element => {
    return (
        <centerbox className="header">
            <button
                className="reset"
                onClick={(_, event) => {
                    if (isPrimaryClick(event)) {
                        options.reset();
                    }
                }}
                tooltipText={'Reset All Settings'}
                halign={Gtk.Align.START}
                valign={Gtk.Align.START}
            >
                <icon icon={icons.ui.refresh} />
            </button>
            <box />
            <button
                className="close"
                halign={Gtk.Align.END}
                valign={Gtk.Align.START}
                onClick={(_, event) => {
                    if (isPrimaryClick(event)) {
                        App.get_window('settings-dialog')?.set_visible(false);
                    }
                }}
            >
                <icon icon={icons.ui.close} />
            </button>
        </centerbox>
    );
};
```

## Configuration Persistence

### File System Structure
```
~/.config/hyprpanel/
├── config.json          # Main configuration file
├── modules.json         # Custom module definitions
└── modules.scss         # Custom module styles
```

### Configuration Loading
```typescript
// Session initialization
Object.assign(globalThis, {
    CONFIG_DIR: `${GLib.get_user_config_dir()}/hyprpanel`,
    CONFIG_FILE: `${GLib.get_user_config_dir()}/hyprpanel/config.json`,
    TMP: `${GLib.get_tmp_dir()}/hyprpanel`,
    USER: GLib.get_user_name(),
    SRC_DIR: dataDir,
});

ensureDirectory(TMP);
ensureFile(CONFIG_FILE);
ensureJsonFile(`${CONFIG_DIR}/modules.json`);
ensureFile(`${CONFIG_DIR}/modules.scss`);
```

### Configuration Serialization
```typescript
// Option value persistence
public set = (value: T, { writeDisk = true }: { writeDisk?: boolean } = {}): void => {
    super.set(value);

    if (writeDisk) {
        const raw = readFile(CONFIG_FILE);
        let config: Record<string, unknown> = {};
        
        if (raw && raw.trim() !== '') {
            try {
                config = JSON.parse(raw) as Record<string, unknown>;
            } catch (error) {
                console.error(`Failed to load config file: ${error}`);
                // Handle error gracefully
            }
        }
        
        config[this._id] = value;
        writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
    }
};
```

## Settings UI System

### Option Input Component
```typescript
export const Option = <T extends string | number | boolean | object>({
    className,
    ...props
}: OptionProps<T>): JSX.Element => {
    const isUnsaved = Variable(false);
    
    return (
        <box
            className={'option-item'}
            hexpand
            onDestroy={() => {
                isUnsaved.drop();
            }}
        >
            <PropertyLabel title={props.title} subtitle={props.subtitle} subtitleLink={props.subtitleLink} />
            <SettingInput isUnsaved={isUnsaved} className={className} {...props} />
            <ResetButton {...props} />
        </box>
    );
};
```

### Input Type System
```typescript
export type InputType =
    | 'number'
    | 'color'
    | 'float'
    | 'object'
    | 'string'
    | 'enum'
    | 'boolean'
    | 'img'
    | 'wallpaper'
    | 'export'
    | 'import'
    | 'config_import'
    | 'font';

export interface RowProps<T> {
    opt: Opt<T>;
    note?: string;
    type?: InputType;
    enums?: T[];
    max?: number;
    min?: number;
    disabledBinding?: Variable<boolean>;
    exportData?: ThemeExportData;
    subtitle?: string | VarType<string> | Opt;
    subtitleLink?: string;
    dependencies?: string[];
    increment?: number;
    fontStyle?: Opt<FontStyle>;
    fontLabel?: Opt<string>;
}
```

## Theme Configuration

### Color System
```typescript
// Base color palette (Catppuccin Mocha)
export const colors = {
    rosewater: '#f5e0dc',
    flamingo: '#f2cdcd',
    pink: '#f5c2e7',
    mauve: '#cba6f7',
    red: '#f38ba8',
    maroon: '#eba0ac',
    peach: '#fab387',
    yellow: '#f9e2af',
    green: '#a6e3a1',
    teal: '#94e2d5',
    sky: '#89dceb',
    sapphire: '#74c7ec',
    blue: '#89b4fa',
    lavender: '#b4befe',
    text: '#cdd6f4',
    subtext1: '#bac2de',
    subtext2: '#a6adc8',
    overlay2: '#9399b2',
    overlay1: '#7f849c',
    overlay0: '#6c7086',
    surface2: '#585b70',
    surface1: '#45475a',
    surface0: '#313244',
    base2: '#242438',
    base: '#1e1e2e',
    mantle: '#181825',
    crust: '#11111b',
};
```

### Theme Import/Export
```typescript
globalThis.useTheme = (filePath: string): void => {
    try {
        const importedConfig = loadJsonFile(filePath);

        if (!importedConfig) {
            return;
        }

        const optionsConfigFile = Gio.File.new_for_path(CONFIG_FILE);
        const [optionsSuccess, optionsContent] = optionsConfigFile.load_contents(null);

        if (!optionsSuccess) {
            throw new Error('Failed to load theme file.');
        }

        let optionsConfig = JSON.parse(new TextDecoder('utf-8').decode(optionsContent));

        const filteredConfig = filterConfigForThemeOnly(importedConfig);
        optionsConfig = { ...optionsConfig, ...filteredConfig };

        saveConfigToFile(optionsConfig, CONFIG_FILE);
        bash(restartCommand.get());
    } catch (error) {
        errorHandler(error);
    }
};
```

## User Customization

### Dependency Handling
```typescript
// Options can depend on other options
options.handler(['font', 'theme', 'bar.flatButtons', 'bar.position'], resetCss);

// Conditional option visibility
const isVisible = Variable.derive(
    [bind(options.theme.matugen), bind(options.wallpaper.enable)],
    (matugen, wallpaper) => matugen && wallpaper
);
```

### Custom Module System
```typescript
// Custom modules can be defined in modules.json
const customModules = options.bar.customModules;

// Each custom module has configurable properties
customModules.myModule = {
    label: opt(true),
    icon: opt('󰣇'),
    command: opt('echo "Hello World"'),
    interval: opt(5000),
    leftClick: opt(''),
    rightClick: opt(''),
    middleClick: opt(''),
    scrollUp: opt(''),
    scrollDown: opt(''),
};
```

### Layout Customization
```typescript
// Bar layouts are fully customizable per monitor
layouts: opt<BarLayouts>({
    '0': {  // Primary monitor
        left: ['dashboard', 'workspaces', 'windowtitle'],
        middle: ['media'],
        right: ['volume', 'network', 'bluetooth', 'battery', 'systray', 'clock', 'notifications'],
    },
    '1': {  // Secondary monitor
        left: ['dashboard', 'workspaces'],
        middle: [],
        right: ['clock'],
    },
}),
```

This configuration system provides a comprehensive, type-safe, and user-friendly way to customize every aspect of HyprPanel's appearance and behavior.
