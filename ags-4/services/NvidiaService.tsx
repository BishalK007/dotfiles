import GObject from "gi://GObject";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import { execAsync } from "astal";

export type NvidiaProcess = {
  pid: number;
  type: string;
  name: string;
  usedMiB: number;
};

export type NvidiaGpu = {
  id?: string;
  uuid?: string;
  name: string;
  pstate?: string;
  tempC?: number | null;
  util?: number | null;
  memTotalMiB?: number | null;
  memUsedMiB?: number | null;
  memFreeMiB?: number | null;
  memUsedPct?: number | null;
  // power
  powerState?: string;
  powerAvgW?: number | null;
  powerInstW?: number | null;
  powerLimitCurrentW?: number | null;
  powerLimitRequestedW?: number | null;
  powerLimitDefaultW?: number | null;
  powerLimitMinW?: number | null;
  powerLimitMaxW?: number | null;
  processes: NvidiaProcess[];
};

export type NvidiaInfo = {
  timestamp?: string;
  driver?: string;
  cuda?: string;
  gpus: NvidiaGpu[];
  error?: string | null;
};

const NUM_RE = /-?\d+(?:\.\d+)?/;
const MB_RE = /(-?\d+(?:\.\d+)?)\s*MiB/i;
const PCT_RE = /(-?\d+(?:\.\d+)?)\s*%/i;
const C_RE = /(-?\d+(?:\.\d+)?)\s*C/i;
const W_RE = /(-?\d+(?:\.\d+)?)\s*W/i;

function n(val?: string | null): string {
  return (val ?? "").trim();
}
function numFrom(str?: string | null): number | null {
  if (!str) return null;
  const m = str.match(NUM_RE);
  return m ? Number(m[0]) : null;
}
function numFromUnit(
  str: string | null | undefined,
  re: RegExp,
): number | null {
  if (!str) return null;
  const m = str.match(re);
  return m ? Number(m[1]) : null;
}
function betweenAll(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "g");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(m[1]);
  return out;
}
function firstBetween(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
  const m = xml.match(re);
  return m ? m[1] : null;
}
function extractOpenTag(xml: string, tagName: string): string | null {
  const re = new RegExp(`<${tagName}[^>]*>`);
  const m = xml.match(re);
  return m ? m[0] : null;
}
function attr(openTag: string, attrName: string): string | undefined {
  const re = new RegExp(`${attrName}="([^"]+)"`);
  const m = openTag.match(re);
  return m?.[1];
}

function parseProcesses(gpuXml: string): NvidiaProcess[] {
  const procsXml = betweenAll(gpuXml, "process_info");
  const procs: NvidiaProcess[] = [];
  for (const px of procsXml) {
    const pid = Number(n(firstBetween(px, "pid")) || 0);
    const type = n(firstBetween(px, "type")) || "";
    const name = n(firstBetween(px, "process_name")) || "";
    const usedMiB = numFromUnit(firstBetween(px, "used_memory"), MB_RE) ?? 0;
    if (!Number.isFinite(pid) || pid <= 0) continue;
    procs.push({ pid, type, name, usedMiB });
  }
  return procs;
}

function parseGpu(gpuXml: string): NvidiaGpu {
  const open = extractOpenTag(gpuXml, "gpu") || "";
  const idAttr = open ? attr(open, "id") : undefined;

  const name = n(firstBetween(gpuXml, "product_name")) || "NVIDIA GPU";
  const uuid = n(firstBetween(gpuXml, "uuid")) || undefined;
  const pstate = n(firstBetween(gpuXml, "performance_state")) || undefined;

  const utilXml = firstBetween(gpuXml, "utilization");
  const util = utilXml
    ? numFromUnit(firstBetween(utilXml, "gpu_util"), PCT_RE)
    : null;

  const tempXml = firstBetween(gpuXml, "temperature");
  const tempC = tempXml
    ? numFromUnit(firstBetween(tempXml, "gpu_temp"), C_RE)
    : null;

  const memXml = firstBetween(gpuXml, "fb_memory_usage");
  const memTotalMiB = memXml
    ? numFromUnit(firstBetween(memXml, "total"), MB_RE)
    : null;
  const memUsedMiB = memXml
    ? numFromUnit(firstBetween(memXml, "used"), MB_RE)
    : null;
  const memFreeMiB = memXml
    ? numFromUnit(firstBetween(memXml, "free"), MB_RE)
    : null;
  const memUsedPct =
    memTotalMiB && memUsedMiB != null
      ? Math.round((memUsedMiB / memTotalMiB) * 100)
      : null;

  const processes = parseProcesses(gpuXml);
  // Power readings
  const pwrXml = firstBetween(gpuXml, "gpu_power_readings");
  const powerState = pwrXml
    ? n(firstBetween(pwrXml, "power_state")) || undefined
    : undefined;
  const powerAvgW = pwrXml
    ? numFromUnit(firstBetween(pwrXml, "average_power_draw"), W_RE)
    : null;
  const powerInstW = pwrXml
    ? numFromUnit(firstBetween(pwrXml, "instant_power_draw"), W_RE)
    : null;
  const powerLimitCurrentW = pwrXml
    ? numFromUnit(firstBetween(pwrXml, "current_power_limit"), W_RE)
    : null;
  const powerLimitRequestedW = pwrXml
    ? numFromUnit(firstBetween(pwrXml, "requested_power_limit"), W_RE)
    : null;
  const powerLimitDefaultW = pwrXml
    ? numFromUnit(firstBetween(pwrXml, "default_power_limit"), W_RE)
    : null;
  const powerLimitMinW = pwrXml
    ? numFromUnit(firstBetween(pwrXml, "min_power_limit"), W_RE)
    : null;
  const powerLimitMaxW = pwrXml
    ? numFromUnit(firstBetween(pwrXml, "max_power_limit"), W_RE)
    : null;

  return {
    id: idAttr,
    uuid,
    name,
    pstate,
    tempC,
    util,
    memTotalMiB,
    memUsedMiB,
    memFreeMiB,
    memUsedPct,
    powerState,
    powerAvgW,
    powerInstW,
    powerLimitCurrentW,
    powerLimitRequestedW,
    powerLimitDefaultW,
    powerLimitMinW,
    powerLimitMaxW,
    processes,
  };
}

function parseNvidiaXml(xml: string): NvidiaInfo {
  const driver = n(firstBetween(xml, "driver_version")) || undefined;
  const cuda = n(firstBetween(xml, "cuda_version")) || undefined;
  const timestamp = n(firstBetween(xml, "timestamp")) || undefined;
  const gpusXml = betweenAll(xml, "gpu");
  const gpus = gpusXml.map(parseGpu);
  return { timestamp, driver, cuda, gpus, error: null };
}

async function fetchInfo(): Promise<NvidiaInfo> {
  try {
    const xml = await execAsync(["bash", "-lc", "nvidia-smi -q -x"]);
    return parseNvidiaXml(xml);
  } catch (e: any) {
    return {
      gpus: [],
      error: typeof e === "string" ? e : (e?.message ?? "nvidia-smi failed"),
    } as NvidiaInfo;
  }
}

const DEFAULT_INTERVAL_MS = 2000;
const XML_END_TAG = "</nvidia_smi_log>";

class NvidiaServiceClass extends GObject.Object {
  static {
    GObject.registerClass(
      {
        GTypeName: "NvidiaService",
        Properties: {
          data: GObject.ParamSpec.jsobject(
            "data",
            "data",
            "Complete nvidia-smi data",
            GObject.ParamFlags.READABLE,
          ),
          available: GObject.ParamSpec.boolean(
            "available",
            "available",
            "Whether NVIDIA GPU is available",
            GObject.ParamFlags.READABLE,
            false,
          ),
          error: GObject.ParamSpec.string(
            "error",
            "error",
            "Last error message",
            GObject.ParamFlags.READABLE,
            "",
          ),
          driver: GObject.ParamSpec.string(
            "driver",
            "driver",
            "NVIDIA driver version",
            GObject.ParamFlags.READABLE,
            "",
          ),
          cuda: GObject.ParamSpec.string(
            "cuda",
            "cuda",
            "CUDA version",
            GObject.ParamFlags.READABLE,
            "",
          ),
          gpus: GObject.ParamSpec.jsobject(
            "gpus",
            "gpus",
            "Array of GPU objects",
            GObject.ParamFlags.READABLE,
          ),
        },
      },
      this,
    );
  }

  private _data: NvidiaInfo | null = null;
  private _available: boolean = false;
  private _error: string | null = null;
  private intervalMs = DEFAULT_INTERVAL_MS;

  // Streaming subprocess state
  private proc: Gio.Subprocess | null = null;
  private stdout: Gio.DataInputStream | null = null;
  private stderr: Gio.DataInputStream | null = null;
  private buffer: string = "";
  private cancel: Gio.Cancellable | null = null;
  private decoder: TextDecoder = new TextDecoder();
  private lastUpdateMs: number = Date.now();
  private watchdogId: number | null = null;

  get data(): NvidiaInfo | null {
    return this._data;
  }

  get available(): boolean {
    return this._available;
  }

  get error(): string | null {
    return this._error;
  }

  get driver(): string | null {
    return this._data?.driver ?? null;
  }

  get cuda(): string | null {
    return this._data?.cuda ?? null;
  }

  get gpus(): NvidiaGpu[] {
    return this._data?.gpus ?? [];
  }

  constructor() {
    super();
    this.start();
  }

  setInterval(ms: number) {
    const next = Math.max(200, ms | 0);
    if (next === this.intervalMs) return;
    this.intervalMs = next;
    this.restartStream();
  }

  start() {
    if (this.proc) return;
    this.startStream();
  }

  stop() {
    this.stopStream();
  }

  async refresh() {
    const info = await fetchInfo();
    this._data = info;
    this._available = info.gpus.length > 0 && !info.error;
    this._error = info.error ?? null;
    this.notify("data");
    this.notify("available");
    this.notify("error");
    this.notify("driver");
    this.notify("cuda");
    this.notify("gpus");
  }

  async kill(pid: number, signal: "TERM" | "KILL" = "TERM") {
    try {
      await execAsync(["bash", "-lc", `kill -s ${signal} ${pid}`]);
      await this.refresh();
      return true;
    } catch {
      return false;
    }
  }

  memLine(g: NvidiaGpu) {
    if (g.memTotalMiB == null || g.memUsedMiB == null) return "MEM: N/A";
    const pct =
      g.memUsedPct ?? Math.round((g.memUsedMiB / g.memTotalMiB) * 100);
    return `MEM: ${g.memUsedMiB} / ${g.memTotalMiB} MiB (${pct}%)`;
  }

  utilTempLine(g: NvidiaGpu) {
    const util = this.fmt(g.util ?? null, " %");
    const temp = this.fmt(g.tempC ?? null, " °C");
    return `Utilisation: ${util}    TEMP ${temp}`;
  }

  perfLine(g: NvidiaGpu) {
    return `Perf: ${g.pstate ?? "N/A"}`;
  }

  powerLine(g: NvidiaGpu) {
    const pNow = g.powerInstW ?? g.powerAvgW;
    const pLimit =
      g.powerLimitCurrentW ?? g.powerLimitMaxW ?? g.powerLimitDefaultW;
    const nowStr = this.fmt(pNow, " W");
    const limStr = pLimit != null ? this.fmt(pLimit, " W") : "N/A";
    return `Power: ${nowStr}${pLimit != null ? ` / ${limStr}` : ""}`;
  }

  private fmt(x: number | null | undefined, unit = ""): string {
    return x == null || Number.isNaN(x) ? "N/A" : `${x}${unit}`;
  }

  // --- Streaming subprocess handling ---
  private startStream() {
    try {
      const cmd = ["bash", "-lc", `nvidia-smi -q -x -lms ${this.intervalMs}`];
      this.proc = Gio.Subprocess.new(
        cmd,
        Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE,
      );
      const out = this.proc.get_stdout_pipe();
      const err = this.proc.get_stderr_pipe();
      this.stdout = new Gio.DataInputStream({ base_stream: out as any });
      this.stderr = new Gio.DataInputStream({ base_stream: err as any });
      this.cancel = new Gio.Cancellable();
      this.buffer = "";
      // Begin read loop
      this.readLoop();
      // Drain stderr to avoid pipe backpressure
      this.drainStderrLoop();
      // Start watchdog to ensure updates keep flowing
      this.startWatchdog();
      // If process exits unexpectedly, attempt restart
      this.proc.wait_check_async(null, (_p, res) => {
        try {
          (this.proc as Gio.Subprocess).wait_check_finish(res);
        } catch {
          /* ignore */
        }
        // Ensure cleanup then restart with small backoff
        this.stopStream();
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 600, () => {
          if (!this.proc) this.startStream();
          return GLib.SOURCE_REMOVE;
        });
      });
    } catch (e) {
      this._error = String(e);
      this.notify("error");
      // Backoff retry
      GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1500, () => {
        if (!this.proc) this.startStream();
        return GLib.SOURCE_REMOVE;
      });
    }
  }

  private stopStream() {
    try {
      this.cancel?.cancel();
    } catch {
      /* ignore */
    }
    this.cancel = null;
    try {
      this.stdout?.close(null);
    } catch {
      /* ignore */
    }
    try {
      this.stderr?.close(null);
    } catch {
      /* ignore */
    }
    this.stdout = null;
    this.stderr = null;
    if (this.proc) {
      try {
        this.proc.force_exit();
      } catch {
        /* ignore */
      }
    }
    this.proc = null;
    this.buffer = "";
    this.stopWatchdog();
  }

  private restartStream() {
    this.stopStream();
    this.startStream();
  }

  private readLoop() {
    if (!this.stdout) return;
    this.stdout.read_line_async(
      GLib.PRIORITY_DEFAULT,
      this.cancel,
      (_src, res) => {
        try {
          const [lineBytes] = this.stdout!.read_line_finish(res);
          if (!lineBytes) {
            // EOF, let wait_check handler restart if needed
            return;
          }
          const line = this.decoder.decode(lineBytes);
          this.buffer += line + "\n";
          this.processBuffer();
          // Guard buffer growth in case of malformed stream
          const MAX_BUFFER = 5 * 1024 * 1024; // 5MB
          if (this.buffer.length > MAX_BUFFER) {
            // keep last 1MB tail which likely contains newest partial frame
            this.buffer = this.buffer.slice(-1 * 1024 * 1024);
          }
        } catch (e) {
          this._error = String(e);
          this.notify("error");
        } finally {
          if (this.stdout) this.readLoop();
        }
      },
    );
  }

  private processBuffer() {
    let idx: number;
    while ((idx = this.buffer.indexOf(XML_END_TAG)) !== -1) {
      const endPos = idx + XML_END_TAG.length;
      const chunk = this.buffer.slice(0, endPos);
      this.buffer = this.buffer.slice(endPos);
      try {
        // Guard against unexpectedly large frames
        const MAX_CHUNK = 1 * 1024 * 1024; // 1MB
        if (chunk.length > MAX_CHUNK) {
          this._error = `nvidia-smi frame too large (${chunk.length} bytes), dropping`;
          this.notify("error");
          continue;
        }
        const info = parseNvidiaXml(chunk);
        this._data = info;
        this._available = info.gpus.length > 0 && !info.error;
        this._error = info.error ?? null;
        this.notify("data");
        this.notify("available");
        this.notify("error");
        this.notify("driver");
        this.notify("cuda");
        this.notify("gpus");
        this.lastUpdateMs = Date.now();
      } catch (e) {
        this._error = `parse error: ${e}`;
        this.notify("error");
      }
    }
  }

  private startWatchdog() {
    this.stopWatchdog();
    const checkSec = Math.max(5, Math.round(this.intervalMs / 1000) * 3);
    this.watchdogId = GLib.timeout_add_seconds(
      GLib.PRIORITY_DEFAULT,
      checkSec,
      () => {
        const now = Date.now();
        const staleMs = Math.max(this.intervalMs * 5, 10_000); // 5x interval or 10s
        if (now - this.lastUpdateMs > staleMs) {
          // Stream appears stale; restart cleanly
          this.restartStream();
        }
        return true; // keep watchdog running
      },
    );
  }

  private stopWatchdog() {
    if (this.watchdogId) {
      try {
        GLib.source_remove(this.watchdogId);
      } catch {
        /* ignore */
      }
      this.watchdogId = null;
    }
  }

  private drainStderrLoop() {
    if (!this.stderr) return;
    this.stderr.read_line_async(
      GLib.PRIORITY_DEFAULT,
      this.cancel,
      (_s, res) => {
        try {
          // simply drain; ignore content or log small snippets if needed
          this.stderr!.read_line_finish(res);
        } catch {
          /* ignore */
        } finally {
          if (this.stderr) this.drainStderrLoop();
        }
      },
    );
  }
}

export const NvidiaService = new NvidiaServiceClass();
