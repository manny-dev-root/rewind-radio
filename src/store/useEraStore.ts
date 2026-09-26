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
  targetTrack: null,
  setYear: (year) => set({ currentYear: year, trackIndex: 0, targetTrack: null }),
  setCountry: (country) => set({ currentCountry: country, trackIndex: 0, targetTrack: null }),
  setTrackIndex: (trackIndex) => set({ trackIndex }),
  setTuning: (isTuning) => set({ isTuning }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setTuneData: (tuneData) => set({ tuneData }),
  setError: (error) => set({ error }),
  setTargetTrack: (targetTrack) => set({ targetTrack }),
}));
