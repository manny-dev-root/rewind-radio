'use client';

import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { COUNTRIES } from '@/lib/constants';

export interface NixieDisplayProps {
  year: number;
  country: string;
  songTitle?: string;
  artist?: string;
  trackRank?: number;
  hasNoData?: boolean;
  isTuning?: boolean;
}

/** Display LCD ámbar con marquesina continua recortada exactamente dentro del visor */
export function NixieDisplay({
  year,
  country,
  songTitle,
  artist,
  trackRank = 1,
  hasNoData = false,
  isTuning = false,
}: NixieDisplayProps) {
  const marqueeGroupRef = useRef<THREE.Group>(null);
  const offsetRef = useRef(0);

  // Planos de recorte hardware (WebGL localClipping) para los bordes exactos del visor LCD [x: -0.31 a +2.11]
  const clipPlanes = useMemo(
    () => [
      new THREE.Plane(new THREE.Vector3(1, 0, 0), 0.31),
      new THREE.Plane(new THREE.Vector3(-1, 0, 0), 2.11),
    ],
    []
  );

  const countryFullName = useMemo(() => {
    const found = COUNTRIES.find((c) => c.code === country);
    return (found ? found.name : country).toUpperCase();
  }, [country]);

  // Marquesina inferior: únicamente Título de la canción y Artista
  const marqueeUnit = useMemo(() => {
    if (isTuning) {
      return `SINTONIZANDO EMISORA...     ✦     `;
    }
    if (hasNoData) {
      return `SIN DATOS PARA ESTE AÑO     ✦     `;
    }
    if (songTitle && artist) {
      return `#${trackRank} ${songTitle}  —  ${artist}     ✦     `;
    }
    return `SINTONIZANDO EMISORA...     ✦     `;
  }, [trackRank, songTitle, artist, hasNoData, isTuning]);

  // Calculamos el ancho aproximado de una unidad para un loop infinito sin saltos
  const unitWidth = useMemo(() => marqueeUnit.length * 0.068, [marqueeUnit]);

  useEffect(() => {
    offsetRef.current = 0;
  }, [year, country, songTitle, artist, trackRank, hasNoData, isTuning]);

  useFrame((_, delta) => {
    offsetRef.current = (offsetRef.current + delta * 0.38) % Math.max(1, unitWidth);
    if (marqueeGroupRef.current) {
      marqueeGroupRef.current.position.x = -1.15 - offsetRef.current;
    }
  });

  return (
    <group position={[0.9, 0.85, 0.635]}>
      {/* Luces puntuales de retroiluminación LCD */}
      <pointLight color="#ff7700" intensity={1.0} distance={2.5} position={[0, 0, 0.25]} />

      {/* Línea superior fija del LCD: Nombre completo del País + Año */}
      <Text
        position={[0, 0.11, 0]}
        fontSize={0.11}
        color="#ff8c33"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.06}
      >
        {`${countryFullName} · ${year}`}
        <meshStandardMaterial
          color="#ff6a00"
          emissive="#ff6a00"
          emissiveIntensity={3.2}
          toneMapped={false}
          clippingPlanes={clipPlanes}
        />
      </Text>

      {/* Línea de Marquesina Móvil (Solo Título y Artista) estrictamente dentro del LCD */}
      <group position={[0, -0.06, 0]}>
        <group ref={marqueeGroupRef} position={[-1.15, 0, 0]}>
          <Text
            fontSize={0.105}
            color="#ff9933"
            anchorX="left"
            anchorY="middle"
            letterSpacing={0.03}
          >
            {marqueeUnit.repeat(4)}
            <meshStandardMaterial
              color="#ff7700"
              emissive="#ff7700"
              emissiveIntensity={2.9}
              toneMapped={false}
              clippingPlanes={clipPlanes}
            />
          </Text>
        </group>
      </group>
    </group>
  );
}
