import Gio from "gi://Gio";
import GLib from "gi://GLib?version=2.0";
import GObject from "gi://GObject";
import { execAsync } from "astal";
import { createLogger } from "../utils/logger";

const logger = createLogger("AsusService");

type AsusInfo = {
  available: boolean;
  profile: string | null;
  chargeLimit: number | null;
  gpuMode: string | null;
  gpuVendor: string | null;
  gpuPower: string | null;
  gpuSupported: string[] | null;
  gpuPendingMode: string | null;
  gpuPendingAction: boolean;
  supergfxVersion: string | null;
  error: string | null;
};

const ASUSD = {
  name: "xyz.ljones.Asusd",
  path: "/xyz/ljones",
  iface: "xyz.ljones.Platform",
};
const SUPERGFX = {
  name: "org.supergfxctl.Daemon",
  path: "/org/supergfxctl/Gfx",
  iface: "org.supergfxctl.Daemon",
};

function unpackDict(entries: Record<string, any>): Record<string, unknown> {
  logger.debug("unpackDict", "unpackDict called");
  const dict: Record<string, unknown> = {};
  // entries is already a plain object with Variant values (after deepUnpack)
  logger.debug(
    "unpackDict",
    `entries type: ${typeof entries}, ${entries?.constructor?.name}`,
  );
  logger.debug(
    "unpackDict",
    `entries keys: ${Object.keys(entries).join(", ")}`,
  );

  for (const key in entries) {
    const val = entries[key];
    logger.debug(
      "unpackDict",
      `processing key: ${key}, val type: ${typeof val}, ${val?.constructor?.name}`,
    );
    // Each value is still a Variant that needs unpacking
    if (
      val &&
      typeof val === "object" &&
      typeof val.deepUnpack === "function"
    ) {
      dict[key] = val.deepUnpack();
      logger.debug(
        "unpackDict",
        `${key} unpacked to: ${dict[key]}, type: ${typeof dict[key]}`,
      );
    } else {
      dict[key] = val;
      logger.debug("unpackDict", `${key} used as-is: ${dict[key]}`);
    }
  }
  logger.debug(
    "unpackDict",
    `final dict keys: ${Object.keys(dict).join(", ")}`,
  );
  return dict;
}

class AsusServiceClass extends GObject.Object {
  static {
    GObject.registerClass(
      {
        GTypeName: "AsusService",
        Properties: {
          available: GObject.ParamSpec.boolean(
            "available",
            "Available",
            "Whether ASUS services are available",
            GObject.ParamFlags.READABLE,
            false,
          ),
          profile: GObject.ParamSpec.string(
            "profile",
            "Profile",
            "Current power profile",
            GObject.ParamFlags.READABLE,
            "",
          ),
          profileChoices: GObject.ParamSpec.jsobject(
            "profile-choices",
            "Profile Choices",
            "Available platform profile choices",
            GObject.ParamFlags.READABLE,
          ),
          chargeLimit: GObject.ParamSpec.int(
            "charge-limit",
            "Charge Limit",
            "Battery charge limit percentage",
            GObject.ParamFlags.READABLE,
            0,
            100,
            80,
          ),
          gpuMode: GObject.ParamSpec.string(
            "gpu-mode",
            "GPU Mode",
            "Current GPU mode",
            GObject.ParamFlags.READABLE,
            "",
          ),
          gpuVendor: GObject.ParamSpec.string(
            "gpu-vendor",
            "GPU Vendor",
            "GPU vendor name",
            GObject.ParamFlags.READABLE,
            "",
          ),
          gpuPower: GObject.ParamSpec.string(
            "gpu-power",
            "GPU Power",
            "GPU power status",
            GObject.ParamFlags.READABLE,
            "",
          ),
          gpuSupported: GObject.ParamSpec.jsobject(
            "gpu-supported",
            "GPU Supported Modes",
            "Supported GPU modes",
            GObject.ParamFlags.READABLE,
          ),
          gpuPendingMode: GObject.ParamSpec.string(
            "gpu-pending-mode",
            "GPU Pending Mode",
            "Pending GPU mode after reboot",
            GObject.ParamFlags.READABLE,
            "",
          ),
          gpuPendingAction: GObject.ParamSpec.boolean(
            "gpu-pending-action",
            "GPU Pending Action",
            "Whether user action is pending",
            GObject.ParamFlags.READABLE,
            false,
          ),
          gpuModeSwitching: GObject.ParamSpec.boolean(
            "gpu-mode-switching",
            "GPU Mode Switching",
            "Whether a GPU mode switch is in progress",
            GObject.ParamFlags.READABLE,
            false,
          ),
          supergfxVersion: GObject.ParamSpec.string(
            "supergfx-version",
            "Supergfx Version",
            "Supergfxctl daemon version",
            GObject.ParamFlags.READABLE,
            "",
          ),
          error: GObject.ParamSpec.string(
            "error",
            "Error",
            "Last error message",
            GObject.ParamFlags.READABLE,
            "",
          ),
        },
      },
      this,
    );
  }

  private _available: boolean = false;
  private _profile: string | null = null;
  private _chargeLimit: number | null = null;
  private _gpuMode: string | null = null;
  private _gpuVendor: string | null = null;
  private _gpuPower: string | null = null;
  private _gpuSupported: string[] | null = null;
  private _gpuPendingMode: string | null = null;
  private _gpuPendingAction: boolean = false;
  private _supergfxVersion: string | null = null;
  private _error: string | null = null;
  private _profileChoices: string[] = [];

  private asusd: Gio.DBusProxy | null = null;
  private gfxd: Gio.DBusProxy | null = null;
  private retryId: number | null = null;
  private _asusdSigId?: number;
  private _gfxSigId?: number;
  private _gpuModeSwitchInProgress: boolean = false;

  get available(): boolean {
    return this._available;
  }

  get profile(): string | null {
    return this._profile;
  }

  get profileChoices(): string[] {
    return this._profileChoices;
  }

  get chargeLimit(): number | null {
    return this._chargeLimit;
  }

  get gpuMode(): string | null {
    return this._gpuMode;
  }

  get gpuVendor(): string | null {
    return this._gpuVendor;
  }

  get gpuPower(): string | null {
    return this._gpuPower;
  }

  get gpuSupported(): string[] | null {
    return this._gpuSupported;
  }

  get gpuPendingMode(): string | null {
    return this._gpuPendingMode;
  }

  get gpuPendingAction(): boolean {
    return this._gpuPendingAction;
  }

  get supergfxVersion(): string | null {
    return this._supergfxVersion;
  }

  get gpuModeSwitching(): boolean {
    return this._gpuModeSwitchInProgress;
  }

  get error(): string | null {
    return this._error;
  }

  constructor() {
    super();
    logger.debug("constructor", "Constructor called");
    try {
      this.start();
    } catch (e) {
      logger.error("constructor", `Constructor error: ${e}`);
      /* ignore */
    }
  }

  start() {
    logger.info("start", "Starting service");
    this.stop();
    this.connectAll();
  }

  stop() {
    if (this.retryId) {
      GLib.source_remove(this.retryId);
      this.retryId = null;
    }
    this.asusd?.disconnect(this._asusdSigId ?? 0);
    this.gfxd?.disconnect(this._gfxSigId ?? 0);
    this.asusd = null;
    this.gfxd = null;
  }

  private normalizeProfile(
    p: string,
  ): "LowPower" | "Balanced" | "Performance" | string {
    const s = String(p);
    if (
      [
        "LowPower",
        "Low Power",
        "Quiet",
        "Powersave",
        "low_power",
        "low-power",
        "quiet",
        "powersave",
      ].includes(s)
    )
      return "LowPower";
    if (["Balanced", "balanced"].includes(s)) return "Balanced";
    if (["Performance", "performance"].includes(s)) return "Performance";
    return s;
  }

  async setProfile(profile: string) {
    // asusd v6.x uses numeric PlatformProfile: 0=Balanced, 1=Performance, 2=Quiet/LowPower
    const profileNumMap: Record<string, number> = {
      LowPower: 2,
      Balanced: 0,
      Performance: 1,
    };

    const profileNum = profileNumMap[profile];
    if (profileNum === undefined) {
      this._err(new Error(`Unknown profile: ${profile}`));
      return false;
    }
    if (this.asusd) {
      try {
        // Use Set method for PlatformProfile property
        this.asusd.call_sync(
          "org.freedesktop.DBus.Properties.Set",
          new GLib.Variant("(ssv)", [
            ASUSD.iface,
            "PlatformProfile",
            new GLib.Variant("u", profileNum),
          ]),
          Gio.DBusCallFlags.NONE,
          -1,
          null,
        );
        this._profile = this.normalizeProfile(profile);
        this._error = null;
        this.notify("profile");
        this.notify("error");
        return true;
      } catch (e) {
        this._err(e);
        return false;
      }
    }

    this._err(new Error(`asusd DBus service not available`));
    return false;
  }

  async setChargeLimit(limit: number) {
    if (!this.asusd) return false;
    try {
      limit = Math.max(40, Math.min(100, Math.round(limit)));
      // asusd v6.x uses ChargeControlEndThreshold property (byte value)
      this.asusd.call_sync(
        "org.freedesktop.DBus.Properties.Set",
        new GLib.Variant("(ssv)", [
          ASUSD.iface,
          "ChargeControlEndThreshold",
          new GLib.Variant("y", limit),
        ]),
        Gio.DBusCallFlags.NONE,
        -1,
        null,
      );
      this._chargeLimit = limit;
      this._error = null;
      this.notify("charge-limit");
      this.notify("error");
      return true;
    } catch (e) {
      this._err(e);
      return false;
    }
  }

  async setGpuMode(mode: string) {
    if (!this.gfxd) return false;

    // Prevent rapid mode switching
    if (this._gpuModeSwitchInProgress) {
      logger.warn(
        "setGpuMode",
        "Mode switch already in progress, ignoring request",
      );
      return false;
    }

    try {
      this._gpuModeSwitchInProgress = true;
      this.notify("gpu-mode-switching");
      // Map mode name to number for supergfxctl
      // Enum order: Hybrid=0, Integrated=1, NvidiaNoModeset=2, Vfio=3, AsusEgpu=4, AsusMuxDgpu=5, None=6
      const modeNumMap: Record<string, number> = {
        Hybrid: 0,
        Integrated: 1,
        NvidiaNoModeset: 2,
        Vfio: 3,
        AsusEgpu: 4,
        AsusMuxDgpu: 5,
      };
      const modeNum = modeNumMap[mode];
      if (modeNum === undefined) {
        this._err(new Error(`Unknown GPU mode: ${mode}`));
        return false;
      }
      logger.info("setGpuMode", `Setting GPU mode: ${mode} -> ${modeNum}`);

      // Optimistically set pending mode immediately for UI feedback
      const modeMap: Record<number, string> = {
        0: "Hybrid",
        1: "Integrated",
        2: "NvidiaNoModeset",
        3: "Vfio",
        4: "AsusEgpu",
        5: "AsusMuxDgpu",
      };
      this._gpuPendingMode = modeMap[modeNum];
      this._gpuPendingAction = true; // Assume action required until we hear back
      this.notify("gpu-pending-mode");
      this.notify("gpu-pending-action");
      logger.debug(
        "setGpuMode",
        `Optimistically set pending mode to: ${this._gpuPendingMode}`,
      );

      // Use async call with longer timeout to allow daemon to cancel previous tasks
      // The daemon might be busy cancelling a previous mode switch
      await new Promise<void>((resolve, reject) => {
        this.gfxd!.call(
          "SetMode",
          new GLib.Variant("(u)", [modeNum]),
          Gio.DBusCallFlags.NONE,
          15000, // 15 second timeout to allow daemon to cancel previous task
          null,
          (proxy, result) => {
            try {
              proxy!.call_finish(result);
              logger.info(
                "setGpuMode",
                `SetMode request sent, waiting for signals...`,
              );
              resolve();
            } catch (e) {
              // Timeout is not fatal - signals might still arrive
              const errStr = String(e);
              if (errStr.includes("Timeout")) {
                logger.warn(
                  "setGpuMode",
                  `SetMode call timed out (daemon busy), but signals should still arrive`,
                );
                resolve(); // Don't treat timeout as error
              } else {
                reject(e);
              }
            }
          },
        );
      });

      // Don't use a fixed cooldown - rely on signals to clear the flag
      // The daemon will send NotifyAction when the switch is done or requires user action

      return true;
    } catch (e) {
      logger.error("setGpuMode", `setGpuMode error: ${e}`);
      this._gpuModeSwitchInProgress = false; // Reset on error
      this.notify("gpu-mode-switching");
      // Don't clear optimistic pending mode - signals might still arrive
      return false;
    }
  }

  async setFanBoost(enabled: boolean) {
    // FanBoost is not available in asusd v6.x DBus API
    this._err(new Error("FanBoost is not supported in asusd v6.x"));
    return false;
  }

  async getGpuConfig(): Promise<{
    mode: number;
    vfio: boolean;
    compute: boolean;
    disableDevices: boolean;
    alwaysReboot: boolean;
    noLogindEvents: boolean;
    acLidCloseDisabled: number;
  } | null> {
    if (!this.gfxd) return null;
    try {
      logger.info("getGpuConfig", "Getting GPU config");
      const res = this.gfxd.call_sync(
        "Config",
        null,
        Gio.DBusCallFlags.NONE,
        -1,
        null,
      );
      // Config returns (ubbbbtu)
      const [
        mode,
        vfio,
        compute,
        disableDevices,
        alwaysReboot,
        noLogindEvents,
        acLidCloseDisabled,
      ] = res.deepUnpack() as [
        number,
        boolean,
        boolean,
        boolean,
        boolean,
        boolean,
        number,
      ];

      const config = {
        mode,
        vfio,
        compute,
        disableDevices,
        alwaysReboot,
        noLogindEvents,
        acLidCloseDisabled,
      };
      logger.debug("getGpuConfig", `Config: ${JSON.stringify(config)}`);
      return config;
    } catch (e) {
      logger.error("getGpuConfig", `getGpuConfig error: ${e}`);
      this._err(e);
      return null;
    }
  }

  async setGpuConfig(config: {
    mode: number;
    vfio: boolean;
    compute: boolean;
    disableDevices: boolean;
    alwaysReboot: boolean;
    noLogindEvents: boolean;
    acLidCloseDisabled: number;
  }): Promise<boolean> {
    if (!this.gfxd) return false;
    try {
      logger.info(
        "setGpuConfig",
        `Setting GPU config: ${JSON.stringify(config)}`,
      );
      this.gfxd.call_sync(
        "SetConfig",
        new GLib.Variant("((ubbbbtu))", [
          [
            config.mode,
            config.vfio,
            config.compute,
            config.disableDevices,
            config.alwaysReboot,
            config.noLogindEvents,
            config.acLidCloseDisabled,
          ],
        ]),
        Gio.DBusCallFlags.NONE,
        -1,
        null,
      );
      logger.success("setGpuConfig", "GPU config set successfully");
      // Refresh GPU info after config change
      this._refreshGfxInfo();
      return true;
    } catch (e) {
      logger.error("setGpuConfig", `setGpuConfig error: ${e}`);
      this._err(e);
      return false;
    }
  }

  private connectAll() {
    logger.debug("connectAll", "connectAll() called");
    logger.info("connectAll", "Connecting to DBus services...");
    try {
      logger.debug(
        "connectAll",
        `Connecting to asusd: ${ASUSD.name} at ${ASUSD.path}`,
      );
      this.asusd = Gio.DBusProxy.new_for_bus_sync(
        Gio.BusType.SYSTEM,
        Gio.DBusProxyFlags.NONE,
        null,
        ASUSD.name,
        ASUSD.path,
        ASUSD.iface,
        null,
      );
      logger.success("connectAll", "Successfully connected to asusd");
      this._asusdSigId = this.asusd.connect(
        "g-signal",
        (_p, _s, signal, params) => {
          if (signal === "PropertiesChanged") {
            const [_iface, changed, _invalid] = params.deepUnpack() as [
              string,
              GLib.Variant,
              string[],
            ];
            logger.debug("connectAll", "PropertiesChanged signal received");
            const props = unpackDict(changed);
            logger.debug(
              "connectAll",
              `PropertiesChanged signal props: ${JSON.stringify(props)}`,
            );
            this._applyAsusdProps(props);
          }
        },
      );
      this._primeAsusd();
    } catch (e) {
      logger.error("connectAll", `Failed to connect to asusd: ${e}`);
      this._err(e);
    }

    try {
      logger.debug(
        "connectAll",
        `Connecting to supergfx: ${SUPERGFX.name} at ${SUPERGFX.path}`,
      );
      this.gfxd = Gio.DBusProxy.new_for_bus_sync(
        Gio.BusType.SYSTEM,
        Gio.DBusProxyFlags.NONE,
        null,
        SUPERGFX.name,
        SUPERGFX.path,
        SUPERGFX.iface,
        null,
      );
      logger.success("connectAll", "Successfully connected to supergfx");
      this._gfxSigId = this.gfxd.connect(
        "g-signal",
        (_p, _s, signal, params) => {
          logger.debug("connectAll", `GFX signal received: ${signal}`);
          if (signal === "NotifyGfx") {
            // NotifyGfx signal contains the PENDING/TARGET mode (misleading param name in dbus)
            const [pendingModeNum] = params.deepUnpack() as [number];
            logger.debug(
              "connectAll",
              `NotifyGfx signal, pending mode: ${pendingModeNum}`,
            );

            const modeMap: Record<number, string> = {
              0: "Hybrid",
              1: "Integrated",
              2: "NvidiaNoModeset",
              3: "Vfio",
              4: "AsusEgpu",
              5: "AsusMuxDgpu",
              6: "None",
            };
            // "None" (6) means no pending mode, so treat it as null
            // Update pending mode (may override optimistic update)
            this._gpuPendingMode =
              pendingModeNum === 6 || !modeMap[pendingModeNum]
                ? null
                : modeMap[pendingModeNum];
            this.notify("gpu-pending-mode");
            logger.info(
              "connectAll",
              `Pending mode confirmed from signal: ${this._gpuPendingMode}`,
            );

            // Query actual current mode from daemon
            try {
              const currentModeRes = this.gfxd!.call_sync(
                "Mode",
                null,
                Gio.DBusCallFlags.NONE,
                3000,
                null,
              );
              const [currentModeNum] = currentModeRes.deepUnpack() as [number];
              this._applyGfxMode(currentModeNum);
              logger.debug("connectAll", `Current mode is: ${this._gpuMode}`);
            } catch (e) {
              logger.debug("connectAll", `Mode() query error: ${e}`);
            }
          } else if (signal === "NotifyGfxStatus") {
            // NotifyGfxStatus signal contains power status changes
            const [powerNum] = params.deepUnpack() as [number];
            logger.debug(
              "connectAll",
              `NotifyGfxStatus signal, power: ${powerNum}`,
            );

            const powerMap: Record<number, string> = {
              0: "Active",
              1: "Suspended",
              2: "Off",
              3: "AsusDisabled",
              4: "AsusMuxDiscreet",
              5: "Unknown",
            };
            this._gpuPower = powerMap[powerNum] || `Unknown(${powerNum})`;
            this.notify("gpu-power");
            logger.debug("connectAll", `GPU power status: ${this._gpuPower}`);
          } else if (signal === "NotifyAction") {
            // NotifyAction signal indicates user action is required
            const [actionNum] = params.deepUnpack() as [number];
            logger.debug(
              "connectAll",
              `NotifyAction signal, action: ${actionNum}`,
            );
            // UserActionRequired enum: Logout=0, Reboot=1, SwitchToIntegrated=2, AsusEgpuDisable=3, Nothing=4
            this._gpuPendingAction = actionNum !== 4;
            this.notify("gpu-pending-action");

            // Clear the in-progress flag when action is determined
            if (actionNum === 4) {
              // Nothing required, mode switch completed immediately
              this._gpuModeSwitchInProgress = false;
              this.notify("gpu-mode-switching");
              // Clear pending mode since no action required
              this._gpuPendingMode = null;
              this._gpuPendingAction = false;
              this.notify("gpu-pending-mode");
              this.notify("gpu-pending-action");
              logger.info(
                "connectAll",
                "Mode switch completed (no action required)",
              );
            } else {
              // User action required, mode switch waiting for user
              // Keep in-progress flag set until user logs out/reboots
              logger.info("connectAll", `User action required: ${actionNum}`);
            }
          } else if (signal === "PropertiesChanged") {
            // Just in case it does emit property changes
            logger.debug("connectAll", "GFX PropertiesChanged signal");
            try {
              this._primeGfx();
            } catch {}
          }
        },
      );
      this._primeGfx();
    } catch (e) {
      logger.error("connectAll", `Failed to connect to supergfx: ${e}`);
      this._err(e);
    }

    const ok = !!this.asusd || !!this.gfxd;
    logger.info(
      "connectAll",
      `Connection status - asusd: ${!!this.asusd}, gfxd: ${!!this.gfxd}, available: ${ok}`,
    );
    if (!ok) {
      logger.warn(
        "connectAll",
        "No services available, will retry in 5 seconds",
      );
      this.retryId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 5, () => {
        this.retryId = null;
        this.connectAll();
        return GLib.SOURCE_REMOVE;
      });
    }
    this._available = ok;
    this._error = null;
    this.notify("available");
    this.notify("error");
    logger.debug(
      "connectAll",
      `connectAll finished - profile: ${this._profile}, available: ${this._available}, error: ${this._error}`,
    );
  }

  private _primeAsusd() {
    logger.debug("_primeAsusd", "_primeAsusd called");
    if (!this.asusd) {
      logger.debug("_primeAsusd", "asusd proxy is null");
      return;
    }
    try {
      logger.debug(
        "_primeAsusd",
        `Getting all properties from interface: ${ASUSD.iface}`,
      );
      const res = this.asusd.call_sync(
        "org.freedesktop.DBus.Properties.GetAll",
        new GLib.Variant("(s)", [ASUSD.iface]),
        Gio.DBusCallFlags.NONE,
        -1,
        null,
      );
      logger.debug("_primeAsusd", "GetAll call succeeded");
      const unpacked = res.deepUnpack();
      logger.debug(
        "_primeAsusd",
        `deepUnpack result type: ${typeof unpacked}, ${unpacked?.constructor?.name}`,
      );
      const [dict] = unpacked as [Record<string, any>];
      logger.debug(
        "_primeAsusd",
        `dict type: ${typeof dict}, ${dict?.constructor?.name}`,
      );
      const props = unpackDict(dict);
      logger.debug(
        "_primeAsusd",
        `DBus properties received: ${JSON.stringify(props)}`,
      );
      this._applyAsusdProps(props);
    } catch (e) {
      logger.error("_primeAsusd", `_primeAsusd error: ${e}`);
      this._err(e);
    }
  }

  private _applyAsusdProps(props: Record<string, unknown>) {
    logger.debug(
      "_applyAsusdProps",
      `_applyAsusdProps called with props: ${Object.keys(props).join(", ")}`,
    );
    logger.debug(
      "_applyAsusdProps",
      `PlatformProfile value: ${props.PlatformProfile}, type: ${typeof props.PlatformProfile}`,
    );

    // Get available profile choices
    if (Array.isArray(props.PlatformProfileChoices)) {
      const profileMap: Record<number, string> = {
        0: "Balanced",
        1: "Performance",
        2: "LowPower",
      };
      this._profileChoices = (props.PlatformProfileChoices as number[])
        .map((num) => profileMap[num])
        .filter((p) => p !== undefined);
      logger.debug(
        "_applyAsusdProps",
        `PlatformProfileChoices: ${JSON.stringify(props.PlatformProfileChoices)} -> ${JSON.stringify(this._profileChoices)}`,
      );
      this.notify("profile-choices");
    }

    // asusd v6.x uses PlatformProfile (number): 0=Quiet, 1=Balanced, 2=Performance
    if (typeof props.PlatformProfile === "number") {
      const profileMap: Record<number, string> = {
        0: "Balanced",
        1: "Performance",
        2: "LowPower",
      };
      const p = profileMap[props.PlatformProfile] || "Balanced";
      logger.debug(
        "_applyAsusdProps",
        `Mapped profile number ${props.PlatformProfile} to ${p}`,
      );
      this._profile = this.normalizeProfile(p);
      logger.debug(
        "_applyAsusdProps",
        `After normalizeProfile: ${this._profile}`,
      );
      this.notify("profile");
      logger.info(
        "_applyAsusdProps",
        `Profile set to: ${this._profile}, type: ${typeof this._profile}`,
      );
    } else {
      logger.warn(
        "_applyAsusdProps",
        "PlatformProfile property missing or not a number",
      );
    }
    // FanBoost is not available in asusd v6.x
    // asusd v6.x uses ChargeControlEndThreshold (byte/number)
    if (typeof props.ChargeControlEndThreshold === "number") {
      this._chargeLimit = props.ChargeControlEndThreshold;
      this.notify("charge-limit");
    } else if (typeof props.ChargeLimit === "number") {
      this._chargeLimit = props.ChargeLimit;
      this.notify("charge-limit");
    }
    this._available = true;
    this._error = null;
    this.notify("available");
    this.notify("error");
  }

  private _primeGfx() {
    logger.debug("_primeGfx", "_primeGfx called");
    if (!this.gfxd) {
      logger.debug("_primeGfx", "gfxd proxy is null");
      return;
    }
    try {
      // Get current GPU mode
      const res = this.gfxd.call_sync(
        "Mode",
        null,
        Gio.DBusCallFlags.NONE,
        -1,
        null,
      );
      const [modeNum] = res.deepUnpack() as [number];
      logger.debug(
        "_primeGfx",
        `_primeGfx Mode() returned: ${modeNum}, type: ${typeof modeNum}`,
      );
      this._applyGfxMode(modeNum);

      // Get additional GPU information on initial connection
      // Use longer timeout since this is first call
      this._refreshGfxInfo(10000);
    } catch (e) {
      logger.error("_primeGfx", `_primeGfx error: ${e}`);
      this._err(e);
    }
  }

  private _refreshGfxInfo(timeout: number = 5000) {
    logger.debug("_refreshGfxInfo", "_refreshGfxInfo called");
    if (!this.gfxd) {
      logger.debug("_refreshGfxInfo", "gfxd proxy is null");
      return;
    }

    try {
      // Get supergfxctl version
      const versionRes = this.gfxd.call_sync(
        "Version",
        null,
        Gio.DBusCallFlags.NONE,
        timeout,
        null,
      );
      const [version] = versionRes.deepUnpack() as [string];
      this._supergfxVersion = version;
      this.notify("supergfx-version");
      logger.debug("_refreshGfxInfo", `Version: ${version}`);
    } catch (e) {
      logger.debug("_refreshGfxInfo", `Version() error: ${e}`);
    }

    try {
      // Get supported GPU modes
      const supportedRes = this.gfxd.call_sync(
        "Supported",
        null,
        Gio.DBusCallFlags.NONE,
        timeout,
        null,
      );
      const [supportedModes] = supportedRes.deepUnpack() as [number[]];
      const modeMap: Record<number, string> = {
        0: "Hybrid",
        1: "Integrated",
        2: "NvidiaNoModeset",
        3: "Vfio",
        4: "AsusEgpu",
        5: "AsusMuxDgpu",
        6: "None",
      };
      this._gpuSupported = supportedModes.map(
        (m) => modeMap[m] || `Unknown(${m})`,
      );
      this.notify("gpu-supported");
      logger.debug(
        "_refreshGfxInfo",
        `Supported modes: ${this._gpuSupported.join(", ")}`,
      );
    } catch (e) {
      logger.debug("_refreshGfxInfo", `Supported() error: ${e}`);
    }

    try {
      // Get GPU vendor
      const vendorRes = this.gfxd.call_sync(
        "Vendor",
        null,
        Gio.DBusCallFlags.NONE,
        timeout,
        null,
      );
      const [vendor] = vendorRes.deepUnpack() as [string];
      this._gpuVendor = vendor;
      this.notify("gpu-vendor");
      logger.debug("_refreshGfxInfo", `Vendor: ${vendor}`);
    } catch (e) {
      logger.debug("_refreshGfxInfo", `Vendor() error: ${e}`);
    }

    try {
      // Get GPU power status
      const powerRes = this.gfxd.call_sync(
        "Power",
        null,
        Gio.DBusCallFlags.NONE,
        timeout,
        null,
      );
      const [powerNum] = powerRes.deepUnpack() as [number];
      // Power status enum: Active=0, Suspended=1, Off=2, AsusDisabled=3, AsusMuxDiscreet=4, Unknown=5
      const powerMap: Record<number, string> = {
        0: "Active",
        1: "Suspended",
        2: "Off",
        3: "AsusDisabled",
        4: "AsusMuxDiscreet",
        5: "Unknown",
      };
      this._gpuPower = powerMap[powerNum] || `Unknown(${powerNum})`;
      this.notify("gpu-power");
      logger.debug("_refreshGfxInfo", `Power: ${this._gpuPower}`);
    } catch (e) {
      logger.debug("_refreshGfxInfo", `Power() error: ${e}`);
    }

    try {
      // Get pending GPU mode (if reboot required)
      const pendingRes = this.gfxd.call_sync(
        "PendingMode",
        null,
        Gio.DBusCallFlags.NONE,
        timeout,
        null,
      );
      const [pendingModeNum] = pendingRes.deepUnpack() as [number];
      const modeMap: Record<number, string> = {
        0: "Hybrid",
        1: "Integrated",
        2: "NvidiaNoModeset",
        3: "Vfio",
        4: "AsusEgpu",
        5: "AsusMuxDgpu",
        6: "None",
      };
      // "None" (6) means no pending mode, so treat it as null
      this._gpuPendingMode =
        pendingModeNum === 6 || !modeMap[pendingModeNum]
          ? null
          : modeMap[pendingModeNum];
      this.notify("gpu-pending-mode");
      logger.debug("_refreshGfxInfo", `Pending mode: ${this._gpuPendingMode}`);
    } catch (e) {
      logger.debug("_refreshGfxInfo", `PendingMode() error: ${e}`);
    }

    try {
      // Get pending user action status
      const actionRes = this.gfxd.call_sync(
        "PendingUserAction",
        null,
        Gio.DBusCallFlags.NONE,
        timeout,
        null,
      );
      const [actionNum] = actionRes.deepUnpack() as [number];
      // UserActionRequired enum: Logout=0, Reboot=1, SwitchToIntegrated=2, AsusEgpuDisable=3, Nothing=4
      this._gpuPendingAction = actionNum !== 4;
      this.notify("gpu-pending-action");
      logger.debug(
        "_refreshGfxInfo",
        `Pending action: ${actionNum} (pending: ${this._gpuPendingAction})`,
      );
    } catch (e) {
      logger.debug("_refreshGfxInfo", `PendingUserAction() error: ${e}`);
    }
  }

  private _applyGfxMode(modeNum: number) {
    logger.debug("_applyGfxMode", `_applyGfxMode called with mode: ${modeNum}`);
    // supergfxctl mode mapping (Rust enum order):
    // 0=Hybrid, 1=Integrated, 2=NvidiaNoModeset, 3=Vfio, 4=AsusEgpu, 5=AsusMuxDgpu, 6=None
    const modeMap: Record<number, string> = {
      0: "Hybrid",
      1: "Integrated",
      2: "NvidiaNoModeset",
      3: "Vfio",
      4: "AsusEgpu",
      5: "AsusMuxDgpu",
      6: "None",
    };
    const modeName = modeMap[modeNum];
    if (modeName) {
      this._gpuMode = modeName;
      this.notify("gpu-mode");
      logger.info("_applyGfxMode", `GPU Mode set to: ${this._gpuMode}`);
    } else {
      logger.warn("_applyGfxMode", `Unknown GPU mode number: ${modeNum}`);
    }
    this._available = true;
    this._error = null;
    this.notify("available");
    this.notify("error");
  }

  private _err(e: unknown) {
    const raw = String(e ?? "");
    let hint = raw;
    if (raw.includes("org.freedesktop.DBus.Error.ServiceUnknown")) {
      if (raw.includes(ASUSD.name)) {
        hint = `${raw} \nHint: asusd isn't running. On NixOS, set services.asusd.enable = true; then rebuild.`;
      } else if (raw.includes(SUPERGFX.name)) {
        hint = `${raw} \nHint: supergfxd isn't running. On NixOS, set services.supergfxd.enable = true; then rebuild.`;
      }
    }
    this._error = hint;
    this._available = !!(this.asusd || this.gfxd);
    this.notify("error");
    this.notify("available");
    logError(e as any);
  }
}

const KEY = Symbol.for("ags.AsusService");
const g = globalThis as any;
if (!g[KEY]) {
  logger.info("init", "Creating new AsusServiceClass instance");
  g[KEY] = new AsusServiceClass();
  // Test profile immediately after creation
  logger.debug("init", "Service created, testing profile getter...");
  const testService = g[KEY] as AsusServiceClass;
  logger.debug("init", `Profile after init: ${testService.profile}`);
  logger.debug("init", `Available after init: ${testService.available}`);
  logger.debug("init", `Error after init: ${testService.error}`);
} else {
  logger.debug("init", "Using existing AsusServiceClass instance");
}

export const AsusService = g[KEY] as AsusServiceClass;
logger.info("init", `AsusService exported, profile: ${AsusService.profile}`);
