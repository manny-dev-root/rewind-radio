'use client';

import { useState } from 'react';
import { useEraStore } from '@/store/useEraStore';
import { audioEngine } from '@/lib/audio-engine';
import { COUNTRIES } from '@/lib/constants';
import { trackEvent } from '@/lib/analytics';

export function RandomButton() {
  const [pressed, setPressed] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    audioEngine?.playClick();
    setPressed(true);
    setTimeout(() => setPressed(false), 140);

    const state = useEraStore.getState();
    const currentCountry = state.currentCountry;
    const currentYear = state.currentYear;

    const availableCountries = COUNTRIES.map((c) => c.code);
    const otherCountries = availableCountries.filter((c) => c !== currentCountry);
    const randomCountry =
      otherCountries.length > 0
        ? otherCountries[Math.floor(Math.random() * otherCountries.length)]
        : availableCountries[Math.floor(Math.random() * availableCountries.length)];

    const minYear = 1970;
    const maxYear = 2024;
    let randomYear = Math.floor(Math.random() * (maxYear - minYear + 1)) + minYear;
    if (randomYear === currentYear) {
      randomYear = randomYear < maxYear ? randomYear + 1 : randomYear - 1;
    }

    const randomTrackIdx = Math.floor(Math.random() * 10);

    useEraStore.setState({
      currentCountry: randomCountry,
      currentYear: randomYear,
      targetTrack: null,
      targetTrackIndex: randomTrackIdx,
      trackIndex: randomTrackIdx,
    });

    trackEvent('random_tune_clicked', { country: randomCountry, year: randomYear, track_index: randomTrackIdx + 1 });
  };

  return (
    <div className="flex flex-col items-center select-none">
      <button
        type="button"
        onClick={handleClick}
        title="Sintonizar época y país al azar"
        className={`w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-2xl flex flex-col items-center justify-center transition-all duration-75 outline-none group ${
          pressed
            ? 'translate-y-[2px] bg-[#14151e] shadow-[inset_0_3px_6px_rgba(0,0,0,0.9),0_1px_1px_rgba(255,255,255,0.05)] border-t border-black'
            : 'bg-gradient-to-b from-[#2d2f40] to-[#1a1b25] shadow-[0_10px_20px_rgba(0,0,0,0.75),inset_0_1px_1px_rgba(255,255,255,0.2)] border border-white/5 hover:from-[#36384c] hover:to-[#20212d]'
        }`}
      >
        {/* Ícono de Shuffle */}
        <svg
          className="w-7 h-7 sm:w-8 sm:h-8 text-[#ffaa33] group-hover:text-white transition-colors [filter:drop-shadow(0_0_8px_rgba(255,140,0,0.65))]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M16 3h5v5" />
          <path d="M4 20L21 3" />
          <path d="M21 16v5h-5" />
          <path d="M15 15l6 6" />
          <path d="M4 4l5 5" />
        </svg>
      </button>

      <span className="mt-2 text-xs font-mono font-bold text-zinc-400 tracking-[0.2em] uppercase">
        RANDOM
      </span>
    </div>
  );
}
