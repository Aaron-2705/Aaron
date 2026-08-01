"use client";

import { useEffect, useMemo } from "react";
import { MeshStandardMaterial } from "three";

import { THEME_3D } from "@/data/themes";
import type { ThemeName } from "@/types";

/**
 * Material library — one place for every reusable scene material.
 * Materials are theme-driven; no colors are hardcoded in room components.
 */
export interface MaterialLibrary {
  metal: MeshStandardMaterial;
  plastic: MeshStandardMaterial;
  glass: MeshStandardMaterial;
  screenOff: MeshStandardMaterial;
  screenOn: MeshStandardMaterial;
  led: MeshStandardMaterial;
  ledAlert: MeshStandardMaterial;
  neonAccent: MeshStandardMaterial;
  floor: MeshStandardMaterial;
  wall: MeshStandardMaterial;
}

export function useMaterialLibrary(theme: ThemeName): MaterialLibrary {
  const library = useMemo(() => {
    const t = THEME_3D[theme];
    const materials: MaterialLibrary = {
      metal: new MeshStandardMaterial({ color: t.frame, metalness: 0.8, roughness: 0.35 }),
      plastic: new MeshStandardMaterial({ color: t.surfaceElevated, metalness: 0.1, roughness: 0.7 }),
      glass: new MeshStandardMaterial({
        color: t.screen,
        metalness: 0.2,
        roughness: 0.1,
        transparent: true,
        opacity: 0.85,
      }),
      screenOff: new MeshStandardMaterial({ color: t.screen, roughness: 0.25 }),
      screenOn: new MeshStandardMaterial({
        color: t.screen,
        emissive: t.accent,
        emissiveIntensity: 0.55,
        roughness: 0.3,
      }),
      led: new MeshStandardMaterial({
        color: t.success,
        emissive: t.success,
        emissiveIntensity: 1.6,
      }),
      ledAlert: new MeshStandardMaterial({
        color: t.alert,
        emissive: t.alert,
        emissiveIntensity: 1.6,
      }),
      neonAccent: new MeshStandardMaterial({
        color: t.accent,
        emissive: t.accent,
        emissiveIntensity: 1.2,
      }),
      floor: new MeshStandardMaterial({ color: t.floor, metalness: 0.3, roughness: 0.8 }),
      wall: new MeshStandardMaterial({ color: t.wall, metalness: 0.05, roughness: 0.95 }),
    };
    return materials;
  }, [theme]);

  // Dispose GPU resources when the theme changes or the scene unmounts.
  useEffect(() => {
    return () => {
      Object.values(library).forEach((material) => material.dispose());
    };
  }, [library]);

  return library;
}
