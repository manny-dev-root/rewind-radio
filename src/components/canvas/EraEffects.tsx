'use client';

import { EffectComposer, Bloom, Glitch } from '@react-three/postprocessing';
import { GlitchMode } from 'postprocessing';

export interface EraEffectsProps {
  year?: number;
  isGlitching: boolean;
}

/**
 * Post-procesado reactivo de la radio.
 * Mantiene el resplandor cálido de los visores LED y activa el efecto Glitch
 * únicamente en saltos directos (Random, cambio de pista en sintonizador, o click en Top).
 */
export function EraEffects({ isGlitching }: EraEffectsProps) {
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        intensity={0.45}
        luminanceThreshold={0.65}
        luminanceSmoothing={0.9}
        mipmapBlur
      />
      <Glitch
        active={isGlitching}
        mode={GlitchMode.CONSTANT_MILD}
      />
    </EffectComposer>
  );
}
