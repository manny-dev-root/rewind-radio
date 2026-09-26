'use client';

import { useRef, useCallback } from 'react';
import { audioEngine } from '@/lib/audio-engine';

export function useAudioAnalyser() {
  const bufferRef = useRef<Uint8Array>(new Uint8Array(64));
  const avgRef = useRef<number>(0);

  const update = useCallback(() => {
    if (audioEngine) {
      const data = audioEngine.getFrequencyData();
      bufferRef.current.set(data);
      avgRef.current = audioEngine.getAverageFrequency();
    }
  }, []);

  /* eslint-disable react-hooks/refs */
  return {
    frequencyData: bufferRef.current,
    get averageFrequency() {
      return avgRef.current;
    },
    update,
  };
  /* eslint-enable react-hooks/refs */
}
