import { Gtk, Widget } from "astal/gtk4";
import { readFileAsync } from "astal";
import { scaleSizeNumber } from "../../utils/utils";

function parseMemInfo(meminfo: string) {
    // Parse lines like: MemTotal:       16384256 kB
    const lines = meminfo.split("\n");
    let memTotal = 0, memAvailable = 0;
    for (const line of lines) {
        if (line.startsWith("MemTotal:")) {
            memTotal = Number(line.replace(/\D+/g, ""));
        }
        if (line.startsWith("MemAvailable:")) {
            memAvailable = Number(line.replace(/\D+/g, ""));
        }
    }
    return { memTotal, memAvailable };
}

// Format number to 'digits' significant digits, remove trailing zeros and dot
function formatUsage(num: number, digits: number) {
    digits = digits > 3 ? digits : 3;
    let str = num.toString().substring(0, digits + 1);
    if (num >= 100){
        str = "100"
    }
    return str;
}

export default function Memory({
    digits = 3,
    interval = 2000,
}) {
    const memLabel = Widget.Label({
        label: "0.00%",
        cssClasses: ["memory-label"],
        valign: Gtk.Align.CENTER,
    });

    async function updateMem() {
        const meminfo = await readFileAsync("/proc/meminfo");
        const { memTotal, memAvailable } = parseMemInfo(meminfo);
        if (memTotal > 0) {
            const used = memTotal - memAvailable;
            const usage = (used / memTotal) * 100;
            memLabel.label = `${formatUsage(usage, digits)}%`;
        }
        setTimeout(updateMem, interval);
    }

    updateMem();

    return (
        <box
            orientation={Gtk.Orientation.HORIZONTAL}
            spacing={scaleSizeNumber(0)}
            valign={Gtk.Align.CENTER}
            cssClasses={["memory", "memory-box"]}
        >
            <label
                label=""
                cssClasses={["memory-icon"]}
                valign={Gtk.Align.CENTER}
            />
            {memLabel}
        </box>
    );
}