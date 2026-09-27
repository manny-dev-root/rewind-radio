'use client';

import { useRef, useState, useMemo } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useEraStore } from '@/store/useEraStore';
import { audioEngine } from '@/lib/audio-engine';
import { COUNTRIES, YEAR_MIN, YEAR_MAX } from '@/lib/constants';
import { trackEvent } from '@/lib/analytics';

interface PhysicalButtonProps {
  position: [number, number, number];
  iconTexture: THREE.CanvasTexture | null;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
  title: string;
}

/**
 * Subcomponente de botón físico táctil individual con amortiguación de resorte y biseles retro.
 */
function PhysicalButton({ position, iconTexture, onClick, title }: PhysicalButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const buttonMeshRef = useRef<THREE.Group>(null);
  const pressZ = useRef(0);

  useFrame((_, delta) => {
    if (buttonMeshRef.current) {
      const targetZ = isPressed ? -0.010 : isHovered ? 0.003 : 0;
      pressZ.current = THREE.MathUtils.damp(pressZ.current, targetZ, 20, delta);
      buttonMeshRef.current.position.z = pressZ.current;
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 130);
    onClick(e);
  };

  return (
    <group position={position}>
      {/* Marco exterior biselado (zócalo empotrado en el chasis) */}
      <RoundedBox args={[0.26, 0.145, 0.022]} radius={0.018} smoothness={4} position={[0, 0, -0.008]}>
        <meshStandardMaterial color="#14141e" roughness={0.7} metalness={0.4} />
      </RoundedBox>

      {/* Bisel decorativo interior */}
      <RoundedBox args={[0.23, 0.118, 0.014]} radius={0.014} smoothness={4} position={[0, 0, 0]}>
        <meshStandardMaterial color="#0c0c14" roughness={0.9} metalness={0.2} />
      </RoundedBox>

      {/* Pulsador móvil */}
      <group
        ref={buttonMeshRef}
        onClick={handleClick}
        onPointerEnter={(e) => {
          e.stopPropagation();
          setIsHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerLeave={(e) => {
          e.stopPropagation();
          setIsHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        {/* Cuerpo del botón */}
        <RoundedBox args={[0.205, 0.098, 0.026]} radius={0.012} smoothness={4} position={[0, 0, 0.013]}>
          <meshStandardMaterial
            color={isHovered ? '#26283b' : '#1c1e2b'}
            roughness={0.4}
            metalness={0.5}
            emissive={isHovered ? '#ff8800' : '#442200'}
            emissiveIntensity={isHovered ? 0.35 : 0.08}
          />
        </RoundedBox>

        {/* Ícono vectorial iluminado (raycast={null} para no interferir con el hover del botón) */}
        {iconTexture && (
          <mesh position={[0, 0, 0.027]} raycast={() => null}>
            <planeGeometry args={[0.07, 0.07]} />
            <meshStandardMaterial
              map={iconTexture}
              transparent
              roughness={0.3}
              metalness={0.2}
              emissive="#ff8800"
              emissiveIntensity={isHovered ? 3.0 : 1.6}
              toneMapped={false}
            />
          </mesh>
        )}
      </group>
    </group>
  );
}

interface PlaybackButtonsProps {
  position?: [number, number, number];
}

/**
 * Trío de botones físicos táctiles (Anterior, Play/Pause, Siguiente) estilo radio antigua.
 * Reemplaza el texto "Sintonizador · X temas encontrados" debajo de la regla del sintonizador.
 */
export function PlaybackButtons({ position = [0.90, -0.15, 0.635] }: PlaybackButtonsProps) {
  const isPlaying = useEraStore((state) => state.isPlaying);

  // 1. Textura del ícono: CANCIÓN ANTERIOR (|◀)
  const prevTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 256, 256);
    ctx.fillStyle = '#ffaa33';

    // Barra vertical izquierda
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(46, 64, 24, 128, 6);
      ctx.fill();
    } else {
      ctx.fillRect(46, 64, 24, 128);
    }

    // Triángulo apuntando a la izquierda
    ctx.beginPath();
    ctx.moveTo(82, 128);
    ctx.lineTo(206, 60);
    ctx.lineTo(206, 196);
    ctx.closePath();
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  // 2. Textura del ícono: PLAY / PAUSA
  const playPauseTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 256, 256);
    ctx.fillStyle = '#ffaa33';

    if (isPlaying) {
      // Ícono de PAUSA (dos barras verticales)
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(72, 64, 34, 128, 7);
        ctx.roundRect(150, 64, 34, 128, 7);
        ctx.fill();
      } else {
        ctx.fillRect(72, 64, 34, 128);
        ctx.fillRect(150, 64, 34, 128);
      }
    } else {
      // Ícono de PLAY (triángulo a la derecha)
      ctx.beginPath();
      ctx.moveTo(82, 60);
      ctx.lineTo(204, 128);
      ctx.lineTo(82, 196);
      ctx.closePath();
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, [isPlaying]);

  // 3. Textura del ícono: CANCIÓN SIGUIENTE (▶|)
  const nextTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, 256, 256);
    ctx.fillStyle = '#ffaa33';

    // Triángulo apuntando a la derecha
    ctx.beginPath();
    ctx.moveTo(50, 60);
    ctx.lineTo(174, 128);
    ctx.lineTo(50, 196);
    ctx.closePath();
    ctx.fill();

    // Barra vertical derecha
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(186, 64, 24, 128, 6);
      ctx.fill();
    } else {
      ctx.fillRect(186, 64, 24, 128);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  const handlePrev = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    audioEngine?.playClick();
    const state = useEraStore.getState();
    const playlist = state.tuneData?.playlist?.filter((t) => Boolean(t.previewUrl)) ?? [];
    if (playlist.length === 0) return;

    let prevIdx = state.trackIndex - 1;
    if (prevIdx < 0) {
      prevIdx = playlist.length - 1;
    }

    trackEvent('playback_prev_clicked', {
      from_index: state.trackIndex + 1,
      to_index: prevIdx + 1,
      year: state.currentYear,
      country: state.currentCountry,
    });

    state.triggerGlitch?.(350);
    state.setTrackIndex(prevIdx);
    const prevTrack = playlist[prevIdx];
    if (prevTrack?.previewUrl) {
      audioEngine?.transitionBetweenTracks(prevTrack.previewUrl);
    }
  };

  const handlePlayPause = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    audioEngine?.playClick();
    const state = useEraStore.getState();
    const willPlay = !state.isPlaying;
    const playlist = state.tuneData?.playlist?.filter((t) => Boolean(t.previewUrl)) ?? [];
    const activeTrack = playlist[state.trackIndex] ?? state.tuneData?.track;

    trackEvent('playback_play_pause_clicked', {
      action: willPlay ? 'play' : 'pause',
      title: activeTrack?.title,
      artist: activeTrack?.artist,
      year: state.currentYear,
      country: state.currentCountry,
    });

    audioEngine?.togglePlayPause();
  };

  const handleNext = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    audioEngine?.playClick();
    const state = useEraStore.getState();
    const playlist = state.tuneData?.playlist?.filter((t) => Boolean(t.previewUrl)) ?? [];
    if (playlist.length === 0) return;

    // Si aún quedan canciones en el top 10 del año
    if (state.trackIndex + 1 < playlist.length) {
      const nextIdx = state.trackIndex + 1;
      const nextTrack = playlist[nextIdx];

      trackEvent('playback_next_clicked', {
        from_index: state.trackIndex + 1,
        to_index: nextIdx + 1,
        title: nextTrack?.title,
        artist: nextTrack?.artist,
        year: state.currentYear,
        country: state.currentCountry,
      });

      state.triggerGlitch?.(350);
      state.setTrackIndex(nextIdx);
      if (nextTrack?.previewUrl) {
        audioEngine?.transitionBetweenTracks(nextTrack.previewUrl);
      }
      return;
    }

    // Terminó el top 10 -> avanzar al siguiente año
    if (state.currentYear < YEAR_MAX) {
      const nextYear = state.currentYear + 1;
      trackEvent('playback_next_clicked', {
        action: 'next_year',
        from_year: state.currentYear,
        to_year: nextYear,
        country: state.currentCountry,
      });
      state.triggerGlitch?.(500);
      state.setYear(nextYear);
    } else {
      // Llegó a 2026 -> avanzar país y volver a 1970
      const cIdx = COUNTRIES.findIndex((c) => c.code === state.currentCountry);
      const nextCIdx = (cIdx + 1) % COUNTRIES.length;
      const nextCountry = COUNTRIES[nextCIdx].code;

      trackEvent('playback_next_clicked', {
        action: 'next_country',
        from_country: state.currentCountry,
        to_country: nextCountry,
        year: YEAR_MIN,
      });

      state.triggerGlitch?.(600);
      useEraStore.setState({
        currentCountry: nextCountry,
        currentYear: YEAR_MIN,
        trackIndex: 0,
        targetTrack: null,
      });
    }
  };

  return (
    <group position={position}>
      {/* Botón 1: Canción Anterior */}
      <PhysicalButton
        position={[-0.34, 0, 0]}
        iconTexture={prevTexture}
        onClick={handlePrev}
        title="Canción Anterior"
      />

      {/* Botón 2: Play / Pausa */}
      <PhysicalButton
        position={[0, 0, 0]}
        iconTexture={playPauseTexture}
        onClick={handlePlayPause}
        title={isPlaying ? 'Pausar' : 'Reproducir'}
      />

      {/* Botón 3: Canción Siguiente */}
      <PhysicalButton
        position={[0.34, 0, 0]}
        iconTexture={nextTexture}
        onClick={handleNext}
        title="Canción Siguiente"
      />
    </group>
  );
}
