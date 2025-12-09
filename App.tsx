import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Webcam from 'react-webcam';
import { HandLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import ParticleSystem from './components/ParticleSystem';
import { HandState, GestureType } from './types';

// Detect if mobile device
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isWeChat = /MicroMessenger/i.test(navigator.userAgent);

const videoConstraints = {
  width: isMobile ? 480 : 640,
  height: isMobile ? 360 : 480,
  facingMode: "user"
};

const App: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const [handState, setHandState] = useState<HandState>({
    gesture: GestureType.NONE,
    openness: 1.0,
    position: { x: 0, y: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);

  // Initialize MediaPipe
  useEffect(() => {
    const initMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        setLoading(false);
      } catch (error) {
        console.error("Error loading MediaPipe:", error);
      }
    };
    initMediaPipe();
  }, []);

  // Detection Loop
  useEffect(() => {
    let animationFrameId: number;

    const detect = () => {
      if (
        handLandmarkerRef.current &&
        webcamRef.current &&
        webcamRef.current.video &&
        webcamRef.current.video.readyState === 4
      ) {
        const video = webcamRef.current.video;
        const startTimeMs = performance.now();
        const results = handLandmarkerRef.current.detectForVideo(video, startTimeMs);

        if (results.landmarks && results.landmarks.length > 0) {
          const landmarks = results.landmarks[0];
          analyzeGesture(landmarks);
        } else {
          // No hand detected, drift to neutral
          setHandState(prev => ({ ...prev, gesture: GestureType.NONE }));
        }
      }
      animationFrameId = requestAnimationFrame(detect);
    };

    detect();

    return () => cancelAnimationFrame(animationFrameId);
  }, [loading]);

  const analyzeGesture = (landmarks: any[]) => {
    // MediaPipe Hand Landmarks:
    // 0: Wrist
    // 4: Thumb Tip
    // 8: Index Tip
    // 12: Middle Tip
    // 16: Ring Tip
    // 20: Pinky Tip
    
    // Simple logic: Is finger tip above the PIP joint (knuckle)?
    // Note: Y coordinates are normalized 0 (top) to 1 (bottom), so smaller Y is higher.
    
    const isFingerUp = (tipIdx: number, pipIdx: number) => {
      return landmarks[tipIdx].y < landmarks[pipIdx].y;
    };

    const indexUp = isFingerUp(8, 6);
    const middleUp = isFingerUp(12, 10);
    const ringUp = isFingerUp(16, 14);
    const pinkyUp = isFingerUp(20, 18);
    const thumbUp = landmarks[4].x < landmarks[3].x; // Crude thumb check (for right hand usually)

    let fingersCount = 0;
    if (indexUp) fingersCount++;
    if (middleUp) fingersCount++;
    if (ringUp) fingersCount++;
    if (pinkyUp) fingersCount++;
    // Thumb is tricky, keeping it simple for 1-4 count

    let gesture = GestureType.NONE;
    if (fingersCount === 1) gesture = GestureType.ONE;
    else if (fingersCount === 2) gesture = GestureType.TWO;
    else if (fingersCount === 3) gesture = GestureType.THREE;
    else if (fingersCount === 4) gesture = GestureType.FOUR;
    
    // Calculate openness (distance between thumb and index)
    // Used for expansion/contraction effect when no specific text gesture is active
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const distance = Math.sqrt(
      Math.pow(thumbTip.x - indexTip.x, 2) + 
      Math.pow(thumbTip.y - indexTip.y, 2)
    );
    
    // Map distance (approx 0.05 to 0.3) to an openness factor (0 to 1)
    const openness = Math.min(Math.max((distance - 0.05) * 4, 0), 1.5);

    // Map wrist position to screen space (-1 to 1)
    const wrist = landmarks[0];
    const xPos = (wrist.x - 0.5) * -2; // Flip X for mirror effect
    const yPos = (wrist.y - 0.5) * -2;

    setHandState({
      gesture,
      openness,
      position: { x: xPos, y: yPos }
    });
  };

  // Handle camera errors
  const handleUserMediaError = (error: string | DOMException) => {
    console.error("Camera error:", error);
    if (isWeChat) {
      setCameraError("请在微信中允许使用摄像头权限");
    } else {
      setCameraError("无法访问摄像头，请检查权限设置");
    }
  };

  return (
    <div className="relative w-full h-screen bg-black text-white overflow-hidden">
      {/* 3D Scene */}
      <div className="absolute inset-0 z-10">
        <Canvas camera={{
          position: [0, 0, isMobile ? 50 : 30],
          fov: isMobile ? 60 : 45
        }}>
          <color attach="background" args={['#050505']} />
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <ParticleSystem handState={handState} isMobile={isMobile} />
          <OrbitControls enableZoom={false} enablePan={false} />
        </Canvas>
      </div>

      {/* UI Overlay */}
      <div className={`absolute z-20 bg-black/50 backdrop-blur-md border border-white/10 rounded-xl ${
        isMobile
          ? 'top-2 left-2 right-2 p-3'
          : 'top-4 left-4 p-4'
      }`}>
        <h1 className={`font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 ${
          isMobile ? 'text-base' : 'text-xl'
        }`}>
          Particle Gestures
        </h1>
        <div className={`mt-2 text-gray-300 ${isMobile ? 'text-xs space-y-0.5' : 'text-sm space-y-1'}`}>
          <p>👆 1 Finger: <span className="text-white font-bold">生</span></p>
          <p>✌️ 2 Fingers: <span className="text-white font-bold">日</span></p>
          <p>🤟 3 Fingers: <span className="text-white font-bold">快</span></p>
          <p>🖖 4 Fingers: <span className="text-white font-bold">乐</span></p>
          {!isMobile && <p>✊/🖐️ Open/Close: <span className="text-white font-bold">Expand/Contract</span></p>}
        </div>
        <div className={`mt-2 font-mono text-gray-400 ${isMobile ? 'text-xs' : 'text-xs'}`}>
          Current: {handState.gesture !== GestureType.NONE ? `State ${handState.gesture}` : "Free Mode"}
        </div>
      </div>

      {/* Webcam preview */}
      <div className={`absolute z-20 rounded-lg overflow-hidden border-2 border-white/20 ${
        isMobile
          ? 'bottom-2 right-2 w-32'
          : 'bottom-4 right-4 w-48'
      }`}>
        <Webcam
          ref={webcamRef}
          audio={false}
          width={isMobile ? 128 : 192}
          height={isMobile ? 96 : 144}
          screenshotFormat="image/jpeg"
          videoConstraints={videoConstraints}
          onUserMediaError={handleUserMediaError}
          className="w-full h-auto transform -scale-x-100"
        />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <span className={`text-white ${isMobile ? 'text-xs' : 'text-xs'}`}>Loading...</span>
          </div>
        )}
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-900/80 p-2">
            <span className="text-white text-xs text-center">{cameraError}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
