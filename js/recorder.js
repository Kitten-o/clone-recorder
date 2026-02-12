// recorder.js - Video Recording with MediaRecorder

export class VideoRecorder {
    constructor(canvas) {
        this.canvas = canvas;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
        this.startTime = null;
        this.recordingDuration = 0;
        this.onRecordingStart = null;
        this.onRecordingStop = null;
        this.onTimeUpdate = null;
        this.enableAudio = false;
    }

    /**
     * Check MediaRecorder support
     */
    static isSupported() {
        return 'MediaRecorder' in window;
    }

    /**
     * Get supported MIME types
     */
    static getSupportedMimeType() {
        const types = [
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm',
            'video/mp4'
        ];

        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                console.log('Using MIME type:', type);
                return type;
            }
        }

        return 'video/webm'; // Fallback
    }

    /**
     * Start recording with countdown
     * @param {number} fps - Frame rate (default 30)
     * @param {Function} countdownCallback - Called with countdown number
     * @param {string} performanceTier - Device performance tier
     */
    async startWithCountdown(fps = 30, countdownCallback, performanceTier = 'high') {
        // 3-2-1 countdown
        for (let i = 3; i > 0; i--) {
            if (countdownCallback) {
                countdownCallback(i);
            }
            await this.sleep(1000);
        }

        // Start recording with adaptive settings
        return this.start(fps, performanceTier);
    }

    /**
     * Start recording
     * @param {number} fps - Frame rate
     */
    start(fps = 30, performanceTier = 'high') {
        if (this.isRecording) {
            console.warn('Already recording');
            return;
        }

        try {
            // Get canvas stream
            const stream = this.canvas.captureStream(fps);

            // TODO: Add audio stream if enabled
            // if (this.enableAudio) {
            //     // Add microphone audio
            // }

            // Create MediaRecorder with adaptive bitrate
            const mimeType = VideoRecorder.getSupportedMimeType();
            const bitrate = this.getAdaptiveBitrate(performanceTier, fps);
            const options = {
                mimeType,
                videoBitsPerSecond: bitrate
            };

            console.log(`Recording: ${fps} FPS @ ${(bitrate / 1000000).toFixed(1)} Mbps (${performanceTier} tier)`);

            this.mediaRecorder = new MediaRecorder(stream, options);
            this.recordedChunks = [];

            // Set up event handlers
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                console.log('Recording stopped');
                this.isRecording = false;

                if (this.onRecordingStop) {
                    this.onRecordingStop(this.recordingDuration);
                }
            };

            this.mediaRecorder.onerror = (error) => {
                console.error('MediaRecorder error:', error);
            };

            // Start recording
            this.mediaRecorder.start(100); // Collect data every 100ms
            this.isRecording = true;
            this.startTime = Date.now();

            // Start duration timer
            this.startDurationTimer();

            console.log('Recording started');

            if (this.onRecordingStart) {
                this.onRecordingStart();
            }

        } catch (error) {
            console.error('Failed to start recording:', error);
            throw error;
        }
    }

    /**
     * Get adaptive bitrate based on performance tier
     * Optimized for file size while maintaining quality
     */
    getAdaptiveBitrate(tier, fps) {
        // Bitrate targets (bits per second)
        const bitrateTable = {
            'low': {
                15: 1500000,  // 1.5 Mbps @ 15 FPS
                30: 2500000   // 2.5 Mbps @ 30 FPS
            },
            'medium': {
                30: 4000000,  // 4 Mbps @ 30 FPS
                60: 6000000   // 6 Mbps @ 60 FPS
            },
            'high': {
                30: 6000000,  // 6 Mbps @ 30 FPS
                60: 8000000   // 8 Mbps @ 60 FPS
            }
        };

        const tierTable = bitrateTable[tier] || bitrateTable['medium'];

        // Find closest FPS match
        const availableFPS = Object.keys(tierTable).map(Number).sort((a, b) => a - b);
        let selectedFPS = availableFPS[0];

        for (const availFPS of availableFPS) {
            if (fps >= availFPS) {
                selectedFPS = availFPS;
            }
        }

        return tierTable[selectedFPS];
    }

    /**
     * Update recording duration timer
     */
    startDurationTimer() {
        const updateInterval = setInterval(() => {
            if (!this.isRecording) {
                clearInterval(updateInterval);
                return;
            }

            this.recordingDuration = Date.now() - this.startTime;

            if (this.onTimeUpdate) {
                this.onTimeUpdate(this.recordingDuration);
            }
        }, 100);
    }

    /**
     * Stop recording
     */
    stop() {
        if (!this.isRecording) {
            console.warn('Not recording');
            return;
        }

        this.mediaRecorder.stop();
        console.log('Stopping recording...');
    }

    /**
     * Get recorded video as Blob
     */
    getBlob() {
        if (this.recordedChunks.length === 0) {
            console.warn('No recorded data');
            return null;
        }

        const mimeType = VideoRecorder.getSupportedMimeType();
        const blob = new Blob(this.recordedChunks, { type: mimeType });

        console.log(`Video blob created: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
        return blob;
    }

    /**
     * Download recorded video
     * @param {string} filename - File name for download
     */
    download(filename = 'clone-recording') {
        const blob = this.getBlob();
        if (!blob) return;

        // Determine file extension from MIME type
        const mimeType = blob.type;
        let extension = 'webm';
        if (mimeType.includes('mp4')) {
            extension = 'mp4';
        }

        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}-${Date.now()}.${extension}`;
        a.click();

        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 100);

        console.log('Video download initiated');
    }

    /**
     * Get video URL for preview
     */
    getVideoURL() {
        const blob = this.getBlob();
        if (!blob) return null;

        return URL.createObjectURL(blob);
    }

    /**
     * Clear recorded data
     */
    clear() {
        this.recordedChunks = [];
        this.recordingDuration = 0;
        this.startTime = null;
    }

    /**
     * Format duration as MM:SS
     */
    static formatDuration(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    /**
     * Utility: Sleep function
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Set audio recording
     */
    setEnableAudio(enabled) {
        this.enableAudio = enabled;
    }
}
