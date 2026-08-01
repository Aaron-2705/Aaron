"use client";

import { ContactShadows, Sparkles } from "@react-three/drei";

import { CameraRig } from "@/components/three/CameraRig";
import { Effects } from "@/components/three/Effects";
import { LightingSystem } from "@/components/three/LightingSystem";
import { useMaterialLibrary } from "@/components/three/materials";
import { Room } from "@/components/three/room/Room";
import { ServerRack } from "@/components/three/room/ServerRack";
import { WorkstationGLB } from "@/components/three/WorkstationGLB";
import { useTheme } from "@/components/providers/ThemeProvider";
import { THEME_3D } from "@/data/themes";

/**
 * The AARON command center.
 * Centerpiece: real textured workstation GLB with live screen feeds.
 * Shell (walls/server rack) stays procedural — replaceable independently.
 */
export function CommandCenterScene() {
  const { theme } = useTheme();
  const materials = useMaterialLibrary(theme);
  const tokens = THEME_3D[theme];

  return (
    <>
      <color attach="background" args={[tokens.floor]} />
      <fog attach="fog" args={[tokens.floor, 7, 16]} />

      <CameraRig path={["overview", "desk", "main_monitor"]} />
      <LightingSystem theme={theme} />

      <Room materials={materials} />
      <WorkstationGLB theme={theme} />
      <ServerRack materials={materials} position={[1.72, 0, -0.85]} rotation={[0, -0.3, 0]} />

      {/* Grounding + atmosphere */}
      <ContactShadows position={[0, 0.01, 0]} opacity={0.55} scale={8} blur={2.4} far={2} />
      <Sparkles
        count={40}
        scale={[6, 2.5, 4]}
        position={[0, 1.4, -0.4]}
        size={1.6}
        speed={0.18}
        opacity={0.35}
        color="#ffd9a0"
      />

      <Effects />
    </>
  );
}
