/**
 * Configurable camera targets — no hardcoded positions inside the rig.
 * Future prompts add cinematic waypoints here (monitor zoom, first person…).
 */
export interface CameraTarget {
  position: [number, number, number];
  lookAt: [number, number, number];
}

export const CAMERA_TARGETS = {
  /** Aimed at the MAIN SCREEN (not the desk) from the start — lookAt sits at
   *  screen height so the monitor is the center and the desk edge drops to the
   *  bottom of the frame. */
  overview: {
    position: [0.1, 1.9, 2.35],
    lookAt: [0, 1.52, -0.5],
  },
  /** Pushing straight in on the screen. */
  desk: {
    position: [0.03, 1.84, 1.75],
    lookAt: [0, 1.52, -0.55],
  },
  /** Main screen focus (CameraRig replaces this with a screen-fill pose
   *  computed from the real screen mesh). The higher Y makes the rig approach
   *  from above so the camera looks slightly down onto the screen. */
  main_monitor: {
    position: [0, 1.82, 1.15],
    lookAt: [0, 1.52, -0.6],
  },
} as const satisfies Record<string, CameraTarget>;

export type CameraTargetName = keyof typeof CAMERA_TARGETS;

/** Mouse parallax tuning — subtle by design. */
export const PARALLAX = {
  maxOffsetX: 0.25,
  maxOffsetY: 0.12,
  /** Per-frame smoothing factor toward the target pose. */
  smoothing: 2.2,
} as const;

/** Idle float tuning. */
export const IDLE_FLOAT = {
  amplitude: 0.035,
  speed: 0.5,
} as const;
