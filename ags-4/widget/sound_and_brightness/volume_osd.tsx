import { Gtk } from "astal/gtk4";

export interface VolumeOSDProps {
    device: 'speaker' | 'microphone';
    volume: number;
    isMuted: boolean;
    deviceName?: string;
}

export default function VolumeOSD(props: VolumeOSDProps): JSX.Element {
    const icon = getVolumeIcon(props);
    const truncatedName = truncateDeviceName(props.deviceName || "Unknown");
    const volumePercentage = Math.min(props.volume / 150, 1.0); // Handle 150% max volume
    const isOverAmplified = props.volume > 100;
    
    return (
        <box 
            orientation={Gtk.Orientation.VERTICAL}
            spacing={12}
            cssClasses={["osd-volume-widget"]}
        >
            {/* Header with icon and device name */}
            <box 
                orientation={Gtk.Orientation.HORIZONTAL}
                spacing={10}
                cssClasses={["osd-volume-header"]}
                halign={Gtk.Align.CENTER}
            >
                <label 
                    label={icon}
                    cssClasses={["osd-volume-icon-large"]}
                />
                <label
                    label={truncatedName}
                    cssClasses={["osd-device-name"]}
                />
            </box>
            
            {/* Volume progress bar */}
            <box 
                orientation={Gtk.Orientation.VERTICAL}
                spacing={8}
                cssClasses={["osd-volume-progress-container"]}
            >
                <levelbar
                    value={volumePercentage}
                    cssClasses={[
                        "osd-volume-progress",
                        isOverAmplified ? "osd-volume-overamplified" : ""
                    ]}
                    hexpand={true}
                />
                
                {/* Volume percentage and status */}
                <box 
                    orientation={Gtk.Orientation.HORIZONTAL}
                    cssClasses={["osd-volume-info"]}
                    halign={Gtk.Align.CENTER}
                    spacing={8}
                >
                    <label 
                        label={`${props.volume}%`}
                        cssClasses={[
                            "osd-volume-percentage",
                            isOverAmplified ? "osd-volume-overamplified-text" : ""
                        ]}
                    />
                    <label 
                        label={
                            props.isMuted ? "MUTED" : 
                            isOverAmplified ? "AMPLIFIED" : ""
                        }
                        cssClasses={[
                            props.isMuted ? "osd-volume-muted-indicator" : 
                            isOverAmplified ? "osd-volume-amplified-indicator" : ""
                        ]}
                        visible={props.isMuted || isOverAmplified}
                    />
                </box>
            </box>
        </box>
    );
}

function getVolumeIcon(props: VolumeOSDProps): string {
    if (props.isMuted) {
        return props.device === 'speaker' ? '󰝟' : '󰍭';
    }
    
    if (props.device === 'speaker') {
        if (props.volume === 0) return '󰕿';
        if (props.volume <= 33) return '󰖀';
        if (props.volume <= 66) return '󰕾';
        return '󰕾';
    } else {
        // Microphone
        if (props.volume === 0) return '󰍭';
        return '󰍬';
    }
}

function truncateDeviceName(name: string): string {
    return name.length > 25 ? name.slice(0, 22) + "..." : name;
}
