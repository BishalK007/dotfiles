import { Gtk } from "astal/gtk4";
import { bind } from "astal/binding";
import AstalNetwork from "gi://AstalNetwork";
import { scaleSizeNumber, chainedBinding } from "../../../utils/utils";

interface WiredSectionProps {
    network: AstalNetwork.Network;
}

/**
 * Wired Network Section Component
 * 
 * Displays ethernet connection information including:
 * - Connection status (Connected/Connecting/Disconnected)
 * - Network speed when available
 * - Internet connectivity indicator
 */
export default function WiredSection({ network }: WiredSectionProps) {
    /**
     * Get connection status text based on device state
     */
    const getConnectionStatus = (state: AstalNetwork.DeviceState | null): string => {
        if (!state) return "";
        switch (state) {
            case AstalNetwork.DeviceState.ACTIVATED:
                return "Connected";
            case AstalNetwork.DeviceState.PREPARE:
            case AstalNetwork.DeviceState.CONFIG:
            case AstalNetwork.DeviceState.NEED_AUTH:
            case AstalNetwork.DeviceState.IP_CONFIG:
            case AstalNetwork.DeviceState.IP_CHECK:
            case AstalNetwork.DeviceState.SECONDARIES:
                return "Connecting...";
            case AstalNetwork.DeviceState.DISCONNECTED:
                return "Disconnected";
            case AstalNetwork.DeviceState.UNMANAGED:
                return "Unmanaged";
            case AstalNetwork.DeviceState.UNAVAILABLE:
                return "Unavailable";
            case AstalNetwork.DeviceState.DEACTIVATING:
                return "Disconnecting...";
            case AstalNetwork.DeviceState.FAILED:
                return "Failed";
            case AstalNetwork.DeviceState.UNKNOWN:
            default:
                return "Unknown";
        }
    };

    /**
     * Get CSS classes for connection status
     */
    const getStatusClasses = (state: AstalNetwork.DeviceState | null): string[] => {
        const baseClass = "network-wired-status";
        switch (state) {
            case AstalNetwork.DeviceState.ACTIVATED:
                return [baseClass, "connected"];
            case AstalNetwork.DeviceState.PREPARE:
            case AstalNetwork.DeviceState.CONFIG:
            case AstalNetwork.DeviceState.NEED_AUTH:
            case AstalNetwork.DeviceState.IP_CONFIG:
            case AstalNetwork.DeviceState.IP_CHECK:
            case AstalNetwork.DeviceState.SECONDARIES:
                return [baseClass, "connecting"];
            case AstalNetwork.DeviceState.DISCONNECTED:
                return [baseClass, "disconnected"];
            case AstalNetwork.DeviceState.UNMANAGED:
                return [baseClass, "unmanaged"];
            case AstalNetwork.DeviceState.UNAVAILABLE:
                return [baseClass, "unavailable"];
            case AstalNetwork.DeviceState.DEACTIVATING:
                return [baseClass, "deactivating"];
            case AstalNetwork.DeviceState.FAILED:
                return [baseClass, "failed"];
            case AstalNetwork.DeviceState.UNKNOWN:
            default:
                return [baseClass, "unknown"];
        }
    };

    /**
     * Get internet status icon
     */
    const getInternetIcon = (internet: AstalNetwork.Internet): string => {
        return internet === AstalNetwork.Internet.CONNECTED
            ? "󰈁"
            : internet === AstalNetwork.Internet.CONNECTING
                ? "..."
                : "󰈂";
    };

    /**
     * Get internet status CSS classes
     */
    const getInternetClasses = (internet: AstalNetwork.Internet): string[] => {
        return internet === AstalNetwork.Internet.CONNECTED
            ? ["network-internet-icon", "connected"]
            : internet === AstalNetwork.Internet.CONNECTING
                ? ["network-internet-icon", "connecting"]
                : ["network-internet-icon", "disconnected"];
    };

    return (
        <box
            orientation={Gtk.Orientation.VERTICAL}
            cssClasses={["network-wired-section"]}
            spacing={scaleSizeNumber(8)}
            visible={bind(network, "wired").as(wired => !!wired)}
        >
            {/* Section Title */}
            <label
                label="Ethernet"
                cssClasses={["network-section-title"]}
                halign={Gtk.Align.START}
            />

            {/* Wired Connection Details */}
            <box
                orientation={Gtk.Orientation.HORIZONTAL}
                cssClasses={["network-wired-item"]}
                spacing={scaleSizeNumber(8)}
                visible={bind(network, "wired").as(wired => !!wired)}
            >
                {/* Ethernet Icon */}
                <label
                    label="󰈀"
                    cssClasses={["network-wired-icon"]}
                    valign={Gtk.Align.CENTER}
                />

                {/* Connection Information */}
                <box
                    orientation={Gtk.Orientation.VERTICAL}
                    cssClasses={["network-wired-info"]}
                    hexpand={true}
                    valign={Gtk.Align.CENTER}
                >
                    {/* Connection Name */}
                    <label
                        label="Wired Connection"
                        cssClasses={["network-wired-name"]}
                        halign={Gtk.Align.START}
                    />

                    {/* Status and Speed */}
                    <box
                        orientation={Gtk.Orientation.HORIZONTAL}
                        spacing={scaleSizeNumber(8)}
                    >
                        {/* Connection Status */}
                        <label
                            label={chainedBinding(network, ["wired", "state"]).as(getConnectionStatus)}
                            cssClasses={chainedBinding(network, ["wired", "state"]).as(getStatusClasses)}
                            halign={Gtk.Align.START}
                        />

                        {/* Network Speed (when available) */}
                        <label
                            label={chainedBinding(network, ["wired", "speed"]).as(speed =>
                                speed ? `${speed} Mb/s` : ""
                            )}
                            cssClasses={["network-wired-speed"]}
                            halign={Gtk.Align.START}
                            visible={chainedBinding(network, ["wired", "speed"]).as(speed =>
                                !!(speed && speed > 0)
                            )}
                        />
                    </box>
                </box>

                {/* Internet Connectivity Indicator */}
                <label
                    label={chainedBinding(network, ["wired", "internet"]).as(getInternetIcon)}
                    cssClasses={chainedBinding(network, ["wired", "internet"]).as(getInternetClasses)}
                    valign={Gtk.Align.CENTER}
                />
            </box>
        </box>
    );
}
