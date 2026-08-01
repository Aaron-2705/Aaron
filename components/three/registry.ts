"use client";

import { useEffect } from "react";
import type { Object3D } from "three";

/**
 * Object registry — every scene object registers under a stable name so
 * future systems (camera focus, hover, GLB swap) can address objects
 * without knowing their implementation.
 */
export type ObjectName =
  | "room"
  | "main_monitor"
  | "main_screen"
  | "secondary_monitor"
  | "desk"
  | "chair"
  | "keyboard"
  | "mouse"
  | "pc_case"
  | "server_rack"
  | "wall_left"
  | "wall_right"
  | "wall_back"
  | "ceiling"
  | "floor"
  | "hologram";

const registry = new Map<ObjectName, Object3D>();

export function registerObject(name: ObjectName, object: Object3D): void {
  registry.set(name, object);
}

export function unregisterObject(name: ObjectName): void {
  registry.delete(name);
}

export function getObject(name: ObjectName): Object3D | undefined {
  return registry.get(name);
}

/** Register a ref'd object for the lifetime of the component. */
export function useRegisterObject(
  name: ObjectName,
  ref: React.RefObject<Object3D | null>,
): void {
  useEffect(() => {
    if (ref.current) registerObject(name, ref.current);
    return () => unregisterObject(name);
  }, [name, ref]);
}
