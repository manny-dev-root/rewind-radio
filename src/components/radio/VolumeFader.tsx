'use client';

import { useRef, useEffect } from 'react';
import { useEraStore } from '@/store/useEraStore';
import { audioEngine } from '@/lib/audio-engine';
import { trackEvent } from '@/lib/analytics';

export function VolumeFader() {
  const currentVolume = useEraStore((s) => s.volume);
  const setVolume = useEraStore((s) => s.setVolume);

  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastLoggedVolume = useRef(currentVolume);
  const lastNotch = useRef(Math.round(currentVolume / 10));

  const updateVolume = (newVol: number, isFinal = false) => {
    const clamped = Math.max(0, Math.min(100, newVol));
    setVolume(clamped);

    const notch = Math.round(clamped / 10);
    if (notch !== lastNotch.current) {
      lastNotch.current = notch;
      audioEngine?.playClick();
    }

    if (isFinal && Math.abs(clamped - lastLoggedVolume.current) >= 5) {
      lastLoggedVolume.current = clamped;
      trackEvent('volume_changed', { volume: clamped, notch });
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    document.body.style.cursor = 'grabbing';
    handlePointerMove(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    // Invertir Y: click arriba = 100%, click abajo = 0%
    const relativeY = rect.bottom - e.clientY;
    const norm = Math.max(0, Math.min(1, relativeY / rect.height));
    const newVol = Math.round(norm * 100);
    updateVolume(newVol, false);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    document.body.style.cursor = 'auto';
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    updateVolume(currentVolume, true);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const step = e.deltaY < 0 ? 5 : -5;
    const nextVol = Math.max(0, Math.min(100, currentVolume + step));
    updateVolume(nextVol, true);
  };

  const currentLevel = Math.round(currentVolume / 10);

  return (
    <div className="w-full flex flex-col justify-between h-full select-none" onWheel={handleWheel}>
      {/* Visor LCD de Volumen (flex-1: exactamente la misma altura que la pantalla del ranking) */}
      <div className="w-full bg-[#07070d] rounded-xl border border-white/5 shadow-[inset_0_3px_10px_rgba(0,0,0,0.95)] p-3 relative flex flex-col justify-between flex-1 group">
        {/* Reflejo de cristal superior idéntico al del ranking */}
        <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none rounded-t-xl" />

        {/* Título Principal VOLUMEN */}
        <div className="text-center pb-2.5 border-b border-amber-500/15">
          <span className="text-[#ff9933] font-mono font-bold text-xs sm:text-sm tracking-[0.2em] [text-shadow:0_0_10px_rgba(255,140,0,0.7)]">
            VOLUMEN
          </span>
        </div>

        {/* Área interactiva del Fader y la escala (0 a 10) */}
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="w-full flex-1 relative my-2 cursor-grab active:cursor-grabbing"
        >
          {/* Ranura del canal de deslizamiento (ubicada a la izquierda) */}
          <div className="absolute left-[18px] top-1 bottom-1 w-2 bg-[#040407] rounded-full border border-white/5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.9)] flex flex-col justify-end overflow-hidden">
            {/* Línea incandescente naranja que sube con el volumen */}
            <div
              className="w-full bg-gradient-to-t from-[#ff6a00] to-[#ffaa33] rounded-full [box-shadow:0_0_8px_#ff9900,0_0_16px_#ff6600] transition-all duration-75"
              style={{ height: `${currentVolume}%` }}
            />
          </div>

          {/* Perilla deslizante táctil (Fader Cap centrada sobre la ranura izquierda) */}
          <div
            className="absolute left-[2px] w-8 h-[22px] rounded-md bg-gradient-to-b from-[#3a3c4f] via-[#242534] to-[#181924] shadow-[0_4px_8px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.25)] border border-white/10 flex items-center justify-center pointer-events-none transition-all duration-75 ease-out z-20"
            style={{
              bottom: `calc(${currentVolume}% - 11px)`,
            }}
          >
            {/* Línea incandescente central en la perilla */}
            <div className="w-5 h-[2px] bg-[#ffaa33] rounded-full [box-shadow:0_0_6px_#ff9900]" />
          </div>

          {/* Escala graduada 0 a 10: marcas y números a la DERECHA (nunca tapados por la perilla) */}
          <div className="absolute left-[36px] right-1 top-1 bottom-1 flex flex-col-reverse justify-between items-start pointer-events-none">
            {Array.from({ length: 11 }).map((_, i) => {
              const isActive = i <= currentLevel;
              const isCurrent = i === currentLevel;
              const isMajor = i === 0 || i === 5 || i === 10;
              return (
                <div key={i} className="flex items-center gap-1.5 h-3">
                  {/* Muesca horizontal */}
                  <div
                    className={`h-[2px] rounded-full transition-colors ${
                      isMajor ? 'w-3' : 'w-1.5'
                    } ${
                      isActive
                        ? 'bg-[#ffaa33] [box-shadow:0_0_6px_#ff9900]'
                        : 'bg-zinc-600'
                    }`}
                  />
                  {/* Número */}
                  <span
                    className={`font-mono text-[10px] font-bold transition-colors select-none ${
                      isCurrent
                        ? 'text-white [text-shadow:0_0_8px_#ffffff]'
                        : isActive
                        ? 'text-[#ffaa33]'
                        : 'text-zinc-500'
                    }`}
                  >
                    {i}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Ranuras acústicas vintage del altavoz derecho (simétricas con las del lado izquierdo) */}
      <div className="flex flex-col gap-2.5 py-4 px-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-1 bg-[#090a10] rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.95),0_1px_0_rgba(255,255,255,0.06)] border-b border-white/[0.04]"
          />
        ))}
      </div>

      {/* Indicador LED y Rótulo POWER simétrico con REWIND RADIO del lado izquierdo */}
      <div className="flex items-center justify-center gap-2 pb-1" title="Sistema encendido (POWER)">
        <div className="w-2.5 h-2.5 rounded-full bg-[#00ff88] [box-shadow:0_0_8px_#00ff88,0_0_16px_#00ff88] border border-white/50" />
        <span className="text-xs font-mono font-bold text-zinc-400/80 tracking-[0.28em] uppercase [text-shadow:0_1px_0_rgba(255,255,255,0.08),0_-1px_1px_rgba(0,0,0,0.8)]">
          POWER
        </span>
      </div>
    </div>
  );
}
