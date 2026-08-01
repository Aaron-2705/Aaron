"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { MeshStandardMaterial, type Group } from "three";

import type { MaterialLibrary } from "@/components/three/materials";
import { useRegisterObject } from "@/components/three/registry";

interface ServerRackProps {
  materials: MaterialLibrary;
  position: [number, number, number];
  rotation?: [number, number, number];
}

const SLAT_COUNT = 7;

/**
 * Server tower styled after the reference room: dark cabinet with
 * horizontal glowing slats that pulse like breathing server activity.
 */
export function ServerRack({ materials, position, rotation = [0, 0, 0] }: ServerRackProps) {
  const groupRef = useRef<Group>(null);
  useRegisterObject("server_rack", groupRef);

  // One emissive material per slat for independent pulsing.
  const slatMaterials = useMemo(
    () =>
      Array.from(
        { length: SLAT_COUNT },
        () =>
          new MeshStandardMaterial({
            color: "#1a1206",
            emissive: "#ffb347",
            emissiveIntensity: 1.2,
            roughness: 0.4,
          }),
      ),
    [],
  );

  useEffect(() => {
    return () => slatMaterials.forEach((m) => m.dispose());
  }, [slatMaterials]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    slatMaterials.forEach((material, i) => {
      material.emissiveIntensity = 1.0 + Math.sin(t * 1.4 + i * 0.9) * 0.55;
    });
  });

  return (
    <group ref={groupRef} name="server_rack" position={position} rotation={rotation}>
      {/* Cabinet */}
      <mesh material={materials.metal} position={[0, 0.85, 0]}>
        <boxGeometry args={[0.5, 1.7, 0.55]} />
      </mesh>
      {/* Glowing horizontal slats on the front face */}
      {Array.from({ length: SLAT_COUNT }, (_, i) => (
        <mesh key={i} material={slatMaterials[i]} position={[0, 0.28 + i * 0.21, 0.278]}>
          <boxGeometry args={[0.4, 0.045, 0.012]} />
        </mesh>
      ))}
      {/* Status LEDs at the top */}
      <mesh material={materials.led} position={[-0.12, 1.66, 0.278]}>
        <sphereGeometry args={[0.014, 8, 8]} />
      </mesh>
      <mesh material={materials.ledAlert} position={[-0.05, 1.66, 0.278]}>
        <sphereGeometry args={[0.014, 8, 8]} />
      </mesh>
      {/* Feet */}
      {([-1, 1] as const).map((side) => (
        <mesh key={side} material={materials.metal} position={[side * 0.18, 0.02, 0]}>
          <boxGeometry args={[0.08, 0.04, 0.5]} />
        </mesh>
      ))}
    </group>
  );
}
