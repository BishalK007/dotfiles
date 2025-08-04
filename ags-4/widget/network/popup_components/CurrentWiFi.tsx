import { Gtk } from "astal/gtk4";
import { bind } from "astal/binding";
import AstalNetwork from "gi://AstalNetwork";
import { scaleSizeNumber, chainedBinding, mergeBindings } from "../../../utils/utils";

interface CurrentWiFiProps {
    network: AstalNetwork.Network;
}

/**
 * Current WiFi Connection Component
 * 
 * Displays detailed information about the currently connected WiFi network:
 * - Signal strength with visual indicator
 * - Network name (SSID)
 * - Connection details (strength %, frequency, bandwidth)
 * - Internet connectivity status
 * - Disconnect button
 */
export default function CurrentWiFi({ network }: CurrentWiFiProps) {
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
     * Format bandwidth with appropriate units
     */
    const formatBandwidth = (bandwidth: number): string => {
        if (bandwidth >= 1000) {
            return `${(bandwidth / 1000).toFixed(1)} GHz`;
        }
        return `${bandwidth} MHz`;
    };

    /**
     * Handle WiFi disconnection
     */
    const handleDisconnect = () => {
        
        if (network.wifi) {
            network.wifi.deactivate_connection(
                (source: any, result: any) => {
                    try {
                        network.wifi?.deactivate_connection_finish(result);                        
                    } catch (e) {
                        console.error("Failed to disconnect WiFi:", e);
                    }
                },
                null
            );
        }
    };

    return (
        <box
            orientation={Gtk.Orientation.VERTICAL}
            cssClasses={["network-current-wifi"]}
            spacing={scaleSizeNumber(4)}
            visible={mergeBindings(
                [chainedBinding(network, ["wifi", "enabled"]), chainedBinding(network, ["wifi", "active_access_point"])],
                (enabled, activeAP) => !!(enabled && activeAP)
            )}
        >
            {/* Section Title */}
            <label
                label="Current Connection"
                cssClasses={["network-subsection-title"]}
                halign={Gtk.Align.START}
            />

            {/* Current Connection Details */}
            <box
                orientation={Gtk.Orientation.HORIZONTAL}
                cssClasses={["network-wifi-current-item"]}
                spacing={scaleSizeNumber(8)}
            >
                {/* Signal Strength Icon */}
                <label
                    label={chainedBinding(network, ["wifi", "strength"]).as(strength =>
                        getSignalIcon(strength || 0)
                    )}
                    cssClasses={["network-wifi-signal-icon"]}
                    valign={Gtk.Align.CENTER}
                />

                {/* Connection Information */}
                <box
                    orientation={Gtk.Orientation.VERTICAL}
                    cssClasses={["network-wifi-current-info"]}
                    hexpand={true}
                    valign={Gtk.Align.CENTER}
                >
                    {/* Network Name (SSID) */}
                    <label
                        label={chainedBinding(network, ["wifi", "ssid"]).as(ssid => ssid || "")}
                        cssClasses={["network-wifi-current-ssid"]}
                        halign={Gtk.Align.START}
                    />

                    {/* Connection Details */}
                    <box
                        orientation={Gtk.Orientation.HORIZONTAL}
                        spacing={scaleSizeNumber(8)}
                    >
                        {/* Signal Strength Percentage */}
                        <label
                            label={chainedBinding(network, ["wifi", "strength"]).as(strength =>
                                strength ? `${strength}%` : ""
                            )}
                            cssClasses={["network-wifi-strength"]}
                            halign={Gtk.Align.START}
                        />

                        {/* Frequency */}
                        <label
                            label={chainedBinding(network, ["wifi", "frequency"]).as(frequency =>
                                frequency ? formatFrequency(frequency) : ""
                            )}
                            cssClasses={["network-wifi-frequency"]}
                            halign={Gtk.Align.START}
                        />

                        {/* Bandwidth */}
                        <label
                            label={chainedBinding(network, ["wifi", "bandwidth"]).as(bandwidth =>
                                bandwidth ? formatBandwidth(bandwidth) : ""
                            )}
                            cssClasses={["network-wifi-bandwidth"]}
                            halign={Gtk.Align.START}
                        />
                    </box>
                </box>

                {/* Status and Controls */}
                <box
                    orientation={Gtk.Orientation.HORIZONTAL}
                    spacing={scaleSizeNumber(4)}
                    valign={Gtk.Align.CENTER}
                >
                    {/* Internet Connectivity Status */}
                    <label
                        label={chainedBinding(network, ["wifi", "internet"]).as(internet =>
                            internet === AstalNetwork.Internet.CONNECTED ? "󰈁" : "󰈂"
                        )}
                        cssClasses={chainedBinding(network, ["wifi", "internet"]).as(internet =>
                            internet === AstalNetwork.Internet.CONNECTED
                                ? ["network-internet-icon", "connected"]
                                : ["network-internet-icon", "disconnected"]
                        )}
                    />

                    {/* Disconnect Button */}
                    <button
                        cssClasses={["network-wifi-disconnect-button"]}
                        onClicked={handleDisconnect}
                        child={
                            <label
                                label="󰅙"
                                cssClasses={["network-wifi-disconnect-icon"]}
                            />
                        }
                    />
                </box>
            </box>
        </box>
    );
}
