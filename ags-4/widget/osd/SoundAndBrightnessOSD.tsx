import { App, Astal, Gdk, Gtk } from "astal/gtk4";
import { bind, Variable } from "astal";
import { createLogger } from "../../utils/logger";

const logger = createLogger("SoundBrightnessOSD");

// Separate OSD Manager for Sound and Brightness
export interface SoundBrightnessOSDContent {
  widget: JSX.Element;
  timeout: number;
  type: "volume" | "brightness";
}

class SoundBrightnessOSDManagerClass {
  OSDVisible = new Variable(false);
  ODSRevealed = new Variable(false);
  OSDContent = new Variable<SoundBrightnessOSDContent | null>(null);

  // Shared variable to track when OSD should be hidden
  private hideTimestamp = new Variable<number | null>(null);
  private hideTimerInterval: any = null;

  // Track animation state to handle interruptions
  private isAnimating = false;
  private animationTimeout: any = null;

  // OSD blocking mechanism
  private isBlocked = false;
  private blockUntilTimestamp: number | null = null;

  constructor() {
    // Start the background timer thread
    this.startHideTimer();
  }

  handleOSDVisibleToggle = () => {
    const currentVisible = this.OSDVisible.get();

    // Clear any existing animation timeout
    if (this.animationTimeout) {
      clearTimeout(this.animationTimeout);
      this.animationTimeout = null;
    }

    this.isAnimating = true;

    if (!currentVisible) {
      // false -> true: set visible first, then revealed
      this.OSDVisible.set(true);
      this.animationTimeout = setTimeout(() => {
        this.ODSRevealed.set(true);
        this.isAnimating = false;
        this.animationTimeout = null;
      }, 200);
    } else {
      // true -> false: set not revealed first, then not visible
      this.ODSRevealed.set(false);
      this.animationTimeout = setTimeout(() => {
        this.OSDVisible.set(false);
        this.isAnimating = false;
        this.animationTimeout = null;
      }, 200);
    }
  };

  startHideTimer = () => {
    this.hideTimerInterval = setInterval(() => {
      const hideTime = this.hideTimestamp.get();
      const currentTime = Date.now();

      // Check if blocking is active and has expired
      if (
        this.isBlocked &&
        this.blockUntilTimestamp &&
        currentTime >= this.blockUntilTimestamp
      ) {
        this.isBlocked = false;
        this.blockUntilTimestamp = null;
      }

      if (!hideTime || this.isAnimating || this.isBlocked) return;

      if (currentTime >= hideTime) {
        this.hideTimestamp.set(null);
        this.hideOSD();
      }
    }, 100);
  };

  showOSD = (content: SoundBrightnessOSDContent) => {
    logger.debug(
      "showOSD",
      `showOSD called with content: ${JSON.stringify({
        type: content.type,
        timeout: content.timeout,
      })}`,
    );

    // Set new content
    this.OSDContent.set(content);

    // Calculate hide timestamp
    const hideTime = Date.now() + content.timeout;
    this.hideTimestamp.set(hideTime);

    // If not visible, show it
    if (!this.OSDVisible.get()) {
      this.handleOSDVisibleToggle();
    }
  };

  hideOSD = () => {
    logger.debug("hideOSD", "hideOSD called");

    if (this.OSDVisible.get()) {
      this.handleOSDVisibleToggle();
    }
  };

  blockOSD = (duration: number) => {
    this.isBlocked = true;
    this.blockUntilTimestamp = Date.now() + duration;
    this.hideOSD();
  };
}

// Export the manager instance
export const SoundBrightnessOSDManager = new SoundBrightnessOSDManagerClass();

// Sound and Brightness OSD Component
export default function SoundAndBrightnessOSD(gdkmonitor: Gdk.Monitor) {
  return (
    <window
      name={`sound-brightness-osd-${gdkmonitor.get_model()}`}
      namespace="sound-brightness-osd"
      gdkmonitor={gdkmonitor}
      layer={Astal.Layer.OVERLAY}
      anchor={Astal.WindowAnchor.BOTTOM}
      exclusivity={Astal.Exclusivity.IGNORE}
      keymode={Astal.Keymode.NONE}
      visible={bind(SoundBrightnessOSDManager.OSDVisible)}
      application={App}
      cssClasses={["osd-window"]}
      child={
        <revealer
          revealChild={bind(SoundBrightnessOSDManager.ODSRevealed)}
          transitionType={Gtk.RevealerTransitionType.SLIDE_UP}
          transitionDuration={200}
          child={
            <box
              cssClasses={["osd-container"]}
              halign={Gtk.Align.CENTER}
              valign={Gtk.Align.END}
              child={bind(SoundBrightnessOSDManager.OSDContent).as((content) =>
                content ? content.widget : <label label="No content" />,
              )}
            />
          }
        />
      }
    />
  );
}
