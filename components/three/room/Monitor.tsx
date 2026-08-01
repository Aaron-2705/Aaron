"use client";

import { useRef } from "react";
import type { Group } from "three";

import type { MaterialLibrary } from "@/components/three/materials";
import { useRegisterObject, type ObjectName } from "@/components/three/registry";

interface MonitorProps {
  name: Extract<ObjectName, "main_monitor" | "secondary_monitor">;
  materials: MaterialLibrary;
  position: [number, number, number];
  rotation?: [number, number, number];
  /** Screen width/height in meters. */
  size?: [number, number];
  powered?: boolean;
}

/**
 * Reusable monitor: frame + stand + screen mesh.
 * The screen mesh is named `${name}_screen` so future prompts can target it
 * for video textures / HTML overlays / the portal transition.
 */
export function Monitor({
  name,
  materials,
  position,
  rotation = [0, 0, 0],
  size = [0.62, 0.36],
  powered = true,
}: MonitorProps) {
  const groupRef = useRef<Group>(null);
  useRegisterObject(name, groupRef);
  const [w, h] = size;

  return (
    <group ref={groupRef} name={name} position={position} rotation={rotation}>
      {/* Frame */}
      <mesh material={materials.metal} position={[0, 0, -0.015]}>
        <boxGeometry args={[w + 0.04, h + 0.04, 0.03]} />
      </mesh>
      {/* Screen */}
      <mesh
        name={`${name}_screen`}
        material={powered ? materials.screenOn : materials.screenOff}
        position={[0, 0, 0.002]}
      >
        <planeGeometry args={[w, h]} />
      </mesh>
      {/* Stand */}
      <mesh material={materials.metal} position={[0, -h / 2 - 0.07, -0.02]}>
        <cylinderGeometry args={[0.015, 0.02, 0.14, 12]} />
      </mesh>
      <mesh material={materials.metal} position={[0, -h / 2 - 0.145, -0.02]}>
        <boxGeometry args={[0.18, 0.015, 0.12]} />
      </mesh>
    </group>
  );
}
