"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";

interface SceneCanvasProps {
  children: React.ReactNode;
  className?: string;
  /** When false the render loop is frozen entirely (GPU idle). */
  active?: boolean;
}

/**
 * Shared R3F canvas wrapper.
 * All 3D content mounts inside this so canvas config lives in one place.
 */
export function SceneCanvas({ children, className, active = true }: SceneCanvasProps) {
  return (
    <div className={className} aria-hidden="true">
      <Canvas
        dpr={[1, 1.75]}
        frameloop={active ? "always" : "never"}
        camera={{ position: [0, 1.4, 5], fov: 45 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <Suspense fallback={null}>{children}</Suspense>
      </Canvas>
    </div>
  );
}
