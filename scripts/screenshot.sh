#!/bin/bash

# Check if there are arguments passed
if [ $# -eq 0 ]; then
    echo "No arguments provided. Usage: ./screenshot.sh <options>"
    exit 1
fi

# Default values
file="$HOME/Pictures/Screenshots/screenshot_$(date +%F_%T).png"

# Initialize option variables
fullscreen=false
region=false
wlcopy=false
openedit=false

# Parse options
for arg in "$@"; do
    case $arg in
        -h|--help)
            echo "Usage: ./script.sh [options]"
            echo "Options:"
            echo "  -h, --help       Show this help message"
            echo "  --fullscreen     Take a fullscreen screenshot"
            echo "  --region         Take a regional screenshot"
            echo "  --wl-copy        Copy the screenshot to clipboard"
            echo "  --open-edit      Open the screenshot in Pinta"
            exit 0
            ;;
        --fullscreen)
            fullscreen=true
            ;;
        --region)
            region=true
            ;;
        --wl-copy)
            wlcopy=true
            ;;
        --open-edit)
            openedit=true
            ;;
        *)
            echo "Unknown option: $arg"
            exit 1
            ;;
    esac
done

# Ensure either --fullscreen or --region is specified
if [ "$fullscreen" = false ] && [ "$region" = false ]; then
    echo "You must specify either --fullscreen or --region."
    exit 1
fi

# Prevent both --fullscreen and --region from being used together
if [ "$fullscreen" = true ] && [ "$region" = true ]; then
    echo "You cannot use both --fullscreen and --region options together."
    exit 1
fi

# Take screenshot
if [ "$fullscreen" = true ]; then
    echo "Taking fullscreen screenshot..."
    grim -t png "$file"
elif [ "$region" = true ]; then
    echo "Taking regional screenshot..."
    grim -g "$(slurp)" -t png "$file"
fi

# Copy to clipboard if requested
if [ "$wlcopy" = true ]; then
    echo "Copying screenshot to clipboard..."
    wl-copy < "$file"
fi

# Open in Pinta if requested
if [ "$openedit" = true ]; then
    echo "Opening screenshot in Pinta..."
    pinta "$file"
fi

# Main script logic
echo "Script completed successfully."


