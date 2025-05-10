# MimiCap Audio Captcha

## Important Update: Client-Side Processing

This backend is no longer used. We have migrated all audio CAPTCHA functionality to the client-side for improved real-time tone detection and verification.

## Benefits of Client-Side Processing

- **Reduced Latency**: No network round-trips means immediate feedback for users
- **Improved Accuracy**: Direct access to Web Audio API for high-fidelity tone detection
- **Enhanced Privacy**: Audio data never leaves the user's browser
- **Better Bot Detection**: More sophisticated analysis of audio characteristics
- **No Backend Dependencies**: Simplified architecture with no server requirements

## Implementation Details

The new implementation uses:

1. **Web Audio API** for capturing and analyzing audio
2. **YIN Algorithm** for accurate fundamental frequency detection
3. **Advanced Pattern Analysis** for bot detection
4. **Local Challenge Generation** for secure verification

See the new `ToneDetectionAndAnalysis.md` file in the root directory for a detailed explanation of the algorithm and implementation.

## Frontend Code Architecture

- `src/lib/toneDetector.ts`: Core tone detection and analysis engine
- `src/components/audio-captcha/audio-captcha.tsx`: Main CAPTCHA component
- `src/components/audio-captcha/PitchVisualizer.tsx`: Visualization component

## Legacy Backend (Deprecated)

The original backend code is preserved in this directory for reference purposes but is no longer used in the application.

### Original Endpoints (No Longer Active)

```
GET /api/audio-captcha/generate
GET /api/audio-captcha/tone/:id
POST /api/audio-captcha/verify
```

## Migration Notes

For any clients previously integrating with this backend, please migrate to the new client-side implementation by:

1. Removing any calls to the backend API
2. Including the new toneDetector.ts file in your project
3. Using the AudioCaptcha component directly in your UI
