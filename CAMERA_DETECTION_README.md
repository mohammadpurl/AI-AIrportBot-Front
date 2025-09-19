# Camera Detection Feature

## Overview
This feature automatically starts the audio session when someone stands in front of the device for more than 3 seconds using the connected camera.

## Features

### Automatic Session Start
- **Motion Detection**: Uses camera to detect movement in front of the device
- **Skin Tone Detection**: Additional detection based on skin tone patterns
- **3-Second Timer**: Automatically starts audio session after 3 seconds of continuous detection
- **Visual Feedback**: Shows detection status and countdown timer

### User Interface
- **Detection Status Indicator**: Shows real-time detection status (green/red dot)
- **Progress Bar**: Visual countdown showing time until auto-start
- **Toggle Control**: Enable/disable auto-detection feature
- **Notification**: Pop-up notification when session auto-starts

### Technical Implementation
- **Motion Analysis**: Compares consecutive video frames to detect movement
- **Skin Tone Recognition**: Simple RGB-based skin tone detection
- **Performance Optimized**: Runs detection every 500ms to balance accuracy and performance
- **Memory Efficient**: Proper cleanup of video streams and timers

## Usage

### Enabling the Feature
1. The feature is enabled by default
2. Use the "Auto Detection" toggle in the UI to enable/disable
3. Camera permissions will be requested when first enabled

### How It Works
1. Camera starts monitoring when feature is enabled and no session is active
2. Detects motion and skin tone patterns in the camera feed
3. Counts continuous detection time
4. Automatically starts audio session after 3 seconds
5. Shows notification confirming auto-start
6. Stops detection once session is active

### Detection Algorithm
- **Motion Detection**: Compares pixel differences between consecutive frames
- **Threshold**: 30 RGB value difference threshold
- **Minimum Motion**: 0.5% of pixels must show motion
- **Skin Tone Detection**: RGB values within human skin tone ranges
- **Combined Logic**: Person detected if motion OR skin tone is found

## Configuration

### Sensitivity Settings
- `threshold`: 30 (RGB difference for motion detection)
- `minMotionPercentage`: 0.005 (minimum motion percentage)
- `detectionInterval`: 500ms (detection frequency)
- `presenceTimer`: 3000ms (time to trigger auto-start)
- `absenceTimer`: 2000ms (time to reset after person leaves)

### Camera Settings
- **Resolution**: 640x480 (ideal)
- **Facing Mode**: 'user' (front camera)
- **Frame Rate**: Browser default

## Browser Compatibility
- Requires HTTPS for camera access
- Supports modern browsers with getUserMedia API
- Fallback gracefully if camera access is denied

## Privacy Considerations
- Camera feed is processed locally (no server transmission)
- Video elements are hidden from UI
- Streams are properly cleaned up when not in use
- No video data is stored or transmitted

## Troubleshooting

### Camera Not Working
- Check browser permissions for camera access
- Ensure site is served over HTTPS
- Try refreshing the page
- Check browser console for errors

### False Detections
- Adjust lighting conditions
- Reduce background movement
- Toggle feature off if needed

### Performance Issues
- Detection runs every 500ms by default
- Reduce detection frequency if needed
- Check browser performance in developer tools
