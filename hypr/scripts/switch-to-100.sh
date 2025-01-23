
# Workspace to move windows to
TARGET_WORKSPACE=100

# Directory to store temporary files for each workspace
TMP_DIR="/tmp/hypr_window_toggle"
mkdir -p "$TMP_DIR"

# Check if jq is installed
if ! command -v jq >/dev/null 2>&1; then
    echo "Error: jq is required but not installed."
    exit 1
fi

# Get the current workspace ID
current_workspace=$(hyprctl monitors -j | jq -r '.[] | select(.focused == true) | .activeWorkspace.id')

# Temporary file for the current workspace
TMP_FILE="$TMP_DIR/workspace_$current_workspace"

if [ -f "$TMP_FILE" ]; then
    # Second press: Move windows back to their original workspaces
    # Get the address of the active window (should be the one we want to keep focused)
    active_window_address=$(hyprctl activewindow -j | jq -r '.address')

    while IFS=, read -r window_address original_workspace; do
        hyprctl dispatch movetoworkspace "$original_workspace,address:$window_address"
    done < "$TMP_FILE"
    # Remove the temporary file
    rm "$TMP_FILE"
    # Switch back to current workspace
    hyprctl dispatch workspace "$current_workspace"
    # Refocus the original active window
    hyprctl dispatch focuswindow address:$active_window_address
else
    # First press: Move windows (except active) to TARGET_WORKSPACE
    # Get active window address
    active_window_address=$(hyprctl activewindow -j | jq -r '.address')

    # Get all windows on the current workspace except the active window
    windows_to_move=$(hyprctl clients -j | jq -r \
        --arg active "$active_window_address" \
        --argjson workspace "$current_workspace" \
        '.[] | select(.workspace.id == $workspace and .address != $active) | "\(.address),\(.workspace.id)"')

    if [ -z "$windows_to_move" ]; then
        echo "No windows to move."
        exit 0
    fi

    # Move windows to TARGET_WORKSPACE and save their addresses and original workspaces
    echo "$windows_to_move" > "$TMP_FILE"
    while IFS=, read -r window_address original_workspace; do
        hyprctl dispatch movetoworkspace "$TARGET_WORKSPACE,address:$window_address"
    done < "$TMP_FILE"
    # Switch back to current workspace
    hyprctl dispatch workspace "$current_workspace"
    # Refocus the original active window
    hyprctl dispatch focuswindow address:$active_window_address
fi
