'use client';

import { useRef, useEffect, useState } from 'react';
import { audioEngine } from '@/lib/audio-engine';
import { trackEvent } from '@/lib/analytics';

interface DialKnobProps {
  values: readonly (string | number)[];
  currentIndex: number;
  onChange: (index: number) => void;
  label: string;
}

export function DialKnob({ values, currentIndex, onChange, label }: DialKnobProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragAcc = useRef(0);
  const lastPointerPos = useRef({ x: 0, y: 0 });
  const lastIndex = useRef(currentIndex);

  const count = Math.max(values.length, 1);
  const MIN_ANGLE = -135;
  const MAX_ANGLE = 135;
  const TOTAL_ARC = MAX_ANGLE - MIN_ANGLE; // 270 degrees

  const getAngleForIndex = (idx: number) => {
    if (count <= 1) return 0;
    return MIN_ANGLE + (idx / (count - 1)) * TOTAL_ARC;
  };

  useEffect(() => {
    lastIndex.current = currentIndex;
  }, [currentIndex]);

  const updateIndex = (newIdx: number) => {
    const clamped = Math.max(0, Math.min(count - 1, newIdx));
    if (clamped !== lastIndex.current) {
      lastIndex.current = clamped;
      onChange(clamped);
      audioEngine?.playClick();
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = true;
    dragAcc.current = 0;
    lastPointerPos.current = { x: e.clientX, y: e.clientY };

    // Si el usuario hace clic sobre el anillo de marcas exteriores, posicionar inmediatamente al punto radial correspondiente
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.hypot(e.clientX - cx, e.clientY - cy);

      if (dist >= 44) {
        const angleRad = Math.atan2(e.clientX - cx, -(e.clientY - cy));
        const angleDeg = angleRad * (180 / Math.PI); // 0 arriba, -180 a +180
        if (angleDeg >= -145 && angleDeg <= 145) {
          const clamped = Math.max(MIN_ANGLE, Math.min(MAX_ANGLE, angleDeg));
          const norm = (clamped - MIN_ANGLE) / TOTAL_ARC;
          const targetIdx = Math.round(norm * (count - 1));
          updateIndex(targetIdx);
        }
      }
    }

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    const deltaX = e.clientX - lastPointerPos.current.x;
    const deltaY = lastPointerPos.current.y - e.clientY; // Arriba positivo
    lastPointerPos.current = { x: e.clientX, y: e.clientY };

    // Movimiento dominante: arriba/derecha incrementa, abajo/izquierda decrementa
    const movement = Math.abs(deltaY) >= Math.abs(deltaX) ? deltaY : deltaX;
    dragAcc.current += movement;

    const STEP_PX = 16; // Sensibilidad calibrada: 1 paso discreto cada 16px
    if (Math.abs(dragAcc.current) >= STEP_PX) {
      const steps = Math.trunc(dragAcc.current / STEP_PX);
      dragAcc.current -= steps * STEP_PX;
      updateIndex(lastIndex.current + steps);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    dragAcc.current = 0;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const dir = e.deltaY < 0 ? 1 : -1;
    updateIndex(lastIndex.current + dir);
  };

  const currentValue = values[currentIndex] ?? values[0];
  const currentAngle = getAngleForIndex(currentIndex);

  // Generar las marcas radiales discretas
  const marks = Array.from({ length: count }).map((_, i) => {
    const angle = getAngleForIndex(i);
    const isSelected = i === currentIndex;
    const val = String(values[i]);

    // Para años: destacar décadas principales ('70, '80, '90, '00, '10, '20, '24)
    const isYear = count > 15;
    const isMajor = isYear ? i % 10 === 0 || i === count - 1 : true;
    const displayText = isYear
      ? isMajor
        ? `'${val.slice(-2)}`
        : ''
      : val;

    return {
      index: i,
      angle,
      isSelected,
      isMajor,
      displayText,
    };
  });

  return (
    <div className="flex flex-col items-center select-none relative group">
      {/* Contenedor principal del Dial con marcas radiales alrededor (más grande e imponente) */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        title={`Girar ${label} (arrastrar o hacer clic en una marca)`}
        className="w-48 h-48 sm:w-52 sm:h-52 md:w-56 md:h-56 relative flex items-center justify-center cursor-grab active:cursor-grabbing"
      >
        {/* Anillo de Marcas Radiales */}
        <div className="absolute inset-0 pointer-events-none z-20">
          {marks.map((m) => {
            const rTick = 72; // radio en px para rayitas
            const rText = 89; // radio en px para etiquetas

            return (
              <div
                key={m.index}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                {/* Rayita radial indicadora (botón de clic directo) */}
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    trackEvent('dial_mark_clicked', { label, value: values[m.index], index: m.index });
                    updateIndex(m.index);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    trackEvent('dial_mark_clicked', { label, value: values[m.index], index: m.index });
                    updateIndex(m.index);
                  }}
                  title={`Seleccionar ${values[m.index]}`}
                  className="absolute w-7 h-7 pointer-events-auto cursor-pointer flex items-center justify-center outline-none group/tick z-30"
                  style={{
                    transform: `rotate(${m.angle}deg) translateY(-${rTick}px)`,
                  }}
                >
                  <div
                    className={`rounded-full transition-all duration-100 ${
                      m.isSelected
                        ? 'w-1.5 h-4 bg-[#ffaa33] [box-shadow:0_0_10px_#ff9900,0_0_18px_#ff6600]'
                        : m.isMajor
                        ? 'w-[2.5px] h-3 bg-amber-500/65 group-hover/tick:bg-amber-300 group-hover/tick:h-4'
                        : 'w-[1.5px] h-2 bg-zinc-600/70 group-hover/tick:bg-zinc-300'
                    }`}
                  />
                </button>

                {/* Texto de la marca (código de país o año década, botón de clic directo) */}
                {m.displayText && (
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      trackEvent('dial_mark_clicked', { label, value: values[m.index], index: m.index });
                      updateIndex(m.index);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      trackEvent('dial_mark_clicked', { label, value: values[m.index], index: m.index });
                      updateIndex(m.index);
                    }}
                    title={`Seleccionar ${values[m.index]}`}
                    className={`absolute px-1.5 py-0.5 pointer-events-auto text-[11px] sm:text-xs font-mono font-bold cursor-pointer transition-all duration-100 z-30 outline-none rounded hover:bg-white/10 ${
                      m.isSelected
                        ? 'text-[#ffaa33] [text-shadow:0_0_10px_rgba(255,140,0,0.85)] scale-110 font-black'
                        : 'text-zinc-500 hover:text-zinc-200'
                    }`}
                    style={{
                      transform: `rotate(${m.angle}deg) translateY(-${rText}px) rotate(${-m.angle}deg)`,
                    }}
                  >
                    {m.displayText}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Perilla circular central con bisel metálico estriado (agrandada) */}
        <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full p-2.5 bg-[#1b1d2a] shadow-[0_12px_28px_rgba(0,0,0,0.95),inset_0_1px_1px_rgba(255,255,255,0.2)] border border-white/10 flex items-center justify-center relative z-10 pointer-events-none">
          {/* Cuerpo rotativo de la perilla: salta discretamente de ángulo con suavidad */}
          <div
            className="absolute inset-2 rounded-full bg-gradient-to-b from-[#2e3042] via-[#20212e] to-[#12131b] shadow-[inset_0_2px_5px_rgba(255,255,255,0.15),0_3px_8px_rgba(0,0,0,0.7)] pointer-events-none transition-transform duration-100 ease-out"
            style={{
              transform: `rotate(${currentAngle}deg)`,
            }}
          >
            {/* Puntero/Muesca luminosa ámbar que apunta a la marca radial activa */}
            <div className="w-2 h-4 sm:w-2 sm:h-4.5 bg-[#ffaa33] rounded-full mx-auto mt-0.5 [box-shadow:0_0_10px_#ff9900,0_0_18px_#ff6600]" />
          </div>

          {/* Pantalla LED digital central con el valor actual (más amplia y nítida) */}
          <div className="w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-full bg-[#080810] border border-amber-500/30 shadow-[inset_0_2px_10px_rgba(0,0,0,0.98),0_1px_2px_rgba(255,255,255,0.06)] flex flex-col items-center justify-center pointer-events-none z-10">
            <span className="text-[#ffaa33] font-mono font-bold text-sm sm:text-base md:text-lg tracking-wider [text-shadow:0_0_12px_rgba(255,140,0,0.85)]">
              {currentValue}
            </span>
          </div>
        </div>
      </div>

      {/* Botones discretos paso a paso [<] y [>] a los lados del rótulo */}
      <div className="flex items-center gap-3 mt-1">
        <button
          type="button"
          onClick={() => {
            trackEvent('dial_stepper_clicked', { label, direction: 'prev' });
            updateIndex(currentIndex - 1);
          }}
          disabled={currentIndex <= 0}
          title={`Anterior ${label}`}
          className="w-5 h-5 rounded flex items-center justify-center text-zinc-500 hover:text-amber-400 disabled:opacity-20 disabled:hover:text-zinc-500 transition-colors cursor-pointer text-xs font-mono font-bold"
        >
          ‹
        </button>
        <span className="text-xs sm:text-[13px] font-mono font-bold text-zinc-400 tracking-[0.25em] uppercase">
          {label}
        </span>
        <button
          type="button"
          onClick={() => {
            trackEvent('dial_stepper_clicked', { label, direction: 'next' });
            updateIndex(currentIndex + 1);
          }}
          disabled={currentIndex >= count - 1}
          title={`Siguiente ${label}`}
          className="w-5 h-5 rounded flex items-center justify-center text-zinc-500 hover:text-amber-400 disabled:opacity-20 disabled:hover:text-zinc-500 transition-colors cursor-pointer text-xs font-mono font-bold"
        >
          ›
        </button>
      </div>
    </div>
  );
}
