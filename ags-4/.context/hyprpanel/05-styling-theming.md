# Styling and Theming System

## Table of Contents
- [SCSS Architecture](#scss-architecture)
- [Theme System](#theme-system)
- [Matugen Integration](#matugen-integration)
- [Compilation Pipeline](#compilation-pipeline)
- [Hot Reload System](#hot-reload-system)
- [Style Variables](#style-variables)
- [Component Styling Patterns](#component-styling-patterns)

## SCSS Architecture

### File Structure
```
src/scss/
├── main.scss                 # Main entry point
├── style.ts                  # Compilation and management
├── optionsTrackers.ts        # Theme change tracking
├── utils/
│   └── hotReload.ts         # Development hot reload
└── style/
    ├── colors.scss          # Color definitions
    ├── highlights.scss      # Highlight colors
    ├── common/              # Shared styles
    │   ├── common.scss
    │   ├── floating-widget.scss
    │   ├── widget-button.scss
    │   ├── popover_menu.scss
    │   └── general.scss
    ├── bar/                 # Bar component styles
    │   ├── bar.scss
    │   ├── menu.scss
    │   ├── audio.scss
    │   ├── media.scss
    │   ├── network.scss
    │   ├── bluetooth.scss
    │   ├── clock.scss
    │   ├── workspace.scss
    │   ├── window_title.scss
    │   ├── systray.scss
    │   ├── notifications.scss
    │   ├── power.scss
    │   ├── battery.scss
    │   ├── style.scss
    │   └── module-separator.scss
    ├── menus/               # Menu component styles
    │   ├── menu.scss
    │   ├── power.scss
    │   ├── powerdropdown.scss
    │   ├── audiomenu.scss
    │   ├── network.scss
    │   ├── bluetooth.scss
    │   ├── media.scss
    │   ├── notifications.scss
    │   ├── calendar.scss
    │   ├── energy.scss
    │   └── dashboard.scss
    ├── notifications/       # Notification styles
    │   └── popups.scss
    ├── osd/                # OSD styles
    │   └── index.scss
    └── settings/           # Settings dialog styles
        └── dialog.scss
```

### Main SCSS Entry Point
```scss
// src/scss/main.scss
* {
    all: unset;
    font-family: $font-name;
    font-style: $font-style;
    font-size: $font-size;
    font-weight: $font-weight;
}

// General imports
@import 'style/colors';
@import 'style/common/common.scss';
@import 'style/common/floating-widget.scss';
@import 'style/common/widget-button.scss';
@import 'style/common/popover_menu.scss';
@import 'style/common/general';

// Bar modules
@import 'style/bar/bar';
@import 'style/bar/menu';
@import 'style/bar/audio';
@import 'style/bar/media';
@import 'style/bar/network';
@import 'style/bar/bluetooth';
@import 'style/bar/clock';
@import 'style/bar/workspace';
@import 'style/bar/window_title';
@import 'style/bar/systray';
@import 'style/bar/notifications';
@import 'style/bar/power';
@import 'style/bar/battery';
@import 'style/bar/style';

// Menu components
@import 'style/menus/menu';
@import 'style/menus/power';
@import 'style/menus/powerdropdown';
@import 'style/menus/audiomenu';
@import 'style/menus/network';
@import 'style/menus/bluetooth';
@import 'style/menus/media';
@import 'style/menus/notifications';
@import 'style/menus/calendar';
@import 'style/menus/energy';
@import 'style/menus/dashboard';

// Other components
@import 'style/notifications/popups';
@import 'style/osd/index';
@import 'style/settings/dialog';
@import 'style/bar/module-separator';
```

## Theme System

### Variable Extraction Process
```typescript
function extractVariables(theme: RecursiveOptionsObject, prefix = '', matugenColors?: MatugenColors): string[] {
    let result = [] as string[];
    for (const key in theme) {
        if (!theme.hasOwnProperty(key)) {
            continue;
        }

        const themeValue = theme[key];
        const newPrefix = prefix ? `${prefix}-${key}` : key;

        const replacedValue =
            isHexColor(themeValue.value) && matugenColors !== undefined
                ? replaceHexValues(themeValue.value, matugenColors)
                : themeValue.value;

        if (typeof themeValue === 'function') {
            result.push(`$${newPrefix}: ${replacedValue};`);
            continue;
        }

        if (typeof themeValue === 'object' && themeValue !== null) {
            result = result.concat(extractVariables(themeValue, newPrefix, matugenColors));
        }
    }
    return result;
}
```

### CSS Compilation Pipeline
```typescript
export const resetCss = async (): Promise<void> => {
    if (!dependencies('sass')) return;

    let variables: string[] = [];
    try {
        const matugenColors = await generateMatugenColors();

        // Choose variable extraction method
        if (options.theme.matugen.get() && matugenColors) {
            variables = await extractMatugenizedVariables(matugenColors);
        } else {
            variables = extractVariables(options.theme as RecursiveOptionsObject, '', undefined);
        }

        // File paths
        const vars = `${TMP}/variables.scss`;
        const css = `${TMP}/main.css`;
        const scss = `${TMP}/entry.scss`;
        const localScss = `${SRC_DIR}/src/scss/main.scss`;
        const moduleScss = `${CONFIG_DIR}/modules.scss`;

        // Generate variable imports
        const imports = [vars].map((f) => `@import '${f}';`);
        writeFile(vars, variables.join('\n'));

        // Combine SCSS files
        let mainScss = readFile(localScss);
        mainScss = `${imports}\n${mainScss}`;

        const moduleScssFile = readFile(moduleScss);
        mainScss = `${mainScss}\n${moduleScssFile}`;

        writeFile(scss, mainScss);

        // Compile SCSS to CSS
        await bash(`sass --load-path=${SRC_DIR}/src/scss ${scss} ${css}`);

        // Apply compiled CSS
        App.apply_css(css, true);
    } catch (error) {
        console.error(error);
    }
};
```

## Matugen Integration

### Color Generation
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
        
        // Generate colors with matugen
        const contents = await bash(
            `matugen image --dry-run -q ${wallpaperPath} -t scheme-${scheme_type.get()} --contrast ${normalizedContrast} --json hex`,
        );
        
        // Apply colors to system
        await bash(`matugen image -q ${wallpaperPath} -t scheme-${scheme_type.get()} --contrast ${normalizedContrast}`);

        return JSON.parse(contents).colors[options.theme.matugen_settings.mode.get()];
    } catch (error) {
        console.error(`An error occurred while generating matugen colors: ${error}`);
        return;
    }
}
```

### Color Mapping
```typescript
export const getMatugenHex = (incomingHex: HexColor, matugenColors: MatugenColors): HexColor => {
    const matugenVariation = getMatugenVariations(matugenColors, options.theme.matugen_settings.variation.get());

    for (const curColor of Object.keys(defaultColorMap)) {
        if (!isColorValid(curColor)) {
            continue;
        }

        const curColorValue: ColorMapValue = defaultColorMap[curColor];

        if (curColorValue === incomingHex) {
            return matugenVariation[curColor];
        }
    }

    return incomingHex;
};
```

### Matugenized Variable Extraction
```typescript
async function extractMatugenizedVariables(matugenColors: MatugenColors): Promise<string[]> {
    const themeVariables = extractVariables(options.theme as RecursiveOptionsObject, '', matugenColors);
    
    // Update option colors with matugen colors
    for (const curColor of Object.keys(defaultColorMap)) {
        if (!isColorValid(curColor)) {
            continue;
        }

        const curColorValue: ColorMapValue = defaultColorMap[curColor];
        const matugenHex = getMatugenHex(curColorValue, matugenColors);
        
        updateOptColor(matugenHex, options.theme[curColor]);
    }

    return themeVariables;
}
```

## Hot Reload System

### File Monitoring
```typescript
export const initializeHotReload = async (): Promise<void> => {
    const monitorList = [
        `${SRC_DIR}/src/scss/main.scss`,
        `${SRC_DIR}/src/scss/style/bar`,
        `${SRC_DIR}/src/scss/style/common`,
        `${SRC_DIR}/src/scss/style/menus`,
        `${SRC_DIR}/src/scss/style/notifications`,
        `${SRC_DIR}/src/scss/style/osd`,
        `${SRC_DIR}/src/scss/style/settings`,
        `${SRC_DIR}/src/scss/style/colors.scss`,
        `${SRC_DIR}/src/scss/style/highlights.scss`,
        `${CONFIG_DIR}/modules.scss`,
    ];

    monitorList.forEach((file) => monitorFile(file, resetCss));
};
```

### Change Tracking
```typescript
export const initializeTrackers = (resetCssFunc: () => void): void => {
    // Matugen toggle tracking
    matugen.subscribe(() => {
        ensureMatugenWallpaper();
    });

    // Wallpaper change tracking
    Wallpaper.connect('changed', () => {
        console.info('Wallpaper changed, regenerating Matugen colors...');
        if (options.theme.matugen.get()) {
            resetCssFunc();
        }
    });

    // Wallpaper path tracking
    options.wallpaper.image.subscribe(() => {
        if ((!Wallpaper.isRunning() && options.theme.matugen.get()) || !options.wallpaper.enable.get()) {
            console.info('Wallpaper path changed, regenerating Matugen colors...');
            resetCssFunc();
        }
        
        // Pywal integration
        if (options.wallpaper.pywal.get() && dependencies('wal')) {
            const wallpaperPath = options.wallpaper.image.get();
            bash(`wal -i ${wallpaperPath}`);
        }
    });
};
```

## Style Variables

### Color System
```scss
// Base colors
$primary-color: #CDD6F4;
$dark-background: #0e0e1e;
$light-background: #1e1e2e;
$mauve: #cba6f7;
$red: #f38ba8;
$yellow: #f9e2af;
$orange: #fab387;
$teal: #94e2d5;
$lightteal: #bac2de;
$pink: #f5c2e7;
$green: #a6e3a1;
$grey: #585b70;
$blue: #89b4fa;
$lightgrey: #a6adc8;
$lightblue: #74c7ec;
```

### Dynamic Variables
Variables are generated from the options system and injected at compile time:
```scss
// Generated variables (example)
$font-name: "Ubuntu Nerd Font";
$font-size: 1.2rem;
$font-weight: 600;
$font-style: normal;

$theme-bar-background: #1e1e2e;
$theme-bar-opacity: 100;
$theme-bar-border-radius: 0.7em;
$theme-bar-margin: 8px;
```

## Component Styling Patterns

### Module Styling Mixin
```scss
@mixin styleModule($class, $config: ()) {
    $config: map-merge($style-module-defaults, $config);
    $text-color: map-get($config, 'text-color');
    $icon-color: map-get($config, 'icon-color');
    $icon-background: map-get($config, 'icon-background');
    $label-background: map-get($config, 'label-background');
    $spacing: map-get($config, 'inner-spacing');
    $border-enabled: map-get($config, 'border-enabled');
    $border-color: map-get($config, 'border-color');
    $icon-size: map-get($config, 'icon-size');

    .#{$class} {
        .bar-button-icon {
            color: $icon-color;
            background-color: $icon-background;
            font-size: $icon-size;
        }

        .bar-button-label {
            color: $text-color;
            background-color: $label-background;
        }

        @if $border-enabled {
            border: 1px solid $border-color;
        }

        > * {
            margin: 0 $spacing;
        }
    }
}
```

### Common Widget Styles
```scss
menu {
    margin: 6px;
    padding: 6px;
    background-color: $primary_bg;
    background-clip: border-box;
    border-radius: 12px;
    border: 1px solid $secondary_bg;

    menuitem {
        transition: background-color 75ms cubic-bezier(0, 0, 0.2, 1);
        min-height: 20px;
        min-width: 40px;
        padding: 4px 8px;
        color: #ffffff;
        border-radius: 6px;

        &:hover,
        &:active {
            background-color: $secondary_bg;
        }

        &:disabled {
            color: $secondary_bg;
        }
    }
}
```

### Responsive Styling
```scss
// Bar button styles adapt to configuration
.bar_item_box_visible {
    &.style1 {
        // Default style
        .bar-button-icon,
        .bar-button-label {
            padding: 4px 8px;
        }
    }

    &.style2 {
        // Split style
        .bar-button-icon {
            border-radius: 8px 0 0 8px;
        }
        
        .bar-button-label {
            border-radius: 0 8px 8px 0;
        }
    }

    &.style3 {
        // Wave style
        clip-path: polygon(0% 0%, 90% 0%, 100% 50%, 90% 100%, 0% 100%);
    }

    &.no-label {
        .bar-button-label {
            display: none;
        }
    }
}
```

## Theme Import/Export

### Theme Application
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

This styling system provides a comprehensive, reactive theming solution that supports both manual configuration and automatic color generation from wallpapers.
