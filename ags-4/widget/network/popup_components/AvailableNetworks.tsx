import { Gtk } from "astal/gtk4";
import { bind } from "astal/binding";
import AstalNetwork from "gi://AstalNetwork";
import { scaleSizeNumber, chainedBinding, mergeBindings } from "../../../utils/utils";
import { Variable } from "astal";

interface AvailableNetworksProps {
    network: AstalNetwork.Network;
}

/**
 * Available Networks Component
 * 
 * Displays a list of available WiFi networks with:
 * - Sorted by signal strength
 * - Filtered to remove duplicates and current connection
 * - Individual access point items
 */
export default function AvailableNetworks({ network }: AvailableNetworksProps) {
    return (
        <box
            orientation={Gtk.Orientation.VERTICAL}
            cssClasses={["network-available-networks"]}
            spacing={scaleSizeNumber(4)}
            visible={chainedBinding(network, ["wifi", "enabled"]).as(enabled => enabled || false)}
        >
            {/* Section Title */}
            <label
                label="Available Networks"
                cssClasses={["network-subsection-title"]}
                halign={Gtk.Align.START}
            />

            {/* Networks List */}
            <box
                cssClasses={["network-wifi-list-container"]}
                orientation={Gtk.Orientation.VERTICAL}
                spacing={scaleSizeNumber(2)}
                children={
                
                mergeBindings( 
                    [
                        chainedBinding(network, ["wifi", "access_points"]), 
                        chainedBinding(network, ["wifi", "ssid"]),
                        chainedBinding(network, ["wifi", "state"]),
                        chainedBinding(network, ["wifi", "active_access_point"])
                    ],
                    (accessPoints: AstalNetwork.AccessPoint[], currentSSID: string, wifiState: AstalNetwork.DeviceState, activeAP: AstalNetwork.AccessPoint) => {
                        
                        if (!accessPoints) {
                            console.log("No access points available");
                            return [];
                        }

                        // Sort access points by signal strength (strongest first)
                        const sortedAPs = [...accessPoints].sort((a, b) => b.strength - a.strength);

                        // Filter out current connection and duplicates
                        const seenSSIDs = new Set<string>();
                        const filteredAPs = sortedAPs.filter(ap => {
                            // Skip if no SSID
                            if (!ap.ssid) return false;
                            
                            // Only filter out current connection if we actually have an active connection
                            if (activeAP && ap.ssid === activeAP.ssid) {
                                console.log(`Filtering out current connection via activeAP: ${ap.ssid}`);
                                return false;
                            }
                            
                            // Skip if we've already seen this SSID
                            if (seenSSIDs.has(ap.ssid)) {
                                console.log(`Filtering out duplicate: ${ap.ssid}`);
                                return false;
                            }
                            
                            // Add to seen list and include
                            seenSSIDs.add(ap.ssid);
                            return true;
                        });
                        
                        // Create AccessPointItem components
                        return filteredAPs.map(ap => <AccessPointItem accessPoint={ap} />);
                    }
                )}
            />
        </box>
    );
}

/**
 * Access Point Item Component
 * 
 * Displays individual WiFi network with:
 * - Signal strength icon (color-coded)
 * - Network name and details
 * - Security status
 * - Connect button
 */
function AccessPointItem({ accessPoint }: { accessPoint: AstalNetwork.AccessPoint }) {
    /**
     * Get signal strength icon based on signal percentage
     */
    const getSignalIcon = (strength: number): string => {
        if (strength >= 80) return "󰤨";
        if (strength >= 60) return "󰤥";
        if (strength >= 40) return "󰤢";
        if (strength >= 20) return "󰤟";
        return "󰤯";
    };

    /**
     * Format frequency from kHz to GHz
     */
    const formatFrequency = (frequency: number): string => {
        return `${(frequency / 1000).toFixed(1)} GHz`;
    };

    /**
     * Get security type based on access point flags
     */
    const getSecurityType = (ap: AstalNetwork.AccessPoint): string => {
        if (!ap.requires_password) return "Open";

        // Check for WPA3/WPA2/WPA based on flags
        const rsnFlags = ap.rsn_flags;
        const wpaFlags = ap.wpa_flags;

        if (rsnFlags > 0) {
            if (rsnFlags & 0x200) return "WPA3";
            return "WPA2";
        }
        if (wpaFlags > 0) return "WPA";

        return "WEP";
    };

    /**
     * Handle connection attempt to access point
     */
    const handleConnect = () => {
        // Simple connection attempt - for secured networks, this would need password dialog
        accessPoint.activate(null, (source: any, result: any) => {
            try {
                const success = accessPoint.activate_finish(result);
                if (success) {
                    console.log(`Connected to ${accessPoint.ssid}`);
                } else {
                    console.log(`Connection to ${accessPoint.ssid} failed`);
                }
            } catch (e) {
                console.error(`Failed to connect to ${accessPoint.ssid}:`, e);
                // Here you would typically show a password dialog for secured networks
            }
        });
    };

    return (
        <box
            orientation={Gtk.Orientation.HORIZONTAL}
            cssClasses={["network-access-point-item"]}
            spacing={scaleSizeNumber(8)}
            hexpand={true}
        >
            {/* Signal Strength Icon */}
            <label
                label={getSignalIcon(accessPoint.strength)}
                cssClasses={[
                    "network-ap-signal-icon",
                    accessPoint.strength >= 70 ? "strong" :
                        accessPoint.strength >= 50 ? "good" :
                            accessPoint.strength >= 30 ? "fair" : "weak"
                ]}
                valign={Gtk.Align.CENTER}
            />

            {/* Network Information */}
            <box
                orientation={Gtk.Orientation.VERTICAL}
                cssClasses={["network-ap-info"]}
                hexpand={true}
                valign={Gtk.Align.CENTER}
            >
                {/* Network Name */}
                <label
                    label={accessPoint.ssid || "Hidden Network"}
                    cssClasses={["network-ap-ssid"]}
                    halign={Gtk.Align.START}
                />

                {/* Network Details */}
                <box
                    orientation={Gtk.Orientation.HORIZONTAL}
                    spacing={scaleSizeNumber(6)}
                >
                    {/* Signal Strength Percentage */}
                    <label
                        label={`${accessPoint.strength}%`}
                        cssClasses={["network-ap-strength"]}
                        halign={Gtk.Align.START}
                    />

                    {/* Security Type */}
                    <label
                        label={getSecurityType(accessPoint)}
                        cssClasses={[
                            "network-ap-security",
                            accessPoint.requires_password ? "secured" : "open"
                        ]}
                        halign={Gtk.Align.START}
                    />

                    {/* Frequency */}
                    <label
                        label={formatFrequency(accessPoint.frequency)}
                        cssClasses={["network-ap-frequency"]}
                        halign={Gtk.Align.START}
                    />
                </box>
            </box>

            {/* Security Icon */}
            <label
                label={accessPoint.requires_password ? "󰌾" : "󰢤"}
                cssClasses={[
                    "network-ap-lock-icon",
                    accessPoint.requires_password ? "locked" : "open"
                ]}
                valign={Gtk.Align.CENTER}
            />

            {/* Connect Button */}
            <button
                cssClasses={["network-ap-connect-button"]}
                onClicked={handleConnect}
                child={
                    <label
                        label="󰐕"
                        cssClasses={["network-ap-connect-icon"]}
                    />
                }
            />
        </box>
    );
}
