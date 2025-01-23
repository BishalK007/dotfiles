#!/bin/bash

usage() {
    echo "Usage: <path-to>/capture.sh [options]"
    echo "Options:"
    echo "  -h, --help           Show this help message"
    echo "  --capture            Take a screenshot"
    echo "      --fullscreen         Use fullscreen mode"
    echo "      --region             Use region selection mode"
    echo "      --wl-copy            Copy the screenshot to clipboard"
    echo "      --open-edit          Open the screenshot in Pinta"
    echo "  --rec-start          Start recording"
    echo "      --fullscreen         Use fullscreen mode"
    echo "      --region             Use region selection mode"
    echo "      --audio              Include audio in the recording"
    echo "  --rec-stop           Stop recording"
    exit 0
}

# Check if there are arguments passed
if [ $# -eq 0 ]; then
    usage
    exit 1
fi

# Default values
SS_location="$HOME/Pictures/Screenshots"
REC_location="$HOME/Videos/Screencasts"

# Avoid colons in the filename
file_id="$(date +%F_%H-%M-%S)"

# PID file location
PID_FILE="/tmp/eww-recorder"

# Initialize option variables
fullscreen=false
region=false
wlcopy=false
openedit=false
capture=false
recording_start=false
recording_stop=false
audio=false

# Parse options
for arg in "$@"; do
    case $arg in
        -h|--help)
            usage
            ;;
        --capture)
            capture=true
            ;;
        --rec-start)
            recording_start=true
            ;;
        --rec-stop)
            recording_stop=true
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
        --audio)
            audio=true
            ;;
        *)
            echo "Unknown option: $arg"
            exit 1
            ;;
    esac
done

# Ensure either --fullscreen or --region is specified unless recording_stop is true
if [ "$recording_stop" != true ] && [ "$fullscreen" = false ] && [ "$region" = false ]; then
    echo "You must specify either --fullscreen or --region."
    exit 1
fi


# Prevent both --fullscreen and --region from being used together
if [ "$fullscreen" = true ] && [ "$region" = true ]; then
    echo "You cannot use both --fullscreen and --region options together."
    exit 1
fi

# Prevent incompatible options
if [ "$capture" = true ] && [ "$recording_start" = true ]; then
    echo "You must specify either --capture or --recording-start, not both."
    exit 1
fi

if [ "$capture" = true ] && [ "$recording_stop" = true ]; then
    echo "You cannot use --capture and --recording-stop together."
    exit 1
fi

if [ "$recording_start" = true ] && [ "$recording_stop" = true ]; then
    echo "You cannot use --recording-start and --recording-stop together."
    exit 1
fi

# Take screenshot
if [ "$capture" = true ]; then
    file="$SS_location/screenshot_$file_id.png"

    grim_command="grim"
    if [ "$fullscreen" = true ]; then
        echo "Taking fullscreen screenshot..."
    elif [ "$region" = true ]; then
        echo "Taking regional screenshot..."        
        grim_command+=" -g \"\$(slurp)\""
    fi

    grim_command+=" -t png \"$file\""
    eval "$grim_command"

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

elif [ "$recording_start" = true ]; then
    # Define the output file with .mp4 extension
    file="$REC_location/screencast_$file_id.mp4"

    # Check if recording is already in progress
    if [ -f "$PID_FILE" ]; then
        echo "Recording is already in progress."
        exit 1
    fi

    # Ensure the output directory exists
    mkdir -p "$REC_location"

    # Initialize the wf-recorder command
    RECORD_CMD="wf-recorder -f \"$file\""

    # Determine the recording geometry
    if [ "$fullscreen" = true ]; then
        echo "Starting fullscreen recording..."
        # No geometry needed for fullscreen; wf-recorder defaults to full screen
    elif [ "$region" = true ]; then
        echo "Selecting region..."
        # Capture the geometry using slurp
        GEOMETRY=$(slurp)
        if [ -z "$GEOMETRY" ]; then
            echo "No region selected. Exiting."
            exit 1
        fi
        echo "Selected Geometry: $GEOMETRY"
        # Append geometry to the wf-recorder command
        RECORD_CMD+=" -g \"$GEOMETRY\""
    fi

    # Include audio recording if requested
    if [ "$audio" = true ]; then
        echo "Including audio in the recording..."
        # Specify the PulseAudio device; adjust if using PipeWire or another audio system
        RECORD_CMD+=" --audio "
        # Optionally, you can specify the audio format and codec
        # RECORD_CMD+=" --audio-codec flac"  # Example for FLAC audio
    fi

    # Specify video encoding parameters if needed
    # For example, setting the codec to H.264:
    # RECORD_CMD+=" --codec vp9"  # You can choose other codecs like vp8, h264, etc.

    # Optionally, set framerate, bitrate, etc.
    # RECORD_CMD+=" --fps 30 --bitrate 5000"

    # Start the recording in the background
    echo "Starting recording..."
    eval "$RECORD_CMD &"
    REC_PID=$!
    echo $REC_PID > "$PID_FILE"
    echo "Recording started with PID $REC_PID."

elif [ "$recording_stop" = true ]; then
    # Check if recording is in progress
    if [ -f "$PID_FILE" ]; then
        REC_PID=$(cat "$PID_FILE")
        echo "Stopping recording with PID $REC_PID..."
        kill $REC_PID
        rm "$PID_FILE"
        echo "Recording stopped."
    else
        echo "No recording is currently in progress."
        exit 1
    fi
fi

# Main script logic
echo "Script completed successfully."
