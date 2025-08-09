import { Variable } from "astal";
import { bind } from "astal";
import AstalWp from "gi://AstalWp";
import { SoundBrightnessOSDManager } from "../widget/osd/SoundAndBrightnessOSD";
import VolumeOSD, { VolumeOSDProps } from "../widget/sound_and_brightness/volume_osd";

export interface VolumeChange {
    device: 'speaker' | 'microphone';
    volume: number;
    isMuted: boolean;
    deviceName?: string;
}

class VolListenerService {
    private wireplumber: AstalWp.Wp;
    private audio: AstalWp.Audio;
    
    // Track previous values to detect actual changes
    private prevSpeakerVolume: number = -1;
    private prevSpeakerMute: boolean = false;
    private prevMicVolume: number = -1;
    private prevMicMute: boolean = false;

    constructor() {
        this.wireplumber = AstalWp.get_default() as AstalWp.Wp;
        this.audio = this.wireplumber.audio;
        this.initializeListeners();
    }

    private initializeListeners(): void {
        // Speaker monitoring - using the same pattern as your sound widget
        const speakerVolumeVar = Variable.derive(
            [
                bind(bind(this.audio, "default-speaker").get(), "volume"),
                bind(bind(this.audio, "default-speaker").get(), "mute"),
                bind(bind(this.audio, "default-speaker").get(), "description"),
            ],
            (volume: number, mute: boolean, description: string) => {
                this.handleSpeakerChange(volume, mute, description);
                return { volume, mute, description };
            }
        );

        // Microphone monitoring - similar pattern
        const micVolumeVar = Variable.derive(
            [
                bind(bind(this.audio, "default-microphone").get(), "volume"),
                bind(bind(this.audio, "default-microphone").get(), "mute"), 
                bind(bind(this.audio, "default-microphone").get(), "description"),
            ],
            (volume: number, mute: boolean, description: string) => {
                this.handleMicrophoneChange(volume, mute, description);
                return { volume, mute, description };
            }
        );

        // Subscribe to keep them active
        speakerVolumeVar.subscribe(() => {});
        micVolumeVar.subscribe(() => {});
    }

    private handleSpeakerChange(volume: number, mute: boolean, description: string): void {
        // Only trigger OSD if there's an actual change
        if (volume !== this.prevSpeakerVolume || mute !== this.prevSpeakerMute) {
            this.prevSpeakerVolume = volume;
            this.prevSpeakerMute = mute;
            
            this.showVolumeOSD({
                device: 'speaker',
                volume: Math.round(volume * 100),
                isMuted: mute,
                deviceName: description
            });
        }
    }

    private handleMicrophoneChange(volume: number, mute: boolean, description: string): void {
        // Only trigger OSD if there's an actual change
        if (volume !== this.prevMicVolume || mute !== this.prevMicMute) {
            this.prevMicVolume = volume;
            this.prevMicMute = mute;
            
            this.showVolumeOSD({
                device: 'microphone',
                volume: Math.round(volume * 100),
                isMuted: mute,
                deviceName: description
            });
        }
    }

    private showVolumeOSD(change: VolumeChange): void {
        const widget = VolumeOSD({
            device: change.device,
            volume: change.volume,
            isMuted: change.isMuted,
            deviceName: change.deviceName
        });
        
        SoundBrightnessOSDManager.showOSD({
            widget,
            timeout: 2000,
            type: 'volume'
        });
    }

    // Public methods for manual testing
    public triggerSpeakerOSD(): void {
        const speaker = this.audio.defaultSpeaker;
        if (speaker) {
            this.showVolumeOSD({
                device: 'speaker',
                volume: Math.round(speaker.volume * 150), // Convert to 150% scale
                isMuted: speaker.mute,
                deviceName: speaker.description || "Speaker"
            });
        }
    }

    public triggerMicOSD(): void {
        const mic = this.audio.defaultMicrophone;
        if (mic) {
            this.showVolumeOSD({
                device: 'microphone',
                volume: Math.round(mic.volume * 150), // Convert to 150% scale
                isMuted: mic.mute,
                deviceName: mic.description || "Microphone"
            });
        }
    }

    // Test functions for different volume levels
    public testVolumeOSD(volume: number = 75): void {
        this.showVolumeOSD({
            device: 'speaker',
            volume: volume,
            isMuted: false,
            deviceName: "Test Speaker"
        });
    }

    public testMutedOSD(): void {
        this.showVolumeOSD({
            device: 'speaker',
            volume: 50,
            isMuted: true,
            deviceName: "Test Speaker"
        });
    }

    public testAmplifiedOSD(): void {
        this.showVolumeOSD({
            device: 'speaker',
            volume: 125,
            isMuted: false,
            deviceName: "Test Speaker (Amplified)"
        });
    }
}

export const VolListener = new VolListenerService();