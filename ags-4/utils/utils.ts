import { execAsync } from "astal";

// Reads the scale from environment variable WAYLAND_MONITOR_SCALE, defaults to 1.0
function getScale(): number {
    // Use GLib to get the environment variable WAYLAND_MONITOR_SCALE
    // @ts-ignore
    const GLib = imports.gi.GLib;
    const scaleStr = GLib.getenv("WAYLAND_MONITOR_SCALE");
    const scale = scaleStr ? parseFloat(scaleStr) : 1.0;
    return isNaN(scale) || scale <= 0 ? 1.0 : scale;
}

// Scales a single integer size by the scale factor from WAYLAND_MONITOR_SCALE
export function scaleSizeNumber(size: number): number {
    const scale = getScale();
    let adjustedValue = Math.floor(size / scale);
    if (adjustedValue === 0) {
        return 1;
    }
    return adjustedValue;
}
// Scales all "<number>px" values in the input CSS string by the scale factor
export function cssPreprocessor(
    css: string, 
    vars: Record<string, string>
): string {
    // Scale preprocessor
    const scale = getScale();
    const re = /(\d+\.?\d*)px/g;

    const scale_processed = css.replace(re, (match, pxValueStr) => {
        const pxValue = parseFloat(pxValueStr);
        if (isNaN(pxValue)) return match;
        let adjustedValue = Math.floor(pxValue / scale);
        if (adjustedValue === 0) adjustedValue = 1;
        return `${adjustedValue}px`;
    });
    
    // Placeholder preporcessor
    // in css preprocessors are defined as @VAR_NAME@
    // this will replace them with the value of the variable
    // print
    const var_processed = scale_processed.replace(/@([A-Z0-9_]+)@/g, (_, varName) => {
        return vars[varName] ?? '';
    });

    
    const result = var_processed;
    // Optionally log the result for debugging
    // print("\n\n _________ Scaled CSS ________\n" + result + "\n _____________________________");
    return result;
}


export async function sh(cmd: string | string[]): Promise<string> {
    return execAsync(cmd).catch((err) => {
        console.error(typeof cmd === 'string' ? cmd : cmd.join(' '), err);
        return '';
    });
}
