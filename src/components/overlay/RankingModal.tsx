'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Flame, X, Radio, Globe } from 'lucide-react';
import { useEraStore } from '@/store/useEraStore';
import { COUNTRIES } from '@/lib/constants';
import type { TrackPlayRecord } from '@/lib/db';

export function RankingModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>('ALL');
  const [ranking, setRanking] = useState<TrackPlayRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [failedImgIds, setFailedImgIds] = useState<Record<string, boolean>>({});

  const setYear = useEraStore((state) => state.setYear);
  const setCountry = useEraStore((state) => state.setCountry);

  const fetchRanking = useCallback(async (countryCode?: string) => {
    setIsLoading(true);
    try {
      const url =
        countryCode && countryCode !== 'ALL'
          ? `/api/ranking?country=${countryCode}&limit=10`
          : '/api/ranking?limit=10';
      const res = await fetch(url);
      if (res.ok) {
        const data = (await res.json()) as { ranking?: TrackPlayRecord[] };
        setRanking(data.ranking || []);
      }
    } catch {
      // Ignorar errores de red
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchRanking(selectedCountry);
    }
  }, [isOpen, selectedCountry, fetchRanking]);

  const handleTuneToTrack = (track: TrackPlayRecord) => {
    setCountry(track.country);
    setYear(track.year);
    setIsOpen(false);
  };

  return (
    <>
      {/* Botón flotante superior para abrir el Ranking */}
      <div className="fixed top-5 left-5 z-40 pointer-events-auto">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-black/75 hover:bg-black/90 active:scale-95 transition-all text-amber-400 hover:text-amber-300 font-mono text-xs uppercase tracking-wider px-3.5 py-2 rounded-full border border-amber-500/35 hover:border-amber-500/70 shadow-lg backdrop-blur-md group"
          title="Ver canciones más reproducidas"
        >
          <Trophy className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
          <span className="font-semibold">Ranking Global</span>
        </button>
      </div>

      {/* Modal / Diálogo del Ranking */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 pointer-events-auto select-none"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 16 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-zinc-950 border border-amber-500/35 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[85vh] text-zinc-100"
            >
              {/* Encabezado */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      Más Reproducidas
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Sintonizá directamente haciendo clic en cualquier himno
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Filtro por País */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-3 no-scrollbar shrink-0 border-b border-white/5">
                <button
                  type="button"
                  onClick={() => setSelectedCountry('ALL')}
                  className={`px-3 py-1 rounded-full text-xs font-mono shrink-0 transition-all flex items-center gap-1.5 ${
                    selectedCountry === 'ALL'
                      ? 'bg-amber-500 text-black font-bold shadow'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/10'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  Mundial
                </button>
                {COUNTRIES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => setSelectedCountry(c.code)}
                    className={`px-3 py-1 rounded-full text-xs font-mono shrink-0 transition-all ${
                      selectedCountry === c.code
                        ? 'bg-amber-500 text-black font-bold shadow'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/10'
                    }`}
                  >
                    {c.code}
                  </button>
                ))}
              </div>

              {/* Lista de Canciones */}
              <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1 custom-scrollbar min-h-[260px]">
                {isLoading ? (
                  <div className="h-48 flex items-center justify-center font-mono text-xs text-amber-500/70 tracking-widest uppercase">
                    Cargando ranking...
                  </div>
                ) : ranking.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center text-center p-4">
                    <Radio className="w-8 h-8 text-zinc-600 mb-2 opacity-50" />
                    <p className="text-sm font-medium text-zinc-400">Sin reproducciones registradas aún</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      ¡Escuchá temas en la radio para que aparezcan en el ranking!
                    </p>
                  </div>
                ) : (
                  ranking.map((item, index) => {
                    const isTop1 = index === 0;
                    const isTop2 = index === 1;
                    const isTop3 = index === 2;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleTuneToTrack(item)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 active:scale-[0.99] border border-white/5 hover:border-amber-500/40 transition-all text-left group"
                      >
                        {/* Posición # */}
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                            isTop1
                              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/50 shadow-sm'
                              : isTop2
                              ? 'bg-zinc-300/20 text-zinc-200 border border-zinc-300/40'
                              : isTop3
                              ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          #{index + 1}
                        </div>

                        {/* Carátula */}
                        <div className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-zinc-800 flex items-center justify-center">
                          {item.artwork_url && !failedImgIds[item.id] ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={item.artwork_url}
                              alt={item.title}
                              onError={() => setFailedImgIds((prev) => ({ ...prev, [item.id]: true }))}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-500 bg-zinc-800/80">
                              <Radio className="w-5 h-5 opacity-70" />
                            </div>
                          )}
                        </div>

                        {/* Título y Artista */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-white truncate group-hover:text-amber-300 transition-colors">
                            {item.title}
                          </div>
                          <div className="text-xs text-zinc-400 truncate flex items-center gap-1.5 mt-0.5">
                            <span>{item.artist}</span>
                            <span className="text-zinc-600">•</span>
                            <span className="font-mono text-zinc-400">{item.country}</span>
                            <span className="text-zinc-600">•</span>
                            <span className="font-mono text-zinc-400">{item.year}</span>
                          </div>
                        </div>

                        {/* Contador de Reproducciones */}
                        <div className="shrink-0 flex items-center gap-1 text-xs font-mono font-semibold text-amber-400/90 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                          <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          <span>{item.play_count}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Pie con instrucción de clic */}
              <div className="pt-3 border-t border-white/10 text-center text-[11px] font-mono text-zinc-500">
                Al hacer clic en cualquier tema, la radio gira automáticamente hacia esa época 📻
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
