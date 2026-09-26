'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudioAnalyser } from '@/hooks/useAudioAnalyser';
import { audioEngine } from '@/lib/audio-engine';

/** Two colored point lights behind the radio that pulse with audio FFT data */
export function AudioReactiveLights() {
  const leftLight = useRef<THREE.PointLight>(null);
  const rightLight = useRef<THREE.PointLight>(null);
  const { update } = useAudioAnalyser();

  useFrame(() => {
    update();
    const avg = audioEngine?.getAverageFrequency() ?? 0;
    const factor = Math.min(1, avg / 128);
    const pulse = 0.3 + factor * 2;

    if (leftLight.current) leftLight.current.intensity = pulse;
    if (rightLight.current) rightLight.current.intensity = pulse * 0.8;
  });

  return (
    <>
      <pointLight ref={leftLight} position={[-3, 1.5, -1]} color="#ff007f" intensity={0.3} distance={10} />
      <pointLight ref={rightLight} position={[3, 1.5, -1]} color="#00e5ff" intensity={0.3} distance={10} />
    </>
  );
}
