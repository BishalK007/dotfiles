// SoundService
// -----------------------------------------------------------------------------
// Provides a Unix socket interface for playing short notification sounds using
// PipeWire (pw-play) with optional multi‑sink output and temporary volume
// normalisation.
// Socket Path (fixed): /tmp/play-sound.sock
// Sound Files: <PROJ_ROOT>/assets/sounds/
// Predefined sounds are statically mapped in SOUNDS.
//
// Runtime Settings (mutable via socket):
//   emittingSpeaker        : "all" | "default"  (multi-sink vs first/default)
//   normaliseVolume        : boolean            (enable temporary volume set)
//   normaliseVolumeLevel   : number (0.0–1.0)
//   volumeRestoreDelayMs   : number (0–10000)   (delay before restoring vols)
//   duration               : number (0–30)      (default play duration if none provided)
//
// Message Format (colon-delimited positional overrides):
//   <soundName>:<duration?>:<emittingSpeaker?>:<normaliseVolume?>:<normaliseVolumeLevel?>:<volumeRestoreDelayMs?>
// Each field after soundName is optional. Empty segments (or missing tail fields)
// mean "use default". Examples:
//   warning                      -> use all defaults
//   warning:1.2                  -> override duration only
//   warning::all                 -> set emittingSpeaker=all, others default
//   warning::default:true        -> emittingSpeaker=default, normaliseVolume=true
//   warning:::false              -> disable normaliseVolume
//   warning::::0.5               -> set normaliseVolumeLevel=0.5 (others default)
//   warning:::::300              -> set volumeRestoreDelayMs=300
//   warning:2:all:true:0.6:250   -> fully specified
// Validation:
//   emittingSpeaker: all|default
//   normaliseVolume: true|false|1|0
//   normaliseVolumeLevel: 0.0–1.0
//   volumeRestoreDelayMs: 0–10000
//   duration: >=0 (seconds) else default
// Response Strings:
//   OK | ERROR unknown_sound | ERROR invalid_format | ERROR bad_value_<field>
// CLI Examples:
//   echo 'warning' | socat - UNIX-CONNECT:/tmp/play-sound.sock
//   echo 'warning:3' | socat - UNIX-CONNECT:/tmp/play-sound.sock
//   echo 'warning::default:true:0.5:300' | socat - UNIX-CONNECT:/tmp/play-sound.sock
//
// Notes:
// - Multi-sink playback spawns one pw-play per sink when emittingSpeaker=all.
// - Volume normalisation temporarily sets sink volumes, then restores them.
// - Unknown keys / invalid ranges are reported individually in the ERROR line.
// -----------------------------------------------------------------------------

import { Gio, GLib } from "astal";
import { execAsync } from "astal/process";
import { createLogger } from "../utils/logger";

const logger = createLogger("SoundService");

const PROJ_ROOT = GLib.getenv("PROJ_ROOT") || GLib.get_current_dir();
//
// _______________ Condfigure the following to your needs _______________
//
// Predefined sound files
const SOUNDS = {
  warning: GLib.build_filenamev([
    PROJ_ROOT,
    "assets",
    "sounds",
    "mixkit-software-interface-back-2575.wav",
  ]),
} as const;

// Runtime configurable settings (mutable)
type EmittingSpeaker = "default" | "all";
interface RuntimeSettings {
  emittingSpeaker: EmittingSpeaker;
  normaliseVolume: boolean;
  normaliseVolumeLevel: number; // 0.0 - 1.0
  volumeRestoreDelayMs: number;
  duration: number; // default duration seconds when none supplied
}

const SETTINGS: RuntimeSettings = {
  emittingSpeaker: "all",
  normaliseVolume: true,
  normaliseVolumeLevel: 1,
  volumeRestoreDelayMs: 150,
  duration: 2,
};

type SoundName = keyof typeof SOUNDS;

export class SoundService {
  private static instance: SoundService;
  private socketPath: string = "/tmp/play-sound.sock";
  private busyNormalising = false; // crude lock to avoid concurrent volume races
  private server: Gio.SocketService;

  private constructor() {
    // Remove existing socket file if it exists
    try {
      const file = Gio.File.new_for_path(this.socketPath);
      if (file.query_exists(null)) {
        file.delete(null);
      }
    } catch (e) {
      logger.error(`Error removing existing socket file: ${e}`);
    }

    this.server = new Gio.SocketService();
    const socketAddress = new Gio.UnixSocketAddress({ path: this.socketPath });

    // add_address returns [boolean, SocketAddress | null]
    const [success] = this.server.add_address(
      socketAddress,
      Gio.SocketType.STREAM,
      Gio.SocketProtocol.DEFAULT,
      null,
    );

    if (!success) {
      throw new Error("Failed to add socket address");
    }

    // Connect to the incoming signal to handle new connections
    this.server.connect(
      "incoming",
      (service: Gio.SocketService, connection: Gio.SocketConnection) => {
        this.handleConnection(connection);
        return false; // Return false to let the service continue handling other connections
      },
    );

    this.server.start();
    logger.info(`Socket server started at ${this.socketPath}`);
  }

  public static getInstance(): SoundService {
    if (!SoundService.instance) {
      SoundService.instance = new SoundService();
    }
    return SoundService.instance;
  }

  private async handleConnection(connection: Gio.SocketConnection) {
    const inputStream = connection.get_input_stream();
    const outputStream = connection.get_output_stream();

    try {
      // Read the message from the client
      const data = inputStream.read_bytes(1024, null);
      const bytes = data.get_data();

      if (bytes) {
        const message = new TextDecoder().decode(bytes).trim();
        if (message) {
          await this.processMessage(message, outputStream);
        }
      }
    } catch (e) {
      logger.error(`Error reading from socket: ${e}`);
    } finally {
      try {
        connection.close(null);
      } catch (e) {
        logger.error(`Error closing connection: ${e}`);
      }
    }
  }

  private async processMessage(
    message: string,
    outputStream: Gio.OutputStream,
  ) {
    try {
      const parts = message.split(":");
      if (!parts.length) {
        this.sendResponse(outputStream, "ERROR invalid_format");
        return;
      }
      const soundName = parts[0] as SoundName;
      if (!(soundName in SOUNDS)) {
        this.sendResponse(outputStream, "ERROR unknown_sound");
        return;
      }

      // Build effective config from defaults
      const cfg: RuntimeSettings = { ...SETTINGS };

      // duration
      if (parts[1] !== undefined && parts[1] !== "") {
        const d = parseFloat(parts[1]);
        if (isFinite(d) && d >= 0 && d <= 30) cfg.duration = d;
        else {
          this.sendResponse(outputStream, "ERROR bad_value_duration");
          return;
        }
      }
      // emittingSpeaker
      if (parts[2] !== undefined && parts[2] !== "") {
        if (parts[2] === "all" || parts[2] === "default")
          cfg.emittingSpeaker = parts[2] as EmittingSpeaker;
        else {
          this.sendResponse(outputStream, "ERROR bad_value_emittingSpeaker");
          return;
        }
      }
      // normaliseVolume
      if (parts[3] !== undefined && parts[3] !== "") {
        const v = parts[3];
        if (["true", "1"].includes(v)) cfg.normaliseVolume = true;
        else if (["false", "0"].includes(v)) cfg.normaliseVolume = false;
        else {
          this.sendResponse(outputStream, "ERROR bad_value_normaliseVolume");
          return;
        }
      }
      // normaliseVolumeLevel
      if (parts[4] !== undefined && parts[4] !== "") {
        const n = Number(parts[4]);
        if (isFinite(n) && n >= 0 && n <= 1) cfg.normaliseVolumeLevel = n;
        else {
          this.sendResponse(
            outputStream,
            "ERROR bad_value_normaliseVolumeLevel",
          );
          return;
        }
      }
      // volumeRestoreDelayMs
      if (parts[5] !== undefined && parts[5] !== "") {
        const n = Number(parts[5]);
        if (Number.isInteger(n) && n >= 0 && n <= 10000)
          cfg.volumeRestoreDelayMs = n;
        else {
          this.sendResponse(
            outputStream,
            "ERROR bad_value_volumeRestoreDelayMs",
          );
          return;
        }
      }

      await this.playWithConfig(soundName, cfg.duration, cfg);
      this.sendResponse(outputStream, "OK");
    } catch (e) {
      logger.error(`Error processing message: ${e}`);
      this.sendResponse(outputStream, "ERROR invalid_format");
    }
  }

  private sendResponse(outputStream: Gio.OutputStream, message: string) {
    try {
      const responseBytes = new TextEncoder().encode(message);
      outputStream.write(responseBytes, null);
      outputStream.flush(null);
    } catch (e) {
      logger.error(`Error sending response: ${e}`);
    }
  }

  // Utility: execute and capture stdout (trimmed)
  private async run(cmd: string): Promise<string> {
    try {
      return (await execAsync(["bash", "-c", cmd])).trim();
    } catch (e) {
      logger.error(`run error: ${cmd} -> ${e}`);
      return "";
    }
  }

  private async listSinkNodes(): Promise<{ id: string; name: string }[]> {
    // Use pw-dump (JSON) and grep node.name + object.serial & media.class == Audio/Sink
    const raw = await this.run("pw-dump");
    if (!raw) return [];
    // Minimal JSON parse (pw-dump returns an array)
    try {
      const arr = JSON.parse(raw);
      const sinks: { id: string; name: string }[] = [];
      for (const o of arr) {
        const props = o?.info?.props;
        if (props?.["media.class"] === "Audio/Sink" && props["node.name"]) {
          const id = String(
            o.id ??
              props["object.serial"] ??
              props["node.id"] ??
              props["node.name"],
          );
          sinks.push({ id, name: props["node.name"] });
        }
      }
      return sinks;
    } catch (e) {
      logger.error(`Failed to parse pw-dump JSON: ${e}`);
      return [];
    }
  }

  private async getDefaultSinkName(): Promise<string | null> {
    // wpctl status prints a block; find the line with @DEFAULT_AUDIO_SINK@
    const status = await this.run("wpctl status");
    const line = status
      .split("\n")
      .find((l) => l.includes("@DEFAULT_AUDIO_SINK@"));
    if (!line) return null;
    // line format example:  *   @DEFAULT_AUDIO_SINK@ 45. Built-in Audio Analog Stereo
    // We try to map it back via pw-dump names; fallback is null
    // Extract name from pw-dump if volume line includes a node name inside parentheses; if not we skip.
    return null; // We'll fallback to first sink if needed.
  }

  private async captureCurrentVolumes(
    sinks: { id: string; name: string }[],
  ): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    for (const s of sinks) {
      const volLine = await this.run(`wpctl get-volume ${s.id}`); // e.g., 'Volume: 0.53'
      map.set(s.id, volLine);
    }
    return map;
  }

  private async normaliseVolumes(
    sinks: { id: string; name: string }[],
    level: number,
  ) {
    for (const s of sinks) {
      await this.run(`wpctl set-volume ${s.id} ${level}`);
    }
  }

  private async restoreVolumes(saved: Map<string, string>) {
    for (const [id, line] of saved.entries()) {
      // line example: 'Volume: 0.53' -> extract number
      const m = line.match(/([0-9]+\.[0-9]+)/);
      if (m) await this.run(`wpctl set-volume ${id} ${m[1]}`);
    }
  }

  // Play sound directly (for internal use) with multi-sink + volume normalisation
  private async playWithConfig(
    soundName: SoundName,
    duration: number,
    cfg: RuntimeSettings,
  ) {
    const soundPath = SOUNDS[soundName];
    const file = Gio.File.new_for_path(soundPath);
    if (!file.query_exists(null)) {
      logger.warn(`Sound file not found: ${soundPath}`);
      return;
    }

    try {
      const sinks = await this.listSinkNodes();
      if (!sinks.length)
        logger.warn("No sinks found, falling back to default pw-play");

      let targetSinks: { id: string; name: string }[] = sinks;
      if (cfg.emittingSpeaker === "default" && sinks.length)
        targetSinks = [sinks[0]];

      let savedVolumes: Map<string, string> | null = null;
      if (cfg.normaliseVolume && !this.busyNormalising && targetSinks.length) {
        this.busyNormalising = true;
        savedVolumes = await this.captureCurrentVolumes(targetSinks);
        await this.normaliseVolumes(targetSinks, cfg.normaliseVolumeLevel);
      }

      const timeoutPrefix =
        duration && duration > 0 ? `timeout ${duration}s ` : "";
      if (cfg.emittingSpeaker === "all" && targetSinks.length > 1) {
        const bashParts = targetSinks.map(
          (s) => `${timeoutPrefix}pw-play --target "${s.name}" "${soundPath}"`,
        );
        await execAsync([
          "bash",
          "-c",
          bashParts.map((c) => `(${c})`).join(" & ") + " ; wait || true",
        ]);
      } else {
        const single = targetSinks[0];
        const cmd = single
          ? `${timeoutPrefix}pw-play --target "${single.name}" "${soundPath}"`
          : `${timeoutPrefix}pw-play "${soundPath}"`;
        await execAsync(["bash", "-c", cmd]);
      }

      if (savedVolumes) {
        GLib.timeout_add(
          GLib.PRIORITY_DEFAULT,
          cfg.volumeRestoreDelayMs,
          () => {
            this.restoreVolumes(savedVolumes!);
            this.busyNormalising = false;
            return GLib.SOURCE_REMOVE;
          },
        );
      }
    } catch (e) {
      logger.error(`Error playing sound ${soundName}: ${e}`);
      this.busyNormalising = false;
    }
  }

  // Static method to send sound request to the socket (for external use)
  public static sendSoundRequest(message: string) {
    try {
      const client = new Gio.SocketClient();
      const socketAddress = new Gio.UnixSocketAddress({
        path: "/tmp/play-sound.sock",
      });

      const connection = client.connect(socketAddress, null);
      const messageBytes = new TextEncoder().encode(message);

      const outputStream = connection.get_output_stream();
      outputStream.write(messageBytes, null);
      outputStream.flush(null);

      connection.close(null);
    } catch (e) {
      logger.error(`Error sending sound request: ${e}`);
    }
  }

  public cleanup() {
    if (this.server) {
      this.server.stop();
      this.server.close();
    }

    // Clean up socket file
    try {
      const file = Gio.File.new_for_path(this.socketPath);
      if (file.query_exists(null)) {
        file.delete(null);
      }
    } catch (e) {
      logger.error(`Error cleaning up socket file: ${e}`);
    }
  }
}

export const soundService = SoundService.getInstance();
