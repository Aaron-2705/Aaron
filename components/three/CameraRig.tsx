"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Box3, type PerspectiveCamera, Vector3 } from "three";

import { CAMERA_TARGETS, IDLE_FLOAT, PARALLAX, type CameraTargetName } from "@/data/cameraTargets";
import { getObject } from "@/components/three/registry";
import { useIsTouchDevice } from "@/hooks/useIsTouchDevice";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { scrollState } from "@/lib/scrollState";

interface CameraRigProps {
  /**
   * Waypoints the camera travels through as scroll progress goes 0 → 1.
   * Configurable — no hardcoded positions; targets live in data/cameraTargets.
   */
  path?: readonly CameraTargetName[];
}

/** Ease-in-out for cinematic pacing along the path. */
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Reusable camera controller.
 * Combines: scroll-driven travel between configurable targets,
 * subtle mouse parallax (desktop only), idle floating, smooth interpolation.
 * Future prompts extend this with cinematic sequences and monitor zoom.
 */
export function CameraRig({ path = ["overview", "desk"] }: CameraRigProps) {
  const camera = useThree((state) => state.camera);
  const pointer = useRef({ x: 0, y: 0 });
  const isTouch = useIsTouchDevice();
  const reducedMotion = usePrefersReducedMotion();

  const work = useRef({
    position: new Vector3(),
    positionEnd: new Vector3(),
    lookAt: new Vector3(),
    lookAtEnd: new Vector3(),
    currentLookAt: new Vector3(...CAMERA_TARGETS[path[0]].lookAt),
  });

  /**
   * Final "screen-fill" pose, derived from the real monitor-screen mesh so the
   * dolly ends with the terminal UI filling the viewport (the portal moment).
   * Computed lazily once the GLB registers its screen; recomputed on aspect
   * change so the fill stays exact after a resize.
   */
  const screenPose = useRef<{ position: Vector3; lookAt: Vector3; aspect: number } | null>(null);
  const computeScreenPose = () => {
    const mesh = getObject("main_screen");
    if (!mesh) return null;
    const cam = camera as PerspectiveCamera;
    mesh.updateWorldMatrix(true, false);
    const box = new Box3().setFromObject(mesh);
    const center = box.getCenter(new Vector3());
    const size = box.getSize(new Vector3());
    const height = size.y;
    const width = Math.max(size.x, size.z);
    const vFov = (cam.fov * Math.PI) / 180;
    const dH = height / 2 / Math.tan(vFov / 2);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * cam.aspect);
    const dW = width / 2 / Math.tan(hFov / 2);
    // Pull back so the WHOLE screen (and the PC beside it) stay in frame with
    // margin — not cropped. The screen sits ~centered at eye level rather than
    // filling the viewport.
    const d = Math.min(dH, dW) * 1.9;
    // Approach from the viewer side (toward the prior desk waypoint). Kept
    // near-horizontal so the screen lands at the camera's eye level.
    const approach = new Vector3(...CAMERA_TARGETS.main_monitor.position).sub(center).normalize();
    return {
      position: center.clone().add(approach.multiplyScalar(d)),
      lookAt: center.clone(),
      aspect: cam.aspect,
    };
  };

  useEffect(() => {
    if (isTouch) return;
    const onMove = (event: PointerEvent) => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [isTouch]);

  useFrame((state, delta) => {
    const { position, positionEnd, lookAt, lookAtEnd, currentLookAt } = work.current;

    // Map global progress onto the current path segment.
    const eased = easeInOut(scrollState.progress);
    const segments = path.length - 1;
    const scaled = Math.min(eased * segments, segments - 1e-6);
    const segment = Math.floor(scaled);
    const t = scaled - segment;
    const fromTarget = CAMERA_TARGETS[path[segment]];
    const toName = path[segment + 1];

    position.fromArray(fromTarget.position);
    lookAt.fromArray(fromTarget.lookAt);

    // The final "main_monitor" waypoint dollies into the real screen mesh so
    // the terminal UI fills the frame. Fall back to the static target until the
    // GLB has registered its screen.
    if (toName === "main_monitor") {
      const cam = camera as PerspectiveCamera;
      if (!screenPose.current || Math.abs(screenPose.current.aspect - cam.aspect) > 0.01) {
        screenPose.current = computeScreenPose() ?? screenPose.current;
      }
    }
    if (toName === "main_monitor" && screenPose.current) {
      positionEnd.copy(screenPose.current.position);
      lookAtEnd.copy(screenPose.current.lookAt);
    } else {
      positionEnd.fromArray(CAMERA_TARGETS[toName].position);
      lookAtEnd.fromArray(CAMERA_TARGETS[toName].lookAt);
    }

    position.lerp(positionEnd, t);
    lookAt.lerp(lookAtEnd, t);

    if (!reducedMotion) {
      // Parallax and float fade out as the camera closes in on the monitor.
      const damp = 1 - eased * 0.85;
      if (!isTouch) {
        position.x += pointer.current.x * PARALLAX.maxOffsetX * damp;
        position.y += -pointer.current.y * PARALLAX.maxOffsetY * damp;
      }
      position.y +=
        Math.sin(state.clock.elapsedTime * IDLE_FLOAT.speed) * IDLE_FLOAT.amplitude * damp;
    }

    const smoothing = 1 - Math.exp(-PARALLAX.smoothing * delta);
    camera.position.lerp(position, smoothing);
    currentLookAt.lerp(lookAt, smoothing);
    camera.lookAt(currentLookAt);
  });

  return null;
}
