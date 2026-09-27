'use client';

import { useRef, useEffect } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useDrag } from '@use-gesture/react';
import * as THREE from 'three';
import { audioEngine } from '@/lib/audio-engine';

interface HorizontalTunerProps {
  position?: [number, number, number];
  trackCount?: number;
  currentIndex?: number;
  onChange?: (index: number) => void;
  width?: number;
}

/** Sintonizador horizontal con marcas de estaciones (hasta 15) y aguja digital luminosa */
export function HorizontalTuner({
  position = [0.9, 0.05, 0.635],
  trackCount = 0,
  currentIndex = 0,
  onChange,
  width = 2.16,
}: HorizontalTunerProps) {
  const needleRef = useRef<THREE.Group>(null);
  const actualCount = Math.max(0, Math.min(15, trackCount));
  const hasTracks = actualCount > 0;
  const halfWidth = width / 2;
  const step = actualCount > 1 ? width / (actualCount - 1) : 0;

  const getStationX = (idx: number) => {
    if (!hasTracks || actualCount === 1) return 0;
    const clamped = Math.max(0, Math.min(actualCount - 1, idx));
    return -halfWidth + clamped * step;
  };

  const safeIndex = hasTracks ? Math.max(0, Math.min(actualCount - 1, currentIndex)) : 0;
  const targetX = useRef(getStationX(safeIndex));
  const currentX = useRef(getStationX(safeIndex));
  const isDragging = useRef(false);
  const prevMx = useRef(0);
  const lastIdx = useRef(safeIndex);

  useEffect(() => {
    if (!hasTracks) {
      lastIdx.current = 0;
      targetX.current = 0;
      return;
    }
    const idx = Math.max(0, Math.min(actualCount - 1, currentIndex));
    lastIdx.current = idx;
    targetX.current = actualCount > 1 ? -halfWidth + idx * step : 0;
  }, [currentIndex, actualCount, hasTracks, halfWidth, step]);

  const selectStation = (idx: number) => {
    if (!hasTracks) return;
    const clamped = Math.max(0, Math.min(actualCount - 1, idx));
    targetX.current = actualCount > 1 ? -halfWidth + clamped * step : 0;
    if (clamped !== lastIdx.current) {
      lastIdx.current = clamped;
      onChange?.(clamped);
      audioEngine?.playClick();
    }
  };

  const bind = useDrag(
    ({ movement: [mx], down, first }) => {
      if (!hasTracks || actualCount <= 1) return;
      if (first) {
        prevMx.current = mx;
        isDragging.current = true;
      }
      const deltaX = mx - prevMx.current;
      prevMx.current = mx;

      if (down) {
        targetX.current = Math.max(-halfWidth, Math.min(halfWidth, targetX.current + deltaX * 0.007));
        const liveIdx = Math.max(
          0,
          Math.min(actualCount - 1, Math.round((targetX.current + halfWidth) / step))
        );
        if (liveIdx !== lastIdx.current) {
          lastIdx.current = liveIdx;
          onChange?.(liveIdx);
          audioEngine?.playClick();
        }
      } else {
        isDragging.current = false;
        const nearestIndex = Math.max(
          0,
          Math.min(actualCount - 1, Math.round((targetX.current + halfWidth) / step))
        );
        selectStation(nearestIndex);
      }
    },
    { pointer: { capture: false } }
  );

  // Permitir hacer clic en cualquier punto de la regla horizontal para mover la aguja digital a esa marca
  const handleBarClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!hasTracks || actualCount <= 1) return;
    const localX = e.point.x - position[0];
    const clickedIdx = Math.round((localX + halfWidth) / step);
    selectStation(clickedIdx);
  };

  useFrame((_, delta) => {
    currentX.current = THREE.MathUtils.damp(currentX.current, targetX.current, 15, delta);
    if (needleRef.current) {
      needleRef.current.position.x = currentX.current;
    }
  });

  return (
    <group position={position}>
      {/* Superficie interactiva para clic y arrastre en toda la regla */}
      <mesh
        position={[0, 0, 0.02]}
        onClick={handleBarClick}
        {...(bind() as unknown as Record<string, unknown>)}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        <planeGeometry args={[width + 0.25, 0.34]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Doble riel horizontal luminoso estilo dial analógico/digital */}
      <mesh position={[0, 0.014, 0.005]}>
        <boxGeometry args={[width + 0.08, 0.012, 0.004]} />
        <meshStandardMaterial
          color="#ff8c33"
          emissive="#ff6a00"
          emissiveIntensity={1.6}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, -0.014, 0.005]}>
        <boxGeometry args={[width + 0.08, 0.012, 0.004]} />
        <meshStandardMaterial
          color="#ff8c33"
          emissive="#ff6a00"
          emissiveIntensity={1.6}
          toneMapped={false}
        />
      </mesh>

      {/* Sub-divisiones finas de escala de fondo */}
      {Array.from({ length: 37 }).map((_, i) => {
        const subX = -halfWidth + (i / 36) * width;
        return (
          <group key={`sub-${i}`} position={[subX, 0, 0.005]}>
            <mesh position={[0, 0.045, 0]}>
              <boxGeometry args={[0.005, 0.03, 0.004]} />
              <meshStandardMaterial
                color="#885522"
                emissive="#663300"
                emissiveIntensity={hasTracks ? 0.5 : 0.2}
              />
            </mesh>
            <mesh position={[0, -0.045, 0]}>
              <boxGeometry args={[0.005, 0.03, 0.004]} />
              <meshStandardMaterial
                color="#885522"
                emissive="#663300"
                emissiveIntensity={hasTracks ? 0.5 : 0.2}
              />
            </mesh>
          </group>
        );
      })}

      {/* Marcas principales dinámicas (#1 a #N, con tope 10) */}
      {hasTracks ? (
        Array.from({ length: actualCount }).map((_, i) => {
          const xPos = actualCount > 1 ? -halfWidth + i * step : 0;
          const isSelected = i === safeIndex;
          const tickWidth = isSelected ? 0.018 : (actualCount > 10 ? 0.009 : 0.013);
          return (
            <group key={`main-${i}`} position={[xPos, 0, 0.008]}>
              {/* Marca superior */}
              <mesh position={[0, 0.06, 0]}>
                <boxGeometry args={[tickWidth, 0.068, 0.006]} />
                <meshStandardMaterial
                  color={isSelected ? '#ffaa44' : '#cc7722'}
                  emissive={isSelected ? '#ff7700' : '#994400'}
                  emissiveIntensity={isSelected ? 2.6 : 0.9}
                  toneMapped={false}
                />
              </mesh>

              {/* Marca inferior */}
              <mesh position={[0, -0.06, 0]}>
                <boxGeometry args={[tickWidth, 0.068, 0.006]} />
                <meshStandardMaterial
                  color={isSelected ? '#ffaa44' : '#cc7722'}
                  emissive={isSelected ? '#ff7700' : '#994400'}
                  emissiveIntensity={isSelected ? 2.6 : 0.9}
                  toneMapped={false}
                />
              </mesh>

              {/* Numeración digital 1..N debajo de cada marca */}
              <Text
                position={[0, -0.115, 0.005]}
                fontSize={actualCount > 10 ? 0.042 : 0.052}
                color={isSelected ? '#ffaa44' : '#887766'}
                anchorX="center"
                anchorY="middle"
              >
                {`${i + 1}`}
              </Text>
            </group>
          );
        })
      ) : (
        <Text
          position={[0, -0.115, 0.01]}
          fontSize={0.048}
          color="#ff7733"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.08}
        >
          SIN DATOS PARA ESTE AÑO
        </Text>
      )}

      {/* Aguja Digital Luminosa (marca en cuál canción está o queda en espera central) */}
      <group ref={needleRef} position={[currentX.current, 0, 0.022]}>
        {/* Halo exterior de la aguja digital */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.045, 0.27, 0.012]} />
          <meshStandardMaterial
            color="#ff5500"
            emissive="#ff4400"
            emissiveIntensity={hasTracks ? 2.2 : 0.5}
            transparent
            opacity={hasTracks ? 0.45 : 0.2}
            toneMapped={false}
          />
        </mesh>

        {/* Núcleo central brillante de la aguja digital */}
        <mesh position={[0, 0, 0.004]}>
          <boxGeometry args={[0.022, 0.28, 0.014]} />
          <meshStandardMaterial
            color="#ffaa33"
            emissive="#ff7700"
            emissiveIntensity={hasTracks ? 4.0 : 0.8}
            toneMapped={false}
          />
        </mesh>

        {/* Cabezal indicador superior */}
        <mesh position={[0, 0.13, 0.008]}>
          <boxGeometry args={[0.05, 0.025, 0.016]} />
          <meshStandardMaterial
            color="#ffcc66"
            emissive="#ff8800"
            emissiveIntensity={hasTracks ? 3.8 : 0.8}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}
