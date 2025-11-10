import { App } from "astal/gtk4";
import style from "./style.scss";
import Bar from "./widget/Bar";
import { cssPreprocessor } from "./utils/utils";
import { createLogger } from "./utils/logger";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import SoundAndBrightnessOSD from "./widget/osd/SoundAndBrightnessOSD";
import NotificationOSD from "./widget/osd/NotificationOSD";
import BatteryWarningOSD from "./widget/osd/BatteryWarningOSD";
import { VolListener } from "./services/VolListener";
import { BrightnessListener } from "./services/BrightnessListener";
import { notificationListener } from "./services/NotificationListener";
import { batteryWarningListener } from "./services/BatteryListener";
import { soundService, SoundService } from "./services/SoundService";
import { NvidiaService } from "./services/NvidiaService";

const logger = createLogger("App", "startup");

// Load .env file into process environment
function loadEnvFile(filePath: string) {
  try {
    const [ok, contents] = GLib.file_get_contents(filePath);
    if (ok && contents) {
      const lines = new TextDecoder().decode(contents).split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        // Split at the first '=' only
        const eqIndex = trimmed.indexOf("=");
        if (eqIndex === -1) continue;
        const key = trimmed.slice(0, eqIndex).trim();
        let value = trimmed.slice(eqIndex + 1).trim();
        // Remove inline comments (unquoted)
        const hashIndex = value.indexOf("#");
        if (hashIndex !== -1 && !/^["'].*["']$/.test(value)) {
          value = value.slice(0, hashIndex).trim();
        }
        // Remove surrounding quotes
        value = value.replace(/^['"]|['"]$/g, "");
        if (key && value !== undefined) {
          logger.info(`ENV: ${key} = ${value}`);
          GLib.setenv(key, value, true);
        }
      }
    }
  } catch (e) {
    logger.error(`Failed to load .env file: ${e}`);
  }
}

// Load .env from home config
loadEnvFile(GLib.build_filenamev([GLib.get_current_dir(), ".env"]));
const PROJ_ROOT = GLib.getenv("PROJ_ROOT") || GLib.get_current_dir();
const envVars = { PROJ_ROOT };

// --- Runtime theming: recompile SCSS and apply at runtime when colors.scss changes ---
let colorsMonitor: Gio.FileMonitor | null = null;
let debounceId: number | null = null;

function getProjectPath(...parts: string[]) {
  return GLib.build_filenamev([GLib.get_current_dir(), ...parts]);
}

function compileScssToCss(inScssPath: string): string | null {
  try {
    const proc = Gio.Subprocess.new(
      ["sass", "--no-source-map", inScssPath],
      Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE,
    );
    // Read stdout (compiled CSS) in-memory
    const result = (proc as any).communicate_utf8(null, null);
    const ok: boolean = result[0];
    const stdout: string = result[1] ?? "";
    const stderr: string = result[2] ?? "";
    if (!ok) {
      logger.error(`sass compile failed: ${stderr}`);
      return null;
    }
    return stdout;
  } catch (e) {
    logger.error(`sass compile error: ${e}`);
    return null;
  }
}

function readFileText(path: string): string | null {
  try {
    const [ok, bytes] = GLib.file_get_contents(path);
    if (ok && bytes) return new TextDecoder().decode(bytes);
  } catch (e) {
    logger.error(`read error ${path}: ${e}`);
  }
  return null;
}

function applyCompiledCssOverlay() {
  const inScss = getProjectPath("style.scss");
  const compiled = compileScssToCss(inScss);
  if (!compiled) return;
  const processed = cssPreprocessor(compiled, envVars);
  // Reset previously applied runtime styles and apply fresh overlay
  App.reset_css();
  App.apply_css(processed);
  logger.success("Applied runtime stylesheet overlay from compiled SCSS");
}

function initColorsWatcher() {
  const colorsPath = getProjectPath("colors.scss");
  try {
    const file = Gio.File.new_for_path(colorsPath);
    colorsMonitor = file.monitor_file(Gio.FileMonitorFlags.NONE, null);
    colorsMonitor.connect("changed", () => {
      if (debounceId) return; // debounce
      debounceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 120, () => {
        applyCompiledCssOverlay();
        debounceId = null;
        return GLib.SOURCE_REMOVE;
      });
    });
    // Apply once on startup as overlay
    applyCompiledCssOverlay();
  } catch (e) {
    logger.error(`Failed to watch colors.scss: ${e}`);
  }
}

App.start({
  css: cssPreprocessor(style, envVars),
  main() {
    // watch for palette changes and apply at runtime
    initColorsWatcher();
    App.get_monitors().map(Bar);
    App.get_monitors().map(SoundAndBrightnessOSD);
    App.get_monitors().map(NotificationOSD);
    App.get_monitors().map(BatteryWarningOSD);

    // Initialize listeners
    VolListener;
    BrightnessListener;
    notificationListener;
    batteryWarningListener;

    // Initialize sound service
    soundService;
  },
});
