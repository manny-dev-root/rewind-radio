'use client';

import { create } from 'zustand';
import type { EraState } from '@/types';

export const useEraStore = create<EraState>((set) => ({
  currentYear: 1990,
  currentCountry: 'AR',
  trackIndex: 0,
  isTuning: false,
  isPlaying: false,
  tuneData: null,
  error: null,
  setYear: (year) => set({ currentYear: year, trackIndex: 0 }),
  setCountry: (country) => set({ currentCountry: country, trackIndex: 0 }),
  setTrackIndex: (trackIndex) => set({ trackIndex }),
  setTuning: (isTuning) => set({ isTuning }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setTuneData: (tuneData) => set({ tuneData }),
  setError: (error) => set({ error }),
}));
