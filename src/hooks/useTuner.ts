'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useEraStore } from '@/store/useEraStore';
import { audioEngine } from '@/lib/audio-engine';
import { DEBOUNCE_MS } from '@/lib/constants';
import type { TuneResponse, Track } from '@/types';

export function useTuner(): void {
  const currentYear = useEraStore((state) => state.currentYear);
  const currentCountry = useEraStore((state) => state.currentCountry);
  const setTuning = useEraStore((state) => state.setTuning);
  const setPlaying = useEraStore((state) => state.setPlaying);
  const setTuneData = useEraStore((state) => state.setTuneData);
  const setTrackIndex = useEraStore((state) => state.setTrackIndex);
  const setError = useEraStore((state) => state.setError);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const failedUrlsRef = useRef<Set<string>>(new Set());

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
    async (year: number, country: string, signal: AbortSignal) => {
      try {
        failedUrlsRef.current.clear();
        const apiUrl = `${window.location.origin}/api/tune?year=${year}&country=${encodeURIComponent(country)}`;

        const response = await fetch(apiUrl, { signal });

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => null);
          throw new Error(errorPayload?.error || `Error al sintonizar: ${response.status}`);
        }

        const data: TuneResponse = await response.json();

        // Si el backend usó seed-cache (por rate-limit 429 de Apple a datacenters) o no tiene suficientes temas,
        // el navegador consulta directamente a iTunes (CORS abierto nativo, sin bloqueos de IP residencial)
        if (data.source === 'seed-cache' || !data.playlist || data.playlist.length < 3) {
          try {
            const clientUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(country + ' ' + year)}&country=${country}&media=music&entity=song&limit=10`;
            const clientRes = await fetch(clientUrl, { signal });
            if (clientRes.ok) {
              const clientData = (await clientRes.json()) as {
                results?: Array<{
                  trackName?: string;
                  artistName?: string;
                  previewUrl?: string;
                  artworkUrl100?: string;
                }>;
              };
              const clientTracks: Track[] = (clientData.results || [])
                .filter((r) => Boolean(r.previewUrl && r.trackName && r.artistName))
                .slice(0, 10)
                .map((r) => ({
                  title: r.trackName!,
                  artist: r.artistName!,
                  previewUrl: r.previewUrl!,
                  artworkUrl: r.artworkUrl100 ? r.artworkUrl100.replace('100x100', '600x600') : null,
                  releaseYear: String(year),
                }));
              if (clientTracks.length > 0) {
                data.playlist = clientTracks;
                data.track = clientTracks[0];
                data.source = 'client-fallback';
              }
            }
          } catch {
            // Ignorar errores del fallback secundario
          }
        }

        const count = data.playlist?.length || (data.track?.previewUrl ? 1 : 0);
        const sourceLabel =
          data.source === 'seed-cache'
            ? 'Catálogo de Respaldo (Seed Cache)'
            : data.source === 'client-fallback'
            ? 'Fallback Navegador'
            : 'API Backend';

        console.log(`[Rewind Radio] 📻 ${country} ${year} -> ${count} canción(es) sintonizada(s) [${sourceLabel}]`);

        setTuneData(data);
        const firstTrackUrl = data.playlist?.[0]?.previewUrl ?? data.track.previewUrl ?? '';
        audioEngine?.stopTuning(firstTrackUrl);
        setTuning(false);
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
    [setTuneData, setError, setTuning]
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
      performTune(currentYear, currentCountry, controller.signal);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [currentYear, currentCountry, setTuning, performTune]);
}
