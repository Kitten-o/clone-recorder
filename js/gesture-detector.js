// gesture-detector.js - MediaPipe Hands Gesture Recognition

export class GestureDetector {
    constructor() {
        this.hands = null;
        this.onGestureDetected = null;
        this.confidenceThreshold = 0.8;
        this.holdDuration = 500; // ms
        this.cooldownDuration = 2000; // ms
        this.lastGestureTime = 0;
        this.currentGestureStart = null;
        this.currentGestureType = null;
        this.isTracking = false;
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
                maxNumHands: 2,
                modelComplexity: 1,
                minDetectionConfidence: 0.7,
                minTrackingConfidence: 0.7
            });

            // Set up results callback
            this.hands.onResults((results) => this.onResults(results));

            // Manual frame processing loop to avoid camera conflicts
            const processFrame = async () => {
                if (!this.isTracking || !this.hands) return;

                // Only process if video is actually playing and has data
                if (videoElement.readyState >= 2) {
                    try {
                        await this.hands.send({ image: videoElement });
                    } catch (e) {
                        console.error('Hands.send error:', e);
                    }
                }

                requestAnimationFrame(processFrame);
            };

            this.isTracking = true;
            processFrame();

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

        // Check for Shadow Clone Hand Seal (requires 2 hands potentially)
        const isSeal = this.detectShadowCloneSeal(results.multiHandLandmarks);
        if (isSeal) {
            this.handleGestureTracking('spawn');
            return;
        }

        // Check for Dismiss gesture (open palm on any hand)
        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
            if (this.detectOpenPalm(results.multiHandLandmarks[i])) {
                this.handleGestureTracking('dismiss');
                return;
            }
        }

        this.currentGestureStart = null;
        this.currentGestureType = null;
    }

    /**
     * Detect Shadow Clone Hand Seal (Crossed fingers)
     */
    detectShadowCloneSeal(multiLandmarks) {
        // According to PRD, we look for crossed index and middle fingers.
        // If we have two hands, we check if they are close together and forming a cross.
        // For simplicity and based on the PRD snippet, we check if any hand is forming the seal.

        for (const landmarks of multiLandmarks) {
            const indexTip = landmarks[8];
            const middleTip = landmarks[12];
            const indexBase = landmarks[5];
            const middleBase = landmarks[9];

            const dist = (a, b) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

            // Hand scale
            const handScale = dist(landmarks[0], landmarks[9]);

            // Fingers must be extended
            const indexExtended = dist(indexTip, indexBase) > handScale * 0.8;
            const middleExtended = dist(middleTip, middleBase) > handScale * 0.8;

            // Fingers must cross (tips closer than bases)
            const tipDistance = dist(indexTip, middleTip);
            const baseDistance = dist(indexBase, middleBase);
            const isCrossed = tipDistance < baseDistance * 0.5;

            if (indexExtended && middleExtended && isCrossed) {
                return true;
            }
        }

        // Also check interaction between two hands if present
        if (multiLandmarks.length === 2) {
            const h1 = multiLandmarks[0];
            const h2 = multiLandmarks[1];

            const dist = (a, b) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

            // Check if hands are overlapping/crossing
            const center1 = h1[9]; // Middle MCP
            const center2 = h2[9];

            if (dist(center1, center2) < 0.1) { // Close together
                // Simplified: if both have index/middle up and are close, it's likely a seal
                const f1 = this.getFingerStates(h1);
                const f2 = this.getFingerStates(h2);
                if (f1.index && f1.middle && f2.index && f2.middle) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Detect Open Palm for dismissal
     */
    detectOpenPalm(landmarks) {
        const fingers = this.getFingerStates(landmarks);
        return fingers.thumb && fingers.index && fingers.middle && fingers.ring && fingers.pinky;
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

        const dist = (a, b) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

        // Use distance between wrist (0) and middle MCP (9) as hand scale
        const handScale = dist(landmarks[0], landmarks[9]);

        // Check if each finger is extended
        // For thumb, use distance from index MCP
        const thumbTip = landmarks[tips.thumb];
        const indexMCP = landmarks[5];
        const thumbDistance = dist(thumbTip, indexMCP);
        states.thumb = thumbDistance > handScale * 0.6;

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
        this.isTracking = false;
        if (this.hands) {
            this.hands.close();
        }
    }
}
