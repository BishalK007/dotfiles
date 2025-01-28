# -----------------------------
#  Parse Command-Line Arguments
# -----------------------------
while [[ "$#" -gt 0 ]]; do
    case "$1" in
        --increase-volume)
            bash $HOME/.config/eww/src/widgets/audio/scripts/volume-ctrl.sh --increase-volume
        ;;
        --decrease-volume)
            bash $HOME/.config/eww/src/widgets/audio/scripts/volume-ctrl.sh --decrease-volume
        ;;
        --mute-toggle)
            bash $HOME/.config/eww/src/widgets/audio/scripts/volume-ctrl.sh --mute-toggle
        ;;
        --update-eww)
            EWW_MAIN_CONF="$HOME/.config/dotfiles/eww-rs/src"
            EWW_BRIGHTNESS_DROPDOWN_CONF="$HOME/.config/eww/src/widgets/audio/audio-dropdown/"
            
            ICON=$(bash $HOME/.config/eww/src/widgets/audio/scripts/volume-ctrl.sh --get-volume-icon)
            eww -c $EWW_MAIN_CONF update audio_icon="$ICON"
            
            VOLUME=$(bash $HOME/.config/eww/src/widgets/audio/scripts/volume-ctrl.sh --get-volume)
            BOOSTER=$(bash $HOME/.config/eww/src/widgets/audio/scripts/volume-ctrl.sh --get-boost-percentage)
            
            eww update audio_slider_val="$VOLUME" audio_booster_val="$BOOSTER" -c $EWW_BRIGHTNESS_DROPDOWN_CONF
        ;;
        *)
            echo "Unknown parameter passed: $1"
            exit 1
        ;;
    esac
    shift
done