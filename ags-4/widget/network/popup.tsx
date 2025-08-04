import { Gtk } from "astal/gtk4";
import AstalNetwork from "gi://AstalNetwork";
import { scaleSizeNumber } from "../../utils/utils";

// Import modular components
import NetworkHeader from "./popup_components/NetworkHeader";
import WiredSection from "./popup_components/WiredSection";
import WiFiHeader from "./popup_components/WiFiHeader";
import WiFiControls from "./popup_components/WiFiControls";
import CurrentWiFi from "./popup_components/CurrentWiFi";
import AvailableNetworks from "./popup_components/AvailableNetworks";

/**
 * Network Popup Component
 * 
 * Comprehensive network management popup with modular architecture:
 * - Clean separation of concerns with individual components
 * - Consistent chainedBinding usage throughout
 * - Professional styling and user experience
 * - Full wired and WiFi network management capabilities
 * 
 * Component Structure:
 * ├── NetworkHeader: Title and settings button
 * ├── WiredSection: Ethernet connection status and details
 * └── WiFi Section:
 *     ├── WiFiHeader: WiFi toggle and section title
 *     ├── WiFiControls: Scan button and network refresh
 *     ├── CurrentWiFi: Active WiFi connection details
 *     └── AvailableNetworks: Discoverable WiFi networks list
 * 
 * This modular approach improves:
 * - Code readability and maintainability
 * - Component reusability
 * - Easier debugging and testing
 * - Better separation of UI logic
 */
export default function NetworkPopup() {
    const network = AstalNetwork.Network.get_default();

    /**
     * Handle WiFi toggle action
     */
    const handleWifiToggle = () => {
        if (network.wifi) {
            network.wifi.enabled = !network.wifi.enabled;
        }
    };

    /**
     * Handle WiFi scan action
     */
    const handleWifiScan = () => {
        if (network.wifi) {
            network.wifi.scan();
        }
    };

    return (
        <box
            orientation={Gtk.Orientation.VERTICAL}
            cssClasses={["network-popover-container"]}
            valign={Gtk.Align.CENTER}
            halign={Gtk.Align.CENTER}
            spacing={scaleSizeNumber(12)}
        >
            {/* 
             * Header Section
             * Displays network title and global settings access
             */}
            <NetworkHeader network={network} />

            {/* 
             * Wired Connection Section
             * Shows ethernet connection status, speed, and internet connectivity
             * Only visible when wired interface is available
             */}
            <WiredSection network={network} />

            {/* 
             * WiFi Section Container
             * Groups all WiFi-related functionality with consistent spacing
             */}
            <box
                orientation={Gtk.Orientation.VERTICAL}
                cssClasses={["network-wifi-section"]}
                spacing={scaleSizeNumber(8)}
            >
                {/* WiFi Header with enable/disable toggle */}
                <WiFiHeader network={network} onToggle={handleWifiToggle} />

                {/* WiFi Controls (scan networks, refresh, etc.) */}
                <WiFiControls network={network} onScan={handleWifiScan} />

                {/* Current Active WiFi Connection Details */}
                <CurrentWiFi network={network} />

                {/* Available Networks List with connection capabilities */}
                <AvailableNetworks network={network} />
            </box>
        </box>
    );
}
