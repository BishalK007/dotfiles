#!/bin/sh
###############################################################################
#                                                                             #
#       __        __   _                                                      #
#       \ \      / /__| | ___ ___  _ __ ___   ___                             #
#        \ \ /\ / / _ \ |/ __/ _ \| '_ ` _ \ / _ \                            #
#         \ V  V /  __/ | (_| (_) | | | | | |  __/                            #
#          \_/\_/ \___|_|\___\___/|_| |_| |_|\___|                            #
#                                                                             #
#   Workspace Change Listener Script                                          #
#                                                                             #
#   Description:                                                              #
#     Listens for workspace changes in Hyprland and updates Eww widgets with  #
#     the current, previous, and next workspace numbers.                      #
###############################################################################

EWW_CONFIG_DIR="$HOME/.config/eww/"

handle() {
  line="$1"

  if echo "$line" | grep -q "^workspace>>"; then
    # Extract the current workspace number
    curr_workspace="${line#workspace>>}"

    # Ensure the workspace number is an integer
    if ! echo "$curr_workspace" | grep -q '^[0-9]\+$'; then
      echo "Invalid workspace number: $curr_workspace"
      return
    fi

    # Calculate previous and next workspace numbers
    prev_workspace=$((curr_workspace - 1))
    next_workspace=$((curr_workspace + 1))

    # Optional: Handle edge cases (e.g., workspace numbers less than 1)
    [ "$prev_workspace" -lt 1 ] && prev_workspace=""
    # Adjust according to your maximum workspace number if needed

    # Update eww widgets
    eww update -c "$EWW_CONFIG_DIR" curr_workspace="$curr_workspace"
    eww update -c "$EWW_CONFIG_DIR" prev_workspace="$prev_workspace"
    eww update -c "$EWW_CONFIG_DIR" next_workspace="$next_workspace"

    echo "Updated workspaces: prev=$prev_workspace, current=$curr_workspace, next=$next_workspace"
  fi
}

# Listen to the socket and process lines
socat -U - UNIX-CONNECT:"$XDG_RUNTIME_DIR"/hypr/"$HYPRLAND_INSTANCE_SIGNATURE"/.socket2.sock | while read -r line; do
  handle "$line"
  # echo $line
done