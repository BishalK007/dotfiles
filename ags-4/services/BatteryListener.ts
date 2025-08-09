import AstalBattery from "gi://AstalBattery";
import { BatteryWarningOSDManager } from "../widget/osd/BatteryWarningOSD";
import { Variable } from "astal";
import PowerAndSystrayOSD from "../widget/power_and_systray/power_and_systray_osd";

export interface BatteryWarningLevel {
    percentage: number;
    isCritical: boolean;
}

class BatteryWarningServiceClass {
    private battery: AstalBattery.Battery;
    private warningLevels: number[] = [40, 20, 10, 5]; // More reasonable warning levels
    private triggeredLevels: Set<number> = new Set(); // Track which warnings we've shown
    private lastPercentage: number = 100;
    private isCharging: boolean = false;

    constructor() {
        this.battery = AstalBattery.get_default() as AstalBattery.Battery;
        this.initializeListeners();
    }

    /**
     * Set custom warning levels
     * Last 3 or fewer levels will be marked as critical
     */
    public setWarningLevels(levels: number[]): void {
        // Sort in descending order and remove duplicates
        this.warningLevels = [...new Set(levels)].sort((a, b) => b - a);
        // Reset triggered levels when levels change
        this.triggeredLevels.clear();
    }

    /**
     * Get warning levels with critical status
     */
    private getWarningLevelsWithStatus(): BatteryWarningLevel[] {
        const totalLevels = this.warningLevels.length;
        const criticalCount = Math.min(3, totalLevels);
        
        return this.warningLevels.map((percentage, index) => ({
            percentage,
            isCritical: index >= (totalLevels - criticalCount)
        }));
    }

    private initializeListeners(): void {
        // Listen for battery percentage changes
        this.battery.connect('notify::percentage', () => {
            this.handleBatteryChange();
        });

        // Listen for charging state changes
        this.battery.connect('notify::charging', () => {
            this.handleChargingStateChange();
        });

        // Initialize current state
        this.lastPercentage = Math.round(this.battery.percentage * 100);
        this.isCharging = this.battery.charging;
    }

    private handleChargingStateChange(): void {
        const newChargingState = this.battery.charging;
        
        // If we start charging, reset triggered levels
        if (!this.isCharging && newChargingState) {
            this.triggeredLevels.clear();
            console.log("[BatteryWarning] Charging started, reset triggered levels");
        }
        
        this.isCharging = newChargingState;
    }

    private handleBatteryChange(): void {
        if (!this.battery.isPresent) return;

        const currentPercentage = Math.round(this.battery.percentage * 100);
        const isCharging = this.battery.charging;

        console.log(`[BatteryWarning] Battery change: ${currentPercentage}% (was ${this.lastPercentage}%), charging: ${isCharging}`);

        // Only check warnings when:
        // 1. Not charging
        // 2. Battery percentage is decreasing (not increasing or same)
        // 3. We've actually crossed a warning threshold
        if (!isCharging && currentPercentage < this.lastPercentage) {
            this.checkWarningLevels(currentPercentage);
        }

        this.lastPercentage = currentPercentage;
    }

    private checkWarningLevels(currentPercentage: number): void {
        const warningLevels = this.getWarningLevelsWithStatus();
        
        for (const level of warningLevels) {
            // Only trigger warning if:
            // 1. Current percentage is at or below the warning level
            // 2. We haven't already triggered this level
            // 3. Previous percentage was above this level (we just crossed the threshold)
            if (currentPercentage <= level.percentage && 
                !this.triggeredLevels.has(level.percentage) &&
                this.lastPercentage > level.percentage) {
                
                this.triggerBatteryWarning(level, currentPercentage);
                this.triggeredLevels.add(level.percentage);
                console.log(`[BatteryWarning] Added level ${level.percentage}% to triggered levels. Current triggered: [${Array.from(this.triggeredLevels).join(', ')}]`);
            }
        }
    }

    private triggerBatteryWarning(level: BatteryWarningLevel, currentPercentage: number): void {
        console.log(`[BatteryWarning] Triggering ${level.isCritical ? 'critical' : 'normal'} warning at ${currentPercentage}% (threshold: ${level.percentage}%)`);
        
        const widget = PowerAndSystrayOSD({
            level: level,
            currentPercentage: currentPercentage
        });
        
        // Show warning for longer time if critical
        const timeout = level.isCritical ? 6000 : 4000;
        
        BatteryWarningOSDManager.showOSD({
            widget,
            timeout,
            type: 'battery-warning'
        });
    }

    // Public methods for testing
    public getCurrentStatus(): { percentage: number, charging: boolean, levels: BatteryWarningLevel[] } {
        return {
            percentage: Math.round(this.battery.percentage * 100),
            charging: this.battery.charging,
            levels: this.getWarningLevelsWithStatus()
        };
    }

    public resetTriggeredLevels(): void {
        this.triggeredLevels.clear();
        console.log("[BatteryWarning] Manually reset triggered levels");
    }

    public testWarning(level: number, isCritical: boolean = false): void {
        const testLevel: BatteryWarningLevel = { percentage: level, isCritical };
        this.triggerBatteryWarning(testLevel, level);
    }
}

// Export the service instance
export const BatteryWarningService = new BatteryWarningServiceClass();

// Export for use in app.ts
export { BatteryWarningService as batteryWarningListener };
