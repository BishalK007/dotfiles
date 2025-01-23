EWW_MAIN_CONF="$HOME/.config/eww/"
EWW_BRIGHTNESS_DROPDOWN_CONF="$HOME/.config/eww/widgets/brightness/brightness-dropdown/"

eww -c $EWW_MAIN_CONF update brightness_icon=$(bash $HOME/.config/eww/widgets/brightness/scripts/get-brightness-icon.sh) 
eww update brightness_slider_val=$(brightnessctl -m | awk -F, '{print $4}' | tr -d '%') -c $EWW_BRIGHTNESS_DROPDOWN_CONF