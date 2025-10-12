import { Gtk } from "astal/gtk4";
import GLib from "gi://GLib?version=2.0";

export type DrawingAreaProps = {
  cssClasses?: string[];
  widthRequest?: number;
  heightRequest?: number;
  hexpand?: boolean;
  vexpand?: boolean;
  redrawIntervalSec?: number; // default 2s
  draw?: (cr: any, width: number, height: number, area: any) => void;
};

export function DrawingArea(props: DrawingAreaProps = {}) {
  const {
    cssClasses = [],
    widthRequest,
    heightRequest,
    hexpand,
    vexpand,
    redrawIntervalSec = 2,
    draw,
    ...other
  } = props as any;

  const area = new Gtk.DrawingArea();

  if (Array.isArray(cssClasses) && cssClasses.length) {
    area.set_css_classes(cssClasses);
  }
  if (typeof widthRequest === "number" || typeof heightRequest === "number") {
    area.set_size_request(widthRequest ?? -1, heightRequest ?? -1);
  }
  if (typeof hexpand === "boolean") area.set_hexpand(hexpand);
  if (typeof vexpand === "boolean") area.set_vexpand(vexpand);

  if (typeof draw === "function") {
    area.set_draw_func((_self: any, cr: any, width: number, height: number) => {
      try { draw(cr, width, height, area); } catch (e) { console.error(e); }
    });
  }

  let timerId: number | null = null;
  if (redrawIntervalSec && redrawIntervalSec > 0) {
    timerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, redrawIntervalSec, () => {
      try { area.queue_draw(); } catch { /* ignore */ }
      return true;
    });
    area.connect("unrealize", () => {
      if (timerId) {
        try { GLib.source_remove(timerId); } catch { /* ignore */ }
        timerId = null;
      }
    });
  }

  // spread any remaining supported props (if any) via generic setters
  // note: keep minimal to avoid unexpected behavior
  void other;

  return area;
}

export default DrawingArea;
