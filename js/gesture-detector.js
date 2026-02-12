// gesture-detector.js - MediaPipe Hands Gesture Recognition

export class GestureDetector {
    constructor() {
        this.hands = null;
        this.camera = null;
        this.onGestureDetected = null;
        this.confidenceThreshold = 0.8;
        this.holdDuration = 500; // ms
        this.cooldownDuration = 2000; // ms
        this.lastGestureTime = 0;
        this.currentGestureStart = null;
        this.currentGestureType = null;
    }

    /**
     * Initialize MediaPipe Hands
     * @param {HTMLVideoElement} videoElement
     * @param {Function} callback - Called when gesture is detected
     */
    async init(videoElement, callback) {
        this.onGestureDetected = callback;

        try {
            // Initialize MediaPipe Hands
            this.hands = new Hands({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`;
                }
            });

            this.hands.setOptions({
                maxNumHands: 1,
                modelComplexity: 1,
                minDetectionConfidence: 0.7,
                minTrackingConfidence: 0.7
            });

            // Set up results callback
            this.hands.onResults((results) => this.onResults(results));

            // Initialize camera for gesture detection
            this.camera = new Camera(videoElement, {
                onFrame: async () => {
                    await this.hands.send({ image: videoElement });
                },
                width: 320,
                height: 240
            });

            // Start processing
            await this.camera.start();

            console.log('Gesture detector initialized');
        } catch (error) {
            console.error('Failed to initialize gesture detector:', error);
            throw error;
        }
    }

    /**
     * Process MediaPipe results
     */
    onResults(results) {
        if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
            // No hand detected - reset gesture tracking
            this.currentGestureStart = null;
            this.currentGestureType = null;
            return;
        }

        const landmarks = results.multiHandLandmarks[0];
        const handedness = results.multiHandedness[0];

        // Detect gesture type
        const gestureType = this.detectGesture(landmarks, handedness);

        if (gestureType) {
            this.handleGestureTracking(gestureType);
        } else {
            this.currentGestureStart = null;
            this.currentGestureType = null;
        }
    }

    /**
     * Detect gesture from hand landmarks
     * @returns {string|null} - 'spawn', 'dismiss', or null
     */
    detectGesture(landmarks, handedness) {
        const fingers = this.getFingerStates(landmarks);

        // Peace sign (✌️) - Index and middle up, others down
        if (fingers.index && fingers.middle && !fingers.ring && !fingers.pinky) {
            return 'spawn';
        }

        // Closed fist (✊) - All fingers down
        if (!fingers.thumb && !fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky) {
            return 'dismiss';
        }

        return null;
    }

    /**
     * Get finger states (up/down)
     */
    getFingerStates(landmarks) {
        // Finger tip indices
        const tips = {
            thumb: 4,
            index: 8,
            middle: 12,
            ring: 16,
            pinky: 20
        };

        // Finger base/middle indices for comparison
        const bases = {
            thumb: 3,
            index: 6,
            middle: 10,
            ring: 14,
            pinky: 18
        };

        const states = {};

        // Check if each finger is extended (tip higher than base)
        // For thumb, check horizontal distance (x-axis)
        states.thumb = landmarks[tips.thumb].x > landmarks[bases.thumb].x;

        // For other fingers, check vertical distance (y-axis)
        // Note: y is inverted (0 at top, 1 at bottom)
        states.index = landmarks[tips.index].y < landmarks[bases.index].y;
        states.middle = landmarks[tips.middle].y < landmarks[bases.middle].y;
        states.ring = landmarks[tips.ring].y < landmarks[bases.ring].y;
        states.pinky = landmarks[tips.pinky].y < landmarks[bases.pinky].y;

        return states;
    }

    /**
     * Handle gesture tracking with hold duration and cooldown
     */
    handleGestureTracking(gestureType) {
        const now = Date.now();

        // Check cooldown
        if (now - this.lastGestureTime < this.cooldownDuration) {
            return;
        }

        // Start tracking new gesture
        if (this.currentGestureType !== gestureType) {
            this.currentGestureStart = now;
            this.currentGestureType = gestureType;
            return;
        }

        // Check if gesture held long enough
        const holdTime = now - this.currentGestureStart;
        if (holdTime >= this.holdDuration) {
            // Trigger gesture
            if (this.onGestureDetected) {
                this.onGestureDetected(gestureType);
            }

            // Reset and start cooldown
            this.lastGestureTime = now;
            this.currentGestureStart = null;
            this.currentGestureType = null;
        }
    }

    /**
     * Update settings
     */
    setConfidenceThreshold(threshold) {
        this.confidenceThreshold = threshold;
    }

    setHoldDuration(duration) {
        this.holdDuration = duration;
    }

    setCooldownDuration(duration) {
        this.cooldownDuration = duration;
    }

    /**
     * Get current gesture progress (for UI feedback)
     */
    getGestureProgress() {
        if (!this.currentGestureStart || !this.currentGestureType) {
            return { type: null, progress: 0 };
        }

        const elapsed = Date.now() - this.currentGestureStart;
        const progress = Math.min(elapsed / this.holdDuration, 1);

        return {
            type: this.currentGestureType,
            progress
        };
    }

    /**
     * Stop gesture detection
     */
    stop() {
        if (this.camera) {
            this.camera.stop();
        }
        if (this.hands) {
            this.hands.close();
        }
    }
}
