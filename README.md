# Clone Recorder 🎥✨

A futuristic web application that lets you create cinematic "clone" effects using simple hand gestures. Built with vanilla JavaScript, MediaPipe, and performance-optimized rendering.

![App Icon](assets/icons/icon-192.png)

## 🌟 Features

- **Gesture Control**: Use **Peace Sign ✌️** to spawn clones and **Fist ✊** to dismiss them.
- **Solid Clones**: Advanced segmentation rendering to make clones appear solid and *behind* you.
- **Adaptive Performance**: Automatically adjusts quality (FPS, resolution, clone count) based on your device's speed.
- **Smart Recording**: records high-quality video with adaptive bitrate to keep file sizes small.
- **PWA Ready**: Installable on mobile and desktop with offline support.
- **Privacy First**: All processing happens locally on your device.

## 🚀 Optimized for All Devices

The app detects your device's capabilities on startup:
- **High-End:** 7 simultaneous clones, High-Res, 60fps
- **Mid-Range:** 3 clones, Balanced settings
- **Low-End:** 1 clone, Optimized settings for smooth playback

## 🛠️ Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Kitten-o/clone-recorder.git
   ```

2. Serve the directory using any static file server.
   **Using Python (Pre-installed on macOS/Linux):**
   ```bash
   cd clone-recorder
   python3 -m http.server 8000
   ```
   **Using Node.js:**
   ```bash
   npx serve .
   ```

3. Open `http://localhost:8000` in Chrome or Edge.

## 📱 Mobile Usage

1. Open the URL on your mobile browser.
2. Tap **Share** (iOS) or **Menu** (Android).
3. Select **"Add to Home Screen"**.
4. Launch the app like a native application!

## 🧪 Technologies

- **MediaPipe**: For hand gesture recognition and selfie segmentation.
- **HTML5 Canvas**: For high-performance compositing and rendering.
- **Web Workers**: For smooth background processing (planned).
- **Service Workers**: For offline PWA functionality.

## 📄 License

MIT License - feel free to use and modify!
