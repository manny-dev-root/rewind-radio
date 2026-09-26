'use client';

import { useRef, useState, useMemo } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { RoundedBox, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useEraStore } from '@/store/useEraStore';
import { audioEngine } from '@/lib/audio-engine';
import { COUNTRIES } from '@/lib/constants';
import { trackEvent } from '@/lib/analytics';

interface RandomButtonProps {
  position?: [number, number, number];
}

/**
 * Botón rectangular táctil de estilo vintage / analógico para sintonizar canciones al azar.
 * Ubicado en la consola entre los dos diales principales de Año y País.
 */
export function RandomButton({ position = [0.90, -0.80, 0.63] }: RandomButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const buttonMeshRef = useRef<THREE.Group>(null);
  const pressZ = useRef(0);

  // Generar textura vectorial nítida del ícono de Shuffle (flechas cruzadas)
  const shuffleTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 256, 256);
    ctx.strokeStyle = '#ff9933';
    ctx.fillStyle = '#ff9933';
    ctx.lineWidth = 20;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Flecha 1: Superior izquierda a inferior derecha
    ctx.beginPath();
    ctx.moveTo(35, 75);
    ctx.lineTo(85, 75);
    ctx.bezierCurveTo(125, 75, 135, 180, 175, 180);
    ctx.lineTo(210, 180);
    ctx.stroke();

    // Punta flecha 1
    ctx.beginPath();
    ctx.moveTo(192, 155);
    ctx.lineTo(225, 180);
    ctx.lineTo(192, 205);
    ctx.fill();

    // Flecha 2: Inferior izquierda a superior derecha
    ctx.beginPath();
    ctx.moveTo(35, 180);
    ctx.lineTo(85, 180);
    ctx.bezierCurveTo(115, 180, 122, 145, 130, 128);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(145, 105);
    ctx.bezierCurveTo(153, 90, 160, 75, 175, 75);
    ctx.lineTo(210, 75);
    ctx.stroke();

    // Punta flecha 2
    ctx.beginPath();
    ctx.moveTo(192, 50);
    ctx.lineTo(225, 75);
    ctx.lineTo(192, 100);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  // Animación física del pulsador (amortiguación suave al presionar)
  useFrame((_, delta) => {
    if (buttonMeshRef.current) {
      const targetZ = isPressed ? -0.012 : isHovered ? 0.003 : 0;
      pressZ.current = THREE.MathUtils.damp(pressZ.current, targetZ, 18, delta);
      buttonMeshRef.current.position.z = pressZ.current;
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    audioEngine?.playClick();

    // Feedback táctil instantáneo
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 140);

    const state = useEraStore.getState();
    const currentCountry = state.currentCountry;
    const currentYear = state.currentYear;

    // Seleccionar un país aleatorio (distinto si es posible)
    const availableCountries = COUNTRIES.map((c) => c.code);
    const otherCountries = availableCountries.filter((c) => c !== currentCountry);
    const randomCountry =
      otherCountries.length > 0
        ? otherCountries[Math.floor(Math.random() * otherCountries.length)]
        : availableCountries[Math.floor(Math.random() * availableCountries.length)];

    // Seleccionar un año histórico aleatorio entre 1970 y 2024 (distinto si es posible)
    const minYear = 1970;
    const maxYear = 2024;
    let randomYear = Math.floor(Math.random() * (maxYear - minYear + 1)) + minYear;
    if (randomYear === currentYear) {
      randomYear = randomYear < maxYear ? randomYear + 1 : randomYear - 1;
    }

    useEraStore.getState().triggerGlitch?.(500);

    useEraStore.setState({
      currentCountry: randomCountry,
      currentYear: randomYear,
      targetTrack: null,
    });

    trackEvent('random_tune_clicked', { country: randomCountry, year: randomYear });
  };

  return (
    <group position={position}>
      {/* Marco exterior biselado (zócalo de inserción) */}
      <RoundedBox args={[0.38, 0.22, 0.025]} radius={0.025} smoothness={4} position={[0, 0, -0.01]}>
        <meshStandardMaterial color="#14141e" roughness={0.7} metalness={0.4} />
      </RoundedBox>

      {/* Bisel decorativo interior */}
      <RoundedBox args={[0.34, 0.18, 0.015]} radius={0.02} smoothness={4} position={[0, 0, 0]}>
        <meshStandardMaterial color="#0c0c14" roughness={0.9} metalness={0.2} />
      </RoundedBox>

      {/* Pulsador móvil */}
      <group
        ref={buttonMeshRef}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          setIsHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setIsHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        {/* Cuerpo del botón táctil */}
        <RoundedBox args={[0.31, 0.15, 0.03]} radius={0.018} smoothness={4} position={[0, 0, 0.015]}>
          <meshStandardMaterial
            color={isHovered ? '#26283b' : '#1c1e2b'}
            roughness={0.4}
            metalness={0.5}
            emissive={isHovered ? '#ff8800' : '#442200'}
            emissiveIntensity={isHovered ? 0.35 : 0.08}
          />
        </RoundedBox>

        {/* Ícono de Shuffle / Random */}
        {shuffleTexture && (
          <mesh position={[0, 0.022, 0.032]}>
            <planeGeometry args={[0.09, 0.09]} />
            <meshStandardMaterial
              map={shuffleTexture}
              transparent
              roughness={0.3}
              metalness={0.2}
              emissive="#ff8800"
              emissiveIntensity={isHovered ? 2.6 : 1.4}
              toneMapped={false}
            />
          </mesh>
        )}

        {/* Etiqueta de texto: RANDOM */}
        <Text
          position={[0, -0.038, 0.032]}
          fontSize={0.030}
          color={isHovered ? '#ffffff' : '#ffaa44'}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.14}
        >
          RANDOM
          <meshStandardMaterial
            color={isHovered ? '#ffffff' : '#ff8c33'}
            emissive={isHovered ? '#ffaa44' : '#cc5500'}
            emissiveIntensity={isHovered ? 3.0 : 1.5}
            toneMapped={false}
          />
        </Text>
      </group>
    </group>
  );
}
