import Binding, { bind } from "astal/binding";
import { Gtk } from "astal/gtk4";
import AstalNetwork from "gi://AstalNetwork";
import { mergeBindings, scaleSizeNumber, chainedBinding } from "../../utils/utils";

const network = AstalNetwork.get_default() as AstalNetwork.Network;

const handleWifiToggle = () => {
    if (network.wifi) {
        network.wifi.enabled = !network.wifi.enabled;
    }
}

const handleWifiScan = () => {
    if (network.wifi) {
        network.wifi.scan();
    }
}

const formatFrequency = (frequency: number): string => {
    return `${(frequency / 1000).toFixed(1)} GHz`;
};

const formatBandwidth = (bandwidth: number): string => {
    if (bandwidth >= 1000) {
        return `${(bandwidth / 1000).toFixed(1)} GHz`;
    }
    return `${bandwidth} MHz`;
};

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

const getSignalIcon = (strength: number): string => {
    if (strength >= 80) return "󰤨";
    if (strength >= 60) return "󰤥";
    if (strength >= 40) return "󰤢";
    if (strength >= 20) return "󰤟";
    return "󰤯";
};

export default function NetworkPopup() {
    return (
        <box
            orientation={Gtk.Orientation.VERTICAL}
            cssClasses={["network-popover-container"]}
            valign={Gtk.Align.CENTER}
            halign={Gtk.Align.CENTER}
            spacing={scaleSizeNumber(12)}
        >
            {/* Network Status Header */}
            <box
                orientation={Gtk.Orientation.HORIZONTAL}
                cssClasses={["network-header"]}
                spacing={scaleSizeNumber(8)}
                hexpand={true}
            >
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
                <box
                    orientation={Gtk.Orientation.HORIZONTAL}
                    spacing={scaleSizeNumber(4)}
                    valign={Gtk.Align.CENTER}
                >
                    <label
                        label={bind(network, "connectivity").as((connectivity) => {
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
                        })}
                        cssClasses={["network-connectivity-icon"]}
                    />
                    <label
                        label={bind(network, "connectivity").as((connectivity) => {
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
                        })}
                        cssClasses={bind(network, "connectivity").as((connectivity) => {
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
                        })}
                    />
                </box>
            </box>

            {/* Wired Network Section */}
            <box
                orientation={Gtk.Orientation.VERTICAL}
                cssClasses={["network-wired-section"]}
                spacing={scaleSizeNumber(8)}
                visible={bind(network, "wired").as(wired => !!wired)}
            >
                <label
                    label="Ethernet"
                    cssClasses={["network-section-title"]}
                    halign={Gtk.Align.START}
                />
                <box
                    orientation={Gtk.Orientation.HORIZONTAL}
                    cssClasses={["network-wired-item"]}
                    spacing={scaleSizeNumber(8)}
                    visible={bind(network, "wired").as(wired => !!wired)}
                >
                    <label
                        label="󰈀"
                        cssClasses={["network-wired-icon"]}
                        valign={Gtk.Align.CENTER}
                    />
                    <box
                        orientation={Gtk.Orientation.VERTICAL}
                        cssClasses={["network-wired-info"]}
                        hexpand={true}
                        valign={Gtk.Align.CENTER}
                    >
                        <label
                            label="Wired Connection"
                            cssClasses={["network-wired-name"]}
                            halign={Gtk.Align.START}
                        />
                        <box
                            orientation={Gtk.Orientation.HORIZONTAL}
                            spacing={scaleSizeNumber(8)}
                        >
                            <label
                                label={chainedBinding(network, ["wired", "state"]).as((state) => {
                                    if (!state) return "";
                                    switch (state) {
                                        case AstalNetwork.DeviceState.ACTIVATED:
                                            return "Connected";
                                        case AstalNetwork.DeviceState.PREPARE:
                                        case AstalNetwork.DeviceState.CONFIG:
                                            return "Connecting...";
                                        case AstalNetwork.DeviceState.DISCONNECTED:
                                            return "Disconnected";
                                        default:
                                            return "Unknown";
                                    }
                                })}
                                cssClasses={
                                    chainedBinding(network, ["wired", "state"]).as((state) => {
                                        const baseClass = "network-wired-status";
                                        switch (state) {
                                            case AstalNetwork.DeviceState.ACTIVATED:
                                                return [baseClass, "connected"];
                                            case AstalNetwork.DeviceState.PREPARE:
                                            case AstalNetwork.DeviceState.CONFIG:
                                                return [baseClass, "connecting"];
                                            case AstalNetwork.DeviceState.DISCONNECTED:
                                                return [baseClass, "disconnected"];
                                            default:
                                                return [baseClass, "unknown"];
                                        }
                                    })}
                                halign={Gtk.Align.START}
                            />
                            <label
                                label={
                                    chainedBinding(network, ["wired", "speed"]).as(speed =>
                                        speed ? `${speed} Mb/s` : ""
                                    )
                                }
                                cssClasses={["network-wired-speed"]}
                                halign={Gtk.Align.START}
                                visible={chainedBinding(network, ["wired", "speed"]).as(speed =>
                                    !!(speed && speed > 0)
                                )}
                            />
                        </box>
                    </box>

                    <label
                        label={
                            chainedBinding(network, ["wired", "internet"]).as(internet =>
                                internet == AstalNetwork.Internet.CONNECTED
                                    ? "󰈁"
                                    : internet == AstalNetwork.Internet.CONNECTING
                                        ? "..."
                                        : "󰈂"
                            )
                        }
                        cssClasses={chainedBinding(network, ["wired", "internet"]).as(internet =>
                            internet == AstalNetwork.Internet.CONNECTED
                                ? ["network-internet-icon", "connected"]
                                : internet == AstalNetwork.Internet.CONNECTING
                                    ? ["network-internet-icon", "connecting"]
                                    : ["network-internet-icon", "disconnected"]
                        )}
                        valign={Gtk.Align.CENTER}
                    />

                </box>
            </box>

            {/* WiFi Section */}
            <box
                orientation={Gtk.Orientation.VERTICAL}
                cssClasses={["network-wifi-section"]}
                spacing={scaleSizeNumber(8)}
                visible={bind(network, "wifi").as(wifi => !!wifi)}
            >
                {/* WiFi Header with Toggle */}
                <box
                    orientation={Gtk.Orientation.HORIZONTAL}
                    cssClasses={["network-wifi-header"]}
                    spacing={scaleSizeNumber(8)}
                    hexpand={true}
                >
                    <label
                        label="WiFi"
                        cssClasses={["network-section-title"]}
                        halign={Gtk.Align.START}
                        hexpand={true}
                    />
                    <button
                        cssClasses={
                            chainedBinding(network, ["wifi", "enabled"]).as(enabled =>
                                enabled ? ["network-wifi-toggle", "enabled"] : ["network-wifi-toggle", "disabled"]
                            )
                        }
                        onClicked={handleWifiToggle}
                        child={
                            <label
                                label={chainedBinding(network, ["wifi", "enabled"]).as(enabled => enabled ? "ON" : "OFF")}
                                cssClasses={["network-wifi-toggle-label"]}
                            />
                        }
                    />
                </box>

                {/* WiFi Controls */}
                <box
                    orientation={Gtk.Orientation.HORIZONTAL}
                    cssClasses={["network-wifi-controls"]}
                    spacing={scaleSizeNumber(8)}
                    visible={chainedBinding(network, ["wifi", "enabled"]).as(enabled => enabled || false)}
                    child={
                        <button
                            cssClasses={
                                chainedBinding(network, ["wifi", "scanning"]).as(scanning =>
                                    scanning ? ["network-scan-button", "scanning"] : ["network-scan-button"]
                                )
                        }
                            onClicked={handleWifiScan}
                            child={
                                <box
                                    orientation={Gtk.Orientation.HORIZONTAL}
                                    spacing={scaleSizeNumber(4)}
                                    cssClasses={["network-scan-container"]}
                                >
                                    <label
                                        label={chainedBinding(network, ["wifi", "scanning"]).as(scanning =>
                                            scanning ? "󰍉" : "󰑓"
                                        )}
                                        cssClasses={["network-scan-icon"]}
                                    />
                                    <label
                                        label={chainedBinding(network, ["wifi", "scanning"]).as(scanning =>
                                            scanning ? " Scanning..." : " Scan"
                                        )}
                                        cssClasses={["network-scan-label"]}
                                    />
                                </box>
                            }
                        />
                    }
                />

                {/* Current WiFi Connection */}
                <box
                    orientation={Gtk.Orientation.VERTICAL}
                    cssClasses={["network-current-wifi"]}
                    spacing={scaleSizeNumber(4)}
                    visible={mergeBindings(
                        [chainedBinding(network, ["wifi", "enabled"]), chainedBinding(network, ["wifi", "active_access_point"])],
                        (enabled, activeAP) => !!(enabled && activeAP)
                    )}
                >
                    <label
                        label="Current Connection"
                        cssClasses={["network-subsection-title"]}
                        halign={Gtk.Align.START}
                    />
                    <box
                        orientation={Gtk.Orientation.HORIZONTAL}
                        cssClasses={["network-wifi-current-item"]}
                        spacing={scaleSizeNumber(8)}
                    >
                        <label
                            label={chainedBinding(network, ["wifi", "strength"]).as(strength =>
                                getSignalIcon(strength || 0)
                            )}
                            cssClasses={["network-wifi-signal-icon"]}
                            valign={Gtk.Align.CENTER}
                        />
                        <box
                            orientation={Gtk.Orientation.VERTICAL}
                            cssClasses={["network-wifi-current-info"]}
                            hexpand={true}
                            valign={Gtk.Align.CENTER}
                        >
                            <label
                                label={chainedBinding(network, ["wifi", "ssid"]).as(ssid => ssid || "")}
                                cssClasses={["network-wifi-current-ssid"]}
                                halign={Gtk.Align.START}
                            />
                            <box
                                orientation={Gtk.Orientation.HORIZONTAL}
                                spacing={scaleSizeNumber(8)}
                            >
                                <label
                                    label={chainedBinding(network, ["wifi", "strength"]).as(strength =>
                                        strength ? `${strength}%` : ""
                                    )}
                                    cssClasses={["network-wifi-strength"]}
                                    halign={Gtk.Align.START}
                                />
                                <label
                                    label={chainedBinding(network, ["wifi", "frequency"]).as(frequency =>
                                        frequency ? formatFrequency(frequency) : ""
                                    )}
                                    cssClasses={["network-wifi-frequency"]}
                                    halign={Gtk.Align.START}
                                />
                                <label
                                    label={chainedBinding(network, ["wifi", "bandwidth"]).as(bandwidth =>
                                        bandwidth ? formatBandwidth(bandwidth) : ""
                                    )}
                                    cssClasses={["network-wifi-bandwidth"]}
                                    halign={Gtk.Align.START}
                                />
                            </box>
                        </box>
                        <box
                            orientation={Gtk.Orientation.HORIZONTAL}
                            spacing={scaleSizeNumber(4)}
                            valign={Gtk.Align.CENTER}
                        >
                            <label
                                label={chainedBinding(network, ["wifi", "internet"]).as(internet =>
                                    internet == AstalNetwork.Internet.CONNECTED ? "󰈁" : "󰈂"
                                )}
                                cssClasses={chainedBinding(network, ["wifi", "internet"]).as(internet =>
                                    internet == AstalNetwork.Internet.CONNECTED
                                        ? ["network-internet-icon", "connected"]
                                        : ["network-internet-icon", "disconnected"]
                                )}
                            />
                            <button
                                cssClasses={["network-wifi-disconnect-button"]}
                                onClicked={() => {
                                    if (network.wifi?.active_connection) {
                                        network.wifi.deactivate_connection(
                                            network.wifi.active_connection,
                                            null,
                                            (source: any, result: any) => {
                                                try {
                                                    network.wifi?.deactivate_connection_finish(result);
                                                    console.log("WiFi disconnected");
                                                } catch (e) {
                                                    console.error("Failed to disconnect WiFi:", e);
                                                }
                                            }
                                        );
                                    }
                                }}
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

                {/* Available Networks */}
                <box
                    orientation={Gtk.Orientation.VERTICAL}
                    cssClasses={["network-available-networks"]}
                    spacing={scaleSizeNumber(4)}
                    visible={chainedBinding(network, ["wifi", "enabled"]).as(enabled => enabled || false)}
                >
                    <label
                        label="Available Networks"
                        cssClasses={["network-subsection-title"]}
                        halign={Gtk.Align.START}
                    />
                    <box
                        cssClasses={["network-wifi-list-container"]}
                        orientation={Gtk.Orientation.VERTICAL}
                        spacing={scaleSizeNumber(2)}
                        children={mergeBindings(
                            [chainedBinding(network, ["wifi", "access_points"]), chainedBinding(network, ["wifi", "ssid"])],
                            (accessPoints, currentSSID) => {
                                if (!accessPoints) return [];

                                // Sort access points by signal strength
                                const sortedAPs = [...accessPoints].sort((a, b) => b.strength - a.strength);

                                // Filter out current connection and duplicates
                                const seenSSIDs = new Set<string>();
                                const filteredAPs = sortedAPs.filter(ap => {
                                    if (!ap.ssid || ap.ssid === currentSSID) return false;
                                    if (seenSSIDs.has(ap.ssid)) return false;
                                    seenSSIDs.add(ap.ssid);
                                    return true;
                                });

                                return filteredAPs.map(ap => <AccessPointItem accessPoint={ap} />);
                            }
                        )}
                    />
                    <box
                        visible={chainedBinding(network, ["wifi", "access_points"]).as(accessPoints => {
                            if (!accessPoints) return true;
                            return accessPoints.length === 0;
                        })}
                        child={
                            <label
                                label="No networks found. Try scanning."
                                cssClasses={["network-no-networks"]}
                                halign={Gtk.Align.CENTER}
                                valign={Gtk.Align.CENTER}
                            />
                        }
                    />
                </box>
            </box>
        </box >
    );
}

// Access Point Item Component
function AccessPointItem({ accessPoint }: { accessPoint: AstalNetwork.AccessPoint }) {
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

            {/* Network Info */}
            <box
                orientation={Gtk.Orientation.VERTICAL}
                cssClasses={["network-ap-info"]}
                hexpand={true}
                valign={Gtk.Align.CENTER}
            >
                <label
                    label={accessPoint.ssid || "Hidden Network"}
                    cssClasses={["network-ap-ssid"]}
                    halign={Gtk.Align.START}
                />
                <box
                    orientation={Gtk.Orientation.HORIZONTAL}
                    spacing={scaleSizeNumber(6)}
                >
                    <label
                        label={`${accessPoint.strength}%`}
                        cssClasses={["network-ap-strength"]}
                        halign={Gtk.Align.START}
                    />
                    <label
                        label={getSecurityType(accessPoint)}
                        cssClasses={[
                            "network-ap-security",
                            accessPoint.requires_password ? "secured" : "open"
                        ]}
                        halign={Gtk.Align.START}
                    />
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
