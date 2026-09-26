export interface EraHit {
  artist: string;
  title: string;
  year: number;
}

export interface Track {
  title: string;
  artist: string;
  previewUrl: string | null;
  artworkUrl: string | null;
  releaseYear?: number | string;
}

export interface TuneResponse {
  track: Track;
  playlist?: Track[];
  source?: 'api' | 'seed-cache' | 'client-fallback';
}

export interface EraState {
  // Dial values
  currentYear: number;
  currentCountry: string;
  trackIndex: number;
  // Tuning state
  isTuning: boolean;
  isPlaying: boolean;
  // Data
  tuneData: TuneResponse | null;
  error: string | null;
  targetTrack?: { title: string; artist: string } | null;
  isGlitching?: boolean;
  // Actions
  setYear: (year: number) => void;
  setCountry: (country: string) => void;
  setTrackIndex: (index: number) => void;
  setTuning: (tuning: boolean) => void;
  setPlaying: (playing: boolean) => void;
  setTuneData: (data: TuneResponse | null) => void;
  setError: (error: string | null) => void;
  setTargetTrack?: (track: { title: string; artist: string } | null) => void;
  triggerGlitch?: (durationMs?: number) => void;
}
