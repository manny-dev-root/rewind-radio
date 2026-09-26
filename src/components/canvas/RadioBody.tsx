'use client';

import { RoundedBox, Text } from '@react-three/drei';

/** Chasis de radio vintage estático inspirado en Braun / Teenage Engineering / Dieter Rams */
export function RadioBody() {
  return (
    <group>
      {/* Cuerpo principal con mayor margen respecto al panel frontal */}
      <RoundedBox args={[6.4, 3.36, 1.25]} radius={0.12} smoothness={4} position={[0, 0, -0.02]}>
        <meshStandardMaterial color="#161622" roughness={0.6} metalness={0.5} />
      </RoundedBox>

      {/* Placa metálica frontal */}
      <RoundedBox args={[5.6, 2.6, 0.08]} radius={0.05} smoothness={4} position={[0, 0, 0.58]}>
        <meshStandardMaterial color="#242432" roughness={0.4} metalness={0.7} />
      </RoundedBox>

      {/* Rejilla de altavoz izquierda */}
      <group position={[-1.6, 0.15, 0.63]}>
        {Array.from({ length: 9 }).map((_, i) => (
          <mesh key={i} position={[0, (i - 4) * 0.24, 0]}>
            <boxGeometry args={[1.4, 0.08, 0.02]} />
            <meshStandardMaterial color="#0a0a12" roughness={0.8} metalness={0.3} />
          </mesh>
        ))}
        {/* Marco de la rejilla */}
        <RoundedBox args={[1.6, 2.3, 0.04]} radius={0.03} smoothness={2} position={[0, 0, -0.01]}>
          <meshStandardMaterial color="#1c1c26" roughness={0.5} metalness={0.6} />
        </RoundedBox>
      </group>

      {/* Ventana visor superior (Pantalla LED Marquesina + Espectro Musical) */}
      <RoundedBox args={[2.5, 0.82, 0.05]} radius={0.04} smoothness={4} position={[0.9, 0.72, 0.6]}>
        <meshStandardMaterial color="#08080f" roughness={0.9} metalness={0.1} />
      </RoundedBox>

      {/* Ventana visor inferior (Sintonizador Horizontal de Tracks) */}
      <RoundedBox args={[2.5, 0.38, 0.05]} radius={0.04} smoothness={4} position={[0.9, 0.05, 0.6]}>
        <meshStandardMaterial color="#08080f" roughness={0.9} metalness={0.1} />
      </RoundedBox>

      {/* LED de encendido */}
      <mesh position={[2.55, 1.15, 0.65]}>
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshStandardMaterial
          color="#00ff88"
          emissive="#00ff88"
          emissiveIntensity={3}
          toneMapped={false}
        />
      </mesh>

      {/* Marca del equipo: REWIND RADIO */}
      <Text
        position={[-1.6, -1.15, 0.64]}
        fontSize={0.11}
        color="#777788"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.18}
      >
        REWIND RADIO
      </Text>

      {/* Divisor del panel inferior */}
      <mesh position={[0, -0.42, 0.63]}>
        <boxGeometry args={[5.4, 0.008, 0.01]} />
        <meshStandardMaterial color="#2d2d3d" roughness={0.5} metalness={0.5} />
      </mesh>

      {/* Patas de apoyo */}
      {[[-2.5, 0.4], [-2.5, -0.4], [2.5, 0.4], [2.5, -0.4]].map(([x, z], i) => (
        <mesh key={i} position={[x, -1.72, z]}>
          <cylinderGeometry args={[0.08, 0.1, 0.08, 16]} />
          <meshStandardMaterial color="#111118" roughness={0.6} metalness={0.5} />
        </mesh>
      ))}
    </group>
  );
}
