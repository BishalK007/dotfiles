#!/bin/bash

# Function to get the current workspace
get_current_workspace() {
    hyprctl monitors -j | jq '.[] | select(.focused==true).activeWorkspace.id'
}

# Function to get all workspaces
get_workspaces() {
    hyprctl workspaces -j | jq '.[].id' | sort -n
}

# Parse the arguments
case "$1" in
    --curr)
        get_current_workspace
        ;;
    --prev)
        current=$(get_current_workspace)
        if (( current - 1 < 0 )); then
            echo "!"
        else
            echo $((current - 1))
        fi
        ;;
    --next)
        current=$(get_current_workspace)
        workspaces=($(get_workspaces))
        index=-1

        # Find the current workspace index
        for i in "${!workspaces[@]}"; do
            if [ "${workspaces[$i]}" == "$current" ]; then
                index=$i
                break
            fi
        done

        if [ $index -lt $((${#workspaces[@]} - 1)) ]; then
            echo "${workspaces[$((index + 1))]}"
        else
            echo "!"
        fi
        ;;
    *)
        echo "Usage: $0 {--curr|--prev|--next}"
        exit 1
        ;;
esac
