import { Gtk } from "astal/gtk4";

export interface PowerAndSystrayOSDProps {
    level: {
        percentage: number;
        isCritical: boolean;
    };
    currentPercentage: number;
}

/**
 * Battery Warning OSD Widget
 */
export default function PowerAndSystrayOSD(props: PowerAndSystrayOSDProps): JSX.Element {
    const { level, currentPercentage } = props;
    const urgencyClass = level.isCritical ? "battery-urgency-critical" : "battery-urgency-normal";
    const batteryIcon = getBatteryIcon(currentPercentage);
    
    return (
        <box 
            orientation={Gtk.Orientation.HORIZONTAL}
            spacing={12}
            cssClasses={["battery-osd-card", urgencyClass]}
            widthRequest={350}
        >
            {/* Battery icon */}
            <label 
                label={batteryIcon}
                cssClasses={["battery-osd-icon"]}
                halign={Gtk.Align.START}
                valign={Gtk.Align.START}
            />
            
            {/* Content */}
            <box 
                orientation={Gtk.Orientation.VERTICAL}
                spacing={4}
                cssClasses={["battery-osd-content"]}
                hexpand={true}
            >
                {/* Header */}
                <box 
                    orientation={Gtk.Orientation.HORIZONTAL}
                    cssClasses={["battery-osd-header"]}
                    spacing={8}
                >
                    <label
                        label={level.isCritical ? "Critical Battery" : "Low Battery"}
                        cssClasses={["battery-osd-title"]}
                        halign={Gtk.Align.START}
                        hexpand={true}
                    />
                    <label
                        label={new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        cssClasses={["battery-osd-time"]}
                        halign={Gtk.Align.END}
                    />
                </box>

                {/* Battery percentage */}
                <label
                    label={`${currentPercentage}% remaining`}
                    cssClasses={["battery-osd-percentage"]}
                    halign={Gtk.Align.START}
                />

                {/* Warning message */}
                <label
                    label={level.isCritical 
                        ? "Please connect charger immediately!" 
                        : "Consider charging your device soon"
                    }
                    cssClasses={["battery-osd-message"]}
                    halign={Gtk.Align.START}
                    wrap={true}
                    lines={2}
                />
            </box>
        </box>
    );
}

/**
 * Get battery icon based on percentage
 */
function getBatteryIcon(percentage: number): string {
    if (percentage >= 90) return "󰁹";
    if (percentage >= 80) return "󰂂";
    if (percentage >= 70) return "󰂁";
    if (percentage >= 60) return "󰂀";
    if (percentage >= 50) return "󰁿";
    if (percentage >= 40) return "󰁾";
    if (percentage >= 30) return "󰁽";
    if (percentage >= 20) return "󰁼";
    if (percentage >= 10) return "󰁻";
    return "󰂎"; // Critical level icon
}
