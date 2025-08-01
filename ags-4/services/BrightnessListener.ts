import { Variable } from "astal";
import { bind } from "astal";
import { OSDManager } from "./OSDManager";
import BrightnessOSD, { BrightnessOSDProps } from "../widget/sound_and_brightness/brightness_osd";
import Brightness from "../libraries/Brightness";

export interface BrightnessChange {
    brightness: number;
}

class BrightnessListenerService {
    private brightness: Brightness;
    
    // Track previous values to detect actual changes
    private prevBrightness: number = -1;

    constructor() {
        this.brightness = Brightness.get_default();
        this.initializeListeners();
    }

    private initializeListeners(): void {
        // Brightness monitoring - using the same pattern as your sound widget
        const brightnessVar = Variable.derive(
            [bind(this.brightness, "screen")],
            (level: number) => {
                this.handleBrightnessChange(level);
                return { level };
            }
        );

        // Subscribe to keep it active
        brightnessVar.subscribe(() => {});
    }

    private handleBrightnessChange(level: number): void {
        // Only trigger OSD if there's an actual change
        const brightnessPercent = Math.round(level * 100);
        
        if (brightnessPercent !== this.prevBrightness) {
            this.prevBrightness = brightnessPercent;
            
            this.showBrightnessOSD({
                brightness: brightnessPercent
            });
        }
    }

    private showBrightnessOSD(change: BrightnessChange): void {
        const widget = BrightnessOSD({
            brightness: change.brightness
        });
        
        OSDManager.showOSD({
            widget,
            timeout: 2000
        });
    }

    // Public methods for manual testing
    public triggerBrightnessOSD(): void {
        const currentLevel = this.brightness.screen;
        this.showBrightnessOSD({
            brightness: Math.round(currentLevel * 100)
        });
    }

    // Test functions for different brightness levels
    public testBrightnessOSD(brightness: number = 50): void {
        this.showBrightnessOSD({
            brightness: brightness
        });
    }

    public testLowBrightnessOSD(): void {
        this.showBrightnessOSD({
            brightness: 10
        });
    }

    public testHighBrightnessOSD(): void {
        this.showBrightnessOSD({
            brightness: 100
        });
    }
}

export const BrightnessListener = new BrightnessListenerService();
