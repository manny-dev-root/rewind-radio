'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useEraStore } from '@/store/useEraStore';
import { audioEngine } from '@/lib/audio-engine';
import { DEBOUNCE_MS } from '@/lib/constants';
import type { TuneResponse } from '@/types';

export function useTuner(): void {
  const currentYear = useEraStore((state) => state.currentYear);
  const currentCountry = useEraStore((state) => state.currentCountry);
  const setTuning = useEraStore((state) => state.setTuning);
  const setPlaying = useEraStore((state) => state.setPlaying);
  const setTuneData = useEraStore((state) => state.setTuneData);
  const setError = useEraStore((state) => state.setError);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    audioEngine?.setPlaybackCallback((playing) => {
      setPlaying(playing);
    });
  }, [setPlaying]);

  const performTune = useCallback(
    async (year: number, country: string, signal: AbortSignal) => {
      try {
        const apiUrl = `${window.location.origin}/api/tune?year=${year}&country=${encodeURIComponent(country)}`;

        const response = await fetch(apiUrl, { signal });

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => null);
          throw new Error(errorPayload?.error || `Error al sintonizar: ${response.status}`);
        }

        const data: TuneResponse = await response.json();

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
