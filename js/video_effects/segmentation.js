// segmentation.js - Person Segmentation using MediaPipe

export class SegmentationManager {
    constructor() {
        this.selfieSegmentation = null;
        this.segmentationMask = null;
        this.enabled = true;
        this.resolution = 256; // Default resolution
        this.frameSkip = 2; // Process every Nth frame for performance
        this.frameCount = 0;
        this.isProcessing = false;
    }

    /**
     * Initialize MediaPipe Selfie Segmentation
     */
    async init(videoElement, resolution = 256) {
        this.resolution = resolution;

        // Import MediaPipe Selfie Segmentation
        const { SelfieSegmentation } = await import('https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js');

        this.selfieSegmentation = new SelfieSegmentation({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
            }
        });

        // Configure for performance
        this.selfieSegmentation.setOptions({
            modelSelection: 0, // 0 = general (faster), 1 = landscape (more accurate)
            selfieMode: true
        });

        // Set up results callback
        this.selfieSegmentation.onResults((results) => {
            this.onResults(results);
        });

        console.log(`Segmentation initialized at ${resolution}x${resolution}`);
    }

    /**
     * Process segmentation results
     */
    onResults(results) {
        if (results.segmentationMask) {
            this.segmentationMask = results.segmentationMask;
            this.isProcessing = false;
        }
    }

    /**
     * Process video frame for segmentation
     */
    async processFrame(videoElement) {
        if (!this.enabled || !this.selfieSegmentation) {
            return;
        }

        // Skip frames for performance
        this.frameCount++;
        if (this.frameCount % this.frameSkip !== 0) {
            return;
        }

        // Don't process if already processing
        if (this.isProcessing) {
            return;
        }

        this.isProcessing = true;

        try {
            // Send to MediaPipe at lower resolution
            await this.selfieSegmentation.send({ image: videoElement });
        } catch (error) {
            console.error('Segmentation error:', error);
            this.isProcessing = false;
        }
    }

    /**
     * Get current segmentation mask
     */
    getMask() {
        return this.segmentationMask;
    }

    /**
     * Apply person mask to a canvas
     */
    applyMask(sourceCanvas, destCanvas) {
        if (!this.segmentationMask) {
            // No mask yet, just copy canvas
            const ctx = destCanvas.getContext('2d');
            ctx.drawImage(sourceCanvas, 0, 0);
            return;
        }

        const ctx = destCanvas.getContext('2d');
        const width = destCanvas.width;
        const height = destCanvas.height;

        // Draw source
        ctx.drawImage(sourceCanvas, 0, 0, width, height);

        // Get image data
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Create temporary canvas for mask
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = this.segmentationMask.width;
        maskCanvas.height = this.segmentationMask.height;
        const maskCtx = maskCanvas.getContext('2d');
        maskCtx.drawImage(this.segmentationMask, 0, 0);
        const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height).data;

        // Apply mask (make background transparent)
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;

                // Sample mask (scale coordinates)
                const maskX = Math.floor(x * maskCanvas.width / width);
                const maskY = Math.floor(y * maskCanvas.height / height);
                const maskI = (maskY * maskCanvas.width + maskX) * 4;

                // Use mask value for alpha (0 = background, 255 = person)
                const maskValue = maskData[maskI];
                data[i + 3] = maskValue; // Set alpha channel
            }
        }

        // Put modified data back
        ctx.putImageData(imageData, 0, 0);
    }

    /**
     * Create person-only canvas from source
     */
    createPersonCanvas(sourceCanvas) {
        const personCanvas = document.createElement('canvas');
        personCanvas.width = sourceCanvas.width;
        personCanvas.height = sourceCanvas.height;

        this.applyMask(sourceCanvas, personCanvas);
        return personCanvas;
    }

    /**
     * Enable/disable segmentation
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        console.log('Segmentation', enabled ? 'enabled' : 'disabled');
    }

    /**
     * Set frame skip for performance
     */
    setFrameSkip(skip) {
        this.frameSkip = skip;
    }

    /**
     * Set resolution
     */
    setResolution(resolution) {
        this.resolution = resolution;
    }

    /**
     * Clean up
     */
    dispose() {
        if (this.selfieSegmentation) {
            this.selfieSegmentation.close();
        }
    }
}
