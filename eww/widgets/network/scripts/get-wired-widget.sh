#!/bin/bash
eww update -c $HOME/.config/eww/widgets/network/network-dropdown wired_conns_widget="(label :text 'Loading...')"

# Run the network script and store the JSON output
network_json=$(bash $HOME/.config/eww/widgets/network/scripts/list-networks.sh --wired)

# Parse the JSON to get device names using jq
device_names=$(echo "$network_json" | jq -r '.[].DEVICE')

# Initialize an empty variable to store the widget definition
widget_definition="(box "

# Add the scrollable box settings
widget_definition+=" :orientation 'v'"
# widget_definition+="\n    :height 100"

# Loop over each device name and create a label for each
for device in $device_names; do
    widget_definition+=" (label "
    widget_definition+="  :text '$device'"
    widget_definition+=" )"
done

# Close the widget definition
widget_definition+=")"

# Echo the complete widget definition at once
echo -e "$widget_definition"

eww update -c $HOME/.config/eww/widgets/network/network-dropdown wired_conns_widget="$widget_definition"
