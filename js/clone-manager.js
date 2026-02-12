// clone-manager.js - Clone Positioning and Frame Buffer Management

export class CloneManager {
    constructor() {
        this.clones = [];
        this.maxClones = 5; // Default, will be set based on FPS
        this.frameBuffer = [];
        this.frameBufferSize = 30; // Store last 30 frames
        this.cloneDelay = 10; // Frames behind (8-12)
        this.isActive = false;
        this.useSegmentation = false; // Person-only clones
        this.frameBufferScale = 1.0; // Performance scaling
        this.particlePositions = []; // Track particles for smoke effects
    }

    /**
     * Calculate optimal clone count based on device FPS
     * @param {number} fps - Measured FPS
     */
    setMaxClonesFromFPS(fps) {
        if (fps < 20) {
            this.maxClones = 2;
        } else if (fps < 30) {
            this.maxClones = 3;
        } else if (fps < 45) {
            this.maxClones = 5;
        } else {
            this.maxClones = 7;
        }

        console.log(`Clone limit set to ${this.maxClones} based on ${fps.toFixed(1)} FPS`);
    }

    /**
     * Spawn clones with circular positioning
     * @param {number} centerX - Center X position
     * @param {number} centerY - Center Y position
     * @param {number} count - Number of clones (optional, uses max if not specified)
     */
    spawnClones(centerX, centerY, count = null) {
        const cloneCount = count || this.maxClones;
        this.clones = [];

        // Calculate positions in circular pattern
        const positions = this.calculateCircularPositions(centerX, centerY, cloneCount);

        for (let i = 0; i < cloneCount; i++) {
            this.clones.push({
                id: i,
                x: positions[i].x,
                y: positions[i].y,
                delay: this.cloneDelay + i, // Slightly different delay for variety
                opacity: 1,
                scale: 1,
                animationState: 'spawning',
                animationProgress: 0,
                spawnDelay: i * 300 // Staggered timing (300ms apart)
            });
        }

        this.isActive = true;

        // Store positions for particle effects
        this.particlePositions = positions.map(p => ({ ...p, type: 'spawn' }));

        console.log(`Spawned ${cloneCount} clones`);
        return this.clones;
    }

    /**
     * Calculate circular positions for clones
     */
    calculateCircularPositions(centerX, centerY, count) {
        const positions = [];
        const radius = 150; // Base radius from center
        const angleStep = (2 * Math.PI) / count;

        for (let i = 0; i < count; i++) {
            const angle = i * angleStep;

            // Add random offset for natural look
            const randomOffset = (Math.random() - 0.5) * 40; // ±20px
            const adjustedRadius = radius + randomOffset;

            // Calculate position
            const x = centerX + adjustedRadius * Math.cos(angle);
            const y = centerY + adjustedRadius * Math.sin(angle);

            positions.push({ x, y });
        }

        // Check for collisions and adjust
        return this.resolveCollisions(positions);
    }

    /**
     * Resolve clone position collisions
     */
    resolveCollisions(positions, minDistance = 80) {
        const maxIterations = 10;
        let iteration = 0;

        while (iteration < maxIterations) {
            let hasCollision = false;

            for (let i = 0; i < positions.length; i++) {
                for (let j = i + 1; j < positions.length; j++) {
                    const dx = positions[i].x - positions[j].x;
                    const dy = positions[i].y - positions[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < minDistance) {
                        hasCollision = true;

                        // Push apart
                        const angle = Math.atan2(dy, dx);
                        const pushDistance = (minDistance - distance) / 2;

                        positions[i].x += Math.cos(angle) * pushDistance;
                        positions[i].y += Math.sin(angle) * pushDistance;
                        positions[j].x -= Math.cos(angle) * pushDistance;
                        positions[j].y -= Math.sin(angle) * pushDistance;
                    }
                }
            }

            if (!hasCollision) break;
            iteration++;
        }

        return positions;
    }

    /**
     * Dismiss all clones
     */
    dismissClones() {
        // Set animation state to dismissing
        this.clones.forEach((clone, index) => {
            clone.animationState = 'dismissing';
            clone.animationProgress = 0;
            clone.spawnDelay = index * 300; // Staggered dismiss
        });

        // Store positions for particle effects
        this.particlePositions = this.clones.map(c => ({ x: c.x, y: c.y, type: 'dismiss' }));

        // Will be removed once animation completes
        console.log('Dismissing clones');
    }

    /**
     * Update clone animations
     * @param {number} deltaTime - Time since last frame (ms)
     */
    updateAnimations(deltaTime) {
        this.clones = this.clones.filter(clone => {
            // Update animation progress
            if (clone.animationState === 'spawning' || clone.animationState === 'dismissing') {
                // Wait for stagger delay
                if (clone.spawnDelay > 0) {
                    clone.spawnDelay -= deltaTime;
                    return true; // Keep clone
                }

                // Update progress
                const duration = clone.animationState === 'spawning' ? 1000 : 800;
                clone.animationProgress += deltaTime / duration;

                if (clone.animationProgress >= 1) {
                    if (clone.animationState === 'spawning') {
                        clone.animationState = 'active';
                        clone.animationProgress = 0;
                    } else {
                        // Remove dismissed clone
                        return false;
                    }
                }
            }

            return true; // Keep clone
        });

        // Check if all clones dismissed
        if (this.clones.length === 0) {
            this.isActive = false;
        }
    }

    /**
     * Add frame to buffer
     * @param {HTMLCanvasElement} sourceCanvas - Canvas to copy from
     */
    addFrame(sourceCanvas) {
        // Create a canvas snapshot
        const snapshot = document.createElement('canvas');
        snapshot.width = sourceCanvas.width;
        snapshot.height = sourceCanvas.height;
        const ctx = snapshot.getContext('2d');
        ctx.drawImage(sourceCanvas, 0, 0);

        this.frameBuffer.push(snapshot);

        // Keep only last N frames
        if (this.frameBuffer.length > this.frameBufferSize) {
            this.frameBuffer.shift();
        }
    }

    /**
     * Get delayed frame for a clone
     * @param {number} delay - Frame delay
     * @returns {HTMLCanvasElement|null}
     */
    getDelayedFrame(delay) {
        const index = Math.max(0, this.frameBuffer.length - delay);
        return this.frameBuffer[index] || null;
    }

    /**
     * Get all active clones
     */
    getClones() {
        return this.clones;
    }

    /**
     * Get clone count
     */
    getCloneCount() {
        return this.clones.length;
    }

    /**
     * Check if clones are active
     */
    hasActiveClones() {
        return this.isActive && this.clones.length > 0;
    }

    /**
     * Clear all clones immediately
     */
    clear() {
        this.clones = [];
        this.isActive = false;
        this.frameBuffer = [];
        this.particlePositions = [];
    }

    /**
     * Enable/disable segmentation for person-only clones
     */
    setSegmentation(enabled) {
        this.useSegmentation = enabled;
        console.log('Clone segmentation', enabled ? 'enabled' : 'disabled');
    }

    /**
     * Set frame buffer scale for performance
     */
    setFrameBufferScale(scale) {
        this.frameBufferScale = Math.max(0.25, Math.min(1.0, scale));
        console.log('Frame buffer scale set to', this.frameBufferScale);
    }

    /**
     * Get particle positions for smoke effects
     */
    getParticlePositions() {
        return this.particlePositions;
    }

    /**
     * Clear particle positions after they've been emitted
     */
    clearParticlePositions() {
        this.particlePositions = [];
    }
}
