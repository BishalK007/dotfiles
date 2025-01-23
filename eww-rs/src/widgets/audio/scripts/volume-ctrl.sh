#!/bin/sh

# ----------------------------------------
# Volume Control Script for Eww bar using PipeWire (wpctl)
# ----------------------------------------

# TEMP_FILE="/tmp/last_volume_for_waybar_script"
VOLUME_OUTPUT=$(wpctl get-volume @DEFAULT_AUDIO_SINK@)
VOLUME=$(echo "$VOLUME_OUTPUT" | awk '{print $2}')
VOLUME_PERCENT=$(awk -v vol="$VOLUME" 'BEGIN { printf "%.0f", vol * 100 }')
VOLUME_LIMIT="1.5" # 1 -> 100%, 1.5 -> 150% like that

#gets the muted status of the default audio sink
IS_MUTED=$(wpctl status | awk '/Audio/,/Video/' | awk '/Sinks/,/Sources/' | grep -E '^[[:space:]]*(├─|│)[[:space:]]+(\*+)' | grep -q 'MUTED' && echo true || echo false)

# Function to display current volume with icon for Waybar
get_volume_icon() {
    if [[ "$IS_MUTED" == "true" ]]; then
        ICON="(label :text \"󰖁\" :class \"audio-icon\")"  # Mute icon
    elif [[ "$VOLUME" == "0.00" ]]; then
        ICON="(label :text \"󰝟\" :class \"audio-icon\")"  # Mute icon
    elif [[ "$VOLUME" < 0.3 ]]; then
        ICON="(label :text \"󰕿\" :class \"audio-icon\")"  # Low volume icon
    elif [[ "$VOLUME" < 0.7 ]]; then
        ICON="(label :text \"󰖀\" :class \"audio-icon\")"  # Medium volume icon
    else
        ICON="(label :text \"󰕾\" :class \"audio-icon\")"   # High volume icon
    fi
    if [[ "$VOLUME" > 1.0 ]]; then
        ICON="(label :text \"󰕾\" :class \"audio-icon-red\")"   # Boosted volume icon
    fi
    printf '%s \n' "$ICON"
}

get_volume() {
    printf '%d\n' "$(if [ "$VOLUME_PERCENT" -gt 100 ]; then echo 100; else echo "$VOLUME_PERCENT"; fi)"
}
get_boost() {
    printf '%d\n' "$(if [ "$VOLUME_PERCENT" -gt 100 ]; then echo "$(($VOLUME_PERCENT - 100))"; else echo "0"; fi)"
}

get_boost_percentage() {
    if [ "$VOLUME_PERCENT" -le 100 ]; then
        printf '0\n'
    else
        BOOST=$(($VOLUME_PERCENT - 100))
        DENOMINATOR=$(echo "$VOLUME_LIMIT * 100 - 100" | bc)
        BOOST_PERCENTAGE=$(echo "$BOOST * 100 / $DENOMINATOR" | bc)
        printf '%d\n' "$BOOST_PERCENTAGE"
    fi
}

# Handle command-line arguments
case "$1" in
    --get-volume-icon)
        get_volume_icon
    ;;
    --get-volume)
        get_volume
    ;;
    --get-boost)
        get_boost
    ;;
    --get-boost-percentage)
        get_boost_percentage
    ;;
    --increase-volume)
        wpctl set-volume -l "$VOLUME_LIMIT" @DEFAULT_AUDIO_SINK@ 5%+
        # SIGNAL FOR UPDATE
        pkill -RTMIN+"$VOLUME_WAYBAR_UPDATE_SIGNAL" waybar
    ;;
    --decrease-volume)
        wpctl set-volume @DEFAULT_AUDIO_SINK@ 5%-
        # SIGNAL FOR UPDATE
        pkill -RTMIN+"$VOLUME_WAYBAR_UPDATE_SIGNAL" waybar
    ;;
    --mute-toggle)
        wpctl set-mute @DEFAULT_AUDIO_SINK@ toggle
        # SIGNAL FOR UPDATE
        pkill -RTMIN+"$VOLUME_WAYBAR_UPDATE_SIGNAL" waybar
    ;;
    *)
        echo "Usage: $0 {--get-volume | --get-boost | --get-volume-icon | --increase-volume | --decrease-volume | --mute-toggle}"
    ;;
esac

