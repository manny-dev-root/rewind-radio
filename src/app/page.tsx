'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { TuningIndicator } from '@/components/overlay/TuningIndicator';
import { TrackInfo } from '@/components/overlay/TrackInfo';
import { RankingModal } from '@/components/overlay/RankingModal';
import { useTuner } from '@/hooks/useTuner';
import { useTrackTracker } from '@/hooks/useTrackTracker';
import { audioEngine } from '@/lib/audio-engine';
import { trackEvent } from '@/lib/analytics';

const DynamicScene = dynamic(
  () =>
    import('@/components/canvas/Scene').then((mod) => ({
      default: mod.default ?? mod.Scene,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center text-amber-500/50 font-mono text-xs tracking-widest uppercase">
        Iniciando motor 3D de Rewind Radio...
      </div>
    ),
  }
);

export default function Home() {
  useTuner();
  useTrackTracker();

  const [showOnboarding, setShowOnboarding] = useState(true);

  const handleStartRadio = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    trackEvent('onboarding_started');
    audioEngine?.init();
    setShowOnboarding(false);
  };

  return (
    <main className="w-screen h-screen relative overflow-hidden bg-black select-none">
      {/* Canvas WebGL 3D */}
      <div className="absolute inset-0 z-0">
        <DynamicScene />
      </div>

      {/* Capas Overlay 2D */}
      <RankingModal />
      <TuningIndicator />
      <TrackInfo />

      {/* Footer centrado de créditos y Nerdearla 2026 Webflow Challenge */}
      <footer className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 pointer-events-auto w-max max-w-[92vw]">
        <div className="bg-black/65 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 text-[11px] text-zinc-400 font-mono flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 shadow-lg text-center">
          <span className="text-zinc-400">
            Proyecto desarrollado para el challenge de{' '}
            <span className="text-zinc-200 font-medium">Webflow en Nerdearla 2026</span>
          </span>
          <span className="text-zinc-600 hidden sm:inline">•</span>
          <span>
            Desarrollado por{' '}
            <a
              href="https://bit.ly/ln-manfred-camacho"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.stopPropagation();
                trackEvent('creator_link_clicked', { platform: 'linkedin', url: 'https://bit.ly/ln-manfred-camacho' });
              }}
              className="text-amber-400 hover:text-amber-300 underline decoration-amber-500/40 hover:decoration-amber-300 transition-colors font-semibold"
            >
              Manfred Camacho
            </a>
          </span>
        </div>
      </footer>

      {/* Diálogo inicial de bienvenida + tutorial con íconos (paleta ámbar cálida, sin glow, bordes suavemente redondeados) */}
      <AnimatePresence>
        {showOnboarding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 pointer-events-auto"
            onClick={handleStartRadio}
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8, transition: { duration: 0.2 } }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="onboarding-title"
              className="w-full max-w-md bg-zinc-950 border border-amber-500/30 rounded-lg p-6 text-zinc-100 shadow-none"
            >
              {/* Encabezado y Slogan */}
              <div className="text-center border-b border-white/10 pb-4">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/25 text-amber-400 font-mono text-[10px] uppercase tracking-widest mb-2.5">
                  <span className="w-1.5 h-1.5 rounded-xs bg-amber-400" />
                  Rewind Radio
                </div>
                <h1
                  id="onboarding-title"
                  className="text-lg sm:text-xl font-bold tracking-tight text-white"
                >
                  La máquina del tiempo musical
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400 mt-1.5 leading-relaxed">
                  Sintonizá las canciones reales que marcaron cada año y país alrededor del mundo.
                </p>
              </div>

              {/* Mini Tutorial con Íconos */}
              <div className="py-4 space-y-3">
                {/* Paso 1: Diales de Año y País */}
                <div className="flex items-start gap-3.5 bg-white/[0.03] border border-white/10 rounded-md p-3">
                  <div className="w-9 h-9 rounded bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="8" />
                      <line x1="12" y1="12" x2="15.5" y2="8.5" />
                      <path d="M12 2v2" />
                      <path d="M12 20v2" />
                      <path d="M2 12h2" />
                      <path d="M20 12h2" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-amber-300 uppercase tracking-wider font-mono">
                      1. Diales de Año y País
                    </p>
                    <p className="text-xs text-zinc-300 mt-0.5 leading-snug">
                      Arrastrá las perillas circulares o usá la <strong className="text-white">rueda del mouse</strong> para elegir el año (<span className="font-mono text-amber-400">1970–2026</span>) y el país.
                    </p>
                  </div>
                </div>

                {/* Paso 2: Sintonizador Horizontal */}
                <div className="flex items-start gap-3.5 bg-white/[0.03] border border-white/10 rounded-md p-3">
                  <div className="w-9 h-9 rounded bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="2" y="6" width="20" height="12" rx="1.5" />
                      <line x1="6" y1="10" x2="6" y2="14" />
                      <line x1="10" y1="9" x2="10" y2="15" />
                      <line x1="14" y1="6" x2="14" y2="18" strokeWidth="2.4" />
                      <line x1="18" y1="10" x2="18" y2="14" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-amber-300 uppercase tracking-wider font-mono">
                      2. Sintonizador de Canciones
                    </p>
                    <p className="text-xs text-zinc-300 mt-0.5 leading-snug">
                      Deslizá la <strong className="text-white">aguja digital</strong> o hacé clic en las marcas numeradas (<span className="font-mono text-amber-400">#1 a #10</span>) para cambiar de canción dentro de ese año.
                    </p>
                  </div>
                </div>

                {/* Paso 3: Control de Reproducción */}
                <div className="flex items-start gap-3.5 bg-white/[0.03] border border-white/10 rounded-md p-3">
                  <div className="w-9 h-9 rounded bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-amber-300 uppercase tracking-wider font-mono">
                      3. Reproductor en Vivo
                    </p>
                    <p className="text-xs text-zinc-300 mt-0.5 leading-snug">
                      En la tarjeta inferior derecha podés ver la portada del disco y tocar la imagen para <strong className="text-white">pausar o reanudar</strong> el audio.
                    </p>
                  </div>
                </div>
              </div>

              {/* Botón con paleta ámbar/naranja sin glow y leve borde redondeado */}
              <button
                type="button"
                onClick={handleStartRadio}
                className="w-full mt-2 py-3 px-5 rounded-md bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-bold text-xs tracking-widest uppercase font-mono flex items-center justify-center gap-2 shadow-none transition-all cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Escuchar radio
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
