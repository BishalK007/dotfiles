# HyprPanel Project Overview

## Table of Contents
- [HyprPanel Project Overview](#hyprpanel-project-overview)
  - [Table of Contents](#table-of-contents)
  - [Project Purpose](#project-purpose)
  - [High-Level Architecture](#high-level-architecture)
  - [Technology Stack](#technology-stack)
    - [Core Framework](#core-framework)
    - [UI Technologies](#ui-technologies)
    - [Build \& Package Management](#build--package-management)
    - [External Integrations](#external-integrations)
  - [Core Dependencies](#core-dependencies)
    - [Runtime Dependencies](#runtime-dependencies)
    - [Development Dependencies](#development-dependencies)
  - [Project Structure](#project-structure)
  - [Build System](#build-system)
    - [Meson Configuration](#meson-configuration)
    - [TypeScript Configuration](#typescript-configuration)
  - [Development Environment](#development-environment)
    - [Prerequisites](#prerequisites)
    - [Development Workflow](#development-workflow)
    - [Environment Variables](#environment-variables)

## Project Purpose

HyprPanel is a modern, customizable panel built specifically for the Hyprland window manager using the Astal framework. It provides a comprehensive desktop experience with:

- **Dynamic Bar System**: Multi-monitor support with customizable layouts
- **Rich Menu System**: Dropdown menus for audio, network, bluetooth, media, and system controls
- **On-Screen Display (OSD)**: Visual feedback for volume, brightness, and other system changes
- **Notification System**: Desktop notifications with customizable positioning and behavior
- **Settings Interface**: GUI configuration with real-time preview
- **Theme System**: Extensive theming with Matugen integration for automatic color generation

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    HyprPanel Application                     │
├─────────────────────────────────────────────────────────────┤
│  Entry Point (app.ts)                                      │
│  ├── Session Management                                     │
│  ├── Style System (SCSS)                                   │
│  ├── Global Utilities                                      │
│  └── Component Initialization                              │
├─────────────────────────────────────────────────────────────┤
│  Core Components                                           │
│  ├── Bar System (Multi-monitor)                           │
│  ├── Menu System (Dropdowns)                              │
│  ├── Notification System                                   │
│  ├── OSD System                                           │
│  └── Settings Dialog                                       │
├─────────────────────────────────────────────────────────────┤
│  Service Layer                                             │
│  ├── Brightness Service                                    │
│  ├── System Services (CPU, RAM, GPU, Storage)             │
│  ├── Wallpaper Service                                     │
│  └── Matugen Service (Theme Generation)                   │
├─────────────────────────────────────────────────────────────┤
│  External Services (Astal Bindings)                       │
│  ├── AstalHyprland (Window Manager)                       │
│  ├── AstalNetwork (Network Management)                    │
│  ├── AstalBluetooth (Bluetooth)                          │
│  ├── AstalWp (Audio via WirePlumber)                     │
│  ├── AstalBattery (Power Management)                      │
│  └── AstalNotifd (Notifications)                         │
├─────────────────────────────────────────────────────────────┤
│  Configuration System                                      │
│  ├── Options Tree (src/options.ts)                        │
│  ├── Settings Persistence                                  │
│  └── Theme Management                                      │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Core Framework
- **Astal**: Modern GTK3-based framework for desktop widgets
- **TypeScript**: Primary development language
- **JSX/React**: Component syntax via Astal's JSX implementation
- **GObject**: Object system for service bindings

### UI Technologies
- **GTK3**: Native Linux desktop toolkit
- **SCSS**: Styling with advanced features and theming
- **CSS**: Final compiled styles

### Build & Package Management
- **Meson**: Primary build system
- **npm**: Node.js package management
- **Nix**: Declarative package management and deployment
- **AGS (Astal)**: Bundling and compilation

### External Integrations
- **Hyprland**: Target window manager
- **WirePlumber**: Audio system integration
- **NetworkManager**: Network management
- **BlueZ**: Bluetooth stack
- **UPower**: Battery/power management

## Core Dependencies

### Runtime Dependencies
```typescript
// Core Astal bindings
import AstalHyprland from 'gi://AstalHyprland?version=0.1';
import AstalNetwork from 'gi://AstalNetwork?version=0.1';
import AstalBluetooth from 'gi://AstalBluetooth?version=0.1';
import AstalWp from 'gi://AstalWp?version=0.1';
import AstalBattery from 'gi://AstalBattery?version=0.1';
import AstalNotifd from 'gi://AstalNotifd?version=0.1';
import AstalApps from 'gi://AstalApps?version=0.1';

// GTK and GLib
import { App, Astal, Gtk, Gdk } from 'astal/gtk3';
import GLib from 'gi://GLib?version=2.0';
import GdkPixbuf from 'gi://GdkPixbuf';
```

### Development Dependencies
- **sass**: SCSS compilation
- **typescript**: Type checking and compilation
- **@types/node**: Node.js type definitions

## Project Structure

```
HyprPanel/
├── app.ts                 # Application entry point
├── src/
│   ├── components/        # UI components
│   │   ├── bar/          # Bar modules and layout
│   │   ├── menus/        # Dropdown menu system
│   │   ├── notifications/ # Notification widgets
│   │   ├── osd/          # On-screen display
│   │   ├── settings/     # Settings dialog
│   │   └── shared/       # Reusable components
│   ├── lib/              # Utility libraries
│   │   ├── types/        # TypeScript type definitions
│   │   ├── constants/    # Application constants
│   │   ├── behaviors/    # System behaviors
│   │   └── utils.ts      # Utility functions
│   ├── services/         # Custom services
│   ├── globals/          # Global state and utilities
│   ├── scss/             # Styling system
│   ├── cli/              # Command-line interface
│   └── options.ts        # Configuration system
├── themes/               # Theme definitions
├── scripts/              # Build and utility scripts
├── nix/                  # Nix packaging
└── assets/               # Static assets
```

## Build System

### Meson Configuration
```meson
project(
  'hyprpanel',
  default_options: [
    'prefix=/usr',
  ],
)

# Bundle TypeScript with AGS
custom_target(
  'hyprpanel_bundle',
  input: files('app.ts'),
  command: [
    ags, 'bundle',
    '--define', 'DATADIR="' + datadir + '"',
    '--root', meson.project_source_root(),
    meson.project_source_root() / 'app.ts',
    '@OUTPUT@',
  ],
  output: meson.project_name() + '.js',
  install: true,
  install_dir: datadir,
)
```

### TypeScript Configuration
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "jsxImportSource": "astal/gtk3",
    "strict": true,
    "baseUrl": ".",
    "typeRoots": ["src/lib/types"]
  }
}
```

## Development Environment

### Prerequisites
- Node.js and npm
- AGS (Astal framework)
- SASS compiler
- Hyprland window manager
- Required system services (WirePlumber, NetworkManager, etc.)

### Development Workflow
1. **Hot Reload**: SCSS files are monitored for changes
2. **Type Checking**: TypeScript provides compile-time validation
3. **Live Testing**: Changes can be tested without full restart
4. **Configuration**: Settings can be modified through GUI or config files

### Environment Variables
- `SRC_DIR`: Source directory path
- `CONFIG_DIR`: User configuration directory
- `TMP`: Temporary files directory
- `DATADIR`: Installation data directory
