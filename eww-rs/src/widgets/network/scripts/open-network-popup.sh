#!/bin/bash

# Default values
x_pos=100
widget_width=300

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --x-pos)
            shift
            x_pos="$1"
            ;;
        *)
            echo "Unknown parameter passed: $1"; exit 1;;
    esac
    shift
done

# Fetch monitor information
monitor_info=$(hyprctl monitors -j | jq '.[] | select(.focused == true) | {width: .width, height: .height, scale: .scale}')

# Extract width and scaling factor
width=$(echo "$monitor_info" | jq '.width')
scale=$(echo "$monitor_info" | jq '.scale')

# Calculate the adjusted x_pos
adjusted_x_pos=$(($x_pos - $widget_width / 2))
max_x_pos=$(echo "$width / $scale - $widget_width" | bc)

# Check if adjusted_x_pos exceeds the available width or is less than 0
if (( $(echo "$adjusted_x_pos > $max_x_pos" | bc -l) )); then
    x_pos=$(echo "$width / $scale - $widget_width" | bc)
elif (( $(echo "$adjusted_x_pos < 0" | bc -l) )); then
    x_pos=0
else
    x_pos=$adjusted_x_pos
fi

echo "$x_pos"


# Open the EWW window at the specified x-coordinate using the temporary config directory
# eww open network_dropdown --toggle -c /tmp/network-dropdown
eww open network_dropdown --toggle -c "$HOME/.config/eww/src/widgets/network/network-dropdown" --arg x_pos="$x_pos" --arg widget_width="$widget_width"
