import { Gtk } from "astal/gtk4";

export interface BrightnessOSDProps {
    brightness: number;
}

export default function BrightnessOSD(props: BrightnessOSDProps): JSX.Element {
    const icon = getBrightnessIcon(props.brightness);
    
    return (
        <box 
            orientation={Gtk.Orientation.VERTICAL}
            spacing={12}
            cssClasses={["osd-brightness-widget"]}
        >
            {/* Header with icon and label */}
            <box 
                orientation={Gtk.Orientation.HORIZONTAL}
                spacing={10}
                cssClasses={["osd-brightness-header"]}
                halign={Gtk.Align.CENTER}
            >
                <label 
                    label={icon}
                    cssClasses={["osd-brightness-icon-large"]}
                />
                <label
                    label="Brightness"
                    cssClasses={["osd-brightness-name"]}
                />
            </box>
            
            {/* Brightness progress bar */}
            <box 
                orientation={Gtk.Orientation.VERTICAL}
                spacing={8}
                cssClasses={["osd-brightness-progress-container"]}
            >
                <levelbar
                    value={props.brightness / 100}
                    cssClasses={["osd-brightness-progress"]}
                    hexpand={true}
                />
                
                {/* Brightness percentage */}
                <label 
                    label={`${props.brightness}%`}
                    cssClasses={["osd-brightness-percentage"]}
                    halign={Gtk.Align.CENTER}
                />
            </box>
        </box>
    );
}

function getBrightnessIcon(brightness: number): string {
    if (brightness <= 25) return '󰃞';
    if (brightness <= 50) return '󰃟';
    if (brightness <= 75) return '󰃝';
    return '󰃠';
}
