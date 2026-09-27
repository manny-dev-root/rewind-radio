'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEraStore } from '@/store/useEraStore';
import { audioEngine } from '@/lib/audio-engine';
import { trackEvent } from '@/lib/analytics';

const EQ_BARS = [
  { duration: 0.6, heights: ['4px', '16px', '6px', '14px', '4px'] },
  { duration: 0.8, heights: ['8px', '4px', '18px', '8px', '8px'] },
  { duration: 0.5, heights: ['4px', '12px', '4px', '18px', '4px'] },
  { duration: 0.7, heights: ['6px', '18px', '10px', '4px', '6px'] },
];

export function TrackInfo() {
  const tuneData = useEraStore((state) => state.tuneData);
  const trackIndex = useEraStore((state) => state.trackIndex);
  const isPlaying = useEraStore((state) => state.isPlaying);
  const isTuning = useEraStore((state) => state.isTuning);

  const playlist =
    tuneData?.playlist && tuneData.playlist.length > 0
      ? tuneData.playlist.filter((t) => Boolean(t.previewUrl))
      : tuneData?.track?.previewUrl
      ? [tuneData.track]
      : [];

  const activeTrack = playlist[trackIndex] || playlist[0];
  const showTrack = Boolean(tuneData && !isTuning && activeTrack);

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const willPlay = !isPlaying;
    trackEvent('playback_toggled', {
      action: willPlay ? 'play' : 'pause',
      title: activeTrack?.title,
      artist: activeTrack?.artist,
      year: useEraStore.getState().currentYear,
      country: useEraStore.getState().currentCountry,
    });
    audioEngine?.togglePlayPause();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 pointer-events-auto select-none">
      <AnimatePresence>
        {showTrack && activeTrack && (
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            onClick={handleTogglePlay}
            role="button"
            tabIndex={0}
            title={isPlaying ? 'Click para pausar' : 'Click para reproducir'}
            className="flex items-center gap-3 bg-black/85 hover:bg-black/95 transition-colors cursor-pointer backdrop-blur-md rounded-xl p-3 w-[320px] sm:w-[340px] h-[78px] border border-amber-500/30 hover:border-amber-500/60 shadow-2xl group"
          >
            {/* Contenedor de carátula de tamaño fijo */}
            <div className="relative w-14 h-14 rounded-md overflow-hidden shrink-0 border border-white/10 shadow">
              {activeTrack.artworkUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={activeTrack.artworkUrl}
                  alt={activeTrack.title || 'Portada del disco'}
                  className="w-full h-full object-cover group-hover:opacity-75 transition-opacity"
                />
              ) : (
                <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-500">
                  <svg
                    className="w-6 h-6 opacity-60 text-amber-500/80"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </div>
              )}

              {/* Botón Play/Pause sobre la imagen del artista */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-85 group-hover:opacity-100 group-hover:bg-black/55 transition-all">
                {isPlaying ? (
                  <svg className="w-6 h-6 text-amber-400 drop-shadow" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-amber-400 drop-shadow" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                )}
              </div>
            </div>

            {/* Datos de la pista con ancho flexible truncado fijo */}
            <div className="flex-1 min-w-0 flex flex-col justify-center text-left">
              <div className="text-[10px] font-mono tracking-wider text-amber-400/90 uppercase mb-0.5 flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
                  }`}
                />
                <span className="truncate">
                  {isPlaying
                    ? `EN EL AIRE • #${trackIndex + 1} DE ${playlist.length}`
                    : `EN PAUSA • #${trackIndex + 1} DE ${playlist.length}`}
                </span>
              </div>
              <div className="font-bold text-sm text-white truncate">
                {activeTrack.title || 'Tema Desconocido'}
              </div>
              <div className="text-xs text-zinc-400 truncate mt-0.5">
                {activeTrack.artist || 'Artista Desconocido'}
              </div>
            </div>

            {/* Indicador ecualizador a la derecha con ancho fijo */}
            <div className="flex items-center justify-end w-8 shrink-0">
              <div className="flex items-end gap-1 h-5 w-6 shrink-0">
                {EQ_BARS.map((bar, i) => (
                  <motion.span
                    key={i}
                    className={`w-1 rounded-full ${isPlaying ? 'bg-amber-400' : 'bg-zinc-600'}`}
                    animate={isPlaying ? { height: bar.heights } : { height: '3px' }}
                    transition={
                      isPlaying
                        ? {
                            duration: bar.duration,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            delay: i * 0.1,
                          }
                        : { duration: 0.2 }
                    }
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default TrackInfo;
