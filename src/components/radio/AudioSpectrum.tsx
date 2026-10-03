'use client';

import { useRef, useEffect } from 'react';
import { useAudioAnalyser } from '@/hooks/useAudioAnalyser';

interface AudioSpectrumProps {
  className?: string;
  barsCount?: number;
}

export function AudioSpectrum({ className = '', barsCount = 20 }: AudioSpectrumProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { frequencyData, update } = useAudioAnalyser();

  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      update();
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const barWidth = (width / barsCount) * 0.72;
      const step = width / barsCount;

      for (let i = 0; i < barsCount; i++) {
        const dataIndex = Math.min(Math.floor((i / barsCount) * 44), 63);
        const val = frequencyData[dataIndex] || 0;
        const normalized = Math.pow(val / 255, 1.2);
        const barH = Math.max(2, normalized * height);

        const x = i * step + (step - barWidth) / 2;
        const y = height - barH;

        // Gradiente ámbar brillante con brillo retro
        const grad = ctx.createLinearGradient(0, height, 0, y);
        grad.addColorStop(0, '#ff6a00');
        grad.addColorStop(1, '#ffaa33');

        ctx.fillStyle = grad;
        ctx.shadowColor = '#ff7700';
        ctx.shadowBlur = normalized > 0.3 ? 6 : 2;

        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barH, [2, 2, 0, 0]);
          ctx.fill();
        } else {
          ctx.fillRect(x, y, barWidth, barH);
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [barsCount, update, frequencyData]);

  return (
    <canvas
      ref={canvasRef}
      width={280}
      height={28}
      className={`w-full h-7 block ${className}`}
    />
  );
}
