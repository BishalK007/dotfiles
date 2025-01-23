#!/bin/bash

# Close any existing capture popup
bash "$HOME/.config/eww/widgets/capture/scripts/open-capture-popup.sh" --close &
sleep 0.6

# Start the capture process (synchronously)
bash "$HOME/.config/eww/widgets/capture/scripts/capture.sh" "$@"

# PID file location (must match the one in capture.sh)
PID_FILE="/tmp/eww-recorder"

# Function to format seconds into D:HH:MM:SS, omitting leading zero units
format_time() {
    local total_seconds=$1
    local days=$((total_seconds / 86400))
    local hours=$(( (total_seconds % 86400) / 3600 ))
    local minutes=$(( (total_seconds % 3600) / 60 ))
    local seconds=$((total_seconds % 60))
    local formatted_time=""

    # Append days if non-zero
    if [ $days -gt 0 ]; then
        formatted_time+="${days}d:"
    fi

    # Append hours if non-zero or if days are non-zero
    if [ $hours -gt 0 ] || [ $days -gt 0 ]; then
        formatted_time+=$(printf "%02dh:" $hours)
    fi

    # Append minutes if non-zero or if hours/days are non-zero
    if [ $minutes -gt 0 ] || [ $hours -gt 0 ] || [ $days -gt 0 ]; then
        formatted_time+=$(printf "%02dm:" $minutes)
    fi

    # Append seconds
    formatted_time+=$(printf "%02ds" $seconds)

    echo "$formatted_time"
}

# Monitoring loop to update Eww variable every second
(
    # Wait for the PID file to be created (with a timeout to prevent infinite loop)
    TIMEOUT=30  # seconds
    elapsed=0
    while [ ! -f "$PID_FILE" ] && [ $elapsed -lt $TIMEOUT ]; do
        sleep 0.1
        elapsed=$(echo "$elapsed + 0.1" | bc)
    done

    if [ ! -f "$PID_FILE" ]; then
        echo "Failed to start recording: PID file not found. Exiting monitoring loop."
        exit 1
    fi

    capture_pid=$(cat "$PID_FILE")

    # Initialize the start time
    start_time=$(date +%s)

    while kill -0 "$capture_pid" 2>/dev/null; do
        current_time=$(date +%s)
        elapsed_time=$((current_time - start_time))
        formatted_time=$(format_time "$elapsed_time")
        eww update -c "$HOME/.config/hypr/eww" stop_icon_with_duration=" $formatted_time"
        sleep 1
    done

    # Reset the Eww variable after the capture process ends
    eww update -c "$HOME/.config/hypr/eww" stop_icon_with_duration=" 0s"
) &
