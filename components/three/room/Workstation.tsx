"use client";

import { useRef } from "react";
import type { Group } from "three";

import type { MaterialLibrary } from "@/components/three/materials";
import { Monitor } from "@/components/three/room/Monitor";
import { useRegisterObject } from "@/components/three/registry";

interface WorkstationProps {
  materials: MaterialLibrary;
}

/** Desk, monitors, keyboard, mouse, PC tower and chair — the hero workstation. */
export function Workstation({ materials }: WorkstationProps) {
  const deskRef = useRef<Group>(null);
  const chairRef = useRef<Group>(null);
  const keyboardRef = useRef<Group>(null);
  const mouseRef = useRef<Group>(null);
  const pcRef = useRef<Group>(null);

  useRegisterObject("desk", deskRef);
  useRegisterObject("chair", chairRef);
  useRegisterObject("keyboard", keyboardRef);
  useRegisterObject("mouse", mouseRef);
  useRegisterObject("pc_case", pcRef);

  return (
    <group name="workstation">
      {/* Desk */}
      <group ref={deskRef} name="desk">
        <mesh material={materials.plastic} position={[0, 0.72, -0.5]}>
          <boxGeometry args={[2.2, 0.05, 0.9]} />
        </mesh>
        {/* Neon edge strip on desk front */}
        <mesh material={materials.neonAccent} position={[0, 0.705, -0.06]}>
          <boxGeometry args={[2.2, 0.008, 0.008]} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} material={materials.metal} position={[side * 1.0, 0.36, -0.5]}>
            <boxGeometry args={[0.06, 0.72, 0.8]} />
          </mesh>
        ))}
      </group>

      {/* Monitors */}
      <Monitor
        name="main_monitor"
        materials={materials}
        position={[0, 1.15, -0.72]}
        size={[0.66, 0.38]}
      />
      <Monitor
        name="secondary_monitor"
        materials={materials}
        position={[-0.62, 1.12, -0.66]}
        rotation={[0, 0.32, 0]}
        size={[0.5, 0.3]}
      />

      {/* Keyboard */}
      <group ref={keyboardRef} name="keyboard" position={[0, 0.755, -0.32]}>
        <mesh material={materials.plastic}>
          <boxGeometry args={[0.42, 0.015, 0.14]} />
        </mesh>
        <mesh material={materials.neonAccent} position={[0, 0.009, 0]}>
          <boxGeometry args={[0.38, 0.002, 0.1]} />
        </mesh>
      </group>

      {/* Mouse */}
      <group ref={mouseRef} name="mouse" position={[0.32, 0.76, -0.32]}>
        <mesh material={materials.plastic}>
          <sphereGeometry args={[0.035, 12, 12]} />
        </mesh>
      </group>

      {/* PC tower under the desk */}
      <group ref={pcRef} name="pc_case" position={[0.85, 0.25, -0.55]}>
        <mesh material={materials.metal}>
          <boxGeometry args={[0.22, 0.5, 0.45]} />
        </mesh>
        <mesh material={materials.neonAccent} position={[0, 0, 0.228]}>
          <planeGeometry args={[0.14, 0.02]} />
        </mesh>
      </group>

      {/* Chair */}
      <group ref={chairRef} name="chair" position={[0, 0, 0.35]}>
        <mesh material={materials.plastic} position={[0, 0.48, 0]}>
          <boxGeometry args={[0.5, 0.06, 0.5]} />
        </mesh>
        <mesh material={materials.plastic} position={[0, 0.85, 0.24]} rotation={[-0.12, 0, 0]}>
          <boxGeometry args={[0.48, 0.7, 0.06]} />
        </mesh>
        <mesh material={materials.metal} position={[0, 0.24, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.44, 10]} />
        </mesh>
        <mesh material={materials.metal} position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.26, 0.3, 0.04, 5]} />
        </mesh>
      </group>
    </group>
  );
}
