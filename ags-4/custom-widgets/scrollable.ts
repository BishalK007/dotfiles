// Custom widgets file that extends astal framework
import { Gtk } from "astal/gtk4";

// Re-export all existing astal widgets
export * from "astal/gtk4";

// Simple GTK Scrollable definition
export function Scrollable(props: any = {}) {
    const {
        cssClasses = [],
        maxContentHeight = 400,
        children,
        ...otherProps
    } = props;

    const scrolled = new Gtk.ScrolledWindow();
    scrolled.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
    scrolled.set_max_content_height(maxContentHeight);
    scrolled.set_css_classes(["scrollable-wrapper", ...cssClasses]);
    if (children) {
        scrolled.set_child(children);
    }
    return scrolled;
}
