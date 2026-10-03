'use client';

import { EffectComposer, Bloom } from '@react-three/postprocessing';

export interface EraEffectsProps {
  year?: number;
  isGlitching?: boolean;
}

/**
 * Post-procesado de iluminación de la radio.
 * Mantiene el resplandor cálido (Bloom) de los visores LED, botones e indicador de volumen,
 * garantizando una imagen limpia, sólida y sin desgarros ni cortes horizontales.
 */
export function EraEffects({}: EraEffectsProps) {
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        intensity={0.45}
        luminanceThreshold={0.65}
        luminanceSmoothing={0.9}
        mipmapBlur
      />
    </EffectComposer>
  );
}

