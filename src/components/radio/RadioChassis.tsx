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
        <div className="w-full bg-gradient-to-b from-[#242536] via-[#1e1f2c] to-[#181924] rounded-[24px] p-5 sm:p-7 border border-white/5 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_10px_30px_rgba(0,0,0,0.6)] flex flex-col gap-4 relative">
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

          {/* ============================================================== */}
          {/* FILA SUPERIOR: PANTALLAS Y VISORES (ALINEACIÓN EXACTA EN ALTURA)*/}
          {/* ============================================================== */}
          <div className="w-full flex flex-col md:flex-row items-stretch gap-5 sm:gap-6">
            {/* COLUMNA IZQUIERDA: Visor de Más Escuchadas */}
            <div className="w-full md:w-[310px] lg:w-[330px] flex-shrink-0 flex flex-col">
              <RankingVisor />
            </div>

            {/* COLUMNA CENTRAL: Pantalla Principal + Sintonizador Horizontal + Botones Playback */}
            <div className="flex-1 flex flex-col justify-between gap-3 min-w-0">
              <MainDisplay
                year={currentYear}
                country={currentCountry}
                songTitle={activeTrack?.title}
                artist={activeTrack?.artist}
                trackRank={trackIndex + 1}
                hasNoData={hasNoData}
                isTuning={isTuning}
              />

              <HorizontalTuner
                trackCount={playlist.length}
                currentIndex={trackIndex}
                onChange={handleTrackChange}
              />

              <div className="py-0.5">
                <PlaybackControls />
              </div>
            </div>

            {/* COLUMNA DERECHA: Visor Selector de Volumen */}
            <div className="w-[100px] sm:w-[112px] lg:w-[124px] flex-shrink-0 flex flex-col">
              <VolumeFader />
            </div>
          </div>

          {/* ============================================================== */}
          {/* EJE SEPARADOR METÁLICO (LÍNEA HORIZONTAL GUÍA)                 */}
          {/* ============================================================== */}
          <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent my-1 sm:my-2" />

          {/* ============================================================== */}
          {/* FILA INFERIOR: ALTAVOCES ACÚSTICOS Y CONTROLES FÍSICOS         */}
          {/* ============================================================== */}
          <div className="w-full flex flex-col md:flex-row items-stretch gap-5 sm:gap-6">
            {/* Altavoz Acústico Izquierdo + Rótulo REWIND RADIO */}
            <div className="w-full md:w-[310px] lg:w-[330px] flex-shrink-0 flex flex-col justify-between py-1">
              {/* Ranuras acústicas del altavoz (estilo Dieter Rams con fresado metálico) */}
              <div className="flex-1 flex flex-col justify-center gap-3.5 px-3 py-2">
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="h-1 bg-[#090a10] rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.95),0_1px_0_rgba(255,255,255,0.06)] border-b border-white/[0.04]"
                  />
                ))}
              </div>
              {/* Marca serigrafiada / grabada: REWIND RADIO */}
              <div className="text-center pt-2">
                <span className="text-xs font-mono font-bold text-zinc-400/80 tracking-[0.28em] uppercase [text-shadow:0_1px_0_rgba(255,255,255,0.08),0_-1px_1px_rgba(0,0,0,0.8)]">
                  REWIND RADIO
                </span>
              </div>
            </div>

            {/* Controles Centrales: Dial AÑO, Botón RANDOM, Dial PAÍS */}
            <div className="flex-1 flex items-center justify-around px-2 min-w-0">
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

              <RandomButton />

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

            {/* Altavoz Acústico Derecho + Indicador LED y POWER */}
            <div className="w-[100px] sm:w-[112px] lg:w-[124px] flex-shrink-0 flex flex-col justify-between py-1">
              {/* Ranuras acústicas del altavoz derecho */}
              <div className="flex-1 flex flex-col justify-center gap-3.5 px-2 py-2">
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="h-1 bg-[#090a10] rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.95),0_1px_0_rgba(255,255,255,0.06)] border-b border-white/[0.04]"
                  />
                ))}
              </div>
              {/* Indicador LED y Rótulo POWER simétrico con REWIND RADIO */}
              <div className="flex items-center justify-center gap-2 pt-2" title="Sistema encendido (POWER)">
                <div className="w-2.5 h-2.5 rounded-full bg-[#00ff88] [box-shadow:0_0_8px_#00ff88,0_0_16px_#00ff88] border border-white/50" />
                <span className="text-xs font-mono font-bold text-zinc-400/80 tracking-[0.28em] uppercase [text-shadow:0_1px_0_rgba(255,255,255,0.08),0_-1px_1px_rgba(0,0,0,0.8)]">
                  POWER
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
