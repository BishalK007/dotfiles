#!/usr/bin/env bash

#  The logic od runnign this script is as folows: 
# 1. check the current location of itself and store it in CURRENT_DIR
# 2. FOR each .desktop fille present in the curent directory
#    a. Replace the following placeholders in the .desktop file with actual paths:
#       - %CURRENT_DIR%: The directory where this script is located
#       - %PARENT_DIR%: The parent directory of where this script is located
#       - %HOME%: The user's home directory
#    b. Copy the modified .desktop file to the user's local applications directory (~/.local/share/applications/)
#       - If same name file exist Print the existing file, ask user whether to overwrite or skip (y/N) -> default is skip
# 3. End of script

CURRENT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
PARENT_DIR="$(dirname "$CURRENT_DIR")"
TARGET_DIR="$HOME/.local/share/applications"

# Query and confirm HOME directory
DETECTED_HOME="$HOME"
USER_HOME=""

if [[ -n "$DETECTED_HOME" ]]; then
    echo "Detected HOME directory: $DETECTED_HOME"
    read -p "Do you want to use this for %HOME% replacement? (Y/n): " -n 1 -r response
    echo
    
    if [[ "$response" =~ ^[Nn]$ ]]; then
        read -p "Enter HOME directory path: " USER_HOME
    else
        USER_HOME="$DETECTED_HOME"
    fi
else
    read -p "Enter HOME directory path: " USER_HOME
fi

echo "Using HOME directory: $USER_HOME"
echo ""

# Create target directory if it doesn't exist
mkdir -p "$TARGET_DIR"

# Find all .desktop files in current directory
for desktop_file in "$CURRENT_DIR"/*.desktop; do
    # Skip if no .desktop files found
    [[ -e "$desktop_file" ]] || continue
    
    filename="$(basename "$desktop_file")"
    target_file="$TARGET_DIR/$filename"
    
    echo "Processing: $filename"
    
    # Check if target file already exists
    if [[ -f "$target_file" ]]; then
        echo "  File already exists: $target_file"
        read -p "  Overwrite? (y/N): " -n 1 -r response
        echo
        
        # Default to N (skip) if empty or not 'y'/'Y'
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            echo "  Skipped."
            continue
        fi
    fi
    
    # Replace %CURRENT_DIR%, %PARENT_DIR%, and %HOME% placeholders and copy to target directory
    sed -e "s|%CURRENT_DIR%|$CURRENT_DIR|g" \
        -e "s|%PARENT_DIR%|$PARENT_DIR|g" \
        -e "s|%HOME%|$USER_HOME|g" \
        "$desktop_file" > "$target_file"
    chmod +x "$target_file"
    
    echo "  ✓ Installed to: $target_file"
done

echo ""
echo "Done! Desktop files have been processed."
