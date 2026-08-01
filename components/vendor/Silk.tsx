"use client";

// Adapted from React Bits <Silk /> (https://reactbits.dev/backgrounds/silk).
// Ported to TS strict and wired into this project's conventions:
//
//  - colour comes from a theme token, not a hardcoded hex, so the one-accent
//    lock holds across all seven themes;
//  - `prefers-reduced-motion` freezes the shader instead of animating forever;
//  - dpr and GL flags match components/three/SceneCanvas.tsx rather than the
//    upstream defaults, and antialiasing is off because a single fullscreen
//    quad has no geometry edges to smooth.
//
// three and @react-three/fiber are already dependencies, so this adds no new
// package and shares the chunk the hero core already pays for.
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { Color, LinearSRGBColorSpace, type Mesh } from "three";

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * Apply a hex to a Color the way the upstream component does.
 *
 * This matters more than it looks. Upstream normalises the hex to 0-1 floats
 * and hands them to `new Color(r, g, b)`, which three treats as values already
 * in the LINEAR working space. The renderer's output conversion then lifts them
 * on the way to the screen, and that lift is what gives the fabric its mid-grey
 * body. Using `new Color("#7B7481")` instead performs an sRGB to linear
 * conversion first, so the same hex renders about a stop darker than the
 * reference material. Keep this, or the weave goes muddy.
 */
function applyHex(target: Color, hex: string): Color {
  const clean = hex.replace("#", "");
  target.setRGB(
    parseInt(clean.slice(0, 2), 16) / 255,
    parseInt(clean.slice(2, 4), 16) / 255,
    parseInt(clean.slice(4, 6), 16) / 255,
    LinearSRGBColorSpace,
  );
  return target;
}

/** Read a CSS custom property, falling back when it is not yet applied. */
function cssColor(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/**
 * Re-read the token whenever the theme attribute changes. `data-theme` on
 * <html> is what the admin terminal flips, and every colour token is redefined
 * under it, so that attribute is the only signal needed.
 */
function subscribeToTheme(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

const vertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vPosition;

void main() {
  vPosition = position;
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vPosition;

uniform float uTime;
uniform vec3  uColor;
uniform float uSpeed;
uniform float uScale;
uniform float uRotation;
uniform float uNoiseIntensity;

const float e = 2.71828182845904523536;

float noise(vec2 texCoord) {
  float G = e;
  vec2  r = (G * sin(G * texCoord));
  return fract(r.x * r.y * (1.0 + texCoord.x));
}

vec2 rotateUvs(vec2 uv, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  mat2  rot = mat2(c, -s, s, c);
  return rot * uv;
}

void main() {
  float rnd        = noise(gl_FragCoord.xy);
  vec2  uv         = rotateUvs(vUv * uScale, uRotation);
  vec2  tex        = uv * uScale;
  float tOffset    = uSpeed * uTime;

  tex.y += 0.03 * sin(8.0 * tex.x - tOffset);

  float pattern = 0.6 +
                  0.4 * sin(5.0 * (tex.x + tex.y +
                                   cos(3.0 * tex.x + 5.0 * tex.y) +
                                   0.02 * tOffset) +
                           sin(20.0 * (tex.x + tex.y - 0.1 * tOffset)));

  vec4 col = vec4(uColor, 1.0) * vec4(pattern) - rnd / 15.0 * uNoiseIntensity;
  col.a = 1.0;
  gl_FragColor = col;
}
`;

interface SilkUniforms {
  uSpeed: { value: number };
  uScale: { value: number };
  uNoiseIntensity: { value: number };
  uColor: { value: Color };
  uRotation: { value: number };
  uTime: { value: number };
  [key: string]: { value: unknown };
}

/**
 * The weave itself.
 *
 * Uniforms are created once and then mutated in `useFrame` rather than in an
 * effect. That is the R3F way round — a uniform is a live GPU binding, not
 * React state — and it is also what keeps the React Compiler's immutability
 * rule satisfied, since the object never leaves this component as a prop.
 */
function SilkPlane({
  settings,
  reducedMotion,
}: {
  settings: Required<Omit<SilkProps, "className" | "colorToken" | "fallbackColor">> & {
    color: string;
  };
  reducedMotion: boolean;
}) {
  const ref = useRef<Mesh>(null);
  const { viewport, invalidate } = useThree();

  // Built once and never rebuilt: swapping the object would recompile the
  // material and reset the weave's phase on every prop change.
  const uniforms = useMemo<SilkUniforms>(
    () => ({
      uSpeed: { value: settings.speed },
      uScale: { value: settings.scale },
      uNoiseIntensity: { value: settings.noiseIntensity },
      uColor: { value: applyHex(new Color(), settings.color) },
      uRotation: { value: settings.rotation },
      uTime: { value: 0 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial values only; updates are pushed in useFrame below.
    [],
  );

  // The plane is a unit quad scaled to the viewport, so the shader covers the
  // frame exactly regardless of camera or aspect.
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (mesh) mesh.scale.set(viewport.width, viewport.height, 1);
    // frameloop is "demand" under reduced motion, so a resize needs an explicit
    // repaint or the canvas would keep the previous aspect.
    invalidate();
  }, [viewport, invalidate]);

  // Repaint the single static frame whenever a setting changes.
  useEffect(() => {
    invalidate();
  }, [settings, invalidate]);

  /* eslint-disable react-hooks/immutability -- A uniform is a live GPU binding,
     not React state: three.js reads these objects each frame and mutating them
     in place is the documented R3F pattern. The React Compiler cannot model
     that, so it sees ordinary mutation. Rebuilding the object instead would
     recompile the shader every frame. Same precedent as the suppressions noted
     in PROGRESS.md §5. */
  useFrame((_, delta) => {
    uniforms.uSpeed.value = settings.speed;
    uniforms.uScale.value = settings.scale;
    uniforms.uNoiseIntensity.value = settings.noiseIntensity;
    uniforms.uRotation.value = settings.rotation;
    applyHex(uniforms.uColor.value, settings.color);
    if (!reducedMotion) uniforms.uTime.value += 0.1 * delta;
  });
  /* eslint-enable react-hooks/immutability */

  return (
    <mesh ref={ref}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
}

export interface SilkProps {
  /** Animation speed. */
  speed?: number;
  /** Pattern scale. */
  scale?: number;
  /**
   * Literal weave colour. Wins over `colorToken` when set. Use this when the
   * material itself is the point and should not shift with the theme.
   */
  color?: string;
  /**
   * CSS custom property to draw the weave in. Reading a token rather than
   * taking a hex keeps the effect on-theme when the admin terminal switches
   * themes, instead of pinning one palette into a background.
   */
  colorToken?: string;
  /** Used until the token resolves, and on the server. */
  fallbackColor?: string;
  noiseIntensity?: number;
  /** Pattern rotation, in radians. */
  rotation?: number;
  className?: string;
}

/**
 * Full-bleed animated silk weave, used as the hero backdrop.
 *
 * Decorative only: the wrapper is aria-hidden and the canvas carries no
 * content, so nothing here reaches the accessibility tree.
 */
export default function Silk({
  speed = 5,
  scale = 1,
  color: literalColor,
  colorToken = "--accent",
  fallbackColor = "#3f74ff",
  noiseIntensity = 1.5,
  rotation = 0,
  className,
}: SilkProps) {
  const reducedMotion = usePrefersReducedMotion();

  // Subscribed rather than read once, so switching theme from the admin
  // terminal re-tints the weave instead of leaving last theme's accent behind.
  // Same external-store shape as usePrefersReducedMotion.
  const themeColor = useSyncExternalStore(
    subscribeToTheme,
    () => cssColor(colorToken, fallbackColor),
    () => fallbackColor,
  );
  const color = literalColor ?? themeColor;

  const settings = useMemo(
    () => ({ speed, scale, noiseIntensity, rotation, color }),
    [speed, scale, noiseIntensity, rotation, color],
  );

  return (
    <div className={className} aria-hidden="true">
      <Canvas
        dpr={[1, 1.75]}
        // "demand" under reduced motion: the weave is painted once and the GPU
        // then goes idle, rather than running a shader nobody asked to move.
        frameloop={reducedMotion ? "demand" : "always"}
        // flat only. R3F defaults to ACES tone mapping, which is right for a
        // lit 3D scene and wrong for a flat material pass - it desaturated and
        // crushed the folds. The sRGB output conversion is deliberately LEFT
        // ON: combined with applyHex above, it is what gives the fabric its
        // body. Turning it off too made the weave muddy.
        flat
        gl={{ antialias: false, powerPreference: "high-performance" }}
      >
        <SilkPlane settings={settings} reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  );
}
