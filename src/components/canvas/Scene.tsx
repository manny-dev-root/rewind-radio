'use client';

import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { RadioBody } from './RadioBody';
import { Dial } from './Dial';
import { NixieDisplay } from './NixieDisplay';
import { AudioSpectrum } from './AudioSpectrum';
import { HorizontalTuner } from './HorizontalTuner';
import { RankingDisplay } from './RankingDisplay';
import { RandomButton } from './RandomButton';
import { PlaybackButtons } from './PlaybackButtons';
import { EraEffects } from './EraEffects';
import { AudioReactiveLights } from './AudioReactiveLights';
import { useEraStore } from '@/store/useEraStore';
import { COUNTRIES, YEAR_MIN, YEAR_MAX } from '@/lib/constants';
import { audioEngine } from '@/lib/audio-engine';
import { trackEvent } from '@/lib/analytics';

function SceneContent() {
  const currentYear = useEraStore((s) => s.currentYear);
  const currentCountry = useEraStore((s) => s.currentCountry);
  const trackIndex = useEraStore((s) => s.trackIndex);
  const isTuning = useEraStore((s) => s.isTuning);
  const isGlitching = useEraStore((s) => s.isGlitching ?? false);
  const tuneData = useEraStore((s) => s.tuneData);
  const setYear = useEraStore((s) => s.setYear);
  const setCountry = useEraStore((s) => s.setCountry);
  const setTrackIndex = useEraStore((s) => s.setTrackIndex);

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = YEAR_MIN; y <= YEAR_MAX; y++) list.push(y);
    return list;
  }, []);

  const countryCodes = useMemo((): string[] => COUNTRIES.map((c) => c.code), []);

  const yearIndex = useMemo(() => {
    const idx = years.indexOf(currentYear);
    return idx >= 0 ? idx : 0;
  }, [years, currentYear]);

  const countryIndex = useMemo(() => {
    const idx = countryCodes.indexOf(currentCountry);
    return idx >= 0 ? idx : 0;
  }, [countryCodes, currentCountry]);

  // Playlist de temas verificados para el año/país (de 0 hasta 10)
  const playlist = useMemo(() => {
    if (!tuneData) return [];
    if (Array.isArray(tuneData.playlist)) {
      return tuneData.playlist.filter((t) => Boolean(t.previewUrl));
    }
    return tuneData.track?.previewUrl ? [tuneData.track] : [];
  }, [tuneData]);

  const hasNoData = Boolean(tuneData && playlist.length === 0 && !isTuning);
  const activeTrack = playlist[trackIndex] || playlist[0];

  const handleTrackChange = (newIndex: number) => {
    if (newIndex === trackIndex) return;
    const selected = playlist[newIndex];
    trackEvent('tuner_track_selected', {
      track_index: newIndex + 1,
      title: selected?.title,
      artist: selected?.artist,
      year: currentYear,
      country: currentCountry,
    });
    useEraStore.getState().triggerGlitch?.(350);
    setTrackIndex(newIndex);
    if (selected?.previewUrl) {
      audioEngine?.transitionBetweenTracks(selected.previewUrl);
    }
  };

  return (
    <>
      <color attach="background" args={['#08080f']} />
      <fog attach="fog" args={['#08080f', 6, 18]} />

      {/* Iluminación frontal calibrada y simétrica para ambos diales */}
      <ambientLight intensity={0.65} />
      <directionalLight position={[0.9, 4, 7]} intensity={1.2} />
      <directionalLight position={[-3.5, 3.5, 6]} intensity={0.9} />
      <directionalLight position={[3.5, 3.5, 6]} intensity={0.9} />

      <AudioReactiveLights />

      {/* Chasis de la radio */}
      <RadioBody />

      {/* Pantalla LCD izquierda: Ranking Más Escuchadas */}
      <RankingDisplay position={[-1.6, 0.495, 0.635]} />

      {/* Display LCD superior con Marquesina recortada por hardware */}
      <NixieDisplay
        year={currentYear}
        country={currentCountry}
        songTitle={activeTrack?.title}
        artist={activeTrack?.artist}
        trackRank={trackIndex + 1}
        hasNoData={hasNoData}
        isTuning={isTuning}
      />

      {/* Espectro musical 3D debajo del texto dentro del visor LCD */}
      <AudioSpectrum position={[0.9, 0.51, 0.64]} barsCount={20} width={2.2} maxHeight={0.14} />

      {/* Sintonizador horizontal con marcas adaptativas (1..N, tope 10) y aguja digital */}
      <HorizontalTuner
        position={[0.9, 0.16, 0.635]}
        trackCount={playlist.length}
        currentIndex={trackIndex}
        onChange={handleTrackChange}
        width={2.16}
      />

      {/* Trío de botones físicos táctiles estilo vintage: Anterior, Play/Pausa, Siguiente */}
      <PlaybackButtons position={[0.90, -0.14, 0.635]} />

      {/* Dial de año compacto con pantalla LED integrada en el centro */}
      <Dial
        position={[0.26, -0.78, 0.64]}
        values={years}
        currentIndex={yearIndex}
        onChange={(idx) => {
          const selectedYear = years[idx];
          if (selectedYear !== currentYear) {
            trackEvent('dial_year_changed', { year: selectedYear, country: currentCountry });
            setYear(selectedYear);
          }
        }}
        label="AÑO"
        color="#242636"
        radius={0.30}
      />

      {/* Botón rectangular táctil de reproducción aleatoria (Shuffle) */}
      <RandomButton position={[0.90, -0.78, 0.64]} />

      {/* Dial de país compacto con pantalla LED integrada en el centro */}
      <Dial
        position={[1.54, -0.78, 0.64]}
        values={countryCodes}
        currentIndex={countryIndex}
        onChange={(idx) => {
          const selectedCountry = countryCodes[idx];
          if (selectedCountry !== currentCountry) {
            trackEvent('dial_country_changed', { country: selectedCountry, year: currentYear });
            setCountry(selectedCountry);
          }
        }}
        label="PAÍS"
        color="#242636"
        radius={0.30}
      />

      <EraEffects year={currentYear} isGlitching={isGlitching} />
    </>
  );
}

export function Scene() {
  return (
    <Canvas
      gl={{
        antialias: false,
        powerPreference: 'high-performance',
        localClippingEnabled: true,
      }}
      camera={{ position: [0, 0.08, 6.2], fov: 39 }}
    >
      <SceneContent />
    </Canvas>
  );
}

export default Scene;
