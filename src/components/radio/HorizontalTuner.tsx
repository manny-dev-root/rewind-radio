'use client';

import { useRef } from 'react';
import { audioEngine } from '@/lib/audio-engine';
import { trackEvent } from '@/lib/analytics';

interface HorizontalTunerProps {
  trackCount: number;
  currentIndex: number;
  onChange: (index: number) => void;
}

export function HorizontalTuner({
  trackCount = 0,
  currentIndex = 0,
  onChange,
}: HorizontalTunerProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const displayCount = Math.max(10, Math.min(15, trackCount));
  const actualCount = Math.max(0, Math.min(15, trackCount));
  const hasTracks = actualCount > 0;
  const safeIndex = hasTracks ? Math.max(0, Math.min(actualCount - 1, currentIndex)) : 0;

  const selectStation = (idx: number) => {
    if (!hasTracks) return;
    const clamped = Math.max(0, Math.min(actualCount - 1, idx));
    if (clamped !== safeIndex) {
      onChange(clamped);
      audioEngine?.playClick();
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!hasTracks) return;
    isDragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    handlePointerMove(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current || !trackRef.current || !hasTracks) return;
    const rect = trackRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const norm = Math.max(0, Math.min(1, relativeX / Math.max(1, rect.width)));
    const targetStation = Math.round(norm * (actualCount - 1));
    selectStation(targetStation);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Porcentaje exacto de la aguja sobre el riel trackRef
  const needlePct = displayCount > 1 ? (safeIndex / (displayCount - 1)) * 100 : 50;

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="w-full h-[88px] bg-[#07070d] rounded-xl border border-white/5 shadow-[inset_0_3px_10px_rgba(0,0,0,0.95)] relative px-7 flex items-center select-none cursor-pointer group"
    >
      {/* Riel interno de coordenadas exactas: estaciones y aguja comparten este mismo contenedor */}
      <div ref={trackRef} className="w-full h-full relative">
        {/* Riel superior luminoso */}
        <div className="absolute left-0 right-0 top-[24px] h-[2px] bg-gradient-to-r from-amber-600/30 via-amber-500/70 to-amber-600/30 [box-shadow:0_0_8px_rgba(255,140,0,0.5)] pointer-events-none" />

        {/* Riel inferior luminoso */}
        <div className="absolute left-0 right-0 top-[48px] h-[2px] bg-gradient-to-r from-amber-600/30 via-amber-500/70 to-amber-600/30 [box-shadow:0_0_8px_rgba(255,140,0,0.5)] pointer-events-none" />

        {/* Marcas de escala y botones de estaciones con espaciado constante y centro matemático idéntico a la aguja */}
        {Array.from({ length: displayCount }).map((_, i) => {
          const isSelected = hasTracks && i === safeIndex;
          const isAvailable = i < actualCount;
          const pct = displayCount > 1 ? (i / (displayCount - 1)) * 100 : 50;

          return (
            <div
              key={i}
              style={{ left: `${pct}%` }}
              className="absolute top-0 bottom-0 -translate-x-1/2 flex items-center justify-center z-10 pointer-events-none"
            >
              <button
                type="button"
                disabled={!isAvailable}
                onClick={(e) => {
                  e.stopPropagation();
                  trackEvent('tuner_station_button_clicked', { station: i + 1 });
                  selectStation(i);
                }}
                title={isAvailable ? `Sintonizar emisora #${i + 1}` : 'Emisora no disponible'}
                className={`flex flex-col items-center justify-between h-full w-8 py-2.5 pointer-events-auto transition-transform outline-none ${
                  isAvailable
                    ? 'cursor-pointer hover:scale-105 active:scale-95'
                    : 'cursor-not-allowed opacity-35'
                }`}
              >
                {/* Muesca vertical en el riel superior */}
                <div
                  className={`w-[2px] h-[30px] rounded-full transition-colors mt-2.5 ${
                    isSelected
                      ? 'bg-[#ffaa44] [box-shadow:0_0_8px_#ff9900]'
                      : isAvailable
                      ? 'bg-amber-700/70'
                      : 'bg-zinc-700/50'
                  }`}
                />

                {/* Número de estación colocado DEBAJO de la aguja para que nunca quede tapado */}
                <span
                  className={`font-mono text-xs sm:text-[13px] font-bold transition-all ${
                    isSelected
                      ? 'text-[#ffffff] [text-shadow:0_0_10px_#ff9900] scale-110'
                      : isAvailable
                      ? 'text-[#9ea3be] hover:text-white'
                      : 'text-zinc-600'
                  }`}
                >
                  {i + 1}
                </span>
              </button>
            </div>
          );
        })}

        {/* Aguja digital luminosa deslizante: viaja en el riel superior y termina justo antes de los números */}
        {hasTracks && (
          <div
            className="absolute top-[8px] h-[48px] w-1 bg-gradient-to-b from-[#ffeedd] via-[#ff9900] to-[#ff5500] rounded-full [box-shadow:0_0_12px_#ff8c00,0_0_24px_#ff5500] pointer-events-none transition-all duration-150 ease-out z-20 -translate-x-1/2"
            style={{
              left: `${needlePct}%`,
            }}
          >
            {/* Pequeña bombilla/punto central en la aguja, centrada entre los dos rieles */}
            <div className="absolute top-[28px] left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white [box-shadow:0_0_8px_#ffffff,0_0_14px_#ffaa00]" />
          </div>
        )}
      </div>
    </div>
  );
}
