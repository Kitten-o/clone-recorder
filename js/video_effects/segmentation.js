// segmentation.js - Person Segmentation using TensorFlow.js BodyPix

export class SegmentationManager {
    constructor() {
        this.bodyPixModel = null;
        this.segmentationMask = null;
        this.maskCanvas = document.createElement('canvas');
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
     * Apply person mask to a canvas using globalCompositeOperation (optimized)
     */
    applyMask(sourceCanvas, destCanvas) {
        const ctx = destCanvas.getContext('2d');
        const width = destCanvas.width;
        const height = destCanvas.height;

        if (!this.segmentationMask || !this.segmentationMask.data) {
            // No mask yet, just copy canvas
            ctx.drawImage(sourceCanvas, 0, 0, width, height);
            return;
        }

        // 1. Prepare mask canvas
        const maskWidth = this.segmentationMask.width;
        const maskHeight = this.segmentationMask.height;

        if (this.maskCanvas.width !== maskWidth || this.maskCanvas.height !== maskHeight) {
            this.maskCanvas.width = maskWidth;
            this.maskCanvas.height = maskHeight;
        }

        const maskCtx = this.maskCanvas.getContext('2d');
        const maskImageData = maskCtx.createImageData(maskWidth, maskHeight);
        const maskData = this.segmentationMask.data;

        // Fill alpha channel of mask canvas
        for (let i = 0; i < maskData.length; i++) {
            const val = maskData[i] === 1 ? 255 : 0;
            const j = i * 4;
            // Red, Green, Blue don't matter for destination-in alpha mask
            maskImageData.data[j+3] = val;
        }
        maskCtx.putImageData(maskImageData, 0, 0);

        // 2. Draw source and apply mask
        ctx.save();
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(sourceCanvas, 0, 0, width, height);

        // Use globalCompositeOperation to mask the already drawn source
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(this.maskCanvas, 0, 0, width, height);
        ctx.restore();
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
