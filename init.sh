#!/bin/bash

# Define the array of symlink pairs
# Format: "<repo-folder>:<symlink-location>"

DOTFILES_REPO_LOCATION="/home/bishal/.config/dotfiles" # -> change this based on ut dotfiles repo location 

symlinks=(
    "$DOTFILES_REPO_LOCATION/hypr:$HOME/.config/hypr"
    # "$DOTFILES_REPO_LOCATION/eww-rs:$HOME/.config/eww"
    "$DOTFILES_REPO_LOCATION/ags-4:$HOME/.config/ags"
    "$DOTFILES_REPO_LOCATION/alacritty:$HOME/.config/alacritty"
    "$DOTFILES_REPO_LOCATION/kitty:$HOME/.config/kitty"
    "$DOTFILES_REPO_LOCATION/fastfetch:$HOME/.config/fastfetch"
    "$DOTFILES_REPO_LOCATION/fuzzel:$HOME/.config/fuzzel"
    "$DOTFILES_REPO_LOCATION/yazi:$HOME/.config/yazi"
    # Add more pairs as needed
)

# Function to create symlinks
create_symlink() {
    local repo_folder="$1"
    local symlink_location="$2"

    # Check if the target exists
    if [ -e "$symlink_location" ]; then
        if [ -d "$symlink_location" ]; then
            echo -e "\033[31mERROR: Directory $symlink_location already exists.\033[0m"
            return
        fi
    fi

    # Check if the repo folder exists
    if [ ! -e "$repo_folder" ]; then
        echo -e "\033[31mERROR: Repository folder $repo_folder does not exist.\033[0m"
        return
    fi

    # Create the symlink
    ln -sfT "$repo_folder" "$symlink_location"
    echo "Symlink created: $repo_folder -> $symlink_location"
}

# Iterate over the symlink pairs
for pair in "${symlinks[@]}"; do
    # Split the pair into repo_folder and symlink_location
    IFS=':' read -r repo_folder symlink_location <<< "$pair"
    create_symlink "$repo_folder" "$symlink_location"
done