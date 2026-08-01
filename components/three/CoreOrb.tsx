"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  type Group,
  MathUtils,
  type Points as ThreePoints,
} from "three";

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/** Additive fresnel rim — glows at the silhouette. */
const RIM_VERT = /* glsl */ `
  varying float vRim;
  void main() {
    vec3 n = normalize(normalMatrix * normal);
    vec3 viewDir = normalize((modelViewMatrix * vec4(position, 1.0)).xyz);
    vRim = pow(1.0 - abs(dot(n, viewDir)), 2.4);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const RIM_FRAG = /* glsl */ `
  varying float vRim;
  uniform vec3 uColor;
  void main() {
    gl_FragColor = vec4(uColor * vRim, vRim * 0.9);
  }
`;

function cssColor(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** Static dust-shell positions — random but computed once at module load
 * (kept out of render so React-compiler purity is satisfied). Shell r∈[2,6]
 * frames the core without overlapping it. */
const DUST_POSITIONS = (() => {
  const N = 420;
  const arr = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 2 + Math.random() * 4;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    arr[i * 3 + 2] = r * Math.cos(phi);
  }
  return arr;
})();

/** A drifting dust shell around the core — parallax depth + slow rotation. */
function Dust({ color, reducedMotion }: { color: Color; reducedMotion: boolean }) {
  const ref = useRef<ThreePoints>(null);

  // Build the geometry explicitly so the position buffer is always bound
  // (the declarative <bufferAttribute> path can leave points drawn before the
  // attribute binds → a WebGL "no buffer bound" warning on the first frame).
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(DUST_POSITIONS, 3));
    return g;
  }, []);

  useFrame((_, delta) => {
    if (ref.current && !reducedMotion) ref.current.rotation.y += delta * 0.02;
  });

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial
        color={color}
        size={0.02}
        sizeAttenuation
        transparent
        opacity={0.6}
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}

/**
 * Gentle bob + drift, equivalent to drei's <Float>.
 *
 * Inlined deliberately: importing Float pulled the whole @react-three/drei
 * barrel into the hero's chunk for ~8 lines of sine math, and the hero is the
 * one place on the page where script-evaluation cost is visible to the user.
 * Static under reduced motion.
 */
function Float({
  children,
  reducedMotion,
  rotationIntensity = 0.2,
  floatIntensity = 0.5,
}: {
  children: React.ReactNode;
  reducedMotion: boolean;
  rotationIntensity?: number;
  floatIntensity?: number;
}) {
  const ref = useRef<Group>(null);

  useFrame((state) => {
    const g = ref.current;
    if (!g || reducedMotion) return;
    const t = state.clock.elapsedTime / 4;
    g.rotation.x = Math.cos(t) * (rotationIntensity / 10);
    g.rotation.y = Math.sin(t) * (rotationIntensity / 10);
    g.rotation.z = Math.sin(t) * (rotationIntensity / 10);
    g.position.y = Math.sin(t) * (floatIntensity / 10);
  });

  return <group ref={ref}>{children}</group>;
}

/**
 * The AARON core — a faceted crystal core inside a wireframe shell with two
 * orbiting rings, a fresnel rim, and a drifting dust shell. Cursor-reactive
 * (core tilts, whole scene parallaxes via the camera) with a breathing energy
 * pulse. Theme-accent driven; static under reduced motion.
 */
export function CoreOrb() {
  const groupRef = useRef<Group>(null);
  const coreRef = useRef<Group>(null);
  const ringA = useRef<Group>(null);
  const ringB = useRef<Group>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const size = useThree((s) => s.size);
  const reducedMotion = usePrefersReducedMotion();

  const accent = useMemo(() => new Color(cssColor("--accent", "#3f74ff")), []);
  const rimRgb = useMemo<[number, number, number]>(() => [accent.r, accent.g, accent.b], [accent]);
  const keyColor = useMemo(() => accent.clone().lerp(new Color("#ffffff"), 0.5), [accent]);
  const coreColor = useMemo(() => accent.clone().multiplyScalar(0.3), [accent]);

  useFrame((state, delta) => {
    const g = groupRef.current;
    if (!g) return;
    if (reducedMotion) return;

    // Smoothed pointer.
    pointer.current.x = (state.pointer.x + pointer.current.x * 3) / 4;
    pointer.current.y = (state.pointer.y + pointer.current.y * 3) / 4;
    const damp = 1 - Math.exp(-3 * delta);

    // Core tilt toward pointer.
    g.rotation.y = MathUtils.lerp(g.rotation.y, pointer.current.x * 0.45, damp);
    g.rotation.x = MathUtils.lerp(g.rotation.x, -pointer.current.y * 0.3, damp);

    // Camera parallax — whole scene shifts with the pointer for real depth.
    const cam = state.camera;
    cam.position.x = MathUtils.lerp(cam.position.x, pointer.current.x * 0.6, damp);
    cam.position.y = MathUtils.lerp(cam.position.y, 1.4 - pointer.current.y * 0.4, damp);
    cam.lookAt(0, 0, 0);

    // Spins.
    if (coreRef.current) coreRef.current.rotation.y += delta * 0.18;
    if (ringA.current) ringA.current.rotation.z += delta * 0.35;
    if (ringB.current) ringB.current.rotation.z -= delta * 0.22;

    // Breathing energy pulse on the core scale.
    if (coreRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.4) * 0.03;
      coreRef.current.scale.setScalar(pulse);
    }
  });

  const scale = size.width < 640 ? 1.05 : 1.5;

  return (
    <group ref={groupRef} scale={scale}>
      <Dust color={accent} reducedMotion={reducedMotion} />

      <Float reducedMotion={reducedMotion}>
        {/* Faceted crystal core */}
        <group ref={coreRef}>
          <mesh>
            <icosahedronGeometry args={[0.92, 1]} />
            <meshStandardMaterial
              color={coreColor}
              emissive={accent}
              emissiveIntensity={0.32}
              roughness={0.3}
              metalness={0.8}
              flatShading
            />
          </mesh>
          {/* Wireframe shell */}
          <mesh scale={1.04}>
            <icosahedronGeometry args={[0.92, 1]} />
            <meshBasicMaterial color={accent} wireframe transparent opacity={0.28} />
          </mesh>
        </group>

        {/* Orbiting rings */}
        <group ref={ringA} rotation={[Math.PI / 2.4, 0.3, 0]}>
          <mesh>
            <torusGeometry args={[1.5, 0.008, 8, 128]} />
            <meshBasicMaterial color={accent} transparent opacity={0.55} />
          </mesh>
        </group>
        <group ref={ringB} rotation={[Math.PI / 3, -0.5, 0.4]}>
          <mesh>
            <torusGeometry args={[1.75, 0.006, 8, 128]} />
            <meshBasicMaterial color={accent} transparent opacity={0.35} />
          </mesh>
        </group>

        {/* Fresnel rim */}
        <mesh scale={1.12}>
          <icosahedronGeometry args={[0.92, 6]} />
          <shaderMaterial
            vertexShader={RIM_VERT}
            fragmentShader={RIM_FRAG}
            uniforms={{ uColor: { value: rimRgb } }}
            transparent
            side={BackSide}
            depthWrite={false}
          />
        </mesh>
      </Float>

      <ambientLight intensity={0.3} />
      <pointLight position={[3, 2, 4]} intensity={12} color={keyColor} distance={12} />
      <pointLight position={[-4, -2, 2]} intensity={7} color={accent} distance={12} />
    </group>
  );
}
