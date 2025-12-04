import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HandState, GestureType } from '../types';
import { samplePointsFromText, generateSphereCloud } from '../utils/textSampler';

interface ParticleSystemProps {
  handState: HandState;
}

const PARTICLE_COUNT = 3000;
const LERP_SPEED = 0.08;

const ParticleSystem: React.FC<ParticleSystemProps> = ({ handState }) => {
  const pointsRef = useRef<THREE.Points>(null);
  
  // Pre-calculate target positions for all states
  const targets = useMemo(() => {
    return {
      sphere: generateSphereCloud(PARTICLE_COUNT, 8),
      char1: samplePointsFromText('生', PARTICLE_COUNT, 140),
      char2: samplePointsFromText('日', PARTICLE_COUNT, 140),
      char3: samplePointsFromText('快', PARTICLE_COUNT, 140),
      char4: samplePointsFromText('乐', PARTICLE_COUNT, 140),
    };
  }, []);

  // Initialize current positions array
  const positions = useMemo(() => {
    return new Float32Array(targets.sphere);
  }, [targets]);

  // Keep track of particle velocities for noise
  const velocities = useMemo(() => {
    return new Float32Array(PARTICLE_COUNT * 3).fill(0);
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;

    const currentPositions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    let targetPositions: Float32Array;

    // 1. Determine Target Shape based on Gesture
    switch (handState.gesture) {
      case GestureType.ONE:
        targetPositions = targets.char1;
        break;
      case GestureType.TWO:
        targetPositions = targets.char2;
        break;
      case GestureType.THREE:
        targetPositions = targets.char3;
        break;
      case GestureType.FOUR:
        targetPositions = targets.char4;
        break;
      default:
        targetPositions = targets.sphere;
        break;
    }

    // 2. Animate Loop
    const time = state.clock.getElapsedTime();

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const idx = i * 3;
      
      let tx = targetPositions[idx];
      let ty = targetPositions[idx + 1];
      let tz = targetPositions[idx + 2];

      // 3. Apply Hand Interactions
      
      if (handState.gesture === GestureType.NONE) {
        // Mode: Expansion/Contraction (Breathing)
        // handState.openness: 0 (closed) -> 1 (open)
        
        // Base sphere expansion
        const expansionFactor = 0.5 + (handState.openness * 1.5); 
        
        tx *= expansionFactor;
        ty *= expansionFactor;
        tz *= expansionFactor;

        // Add some noise/rotation when idle
        const noise = Math.sin(time + i * 0.1) * 0.2;
        tx += noise;
        ty += Math.cos(time * 0.5 + i * 0.05) * 0.2;
      } else {
        // Mode: Text Forming
        // Add a slight floating wobble to the text to keep it alive
        ty += Math.sin(time * 2 + positions[idx] * 0.5) * 0.05;
      }

      // 4. Lerp Logic (Physics update)
      
      // Calculate distance to target
      const dx = tx - currentPositions[idx];
      const dy = ty - currentPositions[idx + 1];
      const dz = tz - currentPositions[idx + 2];

      // Soft lerp towards target
      currentPositions[idx] += dx * LERP_SPEED;
      currentPositions[idx + 1] += dy * LERP_SPEED;
      currentPositions[idx + 2] += dz * LERP_SPEED;
    }

    // Mark geometry as needing update
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    
    // Rotate entire group slightly based on hand position (Parallax effect)
    pointsRef.current.rotation.x = THREE.MathUtils.lerp(pointsRef.current.rotation.x, handState.position.y * 0.2, 0.1);
    pointsRef.current.rotation.y = THREE.MathUtils.lerp(pointsRef.current.rotation.y, handState.position.x * 0.2, 0.1);
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLE_COUNT}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.25}
        color="#4fc3f7"
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

export default ParticleSystem;
