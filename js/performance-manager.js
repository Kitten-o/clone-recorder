// performance-manager.js - Adaptive Performance System

export class PerformanceManager {
    constructor() {
        this.measuredFPS = 60;
        this.performanceTier = 'high'; // low, medium, high
        this.settings = {
            maxClones: 7,
            segmentationEnabled: true,
            segmentationResolution: 256,
            smokeEffectsEnabled: true,
            frameBufferScale: 1.0
        };
    }

    /**
     * Measure device performance
     */
    async measurePerformance() {
        return new Promise((resolve) => {
            const measurements = [];
            let lastTime = performance.now();
            let frameCount = 0;

            const measure = () => {
                const now = performance.now();
                const delta = now - lastTime;
                lastTime = now;

                if (delta > 0) {
                    measurements.push(1000 / delta);
                }

                frameCount++;

                if (frameCount < 100) {
                    requestAnimationFrame(measure);
                } else {
                    // Calculate average FPS
                    const avgFPS = measurements.reduce((a, b) => a + b, 0) / measurements.length;
                    this.measuredFPS = avgFPS;
                    this.determinePerformanceTier(avgFPS);
                    console.log(`Performance: ${avgFPS.toFixed(1)} FPS - Tier: ${this.performanceTier}`);
                    resolve(avgFPS);
                }
            };

            requestAnimationFrame(measure);
        });
    }

    /**
     * Determine performance tier based on FPS
     */
    determinePerformanceTier(fps) {
        if (fps < 20) {
            this.performanceTier = 'low';
            this.applyLowEndSettings();
        } else if (fps < 35) {
            this.performanceTier = 'medium';
            this.applyMediumSettings();
        } else {
            this.performanceTier = 'high';
            this.applyHighSettings();
        }
    }

    /**
     * Low-end device settings
     */
    applyLowEndSettings() {
        this.settings = {
            maxClones: 1,
            segmentationEnabled: true, // Enable for visibility (essential)
            segmentationResolution: 128, // Very low res
            smokeEffectsEnabled: false, // Disable effects
            frameBufferScale: 0.5 // Half resolution buffers
        };
        console.warn('⚠️ Low performance detected - optimizations applied');
    }

    /**
     * Medium performance settings
     */
    applyMediumSettings() {
        this.settings = {
            maxClones: 3,
            segmentationEnabled: true, // Enable for visibility
            segmentationResolution: 144, // Low resolution for performance
            smokeEffectsEnabled: true,
            frameBufferScale: 0.75
        };
        console.log('📊 Medium performance - balanced settings applied');
    }

    /**
     * High performance settings
     */
    applyHighSettings() {
        this.settings = {
            maxClones: 7,
            segmentationEnabled: true,
            segmentationResolution: 256,
            smokeEffectsEnabled: true,
            frameBufferScale: 1.0 // Full resolution
        };
        console.log('🚀 High performance - full quality enabled');
    }

    /**
     * Get current settings
     */
    getSettings() {
        return { ...this.settings };
    }

    /**
     * Get performance tier
     */
    getTier() {
        return this.performanceTier;
    }

    /**
     * Monitor runtime performance
     */
    monitorRuntime(currentFPS) {
        // If FPS drops below threshold, downgrade settings
        if (currentFPS < 15 && this.performanceTier !== 'low') {
            console.warn('⚠️ FPS dropped to', currentFPS, '- downgrading settings');
            this.performanceTier = 'low';
            this.applyLowEndSettings();
            return true; // Settings changed
        }

        return false; // No change
    }

    /**
     * Get recommended clone count
     */
    getRecommendedCloneCount() {
        return this.settings.maxClones;
    }

    /**
     * Check if segmentation should be enabled
     */
    shouldUseSegmentation() {
        return this.settings.segmentationEnabled;
    }

    /**
     * Get segmentation resolution
     */
    getSegmentationResolution() {
        return this.settings.segmentationResolution;
    }

    /**
     * Check if smoke effects should be enabled
     */
    shouldUseSmokeEffects() {
        return this.settings.smokeEffectsEnabled;
    }

    /**
     * Get frame buffer scale
     */
    getFrameBufferScale() {
        return this.settings.frameBufferScale;
    }
}
