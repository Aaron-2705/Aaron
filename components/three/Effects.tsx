"use client";

import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  Noise,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";

import { useIsTouchDevice } from "@/hooks/useIsTouchDevice";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * Cinematic post stack for the hero scene:
 * bloom (emissive glow) → subtle chromatic aberration (lens character)
 * → film grain → vignette (focus). Tuned so DOM text stays untouched —
 * effects apply only inside the canvas.
 * Skipped on touch/weak hardware/reduced-motion.
 */
export function Effects() {
  const isTouch = useIsTouchDevice();
  const reducedMotion = usePrefersReducedMotion();

  const weakGpu =
    typeof navigator !== "undefined" && (navigator.hardwareConcurrency ?? 8) < 6;

  if (isTouch || reducedMotion || weakGpu) return null;

  return (
    <EffectComposer>
      <Bloom intensity={0.55} luminanceThreshold={0.35} luminanceSmoothing={0.9} mipmapBlur />
      <ChromaticAberration offset={[0.0007, 0.0004]} radialModulation modulationOffset={0.4} />
      <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.05} />
      <Vignette eskil={false} offset={0.22} darkness={0.72} />
    </EffectComposer>
  );
}
