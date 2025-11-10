import { bind, Variable } from "astal";
import { Gtk } from "astal/gtk4";
import {
  mergeBindings,
  scaleSizeNumber,
  chainedBinding,
} from "../../utils/utils";
import { AsusService } from "../../services/asus";
import { NvidiaService } from "../../services/NvidiaService";
import { DrawingArea, DAProps, DrawFunc } from "custom-widgets/drawingarea";
import { createLogger } from "../../utils/logger";

const logger = createLogger("MyDevice", "popup");

logger.debug("Module loaded, AsusService imported");
logger.debug(`AsusService.profile at module load: ${AsusService.profile}`);
logger.debug(`AsusService.available at module load: ${AsusService.available}`);

// -------- GPU state tracking (unchanged logic, tidied) --------
const MAX_UTIL_POINTS = 60; // 60 * 2s = 120s
const GPU_UTIL_HISTORY = new Map<string, number[]>();
const GPU_POWER_HISTORY = new Map<string, number[]>();
let __gpuHistorySubscribed = false;

if (!__gpuHistorySubscribed) {
  __gpuHistorySubscribed = true;
  NvidiaService.connect("notify::data", () => {
    const d = NvidiaService.data;
    const present = new Set<string>();
    const gpus = d?.gpus ?? [];
    gpus.forEach((g, i) => {
      const key = (g as any).uuid || g.name || `gpu-${i}`;
      present.add(key);

      // util %
      const util = Math.max(0, Math.min(100, g.util ?? 0));
      const utilArr = GPU_UTIL_HISTORY.get(key) ?? [];
      utilArr.push(util);
      if (utilArr.length > MAX_UTIL_POINTS)
        utilArr.splice(0, utilArr.length - MAX_UTIL_POINTS);
      GPU_UTIL_HISTORY.set(key, utilArr);

      // power W
      const pNow = g.powerInstW ?? g.powerAvgW ?? 0;
      const pArr = GPU_POWER_HISTORY.get(key) ?? [];
      pArr.push(Math.max(0, pNow));
      if (pArr.length > MAX_UTIL_POINTS)
        pArr.splice(0, pArr.length - MAX_UTIL_POINTS);
      GPU_POWER_HISTORY.set(key, pArr);
    });

    // prune
    for (const k of Array.from(GPU_UTIL_HISTORY.keys()))
      if (!present.has(k)) GPU_UTIL_HISTORY.delete(k);
    for (const k of Array.from(GPU_POWER_HISTORY.keys()))
      if (!present.has(k)) GPU_POWER_HISTORY.delete(k);
  });
}

// -------- Drawing helpers --------
function drawUtilGraphForKey(key: string) {
  return (area: any, cr: any, width: number, height: number) => {
    // color from style context
    let r = 1,
      g = 1,
      b = 1;
    try {
      const sc = area.get_style_context?.();
      const rgba = sc?.get_color?.();
      if (rgba) {
        r = rgba.red ?? r;
        g = rgba.green ?? g;
        b = rgba.blue ?? b;
      }
    } catch {}

    const data = GPU_UTIL_HISTORY.get(key) ?? [];

    const leftMargin = 36,
      rightMargin = 6,
      topMargin = 10,
      bottomMargin = 10;
    const plotW = Math.max(1, width - leftMargin - rightMargin);
    const plotH = Math.max(1, height - topMargin - bottomMargin);

    // background
    cr.setSourceRGBA(r, g, b, 0.2);
    cr.rectangle(0, 0, width, height);
    cr.fill();

    // y-axis
    cr.setSourceRGBA(r, g, b, 0.7);
    cr.setLineWidth(1);
    cr.moveTo(leftMargin, topMargin);
    cr.lineTo(leftMargin, topMargin + plotH);
    cr.stroke();

    // grid + labels
    const ticks = [0, 0.25, 0.5, 0.75, 1];
    for (const p of ticks) {
      const y = topMargin + (1 - p) * plotH;
      cr.setSourceRGBA(r, g, b, 0.7);
      cr.setLineWidth(1);
      cr.moveTo(leftMargin + 0.5, y + 0.5);
      cr.lineTo(width - rightMargin - 0.5, y + 0.5);
      cr.stroke();
      cr.setSourceRGBA(r, g, b, 0.7);
      cr.selectFontFace("Sans", 0, 0);
      cr.setFontSize(9);
      cr.moveTo(3, y + 3);
      cr.showText(Math.round(p * 100) + " %");
    }

    if (!data.length) return;

    // line
    cr.setSourceRGBA(r, g, b, 1.0);
    cr.setLineWidth(2);
    const n = data.length;
    const step = n > 1 ? plotW / (Math.max(n, MAX_UTIL_POINTS) - 1) : plotW;
    const yMin = topMargin + 1,
      yMax = topMargin + plotH - 1;

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

    // last point
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
    let r = 1,
      g = 1,
      b = 1;
    try {
      const sc = area.get_style_context?.();
      const rgba = sc?.get_color?.();
      if (rgba) {
        r = rgba.red ?? r;
        g = rgba.green ?? g;
        b = rgba.blue ?? b;
      }
    } catch {}

    const data = GPU_POWER_HISTORY.get(key) ?? [];

    const leftMargin = 44,
      rightMargin = 6,
      topMargin = 10,
      bottomMargin = 10;
    const plotW = Math.max(1, width - leftMargin - rightMargin);
    const plotH = Math.max(1, height - topMargin - bottomMargin);

    // bg
    cr.setSourceRGBA(r, g, b, 0.2);
    cr.rectangle(0, 0, width, height);
    cr.fill();

    // scale upper bound
    const maxData = data.length ? Math.max(...data) : 0;
    const limit =
      limitW && limitW > 0
        ? limitW
        : Math.max(100, Math.ceil(maxData / 10) * 10);

    // y-axis
    cr.setSourceRGBA(r, g, b, 0.7);
    cr.setLineWidth(1);
    cr.moveTo(leftMargin, topMargin);
    cr.lineTo(leftMargin, topMargin + plotH);
    cr.stroke();

    // grid + labels
    const ticks = [0, 0.25, 0.5, 0.75, 1];
    for (const p of ticks) {
      const y = topMargin + (1 - p) * plotH;
      cr.setSourceRGBA(r, g, b, 0.7);
      cr.setLineWidth(1);
      cr.moveTo(leftMargin + 0.5, y + 0.5);
      cr.lineTo(width - rightMargin - 0.5, y + 0.5);
      cr.stroke();

      const val = Math.round(p * limit);
      cr.setSourceRGBA(r, g, b, 0.7);
      cr.selectFontFace("Sans", 0, 0);
      cr.setFontSize(9);
      cr.moveTo(3, y + 3);
      cr.showText(`${val} W`);
    }

    if (!data.length) return;

    // line
    cr.setSourceRGBA(r, g, b, 1.0);
    cr.setLineWidth(2);
    const n = data.length;
    const step = n > 1 ? plotW / (Math.max(n, MAX_UTIL_POINTS) - 1) : plotW;
    const yMin = topMargin + 1,
      yMax = topMargin + plotH - 1;

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

    // last point
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

// A tiny convenience component for your graphs
const GraphArea = ({
  draw,
  intervalMs = 2000,
  ...props
}: {
  draw: DrawFunc;
  intervalMs?: number;
} & Omit<DAProps, "draw" | "intervalMs">) => (
  <DrawingArea {...props} draw={draw} intervalMs={intervalMs} />
);

// -------- UI --------
export default function MyDevicePopup() {
  logger.debug("MyDevicePopup() called");
  logger.debug(`AsusService.profile in function: ${AsusService.profile}`);
  return (
    <box
      orientation={Gtk.Orientation.HORIZONTAL}
      cssClasses={["my-device-popover-container"]}
      valign={Gtk.Align.CENTER}
      halign={Gtk.Align.CENTER}
      spacing={scaleSizeNumber(10)}
    >
      {/* NVIDIA side  */}

      {true ? (
        <box
          orientation={Gtk.Orientation.VERTICAL}
          cssClasses={["my-device-popover-nvidia-box"]}
          valign={Gtk.Align.CENTER}
          halign={Gtk.Align.CENTER}
          spacing={scaleSizeNumber(10)}
        >
          <box
            orientation={Gtk.Orientation.HORIZONTAL}
            valign={Gtk.Align.CENTER}
            cssClasses={["nvidia-header-box"]}
            hexpand={true}
            spacing={scaleSizeNumber(8)}
            child={
              <label
                label="Nvidia"
                cssClasses={["nvidia-header-text"]}
                valign={Gtk.Align.CENTER}
              />
            }
          />

          <box
            orientation={Gtk.Orientation.VERTICAL}
            valign={Gtk.Align.CENTER}
            cssClasses={["nvidia-body-box"]}
            hexpand={true}
            spacing={scaleSizeNumber(8)}
          >
            {/* Driver | CUDA */}
            <box
              orientation={Gtk.Orientation.HORIZONTAL}
              valign={Gtk.Align.CENTER}
              hexpand={true}
              spacing={scaleSizeNumber(4)}
              cssClasses={["nvidia-info-box"]}
            >
              <label
                label={mergeBindings(
                  [bind(NvidiaService, "driver")],
                  (driver) => `Driver: ${driver ?? "N/A"}`,
                )}
                cssClasses={["nvidia-info-label"]}
                valign={Gtk.Align.CENTER}
                halign={Gtk.Align.START}
              />
              <label
                label={mergeBindings(
                  [bind(NvidiaService, "cuda")],
                  (cuda) => `CUDA: ${cuda ?? "N/A"}`,
                )}
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
              children={mergeBindings([bind(NvidiaService, "gpus")], (gpus) => {
                return gpus.map((g, i) => (
                  <box
                    orientation={Gtk.Orientation.VERTICAL}
                    valign={Gtk.Align.CENTER}
                    hexpand={true}
                    spacing={scaleSizeNumber(4)}
                    cssClasses={["nvidia-gpu-box"]}
                    children={[
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
                          // Memory + Temp
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
                          // Power graph
                          <box
                            orientation={Gtk.Orientation.VERTICAL}
                            valign={Gtk.Align.CENTER}
                            hexpand={true}
                            spacing={scaleSizeNumber(4)}
                            cssClasses={["nvidia-gpu-utilisation-box"]}
                          >
                            <label
                              label={`POWER: ${g.powerInstW ?? g.powerAvgW ?? "N/A"}${g.powerInstW != null || g.powerAvgW != null ? " W" : ""}`}
                              cssClasses={["nvidia-gpu-utilisation-label"]}
                              valign={Gtk.Align.CENTER}
                              halign={Gtk.Align.START}
                            />
                            {(() => {
                              const id =
                                (g as any).uuid || g.name || `gpu-${i}`;
                              return (
                                <GraphArea
                                  cssClasses={["nvidia-gpu-utilisation-graph"]}
                                  widthRequest={scaleSizeNumber(220)}
                                  heightRequest={scaleSizeNumber(90)}
                                  intervalMs={2000}
                                  draw={drawPowerGraphForKey(
                                    id,
                                    (g as any).powerLimitW,
                                  )}
                                />
                              );
                            })()}
                          </box>,

                          // Util graph
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
                            {(() => {
                              const id =
                                (g as any).uuid || g.name || `gpu-${i}`;
                              return (
                                <GraphArea
                                  cssClasses={["nvidia-gpu-utilisation-graph"]}
                                  widthRequest={scaleSizeNumber(220)}
                                  heightRequest={scaleSizeNumber(90)}
                                  intervalMs={2000}
                                  draw={drawUtilGraphForKey(id)}
                                />
                              );
                            })()}
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
      ) : (
        <></>
      )}

      {/* ASUS side  */}

      <box
        orientation={Gtk.Orientation.VERTICAL}
        cssClasses={["my-device-popover-asus-box"]}
        valign={Gtk.Align.START}
        halign={Gtk.Align.CENTER}
        spacing={scaleSizeNumber(10)}
        vexpand={true}
      >
        <box
          orientation={Gtk.Orientation.HORIZONTAL}
          valign={Gtk.Align.START}
          cssClasses={["asus-header-box"]}
          hexpand={true}
          spacing={scaleSizeNumber(8)}
          child={
            <label
              label="Asus"
              cssClasses={["asus-header-text"]}
              valign={Gtk.Align.CENTER}
            />
          }
        />

        <box
          orientation={Gtk.Orientation.VERTICAL}
          valign={Gtk.Align.CENTER}
          cssClasses={["asus-body-box"]}
          hexpand={true}
          spacing={scaleSizeNumber(8)}
          children={mergeBindings(
            [
              bind(AsusService, "profileChoices"),
              chainedBinding(AsusService, ["charge-limit"]),
            ],
            (choices, charge_lim) => {
              const profiles =
                choices && choices.length > 0
                  ? choices
                  : ["LowPower", "Balanced", "Performance"];

              const widgets: any[] = [];

              // Profile buttons box
              widgets.push(
                <box
                  orientation={Gtk.Orientation.HORIZONTAL}
                  spacing={scaleSizeNumber(6)}
                  cssClasses={["asus-profile-btn-box"]}
                  hexpand={true}
                >
                  {profiles.map((p) => {
                    logger.debug(`Creating button for: ${p}`);
                    return (
                      <button
                        cssClasses={mergeBindings(
                          [bind(AsusService, "profile")],
                          (profile) => {
                            logger.debug(
                              `cssClasses callback - profile: ${profile}, type: ${typeof profile}, button: ${p}`,
                            );
                            return profile === p
                              ? ["asus-prof-btn", "active"]
                              : ["asus-prof-btn"];
                          },
                        )}
                        onClicked={() => {
                          logger.info(`Button clicked: ${p}`);
                          try {
                            AsusService.setProfile(p as string);
                          } catch {}
                        }}
                        child={
                          <label
                            label={mergeBindings(
                              [bind(AsusService, "profile")],
                              (profile) => {
                                logger.debug(
                                  `label callback - profile: ${profile}, type: ${typeof profile}, button: ${p}`,
                                );
                                return profile === p ? `✓ ${p}` : p;
                              },
                            )}
                          />
                        }
                      />
                    );
                  })}
                </box>,
              );

              // Charge limit box - only if charge_lim is available
              if (charge_lim != null) {
                logger.debug(
                  `Charge limit binding - charge_lim: ${charge_lim}, type: ${typeof charge_lim}`,
                );
                widgets.push(
                  <box
                    orientation={Gtk.Orientation.HORIZONTAL}
                    spacing={scaleSizeNumber(6)}
                    hexpand={true}
                  >
                    <label label="Charge Limit" halign={Gtk.Align.START} />
                    <slider
                      hexpand={true}
                      min={40}
                      max={100}
                      step={1}
                      value={charge_lim}
                      onChangeValue={(self: any) => {
                        try {
                          AsusService.setChargeLimit(Math.round(self.value));
                        } catch {
                          logger.error(
                            `Failed to set charge limit to ${self.value}`,
                          );
                        }
                      }}
                    />
                    <label label={`${charge_lim}%`} />
                  </box>,
                );
              }

              // GPU Mode box
              widgets.push(
                <box
                  orientation={Gtk.Orientation.VERTICAL}
                  spacing={scaleSizeNumber(6)}
                  cssClasses={["asus-gpu-mode-box"]}
                  hexpand={true}
                  child={mergeBindings(
                    [
                      chainedBinding(AsusService, ["gpu-supported"]),
                      chainedBinding(AsusService, ["gpu-mode"]),
                      chainedBinding(AsusService, ["gpu-pending-mode"]),
                      chainedBinding(AsusService, ["gpu-pending-action"]),
                    ],
                    (modes, gpuMode, pendingMode, pendingAction) => {
                      logger.info("Supported GPU modes: ", modes);
                      return (
                        <box
                          orientation={Gtk.Orientation.VERTICAL}
                          spacing={scaleSizeNumber(6)}
                          cssClasses={["asus-gpu-mode-box-inner-"]}
                          hexpand={true}
                        >
                          <box
                            orientation={Gtk.Orientation.HORIZONTAL}
                            spacing={scaleSizeNumber(6)}
                            cssClasses={["asus-gpu-mode-box-inner"]}
                            hexpand={true}
                          >
                            {/* List of modes */}
                            {modes.map((m: string) => (
                              <button
                                cssClasses={
                                  gpuMode === m
                                    ? ["asus-gpu-btn", "active"]
                                    : ["asus-gpu-btn"]
                                }
                                onClicked={() => {
                                  try {
                                    AsusService.setGpuMode(m as string);
                                  } catch {
                                    logger.error(
                                      `Failed to set GPU mode to ${m}`,
                                    );
                                  }
                                }}
                                child={
                                  <label
                                    label={mergeBindings(
                                      [
                                        chainedBinding(AsusService, [
                                          "gpu-mode",
                                        ]),
                                      ],
                                      (gpuMode) =>
                                        gpuMode === m ? `✓ ${m}` : m,
                                    )}
                                  />
                                }
                              />
                            ))}
                          </box>
                          {/* Pending action if any */}
                          {pendingAction &&
                          pendingMode !== "None" &&
                          gpuMode != pendingMode ? (
                            <label
                              cssClasses={["asus-gpu-pending-label"]}
                              label={`Reboot to switch to ${pendingMode}`}
                              halign={Gtk.Align.END}
                            />
                          ) : (
                            <></>
                          )}
                        </box>
                      );

                      // )
                    },
                  )}
                >
                  {/*{["Integrated", "Hybrid", "NVIDIA"].map((m) => (
                    <button
                      cssClasses={["asus-gpu-btn"]}
                      onClicked={() => {
                        try {
                          AsusService.setGpuMode(m as string);
                        } catch {}
                      }}
                      child={
                        <label
                          label={mergeBindings(
                            [bind(AsusService, "gpu-mode")],
                            (gpuMode) => (gpuMode === m ? `✓ ${m}` : m),
                          )}
                        />
                      }
                    />
                  ))}*/}
                </box>,
              );

              // Error label
              widgets.push(
                <label
                  cssClasses={["asus-error-label"]}
                  visible={mergeBindings(
                    [bind(AsusService, "error")],
                    (error) => !!error,
                  )}
                  label={mergeBindings([bind(AsusService, "error")], (error) =>
                    error ? `Error: ${error}` : "",
                  )}
                />,
              );

              return widgets;
            },
          )}
        />
      </box>
    </box>
  );
}
