# Build and Deployment System

## Table of Contents
- [Build System Overview](#build-system-overview)
- [Meson Build Configuration](#meson-build-configuration)
- [Nix Flake System](#nix-flake-system)
- [Package Management](#package-management)
- [Installation Methods](#installation-methods)
- [Development Workflow](#development-workflow)
- [CI/CD Pipeline](#cicd-pipeline)

## Build System Overview

HyprPanel uses a multi-layered build system designed for flexibility and cross-platform support:

### Build Architecture
```
Build System
├── Meson (Primary Build System)
│   ├── TypeScript Bundling (via AGS)
│   ├── Asset Installation
│   ├── Script Configuration
│   └── System Integration
├── Nix Flake (Declarative Packaging)
│   ├── Dependency Management
│   ├── Cross-platform Builds
│   ├── Home Manager Integration
│   └── Overlay System
├── npm (Development Dependencies)
│   ├── TypeScript Tooling
│   ├── Linting & Formatting
│   └── Development Scripts
└── AGS (Application Bundling)
    ├── TypeScript Compilation
    ├── Module Resolution
    └── Runtime Bundling
```

## Meson Build Configuration

### Project Definition
```meson
project(
  'hyprpanel',
  default_options: [
    'prefix=/usr',
  ],
)

prefix = get_option('prefix')
bindir = prefix / get_option('bindir')
datadir = prefix / get_option('datadir') / meson.project_name()
```

### Dependency Detection
```meson
ags = find_program('ags', required: true)
find_program('gjs', required: true)
```

### Application Bundling
```meson
custom_target(
  'hyprpanel_bundle',
  input: files('app.ts'),
  command: [
    ags,
    'bundle',
    '--define', 'DATADIR="' + datadir + '"',
    '--root', meson.project_source_root(),
    meson.project_source_root() / 'app.ts',
    '@OUTPUT@',
  ],
  output: meson.project_name() + '.js',
  install: true,
  install_dir: datadir,
  build_always_stale: true,
)
```

### Launcher Script Configuration
```meson
configure_file(
  input: 'scripts/hyprpanel_launcher.sh.in',
  output: meson.project_name(),
  configuration: {'DATADIR': datadir},
  install: true,
  install_dir: bindir,
  install_mode: 'rwxr-xr-x',
)
```

### Asset Installation
```meson
install_subdir('scripts', install_dir: datadir)
install_subdir('themes', install_dir: datadir)
install_subdir('assets', install_dir: datadir)
install_subdir('src/scss', install_dir: datadir / 'src')
```

### Launcher Script Template
```bash
#!/bin/sh
# scripts/hyprpanel_launcher.sh.in

if [ "$#" -eq 0 ]; then
    exec gjs -m "@DATADIR@/hyprpanel.js"
else
    exec astal -i hyprpanel "$*"
fi
```

## Nix Flake System

### Flake Inputs
```nix
{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";

    ags = {
      url = "github:aylur/ags";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };
}
```

### Package Definition
```nix
packages = forEachSystem (system: let
  pkgs = nixpkgs.legacyPackages.${system};
in {
  default = ags.lib.bundle {
    inherit pkgs;
    src = ./.;
    name = "hyprpanel";
    entry = "app.ts";

    extraPackages =
      (with ags.packages.${system}; [
        tray
        hyprland
        apps
        battery
        bluetooth
        mpris
        cava
        network
        notifd
        powerprofiles
        wireplumber
      ])
      ++ (with pkgs; [
        fish
        typescript
        libnotify
        dart-sass
        fd
        btop
        bluez
        libgtop
        gobject-introspection
        glib
        bluez-tools
        grimblast
        brightnessctl
        gnome-bluetooth
        (python3.withPackages (ps:
          with ps; [
            gpustat
            dbus-python
            pygobject3
          ]))
        matugen
        hyprpicker
        hyprsunset
        hypridle
        wireplumber
        networkmanager
        wf-recorder
        upower
        gvfs
        swww
        pywal
      ]);
  };
});
```

### Overlay System
```nix
overlay = final: prev: {
  hyprpanel = prev.writeShellScriptBin "hyprpanel" ''
    if [ "$#" -eq 0 ]; then
        exec ${self.packages.${final.stdenv.system}.default}/bin/hyprpanel
    else
        exec ${ags.packages.${final.stdenv.system}.io}/bin/astal -i hyprpanel "$*"
    fi
  '';
};
```

### Home Manager Module
```nix
homeManagerModules.hyprpanel = import ./nix/module.nix self;
```

## Package Management

### npm Configuration
```json
{
  "name": "hyprpanel",
  "version": "1.0.0",
  "description": "A customizable panel built for Hyprland.",
  "main": "app.ts",
  "scripts": {
    "lint": "eslint --config .eslintrc.js .",
    "lint:fix": "eslint --config .eslintrc.js . --fix",
    "format": "prettier --write 'modules/**/*.ts'"
  },
  "dependencies": {
    "astal": "/usr/share/astal/gjs"
  },
  "devDependencies": {
    "@types/node": "^22.5.4",
    "@typescript-eslint/eslint-plugin": "^8.5.0",
    "@typescript-eslint/parser": "^8.5.0",
    "eslint": "^8.57.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-import": "^2.30.0",
    "eslint-plugin-prettier": "^5.2.1",
    "prettier": "^3.3.3",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.6.2"
  }
}
```

### TypeScript Configuration
```json
{
  "compilerOptions": {
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022", "DOM"],
    "moduleResolution": "Bundler",
    "allowJs": true,
    "checkJs": false,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "alwaysStrict": true,
    "noImplicitThis": true,
    "baseUrl": ".",
    "typeRoots": ["src/lib/types"],
    "skipLibCheck": true,
    "types": [],
    "experimentalDecorators": true,
    "jsx": "react-jsx",
    "jsxImportSource": "astal/gtk3"
  }
}
```

## Installation Methods

### Manual Installation (Meson)
```bash
git clone https://github.com/Jas-SinghFSU/HyprPanel.git
cd HyprPanel
meson setup build
meson compile -C build
meson install -C build
```

### Nix Flake Installation
```nix
# flake.nix
{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
    hyprpanel.url = "github:Jas-SinghFSU/HyprPanel";
  };

  outputs = { nixpkgs, hyprpanel, ... }: {
    nixosConfigurations.mySystem = nixpkgs.lib.nixosSystem {
      modules = [
        {
          nixpkgs.overlays = [ hyprpanel.overlay ];
          environment.systemPackages = [ pkgs.hyprpanel ];
        }
      ];
    };
  };
}
```

### Home Manager Integration
```nix
# home.nix
{
  programs.hyprpanel = {
    enable = true;
    config.enable = true;
    systemd.enable = true;
    hyprland.enable = true;
    
    settings = {
      layout = {
        "bar.layouts" = {
          "0" = {
            left = [ "dashboard" "workspaces" "windowtitle" ];
            middle = [ "media" ];
            right = [ "volume" "network" "bluetooth" "battery" "systray" "clock" "notifications" ];
          };
        };
      };
    };
    
    override = {
      theme.bar.menus.text = "#123ABC";
    };
  };
}
```

### Home Manager Module Options
```nix
options.programs.hyprpanel = {
  enable = mkEnableOption "HyprPanel";
  config.enable = mkBoolOption true;
  overlay.enable = mkEnableOption "script overlay";
  systemd.enable = mkEnableOption "systemd integration";
  hyprland.enable = mkEnableOption "Hyprland integration";
  overwrite.enable = mkEnableOption "overwrite config fix";

  override = mkOption {
    type = types.attrs;
    default = { };
    description = ''
      An arbitrary set to override the final config with.
      Useful for overriding colors in your chosen theme.
    '';
  };

  settings = {
    layout = mkOption {
      type = jsonFormat.type;
      default = { };
      description = "https://hyprpanel.com/configuration/panel.html";
    };
  };
};
```

## Development Workflow

### Development Dependencies
```bash
# System dependencies (Fedora example)
sudo dnf install wireplumber upower libgtop2 bluez bluez-tools grimblast hyprpicker btop NetworkManager wl-clipboard swww brightnessctl gnome-bluetooth aylurs-gtk-shell power-profiles-daemon gvfs nodejs wf-recorder

# npm dependencies
npm install -g sass

# Optional dependencies
pip install gpustat pywal
```

### Development Scripts
```bash
# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format

# Type checking
npx tsc --noEmit
```

### Build Process
```
1. TypeScript Compilation
   ├── Type checking
   ├── Module resolution
   └── JSX transformation

2. AGS Bundling
   ├── Dependency bundling
   ├── Asset resolution
   └── Runtime preparation

3. Meson Installation
   ├── File copying
   ├── Script configuration
   └── System integration

4. SCSS Compilation
   ├── Variable injection
   ├── SASS compilation
   └── CSS application
```

## CI/CD Pipeline

### GitHub Actions Workflow
```yaml
name: Code Quality

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  code_quality:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout main repository
        uses: actions/checkout@v3

      - name: Node Setup
        uses: actions/setup-node@v3
        with:
          node-version: '21'

      - name: Install Dependencies
        run: npm install

      - name: ESLint
        run: npm run lint

      # - name: Type Check
      #   run: npx tsc --noEmit --pretty --extendedDiagnostics
```

### Quality Assurance
- **ESLint**: Code style and error checking
- **Prettier**: Code formatting
- **TypeScript**: Type safety validation
- **Automated Testing**: CI pipeline validation

### Release Process
1. **Version Tagging**: Semantic versioning
2. **Automated Builds**: Multi-platform compilation
3. **Package Distribution**: Nix flake updates
4. **Documentation Updates**: Synchronized with releases

This build and deployment system provides a robust, flexible foundation for developing, building, and distributing HyprPanel across different platforms and package managers.
