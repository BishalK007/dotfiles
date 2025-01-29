#!/bin/bash

# Function to kill processes
kill_processes() {
    # Kill any running cargo watch processes
    pgrep -f "cargo watch" | xargs -r kill

    # Kill all instances of eww
    pgrep eww | xargs -r kill
}

# Function to run processes
run_processes() {
    # Run cargo watch
    cargo watch -x run --workdir $HOME/.config/eww & 

    # Wait for 2 seconds
    sleep 2

    # Send eww:start command
    echo "eww:start" | socat - UNIX-CONNECT:/tmp/eww_main_socket.sock
}

# Check arguments
if [[ "$1" == "--kill" ]]; then
    kill_processes
elif [[ "$1" == "--run" ]]; then
    run_processes
else
    kill_processes
    run_processes
fi
