import Binding, { bind } from "astal/binding";
import { Gtk } from "astal/gtk4";
import AstalBluetooth from "gi://AstalBluetooth";
import {
  mergeBindings,
  scaleSizeNumber,
  chainedBinding,
} from "../../utils/utils";
import { createLogger } from "../../utils/logger";

const logger = createLogger("WidgetBluetooth");
const bt = AstalBluetooth.get_default() as AstalBluetooth.Bluetooth;

const handleBluetoothToggle = () => {
  bt.toggle();
};

const handleScanToggle = () => {
  logger.debug("handleScanToggle", "Toggling Bluetooth scan");
  const adapter = bt.get_adapter();
  if (adapter) {
    logger.debug(
      "handleScanToggle",
      `Current discovering state: ${adapter.discovering}`,
    );
    if (adapter.discovering) {
      adapter.stop_discovery();
    } else {
      adapter.start_discovery();
    }
  }
};

export default function BluetoothPopup() {
  return (
    <box
      orientation={Gtk.Orientation.VERTICAL}
      cssClasses={["bluetooth-popover-container"]}
      valign={Gtk.Align.CENTER}
      halign={Gtk.Align.CENTER}
      spacing={scaleSizeNumber(10)}
    >
      {/* Header with Bluetooth toggle */}
      <box
        orientation={Gtk.Orientation.HORIZONTAL}
        valign={Gtk.Align.CENTER}
        cssClasses={["bluetooth-header"]}
        hexpand={true}
        spacing={scaleSizeNumber(8)}
      >
        <box
          orientation={Gtk.Orientation.HORIZONTAL}
          spacing={scaleSizeNumber(6)}
          valign={Gtk.Align.CENTER}
          hexpand={true}
        >
          <label
            label=""
            cssClasses={["bluetooth-header-icon", "bluetooth-header-icon-main"]}
            valign={Gtk.Align.CENTER}
          />
          <label
            label="Bluetooth"
            cssClasses={["bluetooth-header-text"]}
            valign={Gtk.Align.CENTER}
            halign={Gtk.Align.START}
          />
        </box>
        <button
          cssClasses={mergeBindings(
            [bind(bt, "is-powered")],
            (powered: boolean) =>
              powered
                ? ["bluetooth-toggle-button", "bluetooth-toggle-on"]
                : ["bluetooth-toggle-button", "bluetooth-toggle-off"],
          )}
          valign={Gtk.Align.CENTER}
          onClicked={handleBluetoothToggle}
          child={
            <label
              valign={Gtk.Align.CENTER}
              cssClasses={["bluetooth-toggle-label"]}
              label={bind(bt, "is-powered").as((powered) =>
                powered ? "ON" : "OFF",
              )}
            />
          }
        />
      </box>

      {/* Adapter Status */}
      <box
        orientation={Gtk.Orientation.HORIZONTAL}
        cssClasses={["bluetooth-adapter-status"]}
        spacing={scaleSizeNumber(8)}
        visible={bind(bt, "is-powered")}
      >
        <label label="Adapter:" cssClasses={["bluetooth-adapter-label"]} />
        <label
          label={mergeBindings(
            [bind(bt, "adapter")],
            (adapter: AstalBluetooth.Adapter | null) => {
              if (!adapter) return "Not Available";
              return `${adapter.name || "Unknown"} (${adapter.alias || "No Alias"})`;
            },
          )}
          cssClasses={["bluetooth-adapter-name"]}
          hexpand={true}
          halign={Gtk.Align.START}
        />
      </box>

      {/* Scan Controls */}
      <box
        orientation={Gtk.Orientation.HORIZONTAL}
        cssClasses={["bluetooth-scan-controls"]}
        spacing={scaleSizeNumber(8)}
        visible={bind(bt, "is-powered")}
      >
        <button
          cssClasses={chainedBinding(bt, ["adapter", "discovering"]).as(
            (discovering: boolean) =>
              discovering
                ? ["bluetooth-scan-button", "bluetooth-scanning"]
                : ["bluetooth-scan-button"],
          )}
          onClicked={handleScanToggle}
          child={
            <box
              orientation={Gtk.Orientation.HORIZONTAL}
              spacing={scaleSizeNumber(4)}
            >
              <label
                label={chainedBinding(bt, ["adapter", "discovering"]).as(
                  (discovering: boolean) => (discovering ? "󰓦" : "󰍉"),
                )}
                cssClasses={chainedBinding(bt, ["adapter", "discovering"]).as(
                  (discovering: boolean) =>
                    discovering
                      ? ["bluetooth-scan-icon", "bluetooth-scan-icon-active"]
                      : ["bluetooth-scan-icon", "bluetooth-scan-icon-inactive"],
                )}
              />
              <label
                label={chainedBinding(bt, ["adapter", "discovering"]).as(
                  (discovering: boolean) =>
                    discovering ? "Stop Scan" : "Start Scan",
                )}
                cssClasses={["bluetooth-scan-label"]}
              />
            </box>
          }
        />
        <label
          label={chainedBinding(bt, ["adapter", "discovering"]).as(
            (discovering: boolean) =>
              discovering ? "Scanning..." : "Not scanning",
          )}
          cssClasses={chainedBinding(bt, ["adapter", "discovering"]).as(
            (discovering: boolean) =>
              discovering
                ? ["bluetooth-scan-status", "scanning"]
                : ["bluetooth-scan-status", "not-scanning"],
          )}
          hexpand={true}
          halign={Gtk.Align.END}
        />
      </box>

      {/* Paired Devices Section */}
      <box
        orientation={Gtk.Orientation.VERTICAL}
        cssClasses={["bluetooth-paired-section"]}
        spacing={scaleSizeNumber(8)}
        visible={bind(bt, "is-powered")}
      >
        <label
          label="Paired Devices"
          cssClasses={["bluetooth-section-title"]}
          halign={Gtk.Align.START}
        />
        <box
          orientation={Gtk.Orientation.VERTICAL}
          cssClasses={["bluetooth-devices-list"]}
          spacing={scaleSizeNumber(4)}
          children={bind(bt, "devices").as((devices) => {
            return devices.map((device: AstalBluetooth.Device) => (
              <box
                visible={bind(device, "paired")}
                child={<DeviceItem device={device} />}
              />
            ));
          })}
        />
        <box
          visible={mergeBindings(
            [bind(bt, "devices")],
            (devices: AstalBluetooth.Device[]) => {
              return devices.filter((d) => d.paired).length === 0;
            },
          )}
          child={
            <label
              label="No paired devices"
              cssClasses={["bluetooth-no-devices"]}
              halign={Gtk.Align.CENTER}
              valign={Gtk.Align.CENTER}
            />
          }
        />
      </box>

      {/* Available Devices Section */}
      <box
        orientation={Gtk.Orientation.VERTICAL}
        cssClasses={["bluetooth-available-section"]}
        spacing={scaleSizeNumber(8)}
        visible={bind(bt, "is-powered")}
      >
        <label
          label="Available Devices"
          cssClasses={["bluetooth-section-title"]}
          halign={Gtk.Align.START}
        />
        <box
          orientation={Gtk.Orientation.VERTICAL}
          cssClasses={["bluetooth-devices-list"]}
          spacing={scaleSizeNumber(4)}
          children={bind(bt, "devices").as((devices) => {
            return devices.map((device: AstalBluetooth.Device) => (
              <box
                visible={mergeBindings(
                  [bind(device, "paired"), bind(device, "name")],
                  (paired: boolean, name: string) => {
                    return !paired && !!name && name !== "";
                  },
                )}
                child={<DeviceItem device={device} />}
              />
            ));
          })}
        />
        <box
          visible={mergeBindings(
            [bind(bt, "devices")],
            (devices: AstalBluetooth.Device[]) => {
              return (
                devices.filter((d) => !d.paired && d.name && d.name !== "")
                  .length === 0
              );
            },
          )}
          child={
            <label
              label="No available devices. Try scanning."
              cssClasses={["bluetooth-no-devices"]}
              halign={Gtk.Align.CENTER}
              valign={Gtk.Align.CENTER}
            />
          }
        />
      </box>
    </box>
  );
}

// Device Item Component
function DeviceItem({ device }: { device: AstalBluetooth.Device }) {
  const handlePrimaryAction = () => {
    const isPaired = device.paired;

    if (isPaired) {
      // For paired devices, toggle connection
      if (device.connected) {
        device.disconnect_device((source: any, result: any) => {
          try {
            device.disconnect_device_finish(result);
            logger.success("DeviceItem", `Disconnected from ${device.name}`);
          } catch (e) {
            logger.error(
              "DeviceItem",
              `Failed to disconnect from ${device.name}: ${e}`,
            );
          }
        });
      } else {
        device.connect_device((source: any, result: any) => {
          try {
            device.connect_device_finish(result);
            logger.success("DeviceItem", `Connected to ${device.name}`);
          } catch (e) {
            logger.error(
              "DeviceItem",
              `Failed to connect to ${device.name}: ${e}`,
            );
          }
        });
      }
    } else {
      // For unpaired devices, pair them
      device.pair((source: any, result: any) => {
        try {
          device.pair_finish(result);
          logger.success("DeviceItem", `Paired with ${device.name}`);
        } catch (e) {
          logger.error(
            "DeviceItem",
            `Failed to pair with ${device.name}: ${e}`,
          );
        }
      });
    }
  };

  const handleSecondaryAction = () => {
    // Remove/unpair device
    const adapter = bt.get_adapter();
    if (adapter) {
      adapter.remove_device(device, (source: any, result: any) => {
        try {
          adapter.remove_device_finish(result);
          logger.success("DeviceItem", `Removed ${device.name}`);
        } catch (e) {
          logger.error("DeviceItem", `Failed to remove ${device.name}: ${e}`);
        }
      });
    }
  };

  const handleTrustToggle = () => {
    device.set_trusted(!device.trusted);
  };

  const getDeviceIcon = (device: AstalBluetooth.Device) => {
    const iconName = device.icon || "bluetooth";
    switch (iconName) {
      case "audio-headphones":
      case "audio-headset":
        return "󰋋";
      case "input-mouse":
        return "󰦋";
      case "input-keyboard":
        return "󰌌";
      case "phone":
        return "󰏲";
      case "computer":
        return "󰍹";
      case "audio-card":
        return "󰋌";
      default:
        return "";
    }
  };

  const getDeviceIconType = (device: AstalBluetooth.Device) => {
    const iconName = device.icon || "bluetooth";
    switch (iconName) {
      case "audio-headphones":
      case "audio-headset":
        return "headphones";
      case "input-mouse":
        return "mouse";
      case "input-keyboard":
        return "keyboard";
      case "phone":
        return "phone";
      case "computer":
        return "computer";
      case "audio-card":
        return "speaker";
      default:
        return "generic";
    }
  };

  return (
    <box
      orientation={Gtk.Orientation.HORIZONTAL}
      cssClasses={["bluetooth-device-item"]}
      spacing={scaleSizeNumber(8)}
      hexpand={true}
    >
      {/* Device Icon */}
      <label
        label={getDeviceIcon(device)}
        cssClasses={[
          "bluetooth-device-icon",
          `bluetooth-device-icon-${getDeviceIconType(device)}`,
        ]}
        valign={Gtk.Align.CENTER}
      />

      {/* Device Info */}
      <box
        orientation={Gtk.Orientation.VERTICAL}
        cssClasses={["bluetooth-device-info"]}
        hexpand={true}
        valign={Gtk.Align.CENTER}
      >
        <label
          label={device.name || "Unknown Device"}
          cssClasses={["bluetooth-device-name"]}
          halign={Gtk.Align.START}
        />
        <box
          orientation={Gtk.Orientation.HORIZONTAL}
          spacing={scaleSizeNumber(4)}
        >
          <label
            label={device.address || ""}
            cssClasses={["bluetooth-device-address"]}
            halign={Gtk.Align.START}
          />
          <box
            visible={bind(device, "paired")}
            child={
              <label
                label={mergeBindings(
                  [
                    bind(device, "connected"),
                    bind(device, "connecting"),
                    bind(device, "battery-percentage"),
                  ],
                  (
                    connected: boolean,
                    connecting: boolean,
                    battery: number,
                  ) => {
                    if (connecting) return "Connecting...";
                    if (connected) {
                      const batteryStr =
                        battery > 0 ? ` (${Math.round(battery * 100)}%)` : "";
                      return `Connected${batteryStr}`;
                    }
                    return "Disconnected";
                  },
                )}
                cssClasses={mergeBindings(
                  [bind(device, "connected"), bind(device, "connecting")],
                  (connected: boolean, connecting: boolean) => {
                    const baseClass = "bluetooth-device-status";
                    if (connecting) return [baseClass, "connecting"];
                    if (connected) return [baseClass, "connected"];
                    return [baseClass, "disconnected"];
                  },
                )}
                halign={Gtk.Align.START}
              />
            }
          />
          <box
            visible={bind(device, "paired")}
            child={
              <label
                label={bind(device, "trusted").as((trusted) =>
                  trusted ? "Trusted" : "Not Trusted",
                )}
                cssClasses={mergeBindings(
                  [bind(device, "trusted")],
                  (trusted: boolean) =>
                    trusted
                      ? ["bluetooth-device-trust", "trusted"]
                      : ["bluetooth-device-trust", "not-trusted"],
                )}
                halign={Gtk.Align.START}
              />
            }
          />
        </box>
      </box>

      {/* Action Buttons */}
      <box
        orientation={Gtk.Orientation.HORIZONTAL}
        cssClasses={["bluetooth-device-actions"]}
        spacing={scaleSizeNumber(4)}
        valign={Gtk.Align.CENTER}
        children={mergeBindings([bind(device, "paired")], (paired: boolean) => [
          <button
            cssClasses={mergeBindings(
              [
                bind(device, "connected"),
                bind(device, "connecting"),
                bind(device, "paired"),
              ],
              (connected: boolean, connecting: boolean, paired: boolean) => {
                const baseClasses = ["bluetooth-device-primary-button"];
                if (paired) {
                  if (connecting)
                    return [...baseClasses, "bluetooth-connecting"];
                  if (connected) return [...baseClasses, "bluetooth-connected"];
                  return [...baseClasses, "bluetooth-disconnected"];
                }
                return baseClasses;
              },
            )}
            onClicked={handlePrimaryAction}
            sensitive={mergeBindings(
              [bind(device, "connecting")],
              (connecting: boolean) => !connecting,
            )}
            child={
              <label
                label={mergeBindings(
                  [
                    bind(device, "connected"),
                    bind(device, "connecting"),
                    bind(device, "paired"),
                  ],
                  (
                    connected: boolean,
                    connecting: boolean,
                    paired: boolean,
                  ) => {
                    if (paired) {
                      if (connecting) return "󰔟";
                      return connected ? "" : "";
                    }
                    return "󰐗";
                  },
                )}
                cssClasses={mergeBindings(
                  [
                    bind(device, "connected"),
                    bind(device, "connecting"),
                    bind(device, "paired"),
                  ],
                  (
                    connected: boolean,
                    connecting: boolean,
                    paired: boolean,
                  ) => {
                    const baseClasses = ["bluetooth-device-action-icon"];
                    if (paired) {
                      if (connecting)
                        return [
                          ...baseClasses,
                          "bluetooth-device-action-icon-connecting",
                        ];
                      return connected
                        ? [
                            ...baseClasses,
                            "bluetooth-device-action-icon-disconnect",
                          ]
                        : [
                            ...baseClasses,
                            "bluetooth-device-action-icon-connect",
                          ];
                    }
                    return [
                      ...baseClasses,
                      "bluetooth-device-action-icon-pair",
                    ];
                  },
                )}
              />
            }
          />,
          ...(paired
            ? [
                <button
                  cssClasses={mergeBindings(
                    [bind(device, "trusted")],
                    (trusted: boolean) =>
                      trusted
                        ? ["bluetooth-device-trust-button", "bluetooth-trusted"]
                        : [
                            "bluetooth-device-trust-button",
                            "bluetooth-not-trusted",
                          ],
                  )}
                  onClicked={handleTrustToggle}
                  child={
                    <label
                      label={bind(device, "trusted").as((trusted) =>
                        trusted ? "󰡃" : "󰕃",
                      )}
                      cssClasses={mergeBindings(
                        [bind(device, "trusted")],
                        (trusted: boolean) =>
                          trusted
                            ? [
                                "bluetooth-device-action-icon",
                                "bluetooth-device-action-icon-trusted",
                              ]
                            : [
                                "bluetooth-device-action-icon",
                                "bluetooth-device-action-icon-untrusted",
                              ],
                      )}
                    />
                  }
                />,
                <button
                  cssClasses={["bluetooth-device-remove-button"]}
                  onClicked={handleSecondaryAction}
                  child={
                    <label
                      label="󰆴"
                      cssClasses={[
                        "bluetooth-device-action-icon",
                        "bluetooth-device-action-icon-remove",
                      ]}
                    />
                  }
                />,
              ]
            : []),
        ])}
      />
    </box>
  );
}
