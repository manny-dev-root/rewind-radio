'use client';

import { useMemo, useRef } from 'react';
import { useEraStore } from '@/store/useEraStore';
import { COUNTRIES, YEAR_MIN, YEAR_MAX } from '@/lib/constants';
import { audioEngine } from '@/lib/audio-engine';
import { trackEvent } from '@/lib/analytics';
import { RankingVisor } from './RankingVisor';
import { MainDisplay } from './MainDisplay';
import { HorizontalTuner } from './HorizontalTuner';
import { PlaybackControls } from './PlaybackControls';
import { DialKnob } from './DialKnob';
import { RandomButton } from './RandomButton';
import { VolumeFader } from './VolumeFader';

export function RadioChassis() {
  const currentYear = useEraStore((s) => s.currentYear);
  const currentCountry = useEraStore((s) => s.currentCountry);
  const trackIndex = useEraStore((s) => s.trackIndex);
  const isTuning = useEraStore((s) => s.isTuning);
  const tuneData = useEraStore((s) => s.tuneData);
  const setYear = useEraStore((s) => s.setYear);
  const setCountry = useEraStore((s) => s.setCountry);
  const setTrackIndex = useEraStore((s) => s.setTrackIndex);

  const containerRef = useRef<HTMLDivElement>(null);

  // Lista de años disponibles (1950 a 2024)
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

  const playlist = useMemo(() => {
    if (!tuneData) return [];
    if (Array.isArray(tuneData.playlist) && tuneData.playlist.length > 0) {
      return tuneData.playlist;
    }
    return tuneData.track ? [tuneData.track] : [];
  }, [tuneData]);

  const hasNoData = Boolean(tuneData && playlist.length === 0 && !isTuning);
  const activeTrack = playlist[trackIndex] || playlist[0];

  const handleTrackChange = (newIndex: number) => {
    if (newIndex === trackIndex) return;
    const selected = playlist[newIndex];
    if (!selected) return;

    trackEvent('tuner_track_selected', {
      track_index: newIndex + 1,
      title: selected.title,
      artist: selected.artist,
      year: currentYear,
      country: currentCountry,
    });
    setTrackIndex(newIndex);
    if (selected.previewUrl) {
      audioEngine?.transitionBetweenTracks(selected.previewUrl);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-3 sm:p-6 lg:p-8">
      {/* Chasis exterior estático de la radio con patas y sombra volumétrica profunda */}
      <div
        ref={containerRef}
        className="w-full max-w-[1160px] xl:max-w-[1240px] bg-gradient-to-b from-[#181926] via-[#141520] to-[#0c0d14] rounded-[32px] p-4 sm:p-6 lg:p-7 shadow-[0_35px_80px_-15px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.06)] relative"
      >
        {/* Patas de apoyo inferiores vintage */}
        <div className="absolute -bottom-3 left-12 w-20 h-3 bg-[#0a0a0f] rounded-b-md shadow-lg" />
        <div className="absolute -bottom-3 right-12 w-20 h-3 bg-[#0a0a0f] rounded-b-md shadow-lg" />

        {/* Placa metálica frontal empotrada con acabado cepillado */}
        <div className="w-full bg-gradient-to-b from-[#242536] via-[#1e1f2c] to-[#181924] rounded-[24px] p-5 sm:p-7 border border-white/5 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_10px_30px_rgba(0,0,0,0.6)] flex flex-col md:flex-row items-start gap-5 sm:gap-6 relative">
          {/* Tornillos de fijación de chasis maquinados en las 4 esquinas */}
          {[
            'top-3 left-3',
            'top-3 right-3',
            'bottom-3 left-3',
            'bottom-3 right-3',
          ].map((pos, idx) => (
            <div
              key={idx}
              className={`absolute ${pos} w-2.5 h-2.5 rounded-full bg-gradient-to-br from-zinc-400 via-zinc-600 to-zinc-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_1px_2px_rgba(0,0,0,0.9)] flex items-center justify-center`}
            >
              <div className="w-1.5 h-[1px] bg-zinc-950/80 rotate-45" />
            </div>
          ))}

          {/* COLUMNA IZQUIERDA: Visor de Más Escuchadas + Altavoz + Marca */}
          <div className="w-full md:w-[310px] lg:w-[330px] flex-shrink-0 flex flex-col justify-between self-stretch">
            <RankingVisor />
          </div>

          {/* COLUMNA CENTRAL: Pantalla Principal + Sintonizador + Botones + Diales */}
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            {/* Visor superior (Pantalla Marquesina + Ecualizador) */}
            <MainDisplay
              year={currentYear}
              country={currentCountry}
              songTitle={activeTrack?.title}
              artist={activeTrack?.artist}
              trackRank={trackIndex + 1}
              hasNoData={hasNoData}
              isTuning={isTuning}
            />

            {/* Visor inferior (Sintonizador Horizontal de Tracks) */}
            <HorizontalTuner
              trackCount={playlist.length}
              currentIndex={trackIndex}
              onChange={handleTrackChange}
            />

            {/* Trío de botones físicos táctiles: Anterior, Play/Pausa, Siguiente */}
            <div className="py-0.5">
              <PlaybackControls />
            </div>

            {/* Divisor metálico horizontal tenue por encima de los diales */}
            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent my-1" />

            {/* Panel de Controles Rotativos Inferiores: Dial AÑO, Botón RANDOM, Dial PAÍS */}
            <div className="flex items-center justify-around px-2 pt-1">
              {/* Dial AÑO */}
              <DialKnob
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
              />

              {/* Botón Central RANDOM (Shuffle) */}
              <RandomButton />

              {/* Dial PAÍS */}
              <DialKnob
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
              />
            </div>
          </div>

          {/* COLUMNA DERECHA: Selector de Volumen + Altavoz simétrico + POWER */}
          <div className="w-[100px] sm:w-[112px] lg:w-[124px] flex-shrink-0 flex flex-col justify-between self-stretch">
            <VolumeFader />
          </div>
        </div>
      </div>
    </div>
  );
}
