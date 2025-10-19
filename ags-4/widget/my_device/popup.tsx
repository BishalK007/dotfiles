import Binding, { bind } from "astal/binding";
import { Gtk } from "astal/gtk4";
import { mergeBindings, scaleSizeNumber, chainedBinding } from "../../utils/utils";
import { DrawingArea } from "../../custom-widgets/drawingarea";
import { NvidiaService } from "../../services/NvidiaService";

// --- GPU Utilisation history (last ~2 minutes @ 2s poll) ---
const MAX_UTIL_POINTS = 60; // 60 * 2s = 120s
const GPU_UTIL_HISTORY = new Map<string, number[]>();
const GPU_POWER_HISTORY = new Map<string, number[]>(); // in Watts
let __gpuHistorySubscribed = false;
if (!__gpuHistorySubscribed) {
    __gpuHistorySubscribed = true;
    NvidiaService.data.subscribe((d) => {
        const present = new Set<string>();
        const gpus = d?.gpus ?? [];
        gpus.forEach((g, i) => {
            const key = (g as any).uuid || g.name || `gpu-${i}`;
            present.add(key);
            const util = Math.max(0, Math.min(100, g.util ?? 0));
            const arr = GPU_UTIL_HISTORY.get(key) ?? [];
            arr.push(util);
            if (arr.length > MAX_UTIL_POINTS) arr.splice(0, arr.length - MAX_UTIL_POINTS);
            GPU_UTIL_HISTORY.set(key, arr);

            const pNow = g.powerInstW ?? g.powerAvgW ?? 0;
            const parr = GPU_POWER_HISTORY.get(key) ?? [];
            parr.push(Math.max(0, pNow));
            if (parr.length > MAX_UTIL_POINTS) parr.splice(0, parr.length - MAX_UTIL_POINTS);
            GPU_POWER_HISTORY.set(key, parr);
        });
        // prune missing
        for (const k of Array.from(GPU_UTIL_HISTORY.keys())) if (!present.has(k)) GPU_UTIL_HISTORY.delete(k);
        for (const k of Array.from(GPU_POWER_HISTORY.keys())) if (!present.has(k)) GPU_POWER_HISTORY.delete(k);
    });
}

function drawUtilGraphForKey(key: string) {
    return (area: any, cr: any, width: number, height: number) => {
        // derive base color from CSS 'color'
        let r = 1, g = 1, b = 1;
        try {
            const sc = area.get_style_context?.();
            const rgba = sc?.get_color?.(); // Gdk.RGBA with red/green/blue/alpha in 0..1
            if (rgba) { r = rgba.red ?? r; g = rgba.green ?? g; b = rgba.blue ?? b; }
        } catch { }
        const data = GPU_UTIL_HISTORY.get(key) ?? [];
        // layout margins
        const leftMargin = 36; // space for y-axis labels
        const rightMargin = 6;
        const topMargin = 10;
        const bottomMargin = 10;
        const plotW = Math.max(1, width - leftMargin - rightMargin);
        const plotH = Math.max(1, height - topMargin - bottomMargin);

        // background (20% of base color)
        cr.setSourceRGBA(r, g, b, 0.20);
        cr.rectangle(0, 0, width, height);
        cr.fill();

        // y-axis line
        cr.setSourceRGBA(r, g, b, 0.7);
        cr.setLineWidth(1);
        cr.moveTo(leftMargin, topMargin);
        cr.lineTo(leftMargin, topMargin + plotH);
        cr.stroke();

        // ticks + labels at 0, 25, 50, 75, 100 %
        const ticks = [0, 0.25, 0.5, 0.75, 1];
        for (const p of ticks) {
            const y = topMargin + (1 - p) * plotH;
            // grid line
            cr.setSourceRGBA(r, g, b, 0.7);
            cr.setLineWidth(1);
            cr.moveTo(leftMargin + 0.5, y + 0.5);
            cr.lineTo(width - rightMargin - 0.5, y + 0.5);
            cr.stroke();
            // label
            const label = Math.round(p * 100) + ' %';
            cr.setSourceRGBA(r, g, b, 0.7);
            cr.selectFontFace('Sans', 0, 0);
            cr.setFontSize(9);
            // baseline offset ~3px
            cr.moveTo(3, y + 3);
            cr.showText(label);
        }

        if (data.length === 0) return;

        // graph line
        // primary line in base color
        cr.setSourceRGBA(r, g, b, 1.0);
        cr.setLineWidth(2);
        const n = data.length;
        const step = n > 1 ? plotW / (Math.max(n, MAX_UTIL_POINTS) - 1) : plotW;
        const yMin = topMargin + 1;
        const yMax = topMargin + plotH - 1;
        for (let i = 0; i < n; i++) {
            const x = leftMargin + i * step;
            const v = Math.max(0, Math.min(100, data[i]));
            let y = topMargin + (1 - v / 100) * plotH;
            if (y < yMin) y = yMin;
            if (y > yMax) y = yMax;
            if (i === 0) cr.moveTo(x, y);
            else cr.lineTo(x, y);
        }
        cr.stroke();

        // current point highlight
        const last = data[n - 1] ?? 0;
        const x = leftMargin + (n - 1) * step;
        let y = topMargin + (1 - last / 100) * plotH;
        if (y < yMin) y = yMin;
        if (y > yMax) y = yMax;
        cr.setSourceRGBA(r, g, b, 1.0);
        cr.arc(x, y, 2.5, 0, Math.PI * 2);
        cr.fill();
    };
}

function drawPowerGraphForKey(key: string, limitW: number | null | undefined) {
    return (area: any, cr: any, width: number, height: number) => {
        let r = 1, g = 1, b = 1;
        try {
            const sc = area.get_style_context?.();
            const rgba = sc?.get_color?.();
            if (rgba) { r = rgba.red ?? r; g = rgba.green ?? g; b = rgba.blue ?? b; }
        } catch { }
        const data = GPU_POWER_HISTORY.get(key) ?? [];
        const leftMargin = 44; // Watts labels can be a bit wider
        const rightMargin = 6;
        const topMargin = 10;
        const bottomMargin = 10;
        const plotW = Math.max(1, width - leftMargin - rightMargin);
        const plotH = Math.max(1, height - topMargin - bottomMargin);

        // background (20% base color)
        cr.setSourceRGBA(r, g, b, 0.20);
        cr.rectangle(0, 0, width, height);
        cr.fill();

        // determine scale limit
        const maxData = data.length ? Math.max(...data) : 0;
        const limit = (limitW && limitW > 0) ? limitW : Math.max(100, Math.ceil(maxData / 10) * 10);

        // y-axis line
        cr.setSourceRGBA(r, g, b, 0.7);
        cr.setLineWidth(1);
        cr.moveTo(leftMargin, topMargin);
        cr.lineTo(leftMargin, topMargin + plotH);
        cr.stroke();

        // ticks + labels (0, 25, 50, 75, 100 % of limit)
        const ticks = [0, 0.25, 0.5, 0.75, 1];
        for (const p of ticks) {
            const y = topMargin + (1 - p) * plotH;
            // grid
            cr.setSourceRGBA(r, g, b, 0.7);
            cr.setLineWidth(1);
            cr.moveTo(leftMargin + 0.5, y + 0.5);
            cr.lineTo(width - rightMargin - 0.5, y + 0.5);
            cr.stroke();
            // label text
            const val = Math.round(p * limit);
            const label = `${val} W`;
            cr.setSourceRGBA(r, g, b, 0.7);
            cr.selectFontFace('Sans', 0, 0);
            cr.setFontSize(9);
            cr.moveTo(3, y + 3);
            cr.showText(label);
        }

        if (data.length === 0) return;

        // graph line
        cr.setSourceRGBA(r, g, b, 1.0);
        cr.setLineWidth(2);
        const n = data.length;
        const step = n > 1 ? plotW / (Math.max(n, MAX_UTIL_POINTS) - 1) : plotW;
        const yMin = topMargin + 1;
        const yMax = topMargin + plotH - 1;
        for (let i = 0; i < n; i++) {
            const x = leftMargin + i * step;
            const v = Math.max(0, data[i]);
            let y = topMargin + (1 - Math.min(1, v / (limit || 1))) * plotH;
            if (y < yMin) y = yMin;
            if (y > yMax) y = yMax;
            if (i === 0) cr.moveTo(x, y);
            else cr.lineTo(x, y);
        }
        cr.stroke();

        // current point
        const last = data[n - 1] ?? 0;
        const x = leftMargin + (n - 1) * step;
        let y = topMargin + (1 - Math.min(1, last / (limit || 1))) * plotH;
        if (y < yMin) y = yMin;
        if (y > yMax) y = yMax;
        cr.setSourceRGBA(r, g, b, 1.0);
        cr.arc(x, y, 2.5, 0, Math.PI * 2);
        cr.fill();
    };
}

export default function MyDevicePopup() {
    return (

        <box
            orientation={Gtk.Orientation.HORIZONTAL}
            cssClasses={["my-device-popover-container"]}
            valign={Gtk.Align.CENTER}
            halign={Gtk.Align.CENTER}
            spacing={scaleSizeNumber(10)}
        >
            <box
                orientation={Gtk.Orientation.VERTICAL}
                cssClasses={["my-device-popover-nvidia-box"]}
                valign={Gtk.Align.CENTER}
                halign={Gtk.Align.CENTER}
                spacing={scaleSizeNumber(10)}
            >
                {/* Nvidia Header */}
                <box
                    orientation={Gtk.Orientation.HORIZONTAL}
                    valign={Gtk.Align.CENTER}
                    cssClasses={["nvidia-header-box"]}
                    hexpand={true}
                    spacing={scaleSizeNumber(8)}
                    child={<label
                        label="Nvidia"
                        cssClasses={["nvidia-header-text"]}
                        valign={Gtk.Align.CENTER}
                    />}
                />
                {/* Nvidia Body */}
                <box
                    orientation={Gtk.Orientation.VERTICAL}
                    valign={Gtk.Align.CENTER}
                    cssClasses={["nvidia-body-box"]}
                    hexpand={true}
                    spacing={scaleSizeNumber(8)}
                >
                    {/* Driver: 575.51.02      CUDA: 12.9 */}
                    <box
                        orientation={Gtk.Orientation.HORIZONTAL}
                        valign={Gtk.Align.CENTER}
                        hexpand={true}
                        spacing={scaleSizeNumber(4)}
                        cssClasses={["nvidia-info-box"]}
                    >
                        <label
                            label={mergeBindings([
                                NvidiaService.data,
                            ], (d) => `Driver: ${d?.driver ?? 'N/A'}`)}
                            cssClasses={["nvidia-info-label"]}
                            valign={Gtk.Align.CENTER}
                            halign={Gtk.Align.START}
                        />
                        <label
                            label={mergeBindings([
                                NvidiaService.data,
                            ], (d) => `CUDA: ${d?.cuda ?? 'N/A'}`)}
                            cssClasses={["nvidia-info-label"]}
                            hexpand={true}
                            valign={Gtk.Align.CENTER}
                            halign={Gtk.Align.END}
                        />
                    </box>
                    {/* GPUs */}
                    <box
                        orientation={Gtk.Orientation.VERTICAL}
                        spacing={scaleSizeNumber(4)}
                        cssClasses={["nvidia-gpu-list-box"]}
                        children={mergeBindings([
                            NvidiaService.data,
                        ], (d) => {
                            const gpus = d?.gpus ?? [];
                            return gpus.map((g, i) => (
                                <box
                                    orientation={Gtk.Orientation.VERTICAL}
                                    valign={Gtk.Align.CENTER}
                                    hexpand={true}
                                    spacing={scaleSizeNumber(4)}
                                    cssClasses={["nvidia-gpu-box"]}
                                    children={[
                                        // Name
                                        <label
                                            label={`${g.name}`}
                                            cssClasses={["nvidia-gpu-name"]}
                                            valign={Gtk.Align.CENTER}
                                            halign={Gtk.Align.START}
                                        />,
                                        <box
                                            orientation={Gtk.Orientation.VERTICAL}
                                            valign={Gtk.Align.CENTER}
                                            hexpand={true}
                                            spacing={scaleSizeNumber(4)}
                                            cssClasses={["nvidia-gpu-stats-box"]}
                                            children={[
                                                // Memory, Temp
                                                <box
                                                    orientation={Gtk.Orientation.HORIZONTAL}
                                                    valign={Gtk.Align.CENTER}
                                                    hexpand={true}
                                                    spacing={scaleSizeNumber(4)}
                                                    cssClasses={["nvidia-gpu-mem-temp-box"]}
                                                    children={[
                                                        <label
                                                            label={`MEM: ${g.memUsedMiB != null && g.memTotalMiB != null ? `${g.memUsedMiB}MiB (${g.memUsedPct}%)` : "N/A"}`}
                                                            cssClasses={["nvidia-gpu-mem-stats"]}
                                                            valign={Gtk.Align.CENTER}
                                                            halign={Gtk.Align.START}
                                                        />,
                                                        <label
                                                            label={`TEMP: ${g.tempC != null ? `${g.tempC}°C` : "N/A"}`}
                                                            cssClasses={["nvidia-gpu-temp-stats"]}
                                                            hexpand={true}
                                                            valign={Gtk.Align.CENTER}
                                                            halign={Gtk.Align.END}
                                                        />,
                                                    ]}
                                                />,
                                                // Perf
                                                <label
                                                    label={`PERF: ${g.pstate != null ? `${g.pstate}` : "N/A"}`}
                                                    cssClasses={["nvidia-gpu-temp-stats"]}
                                                    hexpand={true}
                                                    valign={Gtk.Align.CENTER}
                                                    halign={Gtk.Align.END}
                                                />,
                                                // Power Graph
                                                <box
                                                    orientation={Gtk.Orientation.VERTICAL}
                                                    valign={Gtk.Align.CENTER}
                                                    hexpand={true}
                                                    spacing={scaleSizeNumber(4)}
                                                    cssClasses={["nvidia-gpu-utilisation-box"]}
                                                >
                                                    <label
                                                        label={`POWER: ${g.powerInstW ?? g.powerAvgW ?? 'N/A'}${g.powerInstW != null || g.powerAvgW != null ? ' W' : ''}`}
                                                        cssClasses={["nvidia-gpu-utilisation-label"]}
                                                        valign={Gtk.Align.CENTER}
                                                        halign={Gtk.Align.START}
                                                    />
                                                    {DrawingArea({
                                                        cssClasses: ["nvidia-gpu-utilisation-graph"],
                                                        widthRequest: scaleSizeNumber(200),
                                                        heightRequest: scaleSizeNumber(60),
                                                        hexpand: true,
                                                        vexpand: false,
                                                        redrawIntervalSec: 2,
                                                        draw: (cr: any, width: number, height: number, area: any) => {
                                                            const key = (g as any).uuid || g.name || `gpu-${i}`;
                                                            const maxLimit = g.powerLimitCurrentW ?? g.powerLimitMaxW ?? g.powerLimitDefaultW ?? null;
                                                            drawPowerGraphForKey(key, maxLimit)(area, cr, width, height);
                                                        },
                                                    })}
                                                </box>,
                                                // Utilisation Graph
                                                <box
                                                    orientation={Gtk.Orientation.VERTICAL}
                                                    valign={Gtk.Align.CENTER}
                                                    hexpand={true}
                                                    spacing={scaleSizeNumber(4)}
                                                    cssClasses={["nvidia-gpu-utilisation-box"]}
                                                >
                                                    <label
                                                        label={`UTIL: ${g.util != null ? `${g.util}%` : "N/A"}`}
                                                        cssClasses={["nvidia-gpu-utilisation-label"]}
                                                        valign={Gtk.Align.CENTER}
                                                        halign={Gtk.Align.START}
                                                    />
                                                    {DrawingArea({
                                                        cssClasses: ["nvidia-gpu-utilisation-graph"],
                                                        widthRequest: scaleSizeNumber(200),
                                                        heightRequest: scaleSizeNumber(60),
                                                        hexpand: true,
                                                        vexpand: false,
                                                        redrawIntervalSec: 2,
                                                        draw: (cr: any, width: number, height: number, area: any) => {
                                                            const key = (g as any).uuid || g.name || `gpu-${i}`;
                                                            // Delegate actual Cairo drawing to our helper
                                                            drawUtilGraphForKey(key)(area, cr, width, height);
                                                        },
                                                    })}
                                                </box>,
                                            ]}
                                        />,
                                    ]}
                                />
                            ));
                        })}
                    />

                </box>
            </box>
            <box
                orientation={Gtk.Orientation.VERTICAL}
                cssClasses={["my-device-popover-asus-box"]}
                valign={Gtk.Align.CENTER}
                halign={Gtk.Align.CENTER}
                spacing={scaleSizeNumber(10)}
            >
                {/* Asus Header */}
                <box
                    orientation={Gtk.Orientation.HORIZONTAL}
                    valign={Gtk.Align.CENTER}
                    cssClasses={["asus-header-box"]}
                    hexpand={true}
                    spacing={scaleSizeNumber(8)}
                    child={<label
                        label="Asus"
                        cssClasses={["asus-header-text"]}
                        valign={Gtk.Align.CENTER}
                    />}
                />
                {/* Asus Body */}
                <box
                    orientation={Gtk.Orientation.VERTICAL}
                    valign={Gtk.Align.CENTER}
                    cssClasses={["nvidia-body-box"]}
                    hexpand={true}
                    spacing={scaleSizeNumber(8)}
                >
                    {/* Driver: 575.51.02      CUDA: 12.9 */}
                    <box
                        orientation={Gtk.Orientation.HORIZONTAL}
                        valign={Gtk.Align.CENTER}
                        hexpand={true}
                        spacing={scaleSizeNumber(4)}
                        cssClasses={["nvidia-info-box"]}
                    >
                        <label
                            label={mergeBindings([
                                NvidiaService.data,
                            ], (d) => `Driver: ${d?.driver ?? 'N/A'}`)}
                            cssClasses={["nvidia-info-label"]}
                            valign={Gtk.Align.CENTER}
                            halign={Gtk.Align.START}
                        />
                        <label
                            label={mergeBindings([
                                NvidiaService.data,
                            ], (d) => `CUDA: ${d?.cuda ?? 'N/A'}`)}
                            cssClasses={["nvidia-info-label"]}
                            hexpand={true}
                            valign={Gtk.Align.CENTER}
                            halign={Gtk.Align.END}
                        />
                    </box>
                    {/* GPUs */}
                    <box
                        orientation={Gtk.Orientation.VERTICAL}
                        spacing={scaleSizeNumber(4)}
                        cssClasses={["nvidia-gpu-list-box"]}
                        children={mergeBindings([
                            NvidiaService.data,
                        ], (d) => {
                            const gpus = d?.gpus ?? [];
                            return gpus.map((g, i) => (
                                <box
                                    orientation={Gtk.Orientation.VERTICAL}
                                    valign={Gtk.Align.CENTER}
                                    hexpand={true}
                                    spacing={scaleSizeNumber(4)}
                                    cssClasses={["nvidia-gpu-box"]}
                                    children={[
                                        // Name
                                        <label
                                            label={`${g.name}`}
                                            cssClasses={["nvidia-gpu-name"]}
                                            valign={Gtk.Align.CENTER}
                                            halign={Gtk.Align.START}
                                        />,
                                        <box
                                            orientation={Gtk.Orientation.VERTICAL}
                                            valign={Gtk.Align.CENTER}
                                            hexpand={true}
                                            spacing={scaleSizeNumber(4)}
                                            cssClasses={["nvidia-gpu-stats-box"]}
                                            children={[
                                                // Memory, Temp
                                                <box
                                                    orientation={Gtk.Orientation.HORIZONTAL}
                                                    valign={Gtk.Align.CENTER}
                                                    hexpand={true}
                                                    spacing={scaleSizeNumber(4)}
                                                    cssClasses={["nvidia-gpu-mem-temp-box"]}
                                                    children={[
                                                        <label
                                                            label={`MEM: ${g.memUsedMiB != null && g.memTotalMiB != null ? `${g.memUsedMiB}MiB (${g.memUsedPct}%)` : "N/A"}`}
                                                            cssClasses={["nvidia-gpu-mem-stats"]}
                                                            valign={Gtk.Align.CENTER}
                                                            halign={Gtk.Align.START}
                                                        />,
                                                        <label
                                                            label={`TEMP: ${g.tempC != null ? `${g.tempC}°C` : "N/A"}`}
                                                            cssClasses={["nvidia-gpu-temp-stats"]}
                                                            hexpand={true}
                                                            valign={Gtk.Align.CENTER}
                                                            halign={Gtk.Align.END}
                                                        />,
                                                    ]}
                                                />,
                                                // Perf
                                                <label
                                                    label={`PERF: ${g.pstate != null ? `${g.pstate}` : "N/A"}`}
                                                    cssClasses={["nvidia-gpu-temp-stats"]}
                                                    hexpand={true}
                                                    valign={Gtk.Align.CENTER}
                                                    halign={Gtk.Align.END}
                                                />,
                                                // Power Graph
                                                <box
                                                    orientation={Gtk.Orientation.VERTICAL}
                                                    valign={Gtk.Align.CENTER}
                                                    hexpand={true}
                                                    spacing={scaleSizeNumber(4)}
                                                    cssClasses={["nvidia-gpu-utilisation-box"]}
                                                >
                                                    <label
                                                        label={`POWER: ${g.powerInstW ?? g.powerAvgW ?? 'N/A'}${g.powerInstW != null || g.powerAvgW != null ? ' W' : ''}`}
                                                        cssClasses={["nvidia-gpu-utilisation-label"]}
                                                        valign={Gtk.Align.CENTER}
                                                        halign={Gtk.Align.START}
                                                    />
                                                    {DrawingArea({
                                                        cssClasses: ["nvidia-gpu-utilisation-graph"],
                                                        widthRequest: scaleSizeNumber(200),
                                                        heightRequest: scaleSizeNumber(60),
                                                        hexpand: true,
                                                        vexpand: false,
                                                        redrawIntervalSec: 2,
                                                        draw: (cr: any, width: number, height: number, area: any) => {
                                                            const key = (g as any).uuid || g.name || `gpu-${i}`;
                                                            const maxLimit = g.powerLimitCurrentW ?? g.powerLimitMaxW ?? g.powerLimitDefaultW ?? null;
                                                            drawPowerGraphForKey(key, maxLimit)(area, cr, width, height);
                                                        },
                                                    })}
                                                </box>,
                                                // Utilisation Graph
                                                <box
                                                    orientation={Gtk.Orientation.VERTICAL}
                                                    valign={Gtk.Align.CENTER}
                                                    hexpand={true}
                                                    spacing={scaleSizeNumber(4)}
                                                    cssClasses={["nvidia-gpu-utilisation-box"]}
                                                >
                                                    <label
                                                        label={`UTIL: ${g.util != null ? `${g.util}%` : "N/A"}`}
                                                        cssClasses={["nvidia-gpu-utilisation-label"]}
                                                        valign={Gtk.Align.CENTER}
                                                        halign={Gtk.Align.START}
                                                    />
                                                    {DrawingArea({
                                                        cssClasses: ["nvidia-gpu-utilisation-graph"],
                                                        widthRequest: scaleSizeNumber(200),
                                                        heightRequest: scaleSizeNumber(60),
                                                        hexpand: true,
                                                        vexpand: false,
                                                        redrawIntervalSec: 2,
                                                        draw: (cr: any, width: number, height: number, area: any) => {
                                                            const key = (g as any).uuid || g.name || `gpu-${i}`;
                                                            // Delegate actual Cairo drawing to our helper
                                                            drawUtilGraphForKey(key)(area, cr, width, height);
                                                        },
                                                    })}
                                                </box>,
                                            ]}
                                        />,
                                    ]}
                                />
                            ));
                        })}
                    />
                </box>
            </box>
        </box>
    );
}
