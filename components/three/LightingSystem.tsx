"use client";

import { THEME_3D } from "@/data/themes";
import type { ThemeName } from "@/types";

export type LightingMode = "normal" | "alert";

interface LightingSystemProps {
  theme: ThemeName;
  /** Future prompts switch this dynamically (e.g. security alert). */
  mode?: LightingMode;
}

/**
 * Hybrid cinematic lighting: warm inhabited room (reference: cyberpunk desk
 * scenes) + cold cyan tech accents + red alert capability.
 */
export function LightingSystem({ theme, mode = "normal" }: LightingSystemProps) {
  const tokens = THEME_3D[theme];
  const alert = mode === "alert";

  return (
    <group name="lighting_system">
      {/* Base fill — warm, lifted so the room never reads pitch black */}
      <ambientLight name="ambient_light" intensity={alert ? 0.25 : 0.5} color="#ffd9b0" />
      <hemisphereLight
        intensity={0.35}
        color="#ffe2c4"
        groundColor="#1a1410"
      />

      {/* Warm key — the ceiling lamp feel from the reference room */}
      <spotLight
        name="key_light"
        position={[-1.2, 3.0, 1.6]}
        angle={0.9}
        penumbra={0.8}
        intensity={alert ? 30 : 60}
        color="#ffc088"
        distance={10}
      />

      {/* Monitor glow — cold cyan wash onto the operator side */}
      <pointLight
        name="monitor_glow"
        position={[0, 1.3, 0.4]}
        intensity={alert ? 2 : 7}
        color={tokens.accent}
        distance={4.5}
      />

      {/* Neon accent behind the desk (magenta-red like the reference wall) */}
      <pointLight
        name="accent_light"
        position={[-2.2, 1.6, -1.4]}
        intensity={alert ? 22 : 9}
        color={alert ? tokens.alert : "#ff5e7a"}
        distance={7}
      />

      {/* Server rack glow */}
      <pointLight
        name="server_glow"
        position={[2.2, 1.2, -1.2]}
        intensity={4}
        color={alert ? tokens.alert : tokens.success}
        distance={4}
      />
    </group>
  );
}
