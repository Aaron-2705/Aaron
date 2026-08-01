import type { ThemeName } from "@/types";

/**
 * 3D color tokens per theme.
 * Mirrors the CSS variables in globals.css — Three.js materials cannot read
 * CSS custom properties, so themes are defined here as hex values.
 */
export interface Theme3DTokens {
  accent: string;
  alert: string;
  success: string;
  surface: string;
  surfaceElevated: string;
  frame: string;
  floor: string;
  wall: string;
  screen: string;
}

export const THEME_3D: Record<ThemeName, Theme3DTokens> = {
  jarvis: {
    accent: "#35e0ff",
    alert: "#ff5a5f",
    success: "#38d39f",
    surface: "#111c30",
    surfaceElevated: "#172a45",
    frame: "#274063",
    floor: "#0b1220",
    wall: "#0e1728",
    screen: "#05101c",
  },
  arc: {
    accent: "#ffb347",
    alert: "#ff3b3b",
    success: "#38d39f",
    surface: "#1b1922",
    surfaceElevated: "#241f2b",
    frame: "#3a2f38",
    floor: "#12111a",
    wall: "#171520",
    screen: "#0a0810",
  },
  steel: {
    accent: "#3f74ff",
    alert: "#ff5a5f",
    success: "#38d39f",
    surface: "#171b28",
    surfaceElevated: "#1f2536",
    frame: "#2c3448",
    floor: "#10131c",
    wall: "#141826",
    screen: "#060810",
  },
  cyber: {
    accent: "#00f0ff",
    alert: "#ff2a3c",
    success: "#2bd576",
    surface: "#0b0d10",
    surfaceElevated: "#12151a",
    frame: "#1c2128",
    floor: "#12100e",
    wall: "#1a1512",
    screen: "#020304",
  },
  ironman: {
    accent: "#ffb347",
    alert: "#ff2a3c",
    success: "#2bd576",
    surface: "#140b0b",
    surfaceElevated: "#1d1210",
    frame: "#2a1c18",
    floor: "#0c0808",
    wall: "#151010",
    screen: "#030202",
  },
  matrix: {
    accent: "#00ff66",
    alert: "#ff2a3c",
    success: "#2bd576",
    surface: "#050f08",
    surfaceElevated: "#0a1810",
    frame: "#12241a",
    floor: "#040a06",
    wall: "#07120b",
    screen: "#010402",
  },
  stealth: {
    accent: "#9aa7b3",
    alert: "#ff2a3c",
    success: "#2bd576",
    surface: "#0a0b0d",
    surfaceElevated: "#101216",
    frame: "#181b20",
    floor: "#07080a",
    wall: "#0c0e11",
    screen: "#020303",
  },
};
