// camera.js - Camera Access and Stream Management

export class CameraManager {
    constructor() {
        this.stream = null;
        this.videoElement = null;
        this.constraints = {
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            },
            audio: false
        };
    }

    /**
     * Initialize camera access
     * @param {HTMLVideoElement} videoElement - Video element to attach stream
     * @returns {Promise<MediaStream>}
     */
    async init(videoElement) {
        this.videoElement = videoElement;

        try {
            // Check if getUserMedia is supported
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera API not supported in this browser');
            }

            // Request camera access
            this.stream = await navigator.mediaDevices.getUserMedia(this.constraints);

            // Attach stream to video element
            this.videoElement.srcObject = this.stream;

            // Wait for video metadata to load
            await new Promise((resolve) => {
                this.videoElement.onloadedmetadata = resolve;
            });

            // Play the video
            await this.videoElement.play();

            console.log('Camera initialized successfully');
            console.log('Video dimensions:', videoElement.videoWidth, 'x', videoElement.videoHeight);

            return this.stream;
        } catch (error) {
            console.error('Camera initialization failed:', error);
            throw this.handleCameraError(error);
        }
    }

    /**
     * Handle camera errors with user-friendly messages
     */
    handleCameraError(error) {
        let message = 'Failed to access camera: ';

        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            message += 'Permission denied. Please allow camera access in your browser settings.';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            message += 'No camera found on this device.';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            message += 'Camera is already in use by another application.';
        } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
            message += 'Camera does not support the requested resolution.';
        } else {
            message += error.message || 'Unknown error occurred.';
        }

        return new Error(message);
    }

    /**
     * Update video quality settings
     * @param {string} quality - '480', '720', or '1080'
     */
    async setQuality(quality) {
        const qualityMap = {
            '480': { width: 854, height: 480 },
            '720': { width: 1280, height: 720 },
            '1080': { width: 1920, height: 1080 }
        };

        const resolution = qualityMap[quality] || qualityMap['720'];
        this.constraints.video.width = { ideal: resolution.width };
        this.constraints.video.height = { ideal: resolution.height };

        // Restart stream with new constraints
        if (this.stream) {
            await this.stop();
            await this.init(this.videoElement);
        }
    }

    /**
     * Switch camera (front/back on mobile)
     */
    async switchCamera() {
        const currentFacingMode = this.constraints.video.facingMode;
        this.constraints.video.facingMode = currentFacingMode === 'user' ? 'environment' : 'user';

        if (this.stream) {
            await this.stop();
            await this.init(this.videoElement);
        }
    }

    /**
     * Get video dimensions
     */
    getVideoDimensions() {
        if (!this.videoElement) return { width: 0, height: 0 };
        return {
            width: this.videoElement.videoWidth,
            height: this.videoElement.videoHeight
        };
    }

    /**
     * Stop camera stream
     */
    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        if (this.videoElement) {
            this.videoElement.srcObject = null;
        }

        console.log('Camera stopped');
    }

    /**
     * Check if camera is active
     */
    isActive() {
        return this.stream !== null && this.stream.active;
    }
}
