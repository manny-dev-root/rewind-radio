'use client';

import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useDrag } from '@use-gesture/react';
import * as THREE from 'three';
import { audioEngine } from '@/lib/audio-engine';

export interface DialProps {
  position: [number, number, number];
  values: readonly (string | number)[];
  currentIndex: number;
  onChange: (index: number) => void;
  label: string;
  color?: string;
  radius?: number;
}

export function Dial({
  position,
  values,
  currentIndex,
  onChange,
  label,
  color = '#242636',
  radius = 0.30,
}: DialProps) {
  const knobRef = useRef<THREE.Group>(null);
  const count = Math.max(values.length, 1);
  const stepAngle = (2 * Math.PI) / count;

  const targetRot = useRef(currentIndex * stepAngle);
  const visualRot = useRef(currentIndex * stepAngle);
  const velocity = useRef(0);
  const isDragging = useRef(false);
  const prevMx = useRef(0);
  const lastIndex = useRef(currentIndex);

  // Anillo de marcas compactas alrededor del dial (16 marcas, r = 0.38)
  const ticks = useMemo(() => {
    const tickCount = 16;
    const marks: { angle: number; major: boolean }[] = [];
    for (let i = 0; i < tickCount; i++) {
      const angle = (i / tickCount) * Math.PI * 2;
      marks.push({ angle, major: i % 2 === 0 });
    }
    return marks;
  }, []);

  useEffect(() => {
    if (currentIndex !== lastIndex.current) {
      // Calcular el delta de índice por el camino más corto para que nunca gire al revés al pasar de 1970 a 2026
      let diff = currentIndex - lastIndex.current;
      if (diff > count / 2) diff -= count;
      if (diff < -count / 2) diff += count;
      lastIndex.current = currentIndex;
      targetRot.current += diff * stepAngle;
    }
  }, [currentIndex, count, stepAngle]);

  const bind = useDrag(
    ({ movement: [mx, my], velocity: [vx, vy], direction: [dx, dy], down, first, last }) => {
      if (first) {
        prevMx.current = mx - my;
        isDragging.current = true;
      }
      // Derecha (mx > 0) o Arriba (my < 0) gira en sentido horario (+) y sube el año;
      // Izquierda (mx < 0) o Abajo (my > 0) gira en sentido antihorario (-) y baja el año.
      const combinedPos = mx - my;
      const deltaMove = combinedPos - prevMx.current;
      prevMx.current = combinedPos;

      if (down) {
        isDragging.current = true;
        targetRot.current += deltaMove * 0.012;
        const netDir = Math.abs(dx) >= Math.abs(dy) ? dx : -dy;
        const netVel = Math.max(vx, vy);
        velocity.current = netDir * netVel * 0.012;
      }
      if (last) {
        isDragging.current = false;
      }
    },
    { pointer: { capture: false } }
  );

  // Rueda del mouse: girar hacia arriba (deltaY < 0) sube el año (+1, sentido horario); hacia abajo (deltaY > 0) baja el año (-1)
  const handleWheel = (e: { deltaY: number; stopPropagation: () => void }) => {
    e.stopPropagation();
    velocity.current = 0;
    targetRot.current += (e.deltaY < 0 ? 1 : -1) * stepAngle;
  };

  useFrame((_, delta) => {
    if (!isDragging.current && Math.abs(velocity.current) > 0.0001) {
      targetRot.current += velocity.current;
      velocity.current *= Math.pow(0.85, delta * 60);
      if (Math.abs(velocity.current) <= 0.0001) velocity.current = 0;
    }

    visualRot.current = THREE.MathUtils.damp(visualRot.current, targetRot.current, 12, delta);
    if (knobRef.current) {
      knobRef.current.rotation.z = -visualRot.current;
    }

    const rawIndex = Math.round(targetRot.current / stepAngle);
    const normalizedIndex = ((rawIndex % count) + count) % count;
    if (normalizedIndex !== lastIndex.current) {
      lastIndex.current = normalizedIndex;
      onChange(normalizedIndex);
      audioEngine?.playClick();
    }
  });

  const displayValue = String(values[lastIndex.current] ?? '');

  return (
    <group position={position}>
      {/* Marco exterior biselado (zócalo de inserción de la perilla en el chasis, idéntico al botón Random) */}
      <mesh position={[0, 0, 0.005]}>
        <ringGeometry args={[radius * 0.99, radius * 1.13, 64]} />
        <meshStandardMaterial color="#14141e" roughness={0.7} metalness={0.4} />
      </mesh>

      {/* Bisel decorativo interior del zócalo */}
      <mesh position={[0, 0, 0.012]}>
        <ringGeometry args={[radius * 0.99, radius * 1.05, 64]} />
        <meshStandardMaterial color="#0c0c14" roughness={0.9} metalness={0.2} />
      </mesh>

      {/* Anillo exterior de marcas de calibración compacto (alrededor del bisel) */}
      <group position={[0, 0, 0.015]}>
        {ticks.map((tick, i) => {
          const r = radius + 0.085;
          const x = Math.sin(tick.angle) * r;
          const y = Math.cos(tick.angle) * r;
          return (
            <mesh key={i} position={[x, y, 0]} rotation={[0, 0, -tick.angle]}>
              <boxGeometry args={[tick.major ? 0.022 : 0.012, tick.major ? 0.045 : 0.03, 0.01]} />
              <meshStandardMaterial
                color={tick.major ? '#ff6a00' : '#55586b'}
                emissive={tick.major ? '#ff6a00' : '#000000'}
                emissiveIntensity={tick.major ? 0.9 : 0}
                toneMapped={false}
              />
            </mesh>
          );
        })}
      </group>

      {/* Cuerpo rotatorio del dial (anillo metálico exterior + muesca indicadora) */}
      <group
        ref={knobRef}
        {...(bind() as unknown as Record<string, unknown>)}
        onWheel={handleWheel}
        onPointerOver={() => {
          document.body.style.cursor = 'grab';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        {/* Disco base de la perilla */}
        <mesh position={[0, 0, 0.02]}>
          <circleGeometry args={[radius, 64]} />
          <meshStandardMaterial color={color} roughness={0.4} metalness={0.7} />
        </mesh>

        {/* Bisel perimetral exterior de la perilla rotatoria */}
        <mesh position={[0, 0, 0.023]}>
          <ringGeometry args={[radius * 0.94, radius * 0.99, 64]} />
          <meshStandardMaterial color="#14141e" roughness={0.7} metalness={0.4} />
        </mesh>

        {/* Anillo de bisel metálico decorativo */}
        <mesh position={[0, 0, 0.026]}>
          <ringGeometry args={[radius * 0.77, radius * 0.94, 64]} />
          <meshStandardMaterial color="#2c2e40" roughness={0.3} metalness={0.8} />
        </mesh>

        {/* Bisel decorativo interior hacia la pantalla central */}
        <mesh position={[0, 0, 0.028]}>
          <ringGeometry args={[radius * 0.71, radius * 0.77, 64]} />
          <meshStandardMaterial color="#0c0c14" roughness={0.9} metalness={0.2} />
        </mesh>

        {/* Muesca indicadora luminosa en el borde del anillo */}
        <mesh position={[0, radius * 0.86, 0.044]}>
          <boxGeometry args={[0.024, 0.065, 0.01]} />
          <meshStandardMaterial
            color="#ff7700"
            emissive="#ff6a00"
            emissiveIntensity={3.2}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* Pantalla LED circular fija en el centro del dial */}
      <group position={[0, 0, 0.042]}>
        {/* Bisel exterior de la pantalla */}
        <mesh position={[0, 0, 0.001]}>
          <ringGeometry args={[radius * 0.70, radius * 0.76, 64]} />
          <meshStandardMaterial color="#14141e" roughness={0.7} metalness={0.4} />
        </mesh>

        {/* Bisel interior oscuro al ras */}
        <mesh position={[0, 0, 0.0015]}>
          <ringGeometry args={[radius * 0.68, radius * 0.72, 64]} />
          <meshStandardMaterial color="#0c0c14" roughness={0.9} metalness={0.2} />
        </mesh>

        {/* Fondo pantalla LED oscura */}
        <mesh position={[0, 0, 0.002]}>
          <circleGeometry args={[radius * 0.70, 48]} />
          <meshStandardMaterial color="#120904" roughness={0.9} metalness={0.1} />
        </mesh>

        {/* Texto digital principal (ej. 1990 / AR) estandarizado con el mismo tamaño y peso visual */}
        <Text
          position={[0, 0.015, 0.006]}
          fontSize={0.125}
          color="#ff8c33"
          anchorX="center"
          anchorY="middle"
          letterSpacing={displayValue.length <= 2 ? 0.08 : 0.03}
        >
          {displayValue}
          <meshStandardMaterial
            color="#ff7700"
            emissive="#ff6a00"
            emissiveIntensity={3.4}
            toneMapped={false}
          />
        </Text>

        {/* Micro-etiqueta inferior (AÑO / PAÍS) con el mismo estilo y tamaño */}
        <Text
          position={[0, -0.102, 0.006]}
          fontSize={0.042}
          color="#b35900"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.12}
        >
          {label}
          <meshStandardMaterial
            color="#cc5500"
            emissive="#aa4400"
            emissiveIntensity={1.2}
            toneMapped={false}
          />
        </Text>
      </group>
    </group>
  );
}
