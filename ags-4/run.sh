#!/bin/bash

# Function to display help
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --debug    Run AGS with GTK_DEBUG=interactive for debugging"
    echo "  --kill     Kill all existing AGS processes before running"
    echo "  --disown   Run AGS in background, detached from terminal"
    echo "  --help     Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                Run AGS with file watching"
    echo "  $0 --debug       Run AGS in debug mode with file watching"
    echo "  $0 --kill        Kill existing AGS processes then run"
    echo "  $0 --disown      Run AGS in background, detached from terminal"
    echo "  $0 --kill --debug --disown Kill existing processes, run in debug mode in background"
}

# Resolve and reuse the AGS config directory once
WATCH_DIR="$(realpath /home/bishal/.config/ags)"

# Prefer running inside the project's devShell so all Astal libs (notifd, etc.) are available
RUN_PREFIX=""
if command -v nix >/dev/null 2>&1; then
    RUN_PREFIX="nix develop -c"
fi

# Ensure Gio finds schemas via devShell (flake.nix). Kept here commented as a fallback.
# NOTIFD_SCHEMA_DIR=$(bash -lc 'echo /nix/store/*-astal-notifd-*/share/gsettings-schemas/astal-notifd-*/glib-2.0/schemas' 2>/dev/null | awk '{print $1}')
# if [[ -d "$NOTIFD_SCHEMA_DIR" ]]; then
#     export GSETTINGS_SCHEMA_DIR="${NOTIFD_SCHEMA_DIR}:${GSETTINGS_SCHEMA_DIR:-}"
# fi

# Check for help flag
if [[ "$@" == *"--help"* ]]; then
    show_help
    exit 0
fi

# Kill existing AGS processes if --kill flag is present
if [[ "$@" == *"--kill"* ]]; then
    echo "Killing existing AGS processes..."
    pkill -x ags 2>/dev/null || true
    sleep 1
fi

# Run AGS based on debug and disown flags
if [[ "$@" == *"--disown"* ]]; then
    if [[ "$@" == *"--debug"* ]]; then
        echo "Running AGS in debug mode in background..."
    ${RUN_PREFIX} watchexec -w "${WATCH_DIR}" --exts js,ts,jsx,tsx,css,scss --ignore 'colors.scss' --restart -- sh -c \'GTK_DEBUG=interactive ags run --gtk 4 -d $(realpath /home/bishal/.config/ags)\' > /dev/null 2>&1 &
    else
        echo "Running AGS in background..."
    ${RUN_PREFIX} watchexec -w "${WATCH_DIR}" --exts js,ts,jsx,tsx,css,scss --ignore 'colors.scss' --restart -- sh -c \'ags run --gtk 4 -d $(realpath /home/bishal/.config/ags)\' > /dev/null 2>&1 &
    fi
    disown
    echo "AGS is now running in the background. You can safely close this terminal."
else
    if [[ "$@" == *"--debug"* ]]; then
    ${RUN_PREFIX} watchexec -w "${WATCH_DIR}" --exts js,ts,jsx,tsx,css,scss --ignore 'colors.scss' --restart -- sh -c \'GTK_DEBUG=interactive ags run --gtk 4 -d $(realpath /home/bishal/.config/ags)\'
    else
    ${RUN_PREFIX} watchexec -w "${WATCH_DIR}" --exts js,ts,jsx,tsx,css,scss --ignore 'colors.scss' --restart -- sh -c \'ags run --gtk 4 -d $(realpath /home/bishal/.config/ags)\'
    fi
fi
