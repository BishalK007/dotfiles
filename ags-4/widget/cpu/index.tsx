import { Gtk, Widget } from "astal/gtk4";
import { readFileAsync } from "astal";
import { scaleSizeNumber } from "../../utils/utils";
import { OSDManager } from "../../services/OSDManager";

function parseCpuStat(line: string) {
    // Example: cpu  4705 0 2257 136239 0 0 0 0 0 0
    const [, user, nice, system, idle, iowait, irq, softirq, steal] = line.trim().split(/\s+/);
    const idleTime = Number(idle) + Number(iowait);
    const totalTime =
        Number(user) +
        Number(nice) +
        Number(system) +
        Number(idle) +
        Number(iowait) +
        Number(irq) +
        Number(softirq) +
        Number(steal);
    return { idleTime, totalTime };
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

export default function Cpu({
    digits = 3,
    interval = 2000,
}) {
    const cpuLabel = Widget.Label({
        label: "0.00%",
        cssClasses: ["cpu-label"],
        valign: Gtk.Align.CENTER,
    });

    let prevIdle = 0;
    let prevTotal = 0;

    async function updateCpu() {
        const stat = await readFileAsync("/proc/stat");
        const line = stat.split("\n")[0];
        const { idleTime, totalTime } = parseCpuStat(line);

        if (prevTotal !== 0) {
            const diffIdle = idleTime - prevIdle;
            const diffTotal = totalTime - prevTotal;
            const usage = diffTotal > 0 ? (1 - diffIdle / diffTotal) * 100 : 0;
            cpuLabel.label = `${formatUsage(usage, digits)}%`;
        }

        prevIdle = idleTime;
        prevTotal = totalTime;
        setTimeout(updateCpu, interval);
    }

    updateCpu();

    return (
        <box
            orientation={Gtk.Orientation.HORIZONTAL}
            spacing={scaleSizeNumber(0)}
            valign={Gtk.Align.CENTER}
            cssClasses={["cpu", "cpu-box"]}
        >
            <label
                label=""
                cssClasses={["cpu-icon"]}
                valign={Gtk.Align.CENTER}
            />
            {cpuLabel} 
            <button
                cssClasses={["cpu-button"]}
                valign={Gtk.Align.CENTER}
                onClicked={() => {
                    // Handle button click if needed
                    OSDManager.handleOSDVisibleToggle();
                }}
                child={<label label="Refresh" />}
            />
        </box>
    );
}