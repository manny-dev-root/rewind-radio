'use client';

import { useState } from 'react';
import { useEraStore } from '@/store/useEraStore';
import { audioEngine } from '@/lib/audio-engine';
import { COUNTRIES, YEAR_MIN, YEAR_MAX } from '@/lib/constants';
import { trackEvent } from '@/lib/analytics';

interface PlaybackButtonProps {
  onClick: (e: React.MouseEvent) => void;
  title: string;
  children: React.ReactNode;
}

function PhysicalButton({ onClick, title, children }: PlaybackButtonProps) {
  const [pressed, setPressed] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPressed(true);
    setTimeout(() => setPressed(false), 120);
    onClick(e);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={title}
      className={`relative w-12 h-7.5 sm:w-13 sm:h-8 rounded-lg transition-all duration-75 flex items-center justify-center select-none outline-none group ${
        pressed
          ? 'translate-y-[2px] bg-[#14151e] shadow-[inset_0_2px_4px_rgba(0,0,0,0.9),0_1px_1px_rgba(255,255,255,0.05)] border border-black/40'
          : 'bg-gradient-to-b from-[#323447] via-[#242535] to-[#181925] shadow-[0_3px_6px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.25)] border border-white/10 hover:from-[#3a3c52] hover:to-[#20212e]'
      }`}
    >
      <div className="text-amber-400 group-hover:text-amber-300 transition-colors [filter:drop-shadow(0_0_5px_rgba(255,160,0,0.5))]">
        {children}
      </div>
    </button>
  );
}

export function PlaybackControls() {
  const isPlaying = useEraStore((state) => state.isPlaying);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    audioEngine?.playClick();
    const state = useEraStore.getState();
    const playlist = state.tuneData?.playlist?.filter((t) => Boolean(t.previewUrl)) ?? [];
    if (playlist.length === 0) return;

    let prevIdx = state.trackIndex - 1;
    if (prevIdx < 0) prevIdx = playlist.length - 1;

    trackEvent('playback_prev_clicked', {
      from_index: state.trackIndex + 1,
      to_index: prevIdx + 1,
      year: state.currentYear,
      country: state.currentCountry,
    });

    state.setTrackIndex(prevIdx);
    const prevTrack = playlist[prevIdx];
    if (prevTrack?.previewUrl) {
      audioEngine?.transitionBetweenTracks(prevTrack.previewUrl);
    }
  };

  const handlePlayPause = (e: React.MouseEvent) => {
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

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    audioEngine?.playClick();
    const state = useEraStore.getState();
    const playlist = state.tuneData?.playlist?.filter((t) => Boolean(t.previewUrl)) ?? [];
    if (playlist.length === 0) return;

    // Si aún quedan canciones en la lista
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

      state.setTrackIndex(nextIdx);
      if (nextTrack?.previewUrl) {
        audioEngine?.transitionBetweenTracks(nextTrack.previewUrl);
      }
      return;
    }

    // Terminó la lista -> avanzar al siguiente año
    if (state.currentYear < YEAR_MAX) {
      const nextYear = state.currentYear + 1;
      trackEvent('playback_next_clicked', {
        action: 'next_year',
        from_year: state.currentYear,
        to_year: nextYear,
        country: state.currentCountry,
      });
      state.setYear(nextYear);
    } else {
      // Llegó al final de años -> avanzar país y volver a YEAR_MIN
      const cIdx = COUNTRIES.findIndex((c) => c.code === state.currentCountry);
      const nextCIdx = (cIdx + 1) % COUNTRIES.length;
      const nextCountry = COUNTRIES[nextCIdx].code;

      trackEvent('playback_next_clicked', {
        action: 'next_country',
        from_country: state.currentCountry,
        to_country: nextCountry,
        year: YEAR_MIN,
      });

      useEraStore.setState({
        currentCountry: nextCountry,
        currentYear: YEAR_MIN,
        trackIndex: 0,
        targetTrack: null,
      });
    }
  };

  return (
    <div className="flex items-center justify-center gap-3">
      {/* Botón Anterior (|◀) */}
      <PhysicalButton onClick={handlePrev} title="Canción anterior">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
        </svg>
      </PhysicalButton>

      {/* Botón Play / Pausa (▶ / ⏸) */}
      <PhysicalButton
        onClick={handlePlayPause}
        title={isPlaying ? 'Pausar música' : 'Reproducir música'}
      >
        {isPlaying ? (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </PhysicalButton>

      {/* Botón Siguiente (▶|) */}
      <PhysicalButton onClick={handleNext} title="Siguiente canción">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
        </svg>
      </PhysicalButton>
    </div>
  );
}
