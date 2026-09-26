'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useEraStore } from '@/store/useEraStore';
import { audioEngine } from '@/lib/audio-engine';
import { DEBOUNCE_MS } from '@/lib/constants';
import { fetchCuratedTracks, cleanSongTitle } from '@/lib/music-catalog';
import { trackEvent } from '@/lib/analytics';
import type { TuneResponse, Track } from '@/types';

export function useTuner(): void {
  const currentYear = useEraStore((state) => state.currentYear);
  const currentCountry = useEraStore((state) => state.currentCountry);
  const targetTrack = useEraStore((state) => state.targetTrack);
  const setTuning = useEraStore((state) => state.setTuning);
  const setPlaying = useEraStore((state) => state.setPlaying);
  const setTuneData = useEraStore((state) => state.setTuneData);
  const setTrackIndex = useEraStore((state) => state.setTrackIndex);
  const setError = useEraStore((state) => state.setError);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const failedUrlsRef = useRef<Set<string>>(new Set());
  const initialCheckedRef = useRef(false);

  // Al inicio, seleccionar aleatoriamente un año de Argentina para que la primera canción sea variada y justa para el ranking
  useEffect(() => {
    if (initialCheckedRef.current) return;
    initialCheckedRef.current = true;

    const minYear = 1975;
    const maxYear = 2022;
    const randomYear = Math.floor(Math.random() * (maxYear - minYear + 1)) + minYear;
    useEraStore.setState({
      currentCountry: 'AR',
      currentYear: randomYear,
      targetTrack: null,
    });
  }, []);

  useEffect(() => {
    audioEngine?.setPlaybackCallback((playing) => {
      setPlaying(playing);
    });
    audioEngine?.setErrorCallback(() => {
      const state = useEraStore.getState();
      const playlist = state.tuneData?.playlist;
      if (!playlist || playlist.length === 0) return;

      const currentTrack = playlist[state.trackIndex];
      if (currentTrack?.previewUrl) {
        failedUrlsRef.current.add(currentTrack.previewUrl);
      }

      // Buscar la siguiente canción en la playlist cuya URL no haya fallado
      const validNextIdx = playlist.findIndex(
        (t) => Boolean(t.previewUrl) && !failedUrlsRef.current.has(t.previewUrl!)
      );

      if (validNextIdx >= 0 && validNextIdx !== state.trackIndex) {
        setTrackIndex(validNextIdx);
        const nextSong = playlist[validNextIdx];
        if (nextSong?.previewUrl) {
          audioEngine?.stopTuning(nextSong.previewUrl);
        }
      } else {
        // Todas las canciones de la lista fallaron (404), detener de forma limpia sin bucles
        audioEngine?.stopTuning('');
        setTuning(false);
      }
    });
  }, [setPlaying, setTrackIndex, setTuning]);

  const performTune = useCallback(
    async (
      year: number,
      country: string,
      target: { title: string; artist: string } | null | undefined,
      signal: AbortSignal
    ) => {
      try {
        failedUrlsRef.current.clear();

        // Sintonización directa en vivo desde el navegador usando el catálogo curado por país y época
        const data = await fetchCuratedTracks(country, year, signal, target);

        // Si hay una canción objetivo (top inicial o clickeada), ubicar la aguja exactamente en ella; sino al medio
        let selectedIdx = 0;
        if (target && data.playlist && data.playlist.length > 0) {
          const targetTitleNorm = cleanSongTitle(target.title).toLowerCase();
          const targetArtistNorm = target.artist.toLowerCase();
          const foundIdx = data.playlist.findIndex((t) => {
            const tTitle = cleanSongTitle(t.title).toLowerCase();
            const tArtist = t.artist.toLowerCase();
            return (
              tTitle === targetTitleNorm ||
              tTitle.includes(targetTitleNorm) ||
              targetTitleNorm.includes(tTitle) ||
              (tArtist.includes(targetArtistNorm) && tTitle.length > 0)
            );
          });
          selectedIdx = foundIdx >= 0 ? foundIdx : Math.floor(data.playlist.length / 2);
        } else {
          selectedIdx =
            data.playlist && data.playlist.length > 0 ? Math.floor(data.playlist.length / 2) : 0;
        }

        setTrackIndex(selectedIdx);
        setTuneData(data);
        const activeTrackUrl =
          data.playlist?.[selectedIdx]?.previewUrl ?? data.track.previewUrl ?? '';
        audioEngine?.stopTuning(activeTrackUrl);
        setTuning(false);

        const activeTrack = data.playlist?.[selectedIdx] ?? data.track;
        trackEvent('tune_era', {
          year,
          country,
          title: activeTrack?.title,
          artist: activeTrack?.artist,
        });
      } catch (err: unknown) {
        if ((err as { name?: string })?.name === 'AbortError') {
          return;
        }
        const message = err instanceof Error ? err.message : 'Error al sintonizar';
        setError(message);
        audioEngine?.stopTuning('');
        setTuning(false);
      }
    },
    [setTuneData, setTrackIndex, setError, setTuning]
  );

  useEffect(() => {
    setTuning(true);
    audioEngine?.startTuning();

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    debounceTimerRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      performTune(currentYear, currentCountry, targetTrack, controller.signal);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [currentYear, currentCountry, targetTrack, setTuning, performTune]);
}
