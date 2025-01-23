bash $HOME/.config/eww/widgets/workspaces/scripts/workspaces-listener.sh & 

## HAVE widget daemons leaded in memA

#AUDIO
echo -e "\e[33mSTARTING AUDIO DAEMON\e[0m"
eww daemon -c "$HOME/.config/eww/widgets/audio/audio-dropdown" 

#BRIGHTNESS
echo -e "\e[33mSTARTING BRIGHTNESS DAEMON\e[0m"
eww daemon -c "$HOME/.config/eww/widgets/brightness/brightness-dropdown" 

#CAPTURE
echo -e "\e[33mSTARTING CAPTURE DAEMON\e[0m"
eww daemon -c "$HOME/.config/eww/widgets/capture/capture-dropdown" 

#NETWORK
echo -e "\e[33mSTARTING NETWORK DAEMON\e[0m"
eww daemon -c "$HOME/.config/eww/widgets/network/network-dropdown" 

#SYSTEM BUTTONS
echo -e "\e[33mSTARTING SYSTEM DAEMON\e[0m"
eww daemon -c "$HOME/.config/eww/widgets/system-buttons/system-dropdown" 

#SYSTRAY ## we start and close it so that applets can utilise it in startup
echo -e "\e[33mSTARTING SYSTRAY DAEMON\e[0m"
eww daemon -c "$HOME/.config/eww/widgets/systray/systray-dropdown" 
# eww open systray_dropdown -c "$HOME/.config/eww/widgets/systray/systray-dropdown" --arg x_pos="0" --arg widget_width="100"
# eww close systray_dropdown -c "$HOME/.config/eww/widgets/systray/systray-dropdown"

## RUN EWW BAR
echo -e "\e[33mSTARTING EWW BAR\e[0m"
eww daemon -c ~/.config/eww/
eww open eww-bar -c ~/.config/eww/