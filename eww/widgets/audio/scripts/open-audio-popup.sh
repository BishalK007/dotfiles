#!/usr/bin/env bash
#
# Audio Dropdown Popup Script
# --------------------------------------------------------
# This script handles opening, closing, toggling, or auto-toggling
# an Eww widget (audio_dropdown) with position logic and timing.
#
# Dependencies:
#   - hyprctl
#   - jq
#   - bc
#   - eww
# --------------------------------------------------------

# -----------------------------
#  Default Configuration
# -----------------------------
x_pos=100
y_pos=5
widget_width=300
action="toggle"          # Default action
auto_toggle_duration=1500  # in milliseconds
# show_widget_till_file="/tmp/audio-widget-show-dropdown-till"
show_widget_till_file="/dev/shm/audio-widget-show-dropdown-till"
position="onMouse"       # popup location options: (onMouse | onBottomCenter)
show_ctrl_buttons=false
close_on_hover_lost="false" 

# -----------------------------
#  Parse Command-Line Arguments
# -----------------------------
while [[ "$#" -gt 0 ]]; do
    case "$1" in
        --position)
            shift
            position="$1"
            ;;
        --x-pos)
            shift
            x_pos="$1"
            ;;
        --y-pos)
            shift
            y_pos="$1"
            ;;
        --toggle)
            action="toggle"
            ;;
        --open)
            action="open"
            ;;
        --close)
            action="close"
            ;;
        --close-bool)
            shift
            if["$1" == true]
                action="close"
            ;;
        --auto-toggle)
            action="autotoggle"
            ;;
        --auto-toggle-duration)
            shift
            auto_toggle_duration="$1"
            ;;
        --show-ctrl-buttons)
            show_ctrl_buttons=true
            ;;
        --close-on-hover-lost)
            close_on_hover_lost=true
            ;;
        *)
            echo "Unknown parameter passed: $1"
            exit 1
            ;;
    esac
    shift
done

# -----------------------------
#  Validate Dependencies
# -----------------------------
for cmd in hyprctl jq bc eww; do
    if ! command -v "$cmd" &>/dev/null; then
        echo "Error: '$cmd' command is not found but is required."
        exit 1
    fi
done

# -----------------------------
#  Fetch Current Monitor Info
# -----------------------------
monitor_info="$(hyprctl monitors -j | jq '.[] | select(.focused == true) | {width: .width, height: .height, scale: .scale}')"
# If monitor_info is empty, handle error
if [[ -z "$monitor_info" || "$monitor_info" == "null" ]]; then
    echo "Error: Could not retrieve monitor information."
    exit 1
fi

# Extract width, height, and scale
width="$(echo "$monitor_info" | jq '.width')"
height="$(echo "$monitor_info" | jq '.height')"
scale="$(echo "$monitor_info" | jq '.scale')"

# -----------------------------
#  Compute Logical Dimensions
# -----------------------------
# We use integer math (floor) for logical width/height
# to avoid fractional pixel issues when placing the widget.
logical_width="$(echo "scale=0; $width / $scale" | bc)"
logical_height="$(echo "scale=0; $height / $scale" | bc)"

# Alternatively, you could do (uncomment):
# logical_width=$(awk -v w="$width" -v s="$scale" 'BEGIN {print int(w/s)}')
# logical_height=$(awk -v h="$height" -v s="$scale" 'BEGIN {print int(h/s)}')

# -----------------------------
#  Position Logic
# -----------------------------
case "$position" in
    onMouse)
        # "onMouse" means we interpret x_pos as the mouse X location,
        # then center the widget around that X. 
        # (That means we shift left by widget_width/2)
        # Make sure we don't go beyond screen boundaries.

        # Convert x_pos to an integer if user passed it as string
        # (shell arithmetic automatically floors if it's not numeric)
        : "$(( x_pos += 0 ))"

        # Calculate the adjusted X so that the widget is centered
        adjusted_x_pos=$(( x_pos - widget_width / 2 ))
        max_x_pos=$(( logical_width - widget_width ))

        if [ "$adjusted_x_pos" -gt "$max_x_pos" ]; then
            # If it exceeds the available width, set it to the max
            x_pos=$max_x_pos
        elif [ "$adjusted_x_pos" -lt 0 ]; then
            # If it goes negative, set it to 0
            x_pos=0
        else
            # Otherwise, use the adjusted value
            x_pos=$adjusted_x_pos
        fi
        ;;
    onBottomCenter)
        # Position near the bottom center of the screen
        # Adjust Y to be around ~200px from the bottom (modify as needed)
        y_pos=$(( logical_height - 200 ))
        x_pos=$(( (logical_width - widget_width) / 2 ))
        ;;
    *)
        echo "Invalid position mode: $position. Use 'onMouse' or 'onBottomCenter'."
        exit 1
        ;;
esac

# -----------------------------
#  Display Configuration
# -----------------------------
echo -e "\n=== Audio Popup Configuration ==="
echo -e "Action:            $action"
echo -e "Position Mode:     $position"
echo -e "\nDisplay Properties:"
echo -e "Monitor Width:     $width"
echo -e "Monitor Height:    $height"
echo -e "Scale Factor:      $scale"
echo -e "Logical Width:     $logical_width"
echo -e "Logical Height:    $logical_height"
echo -e "\nWidget Properties:"
echo -e "X Position:        $x_pos"
echo -e "Y Position:        $y_pos"
echo -e "Widget Width:      $widget_width\n"

# Uncomment if you need a short pause
# sleep 0.3

# -----------------------------
#  Eww Action Handling
# -----------------------------
case "$action" in
    open)
        eww open audio_dropdown \
            -c "$HOME/.config/eww/widgets/audio/audio-dropdown" \
            --arg x_pos="$x_pos" \
            --arg y_pos="$y_pos" \
            --arg widget_width="$widget_width" \
            --arg close_on_hover_lost="$close_on_hover_lost" \
            --arg show_ctrl_buttons="$show_ctrl_buttons"
        ;;
    
    close)
        eww close audio_dropdown \
            -c "$HOME/.config/eww/widgets/audio/audio-dropdown"
        ;;
    
    toggle)
        eww open --toggle audio_dropdown \
            -c "$HOME/.config/eww/widgets/audio/audio-dropdown" \
            --arg x_pos="$x_pos" \
            --arg y_pos="$y_pos" \
            --arg widget_width="$widget_width" \
            --arg close_on_hover_lost="$close_on_hover_lost" \
            --arg show_ctrl_buttons="$show_ctrl_buttons"
        ;;
    
    autotoggle)
        # 1) Get current time in ms
        current_time=$(( $(date +%s%N) / 1000000 ))
        new_close_time=$(( current_time + auto_toggle_duration ))
        
        # 2) If the file already exists, check if the widget is still open
        if [ -f "$show_widget_till_file" ]; then
            till_time="$(cat "$show_widget_till_file")"
            if [ "$current_time" -lt "$till_time" ]; then
                # Widget is still open; just update close time
                echo "$new_close_time" > "$show_widget_till_file"
            else
                # Widget is closed (time expired); re-open
                eww open audio_dropdown \
                    -c "$HOME/.config/eww/widgets/audio/audio-dropdown" \
                    --arg x_pos="$x_pos" \
                    --arg y_pos="$y_pos" \
                    --arg widget_width="$widget_width" \
                    --arg close_on_hover_lost="$close_on_hover_lost" \
                    --arg show_ctrl_buttons="$show_ctrl_buttons"
                echo "$new_close_time" > "$show_widget_till_file"
            fi
        else
            # 3) If the file doesn't exist, open the widget
            eww open audio_dropdown \
                -c "$HOME/.config/eww/widgets/audio/audio-dropdown" \
                --arg x_pos="$x_pos" \
                --arg y_pos="$y_pos" \
                --arg widget_width="$widget_width" \
                --arg close_on_hover_lost="$close_on_hover_lost" \
                --arg show_ctrl_buttons="$show_ctrl_buttons"
            echo "$new_close_time" > "$show_widget_till_file"
        fi
        
        # 4) Start the auto-close timer in the background
        (
            # We loop until current_time >= close_time
            while true; do
                current_time=$(( $(date +%s%N) / 1000000 ))
                # If the file is missing (manually closed), exit
                if [ ! -f "$show_widget_till_file" ]; then
                    exit 0
                fi
                # Otherwise read the till_time
                till_time="$(cat "$show_widget_till_file")"
                if [ "$current_time" -ge "$till_time" ]; then
                    eww close audio_dropdown \
                        -c "$HOME/.config/eww/widgets/audio/audio-dropdown"
                    rm -f "$show_widget_till_file"
                    exit 0
                fi
                sleep 0.5
            done
        ) &
        ;;
    
    *)
        echo "Invalid action specified: $action"
        exit 1
        ;;
esac
