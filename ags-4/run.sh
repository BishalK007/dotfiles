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

# Check for help flag
if [[ "$@" == *"--help"* ]]; then
    show_help
    exit 0
fi

# Kill existing AGS processes if --kill flag is present
if [[ "$@" == *"--kill"* ]]; then
    echo "Killing existing AGS processes..."
    kill $(ps aux | grep ags | grep -v grep | awk '{print $2}') 2>/dev/null || true
    sleep 1
fi

# Run AGS based on debug and disown flags
if [[ "$@" == *"--disown"* ]]; then
    if [[ "$@" == *"--debug"* ]]; then
        echo "Running AGS in debug mode in background..."
    watchexec -w "${WATCH_DIR}" --exts js,ts,jsx,tsx,css,scss --ignore 'colors.scss' --restart -- sh -c \'GTK_DEBUG=interactive ags run --gtk 4 -d $(realpath /home/bishal/.config/ags)\' > /dev/null 2>&1 &
    else
        echo "Running AGS in background..."
    watchexec -w "${WATCH_DIR}" --exts js,ts,jsx,tsx,css,scss --ignore 'colors.scss' --restart -- sh -c \'ags run --gtk 4 -d $(realpath /home/bishal/.config/ags)\' > /dev/null 2>&1 &
    fi
    disown
    echo "AGS is now running in the background. You can safely close this terminal."
else
    if [[ "$@" == *"--debug"* ]]; then
    watchexec -w "${WATCH_DIR}" --exts js,ts,jsx,tsx,css,scss --ignore 'colors.scss' --restart -- sh -c \'GTK_DEBUG=interactive ags run --gtk 4 -d $(realpath /home/bishal/.config/ags)\'
    else
    watchexec -w "${WATCH_DIR}" --exts js,ts,jsx,tsx,css,scss --ignore 'colors.scss' --restart -- sh -c \'ags run --gtk 4 -d $(realpath /home/bishal/.config/ags)\'
    fi
fi
