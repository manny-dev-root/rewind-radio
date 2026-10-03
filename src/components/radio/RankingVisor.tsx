'use client';

import { useState, useEffect } from 'react';
import { useEraStore } from '@/store/useEraStore';
import { audioEngine } from '@/lib/audio-engine';
import { cleanSongTitle } from '@/lib/music-catalog';
import { trackEvent } from '@/lib/analytics';
import type { TrackPlayRecord } from '@/lib/db';

function isPlayingCurrentTrack(
  item: TrackPlayRecord,
  current: { title: string; artist: string } | null
): boolean {
  if (!current || !current.title) return false;
  const t1 = item.title.trim().toLowerCase();
  const t2 = current.title.trim().toLowerCase();
  if (t1 === t2) return true;

  const c1 = cleanSongTitle(t1);
  const c2 = cleanSongTitle(t2);
  if (c1.length > 2 && c2.length > 2 && (c1 === c2 || c1.includes(c2) || c2.includes(c1))) {
    const a1 = item.artist.trim().toLowerCase();
    const a2 = current.artist.trim().toLowerCase();
    if (!a1 || !a2 || a1.includes(a2) || a2.includes(a1)) return true;
  }
  return false;
}

export function RankingVisor() {
  const [ranking, setRanking] = useState<TrackPlayRecord[]>([]);
  const tuneData = useEraStore((state) => state.tuneData);
  const trackIndex = useEraStore((state) => state.trackIndex);
  const currentTrack = tuneData?.playlist?.[trackIndex] ?? tuneData?.track ?? null;

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await fetch('/api/ranking?limit=10');
        if (res.ok && isMounted) {
          const data = (await res.json()) as { ranking?: TrackPlayRecord[] };
          if (data.ranking && data.ranking.length > 0) {
            setRanking(data.ranking);
          }
        }
      } catch {}
    };

    load();
    const interval = setInterval(load, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleTrackClick = (track: TrackPlayRecord) => {
    audioEngine?.playClick();
    trackEvent('ranking_track_clicked', {
      title: track.title,
      artist: track.artist,
      country: track.country,
      year: track.year,
      plays: track.play_count,
    });
    useEraStore.setState({
      currentCountry: track.country,
      currentYear: track.year,
      trackIndex: 0,
      targetTrack: { title: track.title, artist: track.artist },
    });
  };

  const displayItems = ranking.slice(0, 8);

  return (
    <div className="w-full bg-[#07070d] rounded-xl border border-white/5 shadow-[inset_0_3px_10px_rgba(0,0,0,0.95)] p-3.5 relative flex flex-col justify-between h-full select-none">
      {/* Reflejo de cristal */}
      <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none rounded-t-xl" />

      {/* Título Principal */}
      <div className="text-center pb-2.5 border-b border-amber-500/15">
        <span className="text-[#ff9933] font-mono font-bold text-xs sm:text-sm tracking-[0.2em] [text-shadow:0_0_10px_rgba(255,140,0,0.7)]">
          MÁS ESCUCHADAS
        </span>
      </div>

      {/* Encabezado de columnas */}
      <div className="flex items-center text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider py-1.5 border-b border-white/5">
        <span className="w-5 text-center">#</span>
        <span className="flex-1 px-1">TÍTULO · ARTISTA</span>
        <span className="w-10 text-right">PLAYS</span>
      </div>

      {/* Filas del Top */}
      <div className="flex flex-col justify-around flex-1 py-1 gap-1">
        {displayItems.map((item, index) => {
          const isPlaying = isPlayingCurrentTrack(item, currentTrack);
          return (
            <button
              key={index}
              type="button"
              onClick={() => handleTrackClick(item)}
              className={`w-full flex items-center text-left py-0.5 px-1 rounded transition-colors group ${
                isPlaying
                  ? 'bg-amber-500/15 text-white'
                  : 'hover:bg-white/[0.04] text-[#ffaa44]'
              }`}
            >
              {/* Ranking # */}
              <span className="w-5 text-center font-mono font-bold text-xs text-amber-500/80">
                {index + 1}
              </span>

              {/* Título y Artista */}
              <div className="flex-1 min-w-0 px-1 truncate flex items-center gap-1.5">
                {isPlaying && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block flex-shrink-0" />
                )}
                <span
                  className={`font-mono text-xs truncate uppercase font-medium ${
                    isPlaying
                      ? 'text-white [text-shadow:0_0_8px_#ff9900]'
                      : 'group-hover:text-amber-200'
                  }`}
                >
                  {item.title} <span className="text-zinc-400 font-normal">· {item.artist}</span>
                </span>
              </div>

              {/* Contador de Plays */}
              <span className="w-10 text-right font-mono text-[10px] sm:text-[11px] text-amber-400/90 font-bold">
                {item.play_count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
