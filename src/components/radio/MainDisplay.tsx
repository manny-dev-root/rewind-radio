'use client';

import { useMemo } from 'react';
import { COUNTRIES } from '@/lib/constants';
import { AudioSpectrum } from './AudioSpectrum';

interface MainDisplayProps {
  year: number;
  country: string;
  songTitle?: string;
  artist?: string;
  trackRank?: number;
  hasNoData?: boolean;
  isTuning?: boolean;
}

export function MainDisplay({
  year,
  country,
  songTitle,
  artist,
  trackRank = 1,
  hasNoData = false,
  isTuning = false,
}: MainDisplayProps) {
  const countryFullName = useMemo(() => {
    const found = COUNTRIES.find((c) => c.code === country);
    return (found ? found.name : country).toUpperCase();
  }, [country]);

  const marqueeText = useMemo(() => {
    if (isTuning) return 'SINTONIZANDO EMISORA... ✦ ';
    if (hasNoData) return 'SIN DATOS PARA ESTE AÑO ✦ ';
    if (songTitle && artist) {
      return `#${trackRank} ${songTitle.toUpperCase()} — ${artist.toUpperCase()} ✦ `;
    }
    return 'SINTONIZANDO EMISORA... ✦ ';
  }, [trackRank, songTitle, artist, hasNoData, isTuning]);

  return (
    <div className="w-full h-[138px] bg-[#07070d] rounded-xl border border-white/5 shadow-[inset_0_3px_10px_rgba(0,0,0,0.95)] flex flex-col justify-between p-3.5 relative overflow-hidden select-none">
      {/* Reflejo superior sutil del cristal */}
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none rounded-t-xl" />

      {/* Línea fija superior: PAÍS · AÑO */}
      <div className="text-center pt-0.5">
        <span className="text-[#ff9933] font-bold font-mono text-base sm:text-lg tracking-[0.22em] [text-shadow:0_0_12px_rgba(255,140,0,0.7),0_0_24px_rgba(255,100,0,0.4)]">
          {countryFullName} · {year}
        </span>
      </div>

      {/* Marquesina horizontal de título y artista */}
      <div className="w-full overflow-hidden whitespace-nowrap py-1 relative">
        {/* Desvanecimiento en los bordes izquierdo y derecho del visor */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#07070d] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#07070d] to-transparent z-10 pointer-events-none" />

        <div className="inline-block animate-[marquee_18s_linear_infinite]">
          <span className="text-[#ffaa44] font-medium font-mono text-sm sm:text-base tracking-wider mr-6 [text-shadow:0_0_10px_rgba(255,150,50,0.6)]">
            {marqueeText.repeat(5)}
          </span>
        </div>
      </div>

      {/* Ecualizador / Espectro de Audio en la parte inferior del visor */}
      <div className="w-full pt-1.5 border-t border-amber-500/10">
        <AudioSpectrum barsCount={28} />
      </div>
    </div>
  );
}
