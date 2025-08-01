import { Variable } from "astal";
import { Gtk } from "astal/gtk4";

export interface OSDContent {
    widget: JSX.Element; // Changed to JSX.Element
    timeout: number;
}

class OSDManagerClass {
    OSDVisible = new Variable(false);
    ODSRevealed = new Variable(false);
    OSDContent = new Variable<OSDContent | null>(null);
    
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
            // true -> false: set revealed first, then visible
            this.ODSRevealed.set(false);
            this.animationTimeout = setTimeout(() => {
                this.OSDVisible.set(false);
                this.hideTimestamp.set(null); // Clear timestamp when manually hidden
                this.isAnimating = false;
                this.animationTimeout = null;
            }, 200);
        }
    }

    handleOSDVisibleAutoHide = () => {
        const currentTime = Date.now();
        const timeout = this.OSDContent.get()?.timeout || 2000;
        const newHideTime = currentTime + timeout;
        
        // Update the hide timestamp (this extends the timer if called again)
        this.hideTimestamp.set(newHideTime);
        
        // Handle different states
        const isVisible = this.OSDVisible.get();
        const isRevealed = this.ODSRevealed.get();
        
        if (!isVisible && !this.isAnimating) {
            // OSD is completely hidden - show it normally
            this.handleOSDVisibleToggle();
        } else if (isVisible && !isRevealed && this.isAnimating) {
            // OSD is in hide animation - interrupt and show again
            if (this.animationTimeout) {
                clearTimeout(this.animationTimeout);
                this.animationTimeout = null;
            }
            
            // Immediately reveal and reset animation state
            this.ODSRevealed.set(true);
            this.isAnimating = false;
        } else if (isVisible && isRevealed) {
            // OSD is fully visible - just update content and timer
            // Content will be updated by showOSD caller
        }
        // If show animation is in progress, let it complete and update timer
    }

    showOSD = (content: OSDContent) => {
        // Check if OSD updates are currently blocked
        if (this.isOSDBlocked()) {
            return; // Don't show OSD when blocked
        }
        
        this.OSDContent.set(content);
        this.handleOSDVisibleAutoHide();
    }

    blockOSDUpdateAutoResume = (duration: number = 1000) => {
        const currentTime = Date.now();
        this.blockUntilTimestamp = currentTime + duration;
        this.isBlocked = true;
        
        console.log(`OSD blocked for ${duration}ms`);
    }

    private isOSDBlocked = (): boolean => {
        if (!this.isBlocked || this.blockUntilTimestamp === null) {
            return false;
        }
        
        const currentTime = Date.now();
        if (currentTime >= this.blockUntilTimestamp) {
            // Block period has expired
            this.isBlocked = false;
            this.blockUntilTimestamp = null;
            console.log("OSD unblocked");
            return false;
        }
        
        return true;
    }

    private startHideTimer = () => {
        // Background thread that checks every 100ms if it's time to hide
        this.hideTimerInterval = setInterval(() => {
            const hideTime = this.hideTimestamp.get();
            
            if (hideTime !== null && Date.now() >= hideTime) {
                // Only hide if not currently animating and OSD is visible
                if (this.OSDVisible.get() && !this.isAnimating) {
                    this.handleOSDVisibleToggle();
                }
                this.hideTimestamp.set(null);
            }
            
            // Also check if we need to unblock OSD updates
            this.isOSDBlocked(); // This will auto-unblock if time has expired
        }, 100);
    }

    // Cleanup method (call when destroying the service)
    destroy = () => {
        if (this.hideTimerInterval) {
            clearInterval(this.hideTimerInterval);
            this.hideTimerInterval = null;
        }
        
        if (this.animationTimeout) {
            clearTimeout(this.animationTimeout);
            this.animationTimeout = null;
        }
    }
}

export const OSDManager = new OSDManagerClass();