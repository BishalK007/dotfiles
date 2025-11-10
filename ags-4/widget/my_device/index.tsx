import { Gtk } from "astal/gtk4";
import { scaleSizeNumber } from "../../utils/utils";
import { NvidiaService } from "../../services/NvidiaService";
import { bind } from "astal";
import MyDevicePopup from "./popup";

export default function Bluetooth() {
  return (
    <menubutton cssClasses={["my-device", "my-device-box"]}>
      <box
        orientation={Gtk.Orientation.HORIZONTAL}
        spacing={scaleSizeNumber(0)}
        valign={Gtk.Align.CENTER}
      >
        <label
          label="󰾰"
          cssClasses={["my-device-icon"]}
          valign={Gtk.Align.CENTER}
        />
        <label
          valign={Gtk.Align.CENTER}
          hexpand={true}
          halign={Gtk.Align.END}
          cssClasses={["my-device-label"]}
          label={"My Device"}
        />
      </box>
      <popover cssClasses={["my-device-popover"]} autohide={false}>
        <MyDevicePopup />
      </popover>
    </menubutton>
  );
}
