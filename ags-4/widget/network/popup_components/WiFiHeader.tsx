import { Gtk } from "astal/gtk4";
import { bind } from "astal/binding";
import AstalNetwork from "gi://AstalNetwork";
import { scaleSizeNumber, chainedBinding } from "../../../utils/utils";

interface WiFiHeaderProps {
    network: AstalNetwork.Network;
    onToggle: () => void;
}

/**
 * WiFi Header Component
 * 
 * Displays WiFi section header with:
 * - Section title
 * - Enable/Disable toggle button
 * - Visual feedback for current state
 */
export default function WiFiHeader({ network, onToggle }: WiFiHeaderProps) {
    return (
        <box
            orientation={Gtk.Orientation.HORIZONTAL}
            cssClasses={["network-wifi-header"]}
            spacing={scaleSizeNumber(8)}
            hexpand={true}
        >
            {/* Section Title */}
            <label
                label="WiFi"
                cssClasses={["network-section-title"]}
                halign={Gtk.Align.START}
                hexpand={true}
            />

            {/* WiFi Toggle Button */}
            <button
                cssClasses={chainedBinding(network, ["wifi", "enabled"]).as(enabled =>
                    enabled 
                        ? ["network-wifi-toggle", "enabled"] 
                        : ["network-wifi-toggle", "disabled"]
                )}
                onClicked={onToggle}
                child={
                    <label
                        label={chainedBinding(network, ["wifi", "enabled"]).as(enabled => 
                            enabled ? "ON" : "OFF"
                        )}
                        cssClasses={["network-wifi-toggle-label"]}
                    />
                }
            />
        </box>
    );
}
