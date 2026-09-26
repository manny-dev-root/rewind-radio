'use client';

import { EffectComposer, Bloom, Glitch } from '@react-three/postprocessing';
import { GlitchMode } from 'postprocessing';

export interface EraEffectsProps {
  year?: number;
  isTuning: boolean;
}

/**
 * Post-procesado limpio sin filtros por rangos de años.
 * Conserva únicamente el brillo de los displays LED y el efecto Glitch al cambiar de año/sintonizar.
 */
export function EraEffects({ isTuning }: EraEffectsProps) {
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        intensity={0.45}
        luminanceThreshold={0.65}
        luminanceSmoothing={0.9}
        mipmapBlur
      />
      <Glitch
        active={isTuning}
        mode={GlitchMode.SPORADIC}
      />
    </EffectComposer>
  );
}
