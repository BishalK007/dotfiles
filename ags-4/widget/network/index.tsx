import { Gtk } from "astal/gtk4";
import { scaleSizeNumber, chainedBinding, mergeBindings } from "../../utils/utils";
import AstalNetwork from "gi://AstalNetwork";
import NetworkPopup from "./popup";

const network = AstalNetwork.Network.get_default();

export default function Network() {
    const getNetworkIcon = () => {
        return mergeBindings(
            [
                chainedBinding(network, ["primary"]),
                chainedBinding(network, ["wifi", "enabled"]),
                chainedBinding(network, ["wifi", "strength"])
            ],
            (primary: AstalNetwork.Primary, wifiEnabled: boolean, wifiStrength: number) => {
                if (primary === AstalNetwork.Primary.WIRED) {
                    return "󰈀"; 
                } else {
                    if (!network.wifi) return "󰤮";
                    if (!wifiEnabled) return "󰤮";
                    
                    const strength = wifiStrength || 0;
                    if (strength >= 80) return "󰤨";
                    if (strength >= 60) return "󰤥";
                    if (strength >= 40) return "󰤢";
                    if (strength >= 20) return "󰤟";
                    return "󰤯";
                }
            }
        );
    };

    const getNetworkLabel = () => {
        return mergeBindings(
            [
                chainedBinding(network, ["primary"]),
                chainedBinding(network, ["wired", "internet"]),
                chainedBinding(network, ["wifi", "enabled"]),
                chainedBinding(network, ["wifi", "ssid"]),
                chainedBinding(network, ["wifi", "internet"])
            ],
            (
                primary: AstalNetwork.Primary, 
                wiredInternet: AstalNetwork.Internet, 
                wifiEnabled: boolean, 
                wifiSSID: string, 
                wifiInternet: AstalNetwork.Internet
            ) => {
                if (primary === AstalNetwork.Primary.WIRED) {
                    return wiredInternet === AstalNetwork.Internet.CONNECTED 
                        ? "Ethernet" 
                        : "Ethernet (No Internet)";
                } else { 
                    if (!network.wifi) return "No WiFi";
                    if (!wifiEnabled) return "WiFi Off";
                    if (wifiSSID) {
                        const internetStatus = wifiInternet === AstalNetwork.Internet.CONNECTED 
                            ? "" 
                            : " (No Internet)";
                        return `${wifiSSID}${internetStatus}`;
                    }
                    return "Disconnected";
                }
            }
        );
    };

    return (
        <menubutton
            cssClasses={["network", "network-box"]}
        >
            <box
                orientation={Gtk.Orientation.HORIZONTAL}
                spacing={scaleSizeNumber(8)}
                valign={Gtk.Align.CENTER}
            >
                <label
                    label={getNetworkIcon()}
                    cssClasses={["network-icon"]}
                    valign={Gtk.Align.CENTER}
                />
                <label
                    valign={Gtk.Align.CENTER}
                    hexpand={true}
                    halign={Gtk.Align.END}
                    cssClasses={["network-status-label"]}
                    label={getNetworkLabel()}
                />
            </box>
            <popover
                cssClasses={["network-popover"]}
                autohide={true}
            >
                <NetworkPopup />
            </popover>
        </menubutton>
    );
}
