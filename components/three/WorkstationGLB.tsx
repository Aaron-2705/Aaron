"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  Box3,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  type Group,
  type MeshStandardMaterial,
  type Object3D,
  Vector3,
} from "three";

import { registerObject, unregisterObject, type ObjectName } from "@/components/three/registry";
import {
  createStatusPainter,
  createTerminalPainter,
  type ScreenPainter,
} from "@/lib/screenTexture";
import { THEME_3D } from "@/data/themes";
import type { ThemeName } from "@/types";

const MODEL_URL = "/models/workstation.glb";
const DRACO_PATH = "/draco/";
/** Desired footprint width of the setup in world units (meters). */
const TARGET_WIDTH = 3.4;
/** Screen redraw interval (seconds) — cheap fake-UI animation. */
const SCREEN_TICK = 0.35;

/**
 * Painter cache — the GLTF scene is module-cached by drei, so screen
 * replacement must happen exactly once per scene. Never disposed:
 * page-lifetime resource, same as the cached GLB itself.
 */
const painterCache = new WeakMap<Object3D, ScreenPainter[]>();

/** GLB node name → stable registry name. */
// NOTE: GLTFLoader sanitizes node names — dots are stripped.
const NODE_REGISTRY: Array<[string, ObjectName]> = [
  ["desk", "desk"],
  ["Cylinder", "main_monitor"],
  ["Plane006", "secondary_monitor"],
  ["whole_boundary_Plane004", "chair"],
  ["pad", "keyboard"],
];

/**
 * The real textured workstation (Sketchfab gaming setup).
 * Normalized at runtime (scale/center/floor) so camera targets stay stable,
 * meshes are registered under the same stable names as the old placeholder —
 * swapping models never touches app logic.
 */
export function WorkstationGLB({ theme }: { theme: ThemeName }) {
  const groupRef = useRef<Group>(null);
  const { scene } = useGLTF(MODEL_URL, DRACO_PATH);
  const tokens = THEME_3D[theme];

  // Normalize the model + collect screen meshes.
  // The GLTF scene is cached/shared, so transforms are reset to identity
  // before measuring — re-runs stay idempotent.
  const painters = useMemo<ScreenPainter[]>(() => {
    const cached = painterCache.get(scene);
    if (cached !== undefined) return cached;

    scene.scale.setScalar(1);
    scene.position.set(0, 0, 0);
    scene.updateMatrixWorld(true);
    const box = new Box3().setFromObject(scene);
    const size = box.getSize(new Vector3());
    const scale = TARGET_WIDTH / Math.max(size.x, size.z, 0.001);
    scene.scale.setScalar(scale);
    scene.updateMatrixWorld(true);
    box.setFromObject(scene);
    const center = box.getCenter(new Vector3());
    scene.position.set(-center.x, -box.min.y, -center.z);

    // Park the chair to the side so it doesn't block the screens.
    // Placed in world space (the FBX hierarchy has nested scales, so local
    // offsets are unreliable). Final world target: left of desk, angled.
    // The outer group rotates -90° about Y, so scene-space = R_y(+90°)·world.
    const chair = scene.getObjectByName("whole_boundary_Plane004");
    if (chair?.parent) {
      scene.updateMatrixWorld(true);
      const sceneSpaceTarget = new Vector3(1.0, 0, 1.55);
      chair.position.copy(chair.parent.worldToLocal(sceneSpaceTarget.clone()));
      chair.rotation.y -= 0.9;
    }

    const terminal = createTerminalPainter(tokens.accent, "#ffb47a");
    const status = createStatusPainter(tokens.accent, "#ffb47a");
    scene.traverse((obj: Object3D) => {
      if (!(obj instanceof Mesh)) return;
      const material = obj.material as MeshStandardMaterial;
      if (material?.name === "Material.009" && terminal) {
        // Main display — live terminal feed (landscape).
        obj.material = new MeshBasicMaterial({
          map: terminal.texture,
          toneMapped: false,
          side: DoubleSide,
        });
        // Register the actual screen plane so the camera can zoom to fill it.
        obj.name = "main_screen";
        registerObject("main_screen", obj);
      } else if (material?.name === "screen.002" && status) {
        // Portrait side monitor — system status panel.
        // Its UVs only cover x∈[0.709, 0.995]; remap so that slice
        // stretches across the full status canvas.
        status.texture.repeat.set(1 / (0.995 - 0.709), 1);
        status.texture.offset.set(-0.709 / (0.995 - 0.709), 0);
        obj.material = new MeshBasicMaterial({
          map: status.texture,
          toneMapped: false,
          side: DoubleSide,
        });
      } else if (material?.emissive) {
        // Boost the RGB props so bloom picks them up.
        material.emissiveIntensity = 1.4;
      }
    });
    const result = [terminal, status].filter((p): p is ScreenPainter => p !== null);
    painterCache.set(scene, result);
    return result;
  }, [scene, tokens]);

  // Register stable object names for camera/interaction systems.
  useEffect(() => {
    for (const [nodeName, stableName] of NODE_REGISTRY) {
      const node = scene.getObjectByName(nodeName);
      if (node) registerObject(stableName, node);
    }
    return () => {
      for (const [, stableName] of NODE_REGISTRY) unregisterObject(stableName);
    };
  }, [scene]);

  // Throttled screen animation.
  const elapsed = useRef(0);
  useFrame((_, delta) => {
    elapsed.current += delta;
    if (elapsed.current >= SCREEN_TICK) {
      elapsed.current = 0;
      for (const painter of painters) painter.tick();
    }
  });

  return (
    // Rotated so the screens (sitter's side) face the room camera.
    <group ref={groupRef} name="workstation" rotation={[0, -Math.PI / 2, 0]}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload(MODEL_URL, DRACO_PATH);
