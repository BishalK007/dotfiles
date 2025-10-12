#!/usr/bin/env bash

# Toggle special workspace apps
# Usage: toggle-special-window-app.sh --app <app_name>
#        toggle-special-window-app.sh --toggleOff

APP=""
TOGGLE_OFF=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --app)
            APP="$2"
            shift 2
            ;;
        --toggleOff)
            TOGGLE_OFF=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Handle toggle off mode
if [[ "$TOGGLE_OFF" == true ]]; then
    # Check which special workspace is currently visible on any monitor
    VISIBLE_SPECIAL=$(hyprctl monitors -j | jq -r '.[].specialWorkspace.name' | grep -v '^$' | grep '^special:' | sed 's/^special://' | head -1)
    
    if [[ -n "$VISIBLE_SPECIAL" ]]; then
        # Toggle off the visible special workspace
        hyprctl dispatch togglespecialworkspace "$VISIBLE_SPECIAL"
    fi
    # If no special workspace is visible, do nothing
    exit 0
fi

# Validate app parameter
if [[ -z "$APP" ]]; then
    echo "Error: --app parameter is required"
    echo "Usage: $0 --app <app_name>"
    echo "       $0 --toggleOff"
    exit 1
fi

case "$APP" in
    gemini)
        WORKSPACE="gemini"
        PROCESS_PATTERN="chrome.*GeminiApp"
        LAUNCH_CMD=(
            google-chrome-stable
            --user-data-dir="$HOME/.config/chrome-apps/gemini"
            --class="GeminiApp"
            --new-window
            --app=https://gemini.google.com/app
        )
        ;;
    whatsapp)
        WORKSPACE="whatsapp"
        PROCESS_PATTERN="chrome.*WhatsAppApp"
        LAUNCH_CMD=(
            google-chrome-stable
            --user-data-dir="$HOME/.config/chrome-apps/whatsapp"
            --class="WhatsAppApp"
            --new-window
            --app=https://web.whatsapp.com
        )
        ;;
    ytmusic)
        WORKSPACE="ytmusic"
        PROCESS_PATTERN="chrome.*YTMusicApp"
        LAUNCH_CMD=(
            google-chrome-stable
            --user-data-dir="$HOME/.config/chrome-apps/ytmusic"
            --class="YTMusicApp"
            --new-window
            --app=https://music.youtube.com
        )
        ;;
    calc)
        WORKSPACE="calc"
        PROCESS_PATTERN=".*speedcrunch.*"
        LAUNCH_CMD=(
            speedcrunch
        )
        ;;
    *)
        echo "Error: Unknown app '$APP'"
        echo "Supported apps: \
                - gemini,  \
                - whatsapp, \
                - ytmusic, \
                - calc"
        exit 1
        ;;
esac

# Check if app is already running
if ! pgrep -f "$PROCESS_PATTERN" > /dev/null; then
    # Launch the app in the background
    "${LAUNCH_CMD[@]}" &
fi

# Toggle the special workspace
hyprctl dispatch togglespecialworkspace "$WORKSPACE"
