'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { RoundedBox, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useEraStore } from '@/store/useEraStore';
import { audioEngine } from '@/lib/audio-engine';
import { trackEvent } from '@/lib/analytics';

interface VerticalVolumeSliderProps {
  position?: [number, number, number];
}

const MIN_Y = -0.38;
const MAX_Y = 0.36;
const TRAVEL_RANGE = MAX_Y - MIN_Y; // 0.74
const FADER_X = -0.04; // Posición X del carril del fader
const TICK_X = 0.030;  // Posición X de las marcas de escala
const LABEL_X = 0.065; // Posición X de los números 0..10

function volumeToY(vol: number): number {
  const norm = Math.max(0, Math.min(100, vol)) / 100;
  return MIN_Y + norm * TRAVEL_RANGE;
}

function yToVolume(y: number): number {
  const clampedY = Math.max(MIN_Y, Math.min(MAX_Y, y));
  const norm = (clampedY - MIN_Y) / TRAVEL_RANGE;
  return Math.round(norm * 100);
}

/**
 * Selector de volumen vertical analógico de 0 a 10 con arrastre físico 1:1,
 * cursor de mano táctil (grab / grabbing) y respuesta sin retardo.
 */
export function VerticalVolumeSlider({
  position = [2.44, 0.53, 0.635],
}: VerticalVolumeSliderProps) {
  const currentVolume = useEraStore((s) => s.volume);
  const setVolume = useEraStore((s) => s.setVolume);

  const knobRef = useRef<THREE.Group>(null);
  const targetY = useRef(volumeToY(currentVolume));
  const animatedY = useRef(volumeToY(currentVolume));
  const isDragging = useRef(false);
  const dragOffsetY = useRef(0);
  const lastLoggedVolume = useRef(currentVolume);
  const lastNotch = useRef(Math.round(currentVolume / 10));
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    targetY.current = volumeToY(currentVolume);
  }, [currentVolume]);

  const updateVolume = (newVol: number, isFinal = false) => {
    const clamped = Math.max(0, Math.min(100, newVol));
    targetY.current = volumeToY(clamped);
    setVolume(clamped);

    const notch = Math.round(clamped / 10);
    if (notch !== lastNotch.current) {
      lastNotch.current = notch;
      audioEngine?.playClick();
    }

    if (isFinal && Math.abs(clamped - lastLoggedVolume.current) >= 5) {
      lastLoggedVolume.current = clamped;
      trackEvent('volume_changed', { volume: clamped, notch });
    }
  };

  // Arrastre 1:1 exacto siguiendo el rayo del cursor en el plano 3D
  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    isDragging.current = true;
    (e.nativeEvent.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
    document.body.style.cursor = 'grabbing';

    const localY = e.point.y - position[1];
    // Si se pulsa sobre la perilla, conservar el offset; si es en la pista, saltar directo
    const isDirectKnob = Math.abs(localY - animatedY.current) < 0.045;
    dragOffsetY.current = isDirectKnob ? localY - animatedY.current : 0;

    const effectiveY = localY - dragOffsetY.current;
    const newVol = yToVolume(effectiveY);
    targetY.current = volumeToY(newVol);
    animatedY.current = targetY.current;
    updateVolume(newVol, false);
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!isDragging.current) return;
    e.stopPropagation();

    const localY = e.point.y - position[1];
    const effectiveY = localY - dragOffsetY.current;
    const newVol = yToVolume(effectiveY);
    targetY.current = volumeToY(newVol);
    animatedY.current = targetY.current; // Sin inercia durante el drag: el fader está pegado al cursor
    updateVolume(newVol, false);
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (!isDragging.current) return;
    e.stopPropagation();
    isDragging.current = false;
    (e.nativeEvent.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);
    document.body.style.cursor = hovered ? 'grab' : 'auto';

    const localY = e.point.y - position[1];
    const effectiveY = localY - dragOffsetY.current;
    updateVolume(yToVolume(effectiveY), true);
  };

  const handleWheel = (e: ThreeEvent<WheelEvent>) => {
    e.stopPropagation();
    const step = e.deltaY < 0 ? 5 : -5;
    const nextVol = Math.max(0, Math.min(100, currentVolume + step));
    updateVolume(nextVol, true);
  };

  useFrame((_, delta) => {
    if (knobRef.current) {
      if (isDragging.current) {
        // En arrastre: posición 100% directa y precisa
        knobRef.current.position.y = animatedY.current;
      } else {
        // En reposo: amortiguación suave si el volumen cambia externamente
        animatedY.current = THREE.MathUtils.damp(
          animatedY.current,
          targetY.current,
          25,
          delta
        );
        knobRef.current.position.y = animatedY.current;
      }
    }
  });

  const currentLevel = Math.round(currentVolume / 10);

  // Escala uniforme del 0 al 10
  const marks = useMemo(() => {
    const items = [];
    for (let i = 0; i <= 10; i++) {
      const y = MIN_Y + (i / 10) * TRAVEL_RANGE;
      const isMajor = i === 0 || i === 5 || i === 10;
      items.push({ level: i, y, isMajor });
    }
    return items;
  }, []);

  return (
    <group position={position} onWheel={handleWheel}>
      {/* Título VOL claro y centrado sobre el fader */}
      <Text
        position={[FADER_X, 0.44, 0.01]}
        fontSize={0.044}
        color="#eef1ff"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.16}
      >
        VOL
      </Text>

      {/* Ranura central (canal de deslizamiento) */}
      <mesh position={[FADER_X, -0.01, 0.006]}>
        <boxGeometry args={[0.022, TRAVEL_RANGE + 0.04, 0.008]} />
        <meshStandardMaterial color="#040407" roughness={0.95} metalness={0.1} />
      </mesh>

      {/* Riel guía oscuro de fondo en todo el recorrido */}
      <mesh position={[FADER_X, MIN_Y + TRAVEL_RANGE / 2, 0.008]}>
        <boxGeometry args={[0.005, TRAVEL_RANGE, 0.002]} />
        <meshStandardMaterial color="#1a1c28" roughness={0.7} metalness={0.4} />
      </mesh>

      {/* Línea naranja incandescente que simula la luz del selector de volumen */}
      {currentVolume > 0 && (
        <mesh
          position={[
            FADER_X,
            MIN_Y + ((currentVolume / 100) * TRAVEL_RANGE) / 2,
            0.012,
          ]}
        >
          <boxGeometry
            args={[0.007, Math.max(0.005, (currentVolume / 100) * TRAVEL_RANGE), 0.003]}
          />
          <meshStandardMaterial
            color="#ff9900"
            emissive="#ff7700"
            emissiveIntensity={hovered || isDragging.current ? 3.8 : 2.8}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* Escala graduada 0 a 10: marcas horizontales y números legibles */}
      {marks.map(({ level, y, isMajor }) => {
        const isActive = level <= currentLevel;
        const isCurrent = level === currentLevel;
        return (
          <group key={level} position={[0, y, 0.012]}>
            {/* Muesca horizontal visible y sólida para cada uno de los niveles 0 a 10 */}
            <mesh position={[TICK_X, 0, 0.002]}>
              <boxGeometry args={[isMajor ? 0.036 : 0.026, isMajor ? 0.009 : 0.0075, 0.005]} />
              <meshStandardMaterial
                color={isActive ? '#ffaa33' : '#8c90ac'}
                emissive={isActive ? '#ff7700' : '#000000'}
                emissiveIntensity={isActive ? (isCurrent ? 1.6 : 0.9) : 0}
                toneMapped={false}
              />
            </mesh>

            {/* Número del 0 al 10 en tipografía nítida y clara */}
            <Text
              position={[LABEL_X, 0, 0.002]}
              fontSize={isMajor ? 0.042 : 0.036}
              color={isCurrent ? '#ffffff' : (isActive ? '#ffaa33' : '#ccd0e4')}
              anchorX="left"
              anchorY="middle"
            >
              {level.toString()}
            </Text>
          </group>
        );
      })}

      {/* Perilla deslizante táctil (Fader Cap estilizado y minimalista) */}
      <group
        ref={knobRef}
        position={[FADER_X, animatedY.current, 0.022]}
      >
        {/* Cuerpo del fader cap en aluminio oscuro mate */}
        <RoundedBox args={[0.14, 0.052, 0.022]} radius={0.004} smoothness={4}>
          <meshStandardMaterial
            color={hovered || isDragging.current ? '#323446' : '#222332'}
            roughness={0.35}
            metalness={0.7}
          />
        </RoundedBox>

        {/* Hendidura central horizontal con LED ámbar incandescente */}
        <mesh position={[0, 0, 0.012]}>
          <boxGeometry args={[0.11, 0.0045, 0.002]} />
          <meshStandardMaterial
            color="#ff9900"
            emissive="#ff8c00"
            emissiveIntensity={hovered || isDragging.current ? 3.4 : 2.5}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* Superficie interactiva frontal unificada con puntero táctil de mano (grab / grabbing) */}
      <mesh
        position={[0, -0.01, 0.035]}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerOver={() => {
          setHovered(true);
          if (!isDragging.current) document.body.style.cursor = 'grab';
        }}
        onPointerOut={() => {
          setHovered(false);
          if (!isDragging.current) document.body.style.cursor = 'auto';
        }}
      >
        <planeGeometry args={[0.34, TRAVEL_RANGE + 0.18]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  );
}
