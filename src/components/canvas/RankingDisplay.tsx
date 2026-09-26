'use client';

import { useState, useEffect } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { Text, RoundedBox } from '@react-three/drei';
import { useEraStore } from '@/store/useEraStore';
import { audioEngine } from '@/lib/audio-engine';
import { cleanSongTitle } from '@/lib/music-catalog';
import { trackEvent } from '@/lib/analytics';
import type { TrackPlayRecord } from '@/lib/db';

interface RankingDisplayProps {
  position?: [number, number, number];
  width?: number;
  height?: number;
}

/** Trunca el título y artista con elipsis si excede el ancho de la columna (aprovechando el espacio antes de PLAYS) */
function formatSongAndArtist(title: string, artist: string, maxLen = 40): string {
  const cleanT = title.trim();
  const cleanA = artist.trim();
  const combined = cleanA ? `${cleanT} - ${cleanA}` : cleanT;
  const upper = combined.toUpperCase();
  if (upper.length <= maxLen) return upper;
  return upper.slice(0, maxLen - 1) + '…';
}

/** Comprueba si la canción del ranking coincide con la que está actualmente sonando */
function isPlayingCurrentTrack(
  item: TrackPlayRecord,
  current: { title: string; artist: string } | null
): boolean {
  if (!current || !current.title) return false;
  const t1 = item.title.trim().toLowerCase();
  const t2 = current.title.trim().toLowerCase();
  if (t1 === t2) return true;

  const c1 = cleanSongTitle(t1);
  const c2 = cleanSongTitle(t2);
  if (c1.length > 2 && c2.length > 2 && (c1 === c2 || c1.includes(c2) || c2.includes(c1))) {
    const a1 = item.artist.trim().toLowerCase();
    const a2 = current.artist.trim().toLowerCase();
    if (!a1 || !a2 || a1.includes(a2) || a2.includes(a1)) return true;
  }
  return false;
}

/**
 * Pantalla LCD izquierda de la radio con estética retro-ámbar.
 * Muestra el Top 7 de canciones "Más Escuchadas" en 3 columnas (#, TITULO · ARTISTA, PLAYS)
 * con tipografía grande, mayor separación y resaltado activo cuando la canción está sonando o con hover.
 */
export function RankingDisplay({
  position = [-1.6, 0.495, 0.62],
  width = 1.56,
  height = 1.27,
}: RankingDisplayProps) {
  const [ranking, setRanking] = useState<TrackPlayRecord[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const tuneData = useEraStore((state) => state.tuneData);
  const trackIndex = useEraStore((state) => state.trackIndex);
  const currentTrack = tuneData?.playlist?.[trackIndex] ?? tuneData?.track ?? null;

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetch('/api/ranking?limit=10');
        if (res.ok && isMounted) {
          const data = (await res.json()) as { ranking?: TrackPlayRecord[] };
          if (data.ranking && data.ranking.length > 0) {
            setRanking(data.ranking);
          }
        }
      } catch {}
    };

    load();
    const interval = setInterval(load, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleTrackClick = (track: TrackPlayRecord, e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    audioEngine?.playClick();
    trackEvent('ranking_track_clicked', {
      title: track.title,
      artist: track.artist,
      country: track.country,
      year: track.year,
      plays: track.play_count,
    });
    useEraStore.setState({
      currentCountry: track.country,
      currentYear: track.year,
      targetTrack: { title: track.title, artist: track.artist },
    });
  };

  const halfW = width / 2;
  const halfH = height / 2;

  // Mostramos exactamente 7 posiciones (#1 a #7) con mayor separación entre filas
  const displayItems = ranking.slice(0, 7);
  const rowHeight = 0.110;
  const rowStep = 0.124;

  // Posiciones X calibradas de las 3 columnas con ancho para título y artista
  const colPosRank = -halfW + 0.07;
  const colPosTitle = -halfW + 0.17;
  const colPosPlays = halfW - 0.07;

  return (
    <group position={position}>
      {/* Marco exterior biselado del visor LCD */}
      <RoundedBox args={[width + 0.08, height + 0.08, 0.04]} radius={0.03} smoothness={4} position={[0, 0, -0.02]}>
        <meshStandardMaterial color="#1a1a26" roughness={0.6} metalness={0.5} />
      </RoundedBox>

      {/* Cristal / Fondo LCD oscuro uniforme */}
      <RoundedBox args={[width, height, 0.03]} radius={0.025} smoothness={4} position={[0, 0, 0]}>
        <meshStandardMaterial color="#07070d" roughness={0.95} metalness={0.05} />
      </RoundedBox>

      {/* Contenido en pantalla (sin pointLight para iluminación completamente uniforme) */}
      <group position={[0, 0, 0.02]}>
        {/* Título Principal */}
        <Text
          position={[0, halfH - 0.08, 0]}
          fontSize={0.074}
          color="#ffaa44"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.12}
        >
          MÁS ESCUCHADAS
          <meshStandardMaterial
            color="#ff8c33"
            emissive="#ff6600"
            emissiveIntensity={2.8}
            toneMapped={false}
          />
        </Text>

        {/* Cabecera de 3 Columnas: #, TÍTULO · ARTISTA, PLAYS (con mayor separación respecto al título) */}
        <group position={[0, halfH - 0.25, 0]}>
          <Text
            position={[colPosRank, 0, 0]}
            fontSize={0.036}
            color="#aa7733"
            anchorX="left"
            anchorY="middle"
            letterSpacing={0.06}
          >
            #
            <meshStandardMaterial color="#885522" emissive="#553311" emissiveIntensity={1.2} toneMapped={false} />
          </Text>

          <Text
            position={[colPosTitle, 0, 0]}
            fontSize={0.036}
            color="#aa7733"
            anchorX="left"
            anchorY="middle"
            letterSpacing={0.08}
          >
            TÍTULO · ARTISTA
            <meshStandardMaterial color="#885522" emissive="#553311" emissiveIntensity={1.2} toneMapped={false} />
          </Text>

          <Text
            position={[colPosPlays, 0, 0]}
            fontSize={0.036}
            color="#aa7733"
            anchorX="right"
            anchorY="middle"
            letterSpacing={0.08}
          >
            PLAYS
            <meshStandardMaterial color="#885522" emissive="#553311" emissiveIntensity={1.2} toneMapped={false} />
          </Text>

          {/* Línea divisoria fina */}
          <mesh position={[0, -0.032, 0]}>
            <boxGeometry args={[width - 0.14, 0.005, 0.002]} />
            <meshStandardMaterial color="#663311" emissive="#442200" emissiveIntensity={0.9} />
          </mesh>
        </group>

        {/* Las 7 filas del Top (#1 a #7) con mayor separación */}
        {displayItems.map((item, idx) => {
          const rowY = 0.26 - idx * rowStep;
          const isHovered = hoveredIndex === idx;
          const isCurrentPlaying = isPlayingCurrentTrack(item, currentTrack);
          const isHighlighted = isHovered || isCurrentPlaying;

          return (
            <group key={item.id} position={[0, rowY, 0]}>
              {/* Barra interactiva permanente que cubre de manera uniforme todo el ancho y alto de la fila */}
              <mesh
                position={[0, 0, 0.001]}
                onClick={(e) => handleTrackClick(item, e)}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  setHoveredIndex(idx);
                  document.body.style.cursor = 'pointer';
                }}
                onPointerOut={(e) => {
                  e.stopPropagation();
                  setHoveredIndex(null);
                  document.body.style.cursor = 'auto';
                }}
              >
                <planeGeometry args={[width - 0.10, rowHeight]} />
                <meshBasicMaterial
                  color="#ff8800"
                  transparent
                  opacity={isHighlighted ? 0.22 : 0}
                  depthWrite={false}
                />
              </mesh>

              {/* Columna 1: # Posición */}
              <Text
                position={[colPosRank, 0, 0.003]}
                fontSize={0.048}
                color={isHighlighted ? '#ffffff' : '#ffaa44'}
                anchorX="left"
                anchorY="middle"
                letterSpacing={0.02}
              >
                {`${idx + 1}`}
                <meshStandardMaterial
                  color={isHighlighted ? '#ffffff' : '#ff8c33'}
                  emissive={isHighlighted ? '#ffaa44' : '#ff6a00'}
                  emissiveIntensity={isHighlighted ? 3.4 : 2.2}
                  toneMapped={false}
                />
              </Text>

              {/* Columna 2: Título + Artista */}
              <Text
                position={[colPosTitle, 0, 0.003]}
                fontSize={0.048}
                color={isHighlighted ? '#ffffff' : '#ffaa44'}
                anchorX="left"
                anchorY="middle"
                letterSpacing={0.02}
              >
                {formatSongAndArtist(item.title, item.artist, 40)}
                <meshStandardMaterial
                  color={isHighlighted ? '#ffffff' : '#ff8c33'}
                  emissive={isHighlighted ? '#ffaa44' : '#ff6a00'}
                  emissiveIntensity={isHighlighted ? 3.4 : 2.2}
                  toneMapped={false}
                />
              </Text>

              {/* Columna 3: Contador de reproducciones fijo a la derecha */}
              <Text
                position={[colPosPlays, 0, 0.003]}
                fontSize={0.048}
                color={isHighlighted ? '#ffffff' : '#ffaa44'}
                anchorX="right"
                anchorY="middle"
                letterSpacing={0.02}
              >
                {`${item.play_count}`}
                <meshStandardMaterial
                  color={isHighlighted ? '#ffffff' : '#ff8c33'}
                  emissive={isHighlighted ? '#ffaa44' : '#ff6a00'}
                  emissiveIntensity={isHighlighted ? 3.4 : 2.2}
                  toneMapped={false}
                />
              </Text>
            </group>
          );
        })}
      </group>
    </group>
  );
}
