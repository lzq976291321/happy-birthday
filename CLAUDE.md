# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a gesture-controlled 3D particle system that uses webcam input and MediaPipe hand tracking to create interactive particle formations. Particles morph between Chinese characters (生日快乐 - "Happy Birthday") based on finger gestures, or expand/contract in a sphere formation based on hand openness.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server (localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Architecture

### Core Technologies
- **React 19** with TypeScript
- **React Three Fiber (@react-three/fiber)**: React renderer for Three.js
- **Three.js**: 3D graphics engine for particle rendering
- **MediaPipe Tasks Vision**: Real-time hand tracking and gesture recognition
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Styling (loaded via CDN in index.html)

### Project Structure

```
/
├── App.tsx                      # Main app component with webcam and MediaPipe integration
├── components/
│   └── ParticleSystem.tsx      # 3D particle system using React Three Fiber
├── utils/
│   └── textSampler.ts          # Canvas-based text-to-particle position sampling
├── types.ts                     # Shared TypeScript interfaces and enums
├── index.tsx                    # React entry point
└── vite.config.ts              # Vite configuration with path aliases
```

### Data Flow

1. **App.tsx** captures webcam video and runs MediaPipe hand detection at 60fps
2. Hand landmarks are analyzed to detect:
   - Finger count (1-4 fingers up) → Maps to GestureType (ONE/TWO/THREE/FOUR)
   - Hand openness (thumb-to-index distance) → Controls particle expansion
   - Wrist position → Controls parallax rotation
3. **HandState** is passed to **ParticleSystem.tsx**
4. **ParticleSystem** lerps 3000 particles between pre-calculated target formations:
   - `GestureType.NONE` → Breathing sphere (expansion controlled by hand openness)
   - `GestureType.ONE` → Character "生"
   - `GestureType.TWO` → Character "日"
   - `GestureType.THREE` → Character "快"
   - `GestureType.FOUR` → Character "乐"

### Key Implementation Details

**Gesture Detection (App.tsx:79-136)**
- Uses MediaPipe's 21 hand landmarks
- Finger detection: Compares tip Y-coordinate with PIP joint (knuckle)
- Lower Y value = finger is up (MediaPipe coordinates: 0=top, 1=bottom)
- Hand openness: Euclidean distance between thumb tip (landmark 4) and index tip (landmark 8)

**Particle Animation (ParticleSystem.tsx:38-115)**
- Pre-calculates all target formations on mount using `useMemo`
- Uses `useFrame` for 60fps animation loop
- Lerp speed: 0.08 (LERP_SPEED constant)
- Particles have slight noise/wobble to feel organic
- Additive blending for glow effect

**Text Sampling (textSampler.ts)**
- Renders text to hidden canvas
- Samples pixel brightness to find character boundaries
- Converts 2D pixel positions to 3D coordinates with random Z-depth
- Chinese characters work due to Microsoft YaHei font fallback

### Environment Variables

The project expects `GEMINI_API_KEY` in `.env.local`, but currently this API key is not actively used in the codebase. It's configured in vite.config.ts but not referenced in any components.

### Configuration Notes

- **Path Alias**: `@/` maps to project root (configured in both vite.config.ts and tsconfig.json)
- **Dev Server**: Runs on port 3000, accessible on local network (host: 0.0.0.0)
- **TypeScript**: Uses ESNext modules with React JSX transform
- **MediaPipe Assets**: Loaded from CDN (https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision)

## Common Modifications

**To change the displayed text:**
Edit the `targets` object in ParticleSystem.tsx:21-25, replacing the Chinese characters with your desired text.

**To adjust particle behavior:**
- Particle count: PARTICLE_COUNT constant (line 11)
- Animation speed: LERP_SPEED constant (line 12)
- Expansion range: expansionFactor calculation (line 80)

**To modify gesture mapping:**
Edit the switch statement in ParticleSystem.tsx:45-61 to map different GestureType values to different target formations.
