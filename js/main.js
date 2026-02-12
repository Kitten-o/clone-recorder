// main.js - Application Entry Point and Coordination

import { CameraManager } from './camera.js';
import { GestureDetector } from './gesture-detector.js';
import { CloneManager } from './clone-manager.js';
import { EffectRenderer } from './video_effects/effect-renderer.js';
import { VideoRecorder } from './recorder.js';
import { PerformanceManager } from './performance-manager.js';

class CloneRecorderApp {
    constructor() {
        // Core components
        this.camera = new CameraManager();
        this.gestureDetector = new GestureDetector();
        this.cloneManager = new CloneManager();
        this.performanceManager = new PerformanceManager();
        this.renderer = null;
        this.recorder = null;

        // DOM elements
        this.elements = {
            canvas: document.getElementById('mainCanvas'),
            video: document.getElementById('videoPreview'),
            loadingOverlay: document.getElementById('loadingOverlay'),
            loadingMessage: document.getElementById('loadingMessage'),
            recordBtn: document.getElementById('recordBtn'),
            stopBtn: document.getElementById('stopBtn'),
            downloadBtn: document.getElementById('downloadBtn'),
            fpsCounter: document.getElementById('fpsCounter'),
            fpsValue: document.getElementById('fpsValue'),
            cloneCount: document.getElementById('cloneCount'),
            recordingIndicator: document.getElementById('recordingIndicator'),
            recordingTime: document.getElementById('recordingTime'),
            countdownOverlay: document.getElementById('countdownOverlay'),
            countdownNumber: document.getElementById('countdownNumber'),
            helpBtn: document.getElementById('helpBtn'),
            settingsBtn: document.getElementById('settingsBtn'),
            helpModal: document.getElementById('helpModal'),
            settingsModal: document.getElementById('settingsModal')
        };

        // Settings
        this.settings = {
            showFPS: false,
            cloneCountOverride: 0, // 0 = auto
            gestureSensitivity: 0.8,
            enableAudio: false,
            videoQuality: '720'
        };

        // State
        this.isInitialized = false;
        this.isRecording = false;
        this.animationFrameId = null;
        this.measuredFPS = 60;

        // Load settings from localStorage
        this.loadSettings();
    }

    /**
     * Initialize application
     */
    async init() {
        try {
            this.updateLoadingMessage('Requesting camera access...');

            // Initialize camera
            await this.camera.init(this.elements.video);

            // Get video dimensions and resize canvas
            const { width, height } = this.camera.getVideoDimensions();
            console.log(`Canvas using camera resolution: ${width}x${height}`);

            // Initialize renderer
            this.renderer = new EffectRenderer(this.elements.canvas, this.elements.video);
            this.renderer.resize(width, height);

            // Initialize recorder
            this.recorder = new VideoRecorder(this.elements.canvas);
            this.recorder.setEnableAudio(this.settings.enableAudio);

            // Set up recorder callbacks
            this.recorder.onRecordingStart = () => this.onRecordingStart();
            this.recorder.onRecordingStop = (duration) => this.onRecordingStop(duration);
            this.recorder.onTimeUpdate = (duration) => this.updateRecordingTime(duration);

            this.updateLoadingMessage('Initializing gesture detection...');

            // Initialize gesture detector
            await this.gestureDetector.init(
                this.elements.video,
                (gestureType) => this.handleGesture(gestureType)
            );

            this.updateLoadingMessage('Measuring device performance...');

            // Measure performance and get adaptive settings
            await this.performanceManager.measurePerformance();
            const perfSettings = this.performanceManager.getSettings();

            // Apply performance-based settings
            if (this.settings.cloneCountOverride === 0) {
                this.cloneManager.maxClones = perfSettings.maxClones;
                console.log(`Clone limit set to ${perfSettings.maxClones} (${this.performanceManager.getTier()} tier)`);
            } else {
                this.cloneManager.maxClones = this.settings.cloneCountOverride;
            }

            // Apply frame buffer scaling for performance
            this.cloneManager.setFrameBufferScale(perfSettings.frameBufferScale);

            // Set up event listeners
            this.setupEventListeners();

            // Start render loop
            this.startRenderLoop();

            // Hide loading overlay
            this.hideLoading();

            // Enable record button
            this.elements.recordBtn.disabled = false;

            this.isInitialized = true;
            console.log('App initialized successfully');

        } catch (error) {
            console.error('Initialization failed:', error);
            this.updateLoadingMessage(`Error: ${error.message}`);
            setTimeout(() => {
                alert(`Failed to initialize: ${error.message}\n\nPlease refresh and try again.`);
            }, 100);
        }
    }

    /**
     * Measure performance and apply settings
     */
    async measurePerformance() {
        // Measure performance and get adaptive settings
        await this.performanceManager.measurePerformance();
        const perfSettings = this.performanceManager.getSettings();

        // Apply performance-based settings
        if (this.settings.cloneCountOverride === 0) {
            this.cloneManager.maxClones = perfSettings.maxClones;
            console.log(`Clone limit set to ${perfSettings.maxClones} (${this.performanceManager.getTier()} tier)`);
        } else {
            this.cloneManager.maxClones = this.settings.cloneCountOverride;
        }

        // Apply frame buffer scaling for performance
        this.cloneManager.setFrameBufferScale(perfSettings.frameBufferScale);

        // Enable segmentation if high/medium tier
        this.cloneManager.setSegmentation(perfSettings.segmentationEnabled);

        this.setupEventListeners();
        this.startRenderLoop();
    }
    startRenderLoop() {
        const render = () => {
            this.renderer.render(this.cloneManager);

            // Update FPS display
            if (this.settings.showFPS) {
                this.elements.fpsValue.textContent = `${Math.round(this.renderer.getFPS())} FPS`;
            }

            // Update clone count
            const count = this.cloneManager.getCloneCount();
            this.elements.cloneCount.querySelector('strong').textContent = count;

            this.animationFrameId = requestAnimationFrame(render);
        };

        render();
    }

    /**
     * Handle gesture detection
     */
    handleGesture(gestureType) {
        console.log('Gesture detected:', gestureType);

        if (gestureType === 'spawn') {
            this.spawnClones();
        } else if (gestureType === 'dismiss') {
            this.dismissClones();
        }
    }

    /**
     * Spawn clones
     */
    spawnClones() {
        const centerX = this.elements.canvas.width / 2;
        const centerY = this.elements.canvas.height / 2;

        const count = this.settings.cloneCountOverride || this.cloneManager.maxClones;
        this.cloneManager.spawnClones(centerX, centerY, count);

        console.log(`Spawned ${count} clones`);
    }

    /**
     * Dismiss clones
     */
    dismissClones() {
        if (!this.cloneManager.hasActiveClones()) {
            console.log('No clones to dismiss');
            return;
        }

        this.cloneManager.dismissClones();
        console.log('Dismissing clones');
    }

    /**
     * Start recording with countdown
     */
    async startRecording() {
        if (this.isRecording) return;

        // Disable record button
        this.elements.recordBtn.disabled = true;

        try {
            // Get adaptive FPS based on performance
            const perfTier = this.performanceManager.getTier();
            const targetFPS = perfTier === 'low' ? 15 : perfTier === 'medium' ? 30 : 30;

            // Start recording with countdown and adaptive settings
            await this.recorder.startWithCountdown(targetFPS, (count) => {
                this.showCountdown(count);
            }, perfTier);

            this.hideCountdown();

        } catch (error) {
            console.error('Recording failed:', error);
            alert('Failed to start recording: ' + error.message);
            this.elements.recordBtn.disabled = false;
        }
    }

    /**
     * Recording started callback
     */
    onRecordingStart() {
        this.isRecording = true;
        this.elements.recordBtn.classList.add('hidden');
        this.elements.stopBtn.classList.remove('hidden');
        this.elements.stopBtn.disabled = false;
        this.elements.recordingIndicator.classList.remove('hidden');
    }

    /**
     * Stop recording
     */
    stopRecording() {
        if (!this.isRecording) return;

        this.recorder.stop();
        this.elements.stopBtn.disabled = true;
    }

    /**
     * Recording stopped callback
     */
    onRecordingStop(duration) {
        this.isRecording = false;
        this.elements.stopBtn.classList.add('hidden');
        this.elements.recordBtn.classList.remove('hidden');
        this.elements.recordBtn.disabled = false;
        this.elements.recordingIndicator.classList.add('hidden');
        this.elements.downloadBtn.classList.remove('hidden');

        console.log(`Recording complete: ${VideoRecorder.formatDuration(duration)}`);
    }

    /**
     * Download recorded video
     */
    downloadVideo() {
        this.recorder.download('clone-recorder');
        this.recorder.clear();
        this.elements.downloadBtn.classList.add('hidden');
    }

    /**
     * Update recording time display
     */
    updateRecordingTime(duration) {
        this.elements.recordingTime.textContent = VideoRecorder.formatDuration(duration);
    }

    /**
     * Show countdown overlay
     */
    showCountdown(number) {
        this.elements.countdownNumber.textContent = number;
        this.elements.countdownOverlay.classList.remove('hidden');
    }

    /**
     * Hide countdown overlay
     */
    hideCountdown() {
        this.elements.countdownOverlay.classList.add('hidden');
    }

    /**
     * Set up UI event listeners
     */
    setupEventListeners() {
        // Recording controls
        this.elements.recordBtn.addEventListener('click', () => this.startRecording());
        this.elements.stopBtn.addEventListener('click', () => this.stopRecording());
        this.elements.downloadBtn.addEventListener('click', () => this.downloadVideo());

        // Modal controls
        this.elements.helpBtn.addEventListener('click', () => this.showModal('helpModal'));
        this.elements.settingsBtn.addEventListener('click', () => this.showModal('settingsModal'));

        // Close buttons
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = e.target.dataset.modal;
                this.hideModal(modalId);
            });
        });

        // Click outside modal to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        });

        // Settings controls
        document.getElementById('cloneCountOverride').addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.settings.cloneCountOverride = value;
            document.getElementById('cloneCountValue').textContent = value === 0 ? 'Auto' : value;
            this.saveSettings();

            if (value > 0) {
                this.cloneManager.maxClones = value;
            }
        });

        document.getElementById('gestureSensitivity').addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.settings.gestureSensitivity = value;
            document.getElementById('sensitivityValue').textContent = value.toFixed(1);
            this.gestureDetector.setConfidenceThreshold(value);
            this.saveSettings();
        });

        document.getElementById('showFPS').addEventListener('change', (e) => {
            this.settings.showFPS = e.target.checked;
            this.elements.fpsCounter.classList.toggle('hidden', !e.target.checked);
            this.saveSettings();
        });

        document.getElementById('enableAudio').addEventListener('change', (e) => {
            this.settings.enableAudio = e.target.checked;
            this.recorder.setEnableAudio(e.target.checked);
            this.saveSettings();
        });

        document.getElementById('videoQuality').addEventListener('change', async (e) => {
            this.settings.videoQuality = e.target.value;
            this.saveSettings();

            // Update camera quality
            await this.camera.setQuality(e.target.value);

            // Resize canvas to fullscreen
            const width = window.innerWidth;
            const height = window.innerHeight;
            this.renderer.resize(width, height);
        });
    }

    /**
     * Show modal
     */
    showModal(modalId) {
        document.getElementById(modalId).classList.remove('hidden');
    }

    /**
     * Hide modal
     */
    hideModal(modalId) {
        document.getElementById(modalId).classList.add('hidden');
    }

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        localStorage.setItem('cloneRecorderSettings', JSON.stringify(this.settings));
    }

    /**
     * Load settings from localStorage
     */
    loadSettings() {
        const saved = localStorage.getItem('cloneRecorderSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
            console.log('Settings loaded:', this.settings);
        }
    }

    /**
     * Update loading message
     */
    updateLoadingMessage(message) {
        this.elements.loadingMessage.textContent = message;
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        setTimeout(() => {
            this.elements.loadingOverlay.classList.add('hidden');
        }, 500);
    }

    /**
     * Clean up resources
     */
    destroy() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }

        this.camera.stop();
        this.gestureDetector.stop();
        this.cloneManager.clear();
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const app = new CloneRecorderApp();
        app.init();

        // Expose to window for debugging
        window.cloneRecorder = app;
    });
} else {
    const app = new CloneRecorderApp();
    app.init();
    window.cloneRecorder = app;
}
