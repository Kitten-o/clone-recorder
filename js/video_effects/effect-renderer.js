// effect-renderer.js - Canvas Rendering and Effects

export class EffectRenderer {
    constructor(canvas, videoElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.videoElement = videoElement;
        this.frameCount = 0;
        this.lastFrameTime = performance.now();
        this.fps = 60;
    }

    /**
     * Resize canvas to match video dimensions
     */
    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        console.log(`Canvas resized to ${width}x${height}`);
    }

    /**
     * Main render loop
     * @param {CloneManager} cloneManager
     */
    render(cloneManager) {
        const now = performance.now();
        const deltaTime = now - this.lastFrameTime;
        this.lastFrameTime = now;

        // Update FPS counter
        if (deltaTime > 0) {
            this.fps = 1000 / deltaTime;
        }

        // Update clone animations
        cloneManager.updateAnimations(deltaTime);

        // Clear canvas
        this.ctx.fillStyle = '#0f0f1e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw clones FIRST (behind the user)
        if (cloneManager.hasActiveClones()) {
            this.drawClones(cloneManager);
        }

        // Draw main video feed LAST (on top, in front)
        this.drawVideoFullScreen();

        // Capture current frame for buffer AFTER drawing everything
        cloneManager.addFrame(this.canvas);

        this.frameCount++;
    }

    /**
     * Draw video filling entire canvas
     */
    drawVideoFullScreen() {
        if (!this.videoElement.videoWidth) return;

        // Draw video to fill entire canvas
        this.ctx.drawImage(
            this.videoElement,
            0, 0,
            this.videoElement.videoWidth,
            this.videoElement.videoHeight,
            0, 0,
            this.canvas.width,
            this.canvas.height
        );
    }

    /**
     * Draw video at specified position (for clones)
     */
    drawVideo(x, y, scale, opacity) {
        if (!this.videoElement.videoWidth) return;

        this.ctx.save();
        this.ctx.globalAlpha = opacity;
        this.ctx.translate(x, y);
        this.ctx.scale(scale, scale);

        // Draw centered
        const w = this.canvas.width;
        const h = this.canvas.height;
        this.ctx.drawImage(this.videoElement, -w / 2, -h / 2, w, h);

        this.ctx.restore();
    }

    /**
     * Draw all clones with effects
     */
    drawClones(cloneManager) {
        const clones = cloneManager.getClones();

        for (const clone of clones) {
            this.drawClone(clone, cloneManager);
        }
    }

    /**
     * Draw individual clone
     */
    drawClone(clone, cloneManager) {
        // Get delayed frame (canvas element)
        const delayedFrame = cloneManager.getDelayedFrame(clone.delay);
        if (!delayedFrame) return;

        this.ctx.save();

        // Calculate animation effects
        let opacity = clone.opacity;
        let scale = clone.scale;
        let clipY = 0;
        let clipHeight = 1;

        // Spawn animation - bottom to top reveal
        if (clone.animationState === 'spawning') {
            const progress = this.easeInOutCubic(clone.animationProgress);

            // Bottom-to-top reveal
            clipY = 1 - progress;
            clipHeight = progress;

            // Scale pop at end
            if (progress > 0.8) {
                const popProgress = (progress - 0.8) / 0.2;
                scale = 0.95 + (0.05 * this.easeOutBack(popProgress));
            } else {
                scale = 0.95;
            }

            opacity = Math.min(progress * 1.5, 1);
        }

        // Dismiss animation - top to bottom fade
        if (clone.animationState === 'dismissing') {
            const progress = this.easeInOutCubic(clone.animationProgress);

            // Top-to-bottom fade
            clipHeight = 1 - progress;
            opacity = 1 - progress;
        }

        // Apply transformations
        this.ctx.globalAlpha = opacity * 0.8; // Clones slightly transparent
        this.ctx.translate(clone.x, clone.y);
        this.ctx.scale(scale * 0.5, scale * 0.5); // Make clones smaller (50% of main)

        // Create clipping region for reveal effect
        const cloneWidth = this.canvas.width;
        const cloneHeight = this.canvas.height;

        this.ctx.beginPath();
        this.ctx.rect(
            -cloneWidth / 2,
            -cloneHeight / 2 + (cloneHeight * clipY),
            cloneWidth,
            cloneHeight * clipHeight
        );
        this.ctx.clip();

        // Draw delayed frame using drawImage (works with transformations)
        this.ctx.drawImage(
            delayedFrame,
            -cloneWidth / 2,
            -cloneHeight / 2,
            cloneWidth,
            cloneHeight
        );

        this.ctx.restore();

        // TODO: Draw smoke effect (Phase 3)
        // this.drawSmokeEffect(clone);
    }

    /**
     * Easing functions
     */
    easeInOutCubic(t) {
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    easeOutBack(t) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }

    /**
     * Get current FPS
     */
    getFPS() {
        return this.fps;
    }

    /**
     * Get canvas stream for recording
     */
    getStream(frameRate = 30) {
        return this.canvas.captureStream(frameRate);
    }

    /**
     * Clear canvas
     */
    clear() {
        this.ctx.fillStyle = '#0f0f1e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
}
