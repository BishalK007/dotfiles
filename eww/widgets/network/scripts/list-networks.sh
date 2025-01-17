#!/bin/bash

# Function to get active wired connections in JSON format, including UUID
get_wired() {
    # Fetch active connections with DEVICE, STATE, NAME, and UUID
    wired_output=$(nmcli -t -f DEVICE,STATE,NAME,UUID,TYPE connection show)
    
    echo "$wired_output" | awk -F: '
BEGIN {
    OFS = "";
    print "[";
    first = 1;
}
{
    device = $1;
    state = $2;
    name = $3;
    uuid = $4;
    type = $5;

    # Filter for Ethernet devices only
    if (index(type, "ethernet") > 0) {
        if (!first) print ",";
        first = 0;
        print "{";
        print "\"NAME\": \"" name "\",";
        print "\"UUID\": \"" uuid "\"";
        print "\"DEVICE\": \"" device "\",";
        print "\"STATE\": \"" state "\",";
        print "\"CONNECTION\": \"" type "\",";
        print "}";
    }
}
END { print "]"; }
    '
        
}

# Function to get available wireless networks in JSON format
# Note: UUIDs are not applicable for scan results
get_wireless() {
    wifi_output=$(nmcli -f SSID,MODE,CHAN,RATE,SIGNAL,BARS,SECURITY dev wifi list)
    
    echo "$wifi_output" | awk '
    BEGIN {
        OFS = "";
        print "[";
        first = 1;
    }
    NR > 1 {
        # Handle SSIDs with spaces by capturing all fields beyond the first
        ssid = $1;
        for(i=2; i<=NF-6; i++) {
            ssid = ssid " " $i;
        }
        mode = $(NF-5);
        chan = $(NF-4);
        rate = $(NF-3);
        signal = $(NF-2);
        bars = $(NF-1);
        security = $NF;

        if (!first) print ",";
        first = 0;
        print "{";
        print "\"SSID\": \"" ssid "\",";
        print "\"MODE\": \"" mode "\",";
        print "\"CHAN\": \"" chan "\",";
        print "\"RATE\": \"" rate "\",";
        print "\"SIGNAL\": \"" signal "\",";
        print "\"BARS\": \"" bars "\",";
        print "\"SECURITY\": \"" security "\",";
        print "\"UUID\": null";  # UUID not applicable for scan results
        print "}";
    }
    END { print "]"; }
    '
}

# Optional: Function to get saved wireless connections with UUIDs
# Uncomment and use if you want to list saved wireless connections
get_saved_wireless() {
    saved_wifi_output=$(nmcli -t -f DEVICE,STATE,NAME,UUID,TYPE connection show)
    
    echo "$saved_wifi_output" | awk -F: '
BEGIN {
    OFS = "";
    print "[";
    first = 1;
}
{
    device = $1;
    state = $2;
    name = $3;
    uuid = $4;
    type = $5;

    # Filter for Ethernet devices only
    if (index(type, "wireless") > 0) {
        if (!first) print ",";
        first = 0;
        print "{";
        print "\"NAME\": \"" name "\",";
        print "\"UUID\": \"" uuid "\"";
        print "\"DEVICE\": \"" device "\",";
        print "\"STATE\": \"" state "\",";
        print "\"CONNECTION\": \"" type "\",";
        print "}";
    }
}
END { print "]"; }
    '
}

# Function to connect to a wired or wireless network
connect_network() {
    type="$1"
    name="$2"
    password="$3"
    
    if [[ "$type" == "wired" ]]; then
        # Determine if 'name' is a device or connection name
        # Check if 'name' matches a device
        if nmcli device status | awk '{print $1}' | grep -wq "$name"; then
            # Get the connection name associated with the device
            connection_name=$(nmcli -t -f NAME,DEVICE connection show --active | grep ":$name$" | cut -d':' -f1)
            
            if [[ -z "$connection_name" ]]; then
                # If no active connection, try to find a connection for the device
                connection_name=$(nmcli -t -f NAME,DEVICE connection show | grep ":$name$" | cut -d':' -f1)
            fi
        else
            # Assume 'name' is a connection name
            connection_name="$name"
        fi
        
        if [[ -z "$connection_name" ]]; then
            echo "Error: Unable to find connection associated with device '$name'."
            exit 1
        fi
        
        # Attempt to bring up the wired connection
        nmcli con up "$connection_name" || {
            echo "Failed to connect to wired network: $connection_name"
            exit 1
        }
        echo "Successfully connected to wired network: $connection_name"
        elif [[ "$type" == "wireless" ]]; then
        if [[ -z "$password" ]]; then
            # Attempt to connect to an open wireless network
            nmcli dev wifi connect "$name" || {
                echo "Failed to connect to wireless network: $name"
                exit 1
            }
            echo "Successfully connected to wireless network: $name"
        else
            # Attempt to connect to a secured wireless network
            nmcli dev wifi connect "$name" password "$password" || {
                echo "Failed to connect to wireless network: $name"
                exit 1
            }
            echo "Successfully connected to wireless network: $name"
        fi
    else
        echo "Invalid connection type: $type"
        echo "Usage: $0 --conn [wired|wireless] <name> [password]"
        exit 1
    fi
}
# Function to disconnect from a wired or wireless network
disconnect_network() {
    type="$1"
    name="$2"
    
    if [[ "$type" == "wired" ]]; then
        # Determine if 'name' is a device or connection name
        # if nmcli device status | awk '{print $1}' | grep -wq "$name"; then
        #     # Get the connection name associated with the device
        #     connection_name=$(nmcli -t -f NAME,DEVICE connection show --active | grep ":$name$" | cut -d':' -f1)
        
        #     if [[ -z "$connection_name" ]]; then
        #         echo "Error: No active wired connection found on device '$name'."
        #         exit 1
        #     fi
        # else
        #     # Assume 'name' is a connection name
        #     connection_name="$name"
        #     # Verify if the connection is active
        #     if ! nmcli -t -f NAME connection show --active | grep -wq "^$connection_name$"; then
        #         echo "Error: Wired connection '$connection_name' is not active."
        #         exit 1
        #     fi
        # fi
        
        # Attempt to disconnect the wired connection
        nmcli con down "$connection_name" || {
            echo "Failed to disconnect wired network: $connection_name"
            exit 1
        }
        echo "Successfully disconnected wired network: $connection_name"
        elif [[ "$type" == "wireless" ]]; then
        # For wireless, 'name' is typically the SSID or connection name
        # Check if the connection is active
        connection_name=$(nmcli -t -f NAME,TYPE connection show --active | grep ":wifi:" | cut -d':' -f1 | grep -w "$name")
        
        if [[ -z "$connection_name" ]]; then
            echo "Error: Wireless connection '$name' is not active."
            exit 1
        fi
        
        # Attempt to disconnect the wireless connection
        nmcli con down "$connection_name" || {
            echo "Failed to disconnect wireless network: $connection_name"
            exit 1
        }
        echo "Successfully disconnected wireless network: $connection_name"
    else
        echo "Invalid disconnection type: $type"
        echo "Usage: $0 --disconn [wired|wireless] <name>"
        exit 1
    fi
}

# Parse command-line arguments
case "$1" in
    --wired)
        # Only list wired connections
        get_wired
    ;;
    --wireless)
        # Only list wireless networks
        get_wireless
    ;;
    --saved-wireless)
        # Only list saved wireless connections with UUIDs
        get_saved_wireless
    ;;
    --full)
        # Full output (both wired and wireless)
        wired_json=$(get_wired)
        wireless_json=$(get_wireless)
        echo "{"
        echo "\"wired\": $wired_json,"
        echo "\"wireless\": $wireless_json"
        echo "}"
    ;;
    --conn)
        # Connect to a specified network
        if [[ $# -lt 3 ]]; then
            echo "Usage: $0 --conn [wired|wireless] <name> [password]"
            exit 1
        fi
        connection_type="$2"
        connection_name_or_device="$3"
        connection_password="$4"
        connect_network "$connection_type" "$connection_name_or_device" "$connection_password"
    ;;
    --disconn)
        # Disconnect from a specified network
        if [[ $# -lt 3 ]]; then
            echo "Usage: $0 --disconn [wired|wireless] <name>"
            exit 1
        fi
        disconn_type="$2"
        disconn_name="$3"
        disconnect_network "$disconn_type" "$disconn_name"
    ;;
    *)
        echo "Usage: $0 [--wired | --wireless | --full | --conn [wired|wireless] <name> [password] | --disconn [wired|wireless] <name> | --saved-wireless]"
        exit 1
    ;;
esac