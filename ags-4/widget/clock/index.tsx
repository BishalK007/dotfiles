import { Gtk, Widget } from "astal/gtk4";
import { scaleSizeNumber } from "../../utils/utils";

type TimeFormat =
    | "HH"
    | "HH:mm"
    | "HH:mm:ss"
    | "hh A"
    | "hh:mm A"
    | "hh:mm:ss A";

function formatTime(date: Date, format: TimeFormat): string {
    const pad = (n: number) => n.toString().padStart(2, "0");
    let h = date.getHours();
    let m = date.getMinutes();
    let s = date.getSeconds();
    let isPM = h >= 12;
    let h12 = h % 12 || 12;
    switch (format) {
        case "HH": return pad(h);
        case "HH:mm": return `${pad(h)}:${pad(m)}`;
        case "HH:mm:ss": return `${pad(h)}:${pad(m)}:${pad(s)}`;
        case "hh A": return `${pad(h12)} ${isPM ? "PM" : "AM"}`;
        case "hh:mm A": return `${pad(h12)}:${pad(m)} ${isPM ? "PM" : "AM"}`;
        case "hh:mm:ss A": return `${pad(h12)}:${pad(m)}:${pad(s)} ${isPM ? "PM" : "AM"}`;
        default: return `${pad(h)}:${pad(m)}`;
    }
}

function computeDelay(format: TimeFormat): number {
    const now = new Date();
    switch (format) {
        case "HH":
        case "hh A":
            return ((60 - now.getMinutes()) * 60 - now.getSeconds()) * 1000 - now.getMilliseconds();
        case "HH:mm":
        case "hh:mm A":
            return (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
        case "HH:mm:ss":
        case "hh:mm:ss A":
            return 1000 - now.getMilliseconds();
        default:
            return (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    }
}

interface ClockProps {
    format?: TimeFormat;
    cssClasses?: string[];
}

export default function Clock({ format = "HH:mm", cssClasses = [] }: ClockProps) {
    const timeLabel = Widget.Label({
        label: formatTime(new Date(), format),
        cssClasses: ["clock-label", "primary-color"],
        valign: Gtk.Align.CENTER,
    });

    function updateTime() {
        timeLabel.label = formatTime(new Date(), format);
        setTimeout(updateTime, computeDelay(format));
    }

    updateTime();

    return (
        <box
            orientation={Gtk.Orientation.HORIZONTAL}
            spacing={scaleSizeNumber(0)}
            valign={Gtk.Align.CENTER}
            cssClasses={["clock", "clock-box", "background-color", "border-color", ...cssClasses]}
        >
            <label
                label="󰥔"
                cssClasses={["clock-icon", "primary-color"]}
                valign={Gtk.Align.CENTER}
            />
            {timeLabel}
        </box>
    );
}
