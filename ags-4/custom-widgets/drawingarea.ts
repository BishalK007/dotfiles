import { GLib } from "astal";
import { Gtk } from "astal/gtk4";

type DrawFunc = (
  area: Gtk.DrawingArea,
  cr: any,
  width: number,
  height: number,
) => void;

type DAProps = Gtk.DrawingArea.ConstructorProps & {
  draw?: DrawFunc;
  /** milliseconds between redraws (0 = no timer) */
  intervalMs?: number;
  /** convenience: add CSS classes to a raw GTK widget */
  cssClasses?: string[]; // ["my-class", "accent"]
  className?: string; // "my-class accent"
  classList?: string[]; // alias
  // allow passing user handlers too
  onRealize?: (w: Gtk.DrawingArea) => void;
  on_realize?: (w: Gtk.DrawingArea) => void;
} & Record<string, unknown>;

/** Capitalized component that wraps a real Gtk.DrawingArea */
export const DrawingArea = ({
  draw,
  intervalMs = 0,
  cssClasses,
  className,
  classList,
  onRealize,
  on_realize,
  ...rest
}: DAProps) => {
  const handleRealize = (area: Gtk.DrawingArea) => {
    // 1) CSS classes (GTK doesn't have a "cssClasses" constructor prop)
    const allClasses: string[] = [
      ...(Array.isArray(cssClasses) ? cssClasses : []),
      ...(Array.isArray(classList) ? classList : []),
      ...(typeof className === "string"
        ? className.split(/\s+/).filter(Boolean)
        : []),
    ];
    for (const c of allClasses) {
      try {
        area.add_css_class?.(c);
      } catch {}
    }

    // 2) attach draw function
    if (draw) {
      try {
        area.set_draw_func?.(draw);
      } catch {}
    }

    // 3) periodic redraw
    let src = 0;
    if (intervalMs > 0) {
      try {
        src = GLib.timeout_add(GLib.PRIORITY_DEFAULT, intervalMs, () => {
          try {
            area.queue_draw?.();
          } catch {}
          return GLib.SOURCE_CONTINUE;
        });
      } catch {}
    }

    // 4) cleanup timers
    const cleanup = () => {
      if (src) {
        try {
          GLib.source_remove(src);
        } catch {}
        src = 0;
      }
    };
    area.connect?.("unrealize", cleanup);
    area.connect?.("destroy", cleanup);

    // 5) call user-provided realize handlers if any
    try {
      onRealize?.(area);
    } catch {}
    try {
      on_realize?.(area);
    } catch {}
  };

  // Create the DrawingArea widget directly and connect realize signal
  // Filter out children and other props that DrawingArea doesn't support
  const { children, child, ...validProps } = rest as any;
  const area = new Gtk.DrawingArea(validProps);
  area.connect("realize", () => handleRealize(area));
  return area;
};

export { DrawFunc, DAProps };
