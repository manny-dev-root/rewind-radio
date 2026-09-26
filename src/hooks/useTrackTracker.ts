'use client';

import { useEffect, useRef } from 'react';
import { useEraStore } from '@/store/useEraStore';
import { trackEvent } from '@/lib/analytics';

/**
 * Hook que registra de forma atómica la reproducción de una canción
 * si el usuario la escucha durante al menos 5 segundos continuos.
 */
export function useTrackTracker(): void {
  const isPlaying = useEraStore((state) => state.isPlaying);
  const isTuning = useEraStore((state) => state.isTuning);
  const tuneData = useEraStore((state) => state.tuneData);
  const trackIndex = useEraStore((state) => state.trackIndex);
  const currentCountry = useEraStore((state) => state.currentCountry);
  const currentYear = useEraStore((state) => state.currentYear);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordedTrackRef = useRef<string | null>(null);

  useEffect(() => {
    const playlist = tuneData?.playlist;
    const activeTrack = playlist?.[trackIndex] || tuneData?.track;

    if (!isPlaying || isTuning || !activeTrack?.title || !activeTrack?.previewUrl) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const trackKey = `${currentCountry}-${activeTrack.artist}-${activeTrack.title}-${trackIndex}`;

    // Si ya fue registrada en esta sesión de escucha para este tema, evitar llamadas duplicadas
    if (recordedTrackRef.current === trackKey) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Registrar reproducción si el usuario la escucha al menos 5 segundos
    timerRef.current = setTimeout(() => {
      recordedTrackRef.current = trackKey;
      const trackYear = Number(activeTrack.releaseYear || currentYear);

      trackEvent('track_play_completed', {
        artist: activeTrack.artist,
        title: activeTrack.title,
        country: currentCountry,
        year: trackYear,
      });

      fetch('/api/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artist: activeTrack.artist,
          title: activeTrack.title,
          country: currentCountry,
          year: trackYear,
          artworkUrl: activeTrack.artworkUrl,
        }),
      }).catch(() => {});
    }, 5000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isPlaying, isTuning, tuneData, trackIndex, currentCountry, currentYear]);
}
