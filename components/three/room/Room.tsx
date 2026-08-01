"use client";

import { useRef } from "react";
import type { Group, Mesh } from "three";

import type { MaterialLibrary } from "@/components/three/materials";
import { useRegisterObject } from "@/components/three/registry";

interface RoomProps {
  materials: MaterialLibrary;
}

const ROOM = { width: 7, depth: 7, height: 3.2 } as const;

/** Room shell: floor, walls, ceiling and neon trim. */
export function Room({ materials }: RoomProps) {
  const roomRef = useRef<Group>(null);
  const floorRef = useRef<Mesh>(null);
  const ceilingRef = useRef<Mesh>(null);
  const wallLeftRef = useRef<Mesh>(null);
  const wallRightRef = useRef<Mesh>(null);
  const wallBackRef = useRef<Mesh>(null);

  useRegisterObject("room", roomRef);
  useRegisterObject("floor", floorRef);
  useRegisterObject("ceiling", ceilingRef);
  useRegisterObject("wall_left", wallLeftRef);
  useRegisterObject("wall_right", wallRightRef);
  useRegisterObject("wall_back", wallBackRef);

  const { width, depth, height } = ROOM;

  return (
    <group ref={roomRef} name="room">
      <mesh
        ref={floorRef}
        name="floor"
        material={materials.floor}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
      >
        <planeGeometry args={[width, depth]} />
      </mesh>
      <mesh
        ref={ceilingRef}
        name="ceiling"
        material={materials.wall}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, height, 0]}
      >
        <planeGeometry args={[width, depth]} />
      </mesh>
      <mesh
        ref={wallBackRef}
        name="wall_back"
        material={materials.wall}
        position={[0, height / 2, -depth / 2 + 1.5]}
      >
        <planeGeometry args={[width, height]} />
      </mesh>
      <mesh
        ref={wallLeftRef}
        name="wall_left"
        material={materials.wall}
        rotation={[0, Math.PI / 2, 0]}
        position={[-width / 2 + 1.5, height / 2, 0]}
      >
        <planeGeometry args={[depth, height]} />
      </mesh>
      <mesh
        ref={wallRightRef}
        name="wall_right"
        material={materials.wall}
        rotation={[0, -Math.PI / 2, 0]}
        position={[width / 2 - 1.5, height / 2, 0]}
      >
        <planeGeometry args={[depth, height]} />
      </mesh>

      {/* Neon trim where back wall meets ceiling */}
      <mesh material={materials.neonAccent} position={[0, height - 0.4, -depth / 2 + 1.51]}>
        <boxGeometry args={[width * 0.7, 0.02, 0.02]} />
      </mesh>
    </group>
  );
}
