import { Gtk } from "astal/gtk4";
import { bind } from "astal/binding";
import AstalNetwork from "gi://AstalNetwork";
import { scaleSizeNumber, chainedBinding } from "../../../utils/utils";
import { createLogger } from "../../../utils/logger";

const logger = createLogger("WidgetNetwork", "WiFiControls");

interface WiFiControlsProps {
  network: AstalNetwork.Network;
  onScan: () => void;
}

/**
 * WiFi Controls Component
 *
 * Displays WiFi scan controls with:
 * - Scan/Stop scan button
 * - Visual feedback for scanning state
 * - Animated scan icon when active
 */
export default function WiFiControls({ network, onScan }: WiFiControlsProps) {
  /**
   * Enhanced scan handler that forces a proper scan
   */
  const handleScan = () => {
    logger.debug("Manual scan triggered");
    if (network.wifi) {
      // Force scan and log the result
      network.wifi.scan();
      logger.info("WiFi scan initiated");
    }
  };

  return (
    <box
      orientation={Gtk.Orientation.HORIZONTAL}
      cssClasses={["network-wifi-controls"]}
      spacing={scaleSizeNumber(8)}
      visible={chainedBinding(network, ["wifi", "enabled"]).as(
        (enabled) => enabled || false,
      )}
      child={
        <button
          cssClasses={chainedBinding(network, ["wifi", "scanning"]).as(
            (scanning) =>
              scanning
                ? ["network-scan-button", "scanning"]
                : ["network-scan-button"],
          )}
          onClicked={handleScan}
          child={
            <box
              orientation={Gtk.Orientation.HORIZONTAL}
              spacing={scaleSizeNumber(4)}
              cssClasses={["network-scan-container"]}
            >
              {/* Scan Icon (animated when scanning) */}
              <label label="󰑓" cssClasses={["network-scan-icon"]} />

              {/* Scan Button Label */}
              <label
                label={chainedBinding(network, ["wifi", "scanning"]).as(
                  (scanning) => (scanning ? " Scanning..." : " Scan"),
                )}
                cssClasses={["network-scan-label"]}
              />
            </box>
          }
        />
      }
    />
  );
}
