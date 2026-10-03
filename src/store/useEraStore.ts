'use client';

import { create } from 'zustand';
import type { EraState } from '@/types';
import { audioEngine } from '@/lib/audio-engine';

let glitchTimer: ReturnType<typeof setTimeout> | null = null;

export const useEraStore = create<EraState>((set) => ({
  currentYear: 1990,
  currentCountry: 'AR',
  trackIndex: 0,
  volume: 50,
  isTuning: false,
  isPlaying: false,
  tuneData: null,
  error: null,
  targetTrack: null,
  targetTrackIndex: null,
  isGlitching: false,
  setYear: (year) => set({ currentYear: year, trackIndex: 0, targetTrack: null, targetTrackIndex: 0 }),
  setCountry: (country) => set({ currentCountry: country, trackIndex: 0, targetTrack: null, targetTrackIndex: 0 }),
  setTrackIndex: (trackIndex) => set({ trackIndex }),
  setVolume: (volume) => {
    audioEngine?.setVolume(volume);
    set({ volume });
  },
  setTuning: (isTuning) => set({ isTuning }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setTuneData: (tuneData) => set({ tuneData }),
  setError: (error) => set({ error }),
  setTargetTrack: (targetTrack) => set({ targetTrack }),
  triggerGlitch: (durationMs = 450) => {
    if (glitchTimer) clearTimeout(glitchTimer);
    set({ isGlitching: true });
    glitchTimer = setTimeout(() => {
      set({ isGlitching: false });
      glitchTimer = null;
    }, durationMs);
  },
}));
