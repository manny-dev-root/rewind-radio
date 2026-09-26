'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudioAnalyser } from '@/hooks/useAudioAnalyser';

interface AudioSpectrumProps {
  position?: [number, number, number];
  barsCount?: number;
  width?: number;
  maxHeight?: number;
}

/** Espectro musical 3D reactivo integrado debajo del título en el visor */
export function AudioSpectrum({
  position = [0.9, 0.52, 0.64],
  barsCount = 20,
  width = 2.2,
  maxHeight = 0.22,
}: AudioSpectrumProps) {
  const barsRef = useRef<THREE.InstancedMesh>(null);
  const { frequencyData, update } = useAudioAnalyser();
  const dummy = useRef(new THREE.Object3D());
  const barWidth = width / barsCount;

  useFrame(() => {
    if (!barsRef.current) return;
    update();

    for (let i = 0; i < barsCount; i++) {
      const dataIndex = Math.min(Math.floor((i / barsCount) * 44), 63);
      const val = frequencyData[dataIndex] || 0;
      const normalized = Math.pow(val / 255, 1.2);
      const h = Math.max(0.015, normalized * maxHeight);

      const x = -width / 2 + i * barWidth + barWidth / 2;
      const y = h / 2;

      dummy.current.position.set(x, y, 0);
      dummy.current.scale.set(1, h / 0.015, 1);
      dummy.current.updateMatrix();

      barsRef.current.setMatrixAt(i, dummy.current.matrix);
    }
    barsRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group position={position}>
      <instancedMesh ref={barsRef} args={[undefined, undefined, barsCount]}>
        <boxGeometry args={[barWidth * 0.72, 0.015, 0.012]} />
        <meshStandardMaterial
          color="#ff7700"
          emissive="#ff5500"
          emissiveIntensity={2.8}
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  );
}
