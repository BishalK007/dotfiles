#!/usr/bin/env bash
#==============================================================================
#  Script: copy-conf.sh
#  Description: Copies /etc/nixos/configuration.nix to the current directory,
#               replacing any existing file.
#==============================================================================

# Exit immediately if a command fails
set -e

#------------------------------------------------------------------------------
# Define source and destination paths
#------------------------------------------------------------------------------
SOURCE="/etc/nixos/configuration.nix"
DESTINATION="./configuration.nix"

#------------------------------------------------------------------------------
# Validate that the source file exists
#------------------------------------------------------------------------------
if [ ! -f "$SOURCE" ]; then
    echo "Error: Source file not found at $SOURCE"
    exit 1
fi

#------------------------------------------------------------------------------
# Copy the source file to the destination, replacing if necessary
#------------------------------------------------------------------------------
cp -f "$SOURCE" "$DESTINATION"

#------------------------------------------------------------------------------
# Notify the user upon success
#------------------------------------------------------------------------------
echo "Configuration file has been successfully copied to $DESTINATION"