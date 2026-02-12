// segmentation.js - Person Segmentation using TensorFlow.js BodyPix

export class SegmentationManager {
    constructor() {
        this.bodyPixModel = null;
        this.segmentationMask = null;
        this.enabled = true;
        this.resolution = 256;
        this.frameSkip = 2;
        this.frameCount = 0;
        this.isProcessing = false;
        this.isInitialized = false;
    }

    /**
     * Initialize TensorFlow.js BodyPix
     */
    async init(videoElement, resolution = 256) {
        this.resolution = resolution;

        try {
            // Load BodyPix from CDN
            if (!window.bodyPix) {
                console.error('BodyPix not loaded. Make sure to include the script tag.');
                return;
            }

            console.log('Loading BodyPix model...');

            // Load model with performance settings
            this.bodyPixModel = await window.bodyPix.load({
                architecture: 'MobileNetV1',
                outputStride: 16,
                multiplier: 0.75,
                quantBytes: 2
            });

            this.isInitialized = true;
            console.log(`BodyPix initialized at ${resolution}x${resolution}`);
        } catch (error) {
            console.error('BodyPix initialization failed:', error);
            this.isInitialized = false;
        }
    }

    /**
     * Process video frame for segmentation
     */
    async processFrame(videoElement) {
        if (!this.enabled || !this.isInitialized || !this.bodyPixModel) {
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
            // Segment person from background
            const segmentation = await this.bodyPixModel.segmentPerson(videoElement, {
                flipHorizontal: false,
                internalResolution: 'medium',
                segmentationThreshold: 0.7
            });

            this.segmentationMask = segmentation;
            this.isProcessing = false;
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
        if (!this.segmentationMask || !this.segmentationMask.data) {
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

        // Get mask data
        const maskData = this.segmentationMask.data;
        const maskWidth = this.segmentationMask.width;
        const maskHeight = this.segmentationMask.height;

        // Apply mask (make background transparent)
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;

                // Sample mask (scale coordinates)
                const maskX = Math.floor(x * maskWidth / width);
                const maskY = Math.floor(y * maskHeight / height);
                const maskI = maskY * maskWidth + maskX;

                // Use mask value for alpha (0 = background, 1 = person)
                const maskValue = maskData[maskI];
                data[i + 3] = maskValue === 1 ? 255 : 0; // Set alpha channel
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
        if (this.bodyPixModel) {
            this.bodyPixModel.dispose();
        }
    }
}
