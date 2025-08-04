import { Gtk } from "astal/gtk4";
import { bind } from "astal/binding";
import AstalNetwork from "gi://AstalNetwork";
import { scaleSizeNumber } from "../../../utils/utils";

interface NetworkHeaderProps {
    network?: AstalNetwork.Network;
}

/**
 * Network Header Component
 * 
 * Displays the main network status with:
 * - Network type icon (wired/wireless)
 * - Connectivity status with color-coded indicators
 * - Overall connection state
 */
export default function NetworkHeader({ network: networkProp }: NetworkHeaderProps) {
    const network = networkProp || AstalNetwork.Network.get_default();
    /**
     * Get connectivity icon based on network state
     */
    const getConnectivityIcon = (connectivity: AstalNetwork.Connectivity): string => {
        switch (connectivity) {
            case AstalNetwork.Connectivity.FULL:
                return "󰈁";
            case AstalNetwork.Connectivity.LIMITED:
                return "!󰈁";
            case AstalNetwork.Connectivity.PORTAL:
                return "󰈃";
            case AstalNetwork.Connectivity.NONE:
                return "󰈂";
            case AstalNetwork.Connectivity.UNKLNOWN:
                return "?";
            default:
                return "???";
        }
    };

    /**
     * Get connectivity label text
     */
    const getConnectivityLabel = (connectivity: AstalNetwork.Connectivity): string => {
        switch (connectivity) {
            case AstalNetwork.Connectivity.FULL:
                return "Connected";
            case AstalNetwork.Connectivity.LIMITED:
                return "Limited";
            case AstalNetwork.Connectivity.PORTAL:
                return "Portal";
            default:
                return "Disconnected";
        }
    };

    /**
     * Get CSS classes for connectivity status
     */
    const getConnectivityClasses = (connectivity: AstalNetwork.Connectivity): string[] => {
        const baseClass = "network-connectivity-label";
        switch (connectivity) {
            case AstalNetwork.Connectivity.FULL:
                return [baseClass, "connected"];
            case AstalNetwork.Connectivity.LIMITED:
                return [baseClass, "limited"];
            case AstalNetwork.Connectivity.PORTAL:
                return [baseClass, "portal"];
            default:
                return [baseClass, "disconnected"];
        }
    };

    return (
        <box
            orientation={Gtk.Orientation.HORIZONTAL}
            cssClasses={["network-header"]}
            spacing={scaleSizeNumber(8)}
            hexpand={true}
        >
            {/* Left side: Network type and title */}
            <box
                orientation={Gtk.Orientation.HORIZONTAL}
                spacing={scaleSizeNumber(6)}
                valign={Gtk.Align.CENTER}
                hexpand={true}
            >
                <label
                    label={bind(network, "primary").as((primary) =>
                        primary === AstalNetwork.Primary.WIRED ? "󰈀" : "󰤨"
                    )}
                    cssClasses={["network-header-icon"]}
                    valign={Gtk.Align.CENTER}
                />
                <label
                    label="Network"
                    cssClasses={["network-header-text"]}
                    valign={Gtk.Align.CENTER}
                    halign={Gtk.Align.START}
                />
            </box>

            {/* Right side: Connectivity status */}
            <box
                orientation={Gtk.Orientation.HORIZONTAL}
                spacing={scaleSizeNumber(4)}
                valign={Gtk.Align.CENTER}
            >
                <label
                    label={bind(network, "connectivity").as(getConnectivityIcon)}
                    cssClasses={["network-connectivity-icon"]}
                />
                <label
                    label={bind(network, "connectivity").as(getConnectivityLabel)}
                    cssClasses={bind(network, "connectivity").as(getConnectivityClasses)}
                />
            </box>
        </box>
    );
}
