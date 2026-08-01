"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { PortalOverlay } from "@/components/animations/PortalOverlay";
import { Scanlines } from "@/components/animations/Scanlines";
import { useScrollProgressTracker } from "@/hooks/useScrollProgress";

const SceneCanvas = dynamic(
  () => import("@/components/three/SceneCanvas").then((m) => m.SceneCanvas),
  {
    ssr: false,
    loading: () => <EnvironmentLoading />,
  },
);
const CommandCenterScene = dynamic(
  () => import("@/components/three/CommandCenterScene").then((m) => m.CommandCenterScene),
  { ssr: false },
);

function EnvironmentLoading() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background">
      <p className="animate-pulse font-mono text-xs tracking-[0.4em] text-accent">
        LOADING ENVIRONMENT...
      </p>
    </div>
  );
}

/**
 * The command center — the cyberpunk system revealed below the calm orb hero.
 * A fixed full-screen canvas holds the workstation desk; scrolling through
 * this section's runway drives the camera from overview toward the main
 * monitor and portals into the mission database.
 */
export function HeroEnvironment() {
  useScrollProgressTracker();
  const [active, setActive] = useState(false);
  // The workstation scene (Draco GLB + postprocessing) is the single most
  // expensive thing on the page and sits a full viewport below the fold, so it
  // is not built until the visitor actually scrolls toward it. Mounting it on
  // load put ~1.6s of script evaluation into the initial main-thread budget for
  // a section nobody had looked at yet. Latched: once mounted it never
  // unmounts, so the canvas is never torn down mid-render.
  const [mounted, setMounted] = useState(false);

  // Render the 3D loop only while the command section is in/near view.
  useEffect(() => {
    const section = document.getElementById("command");
    if (!section) return;
    const onScroll = () => {
      const rect = section.getBoundingClientRect();
      const next = rect.top < window.innerHeight && rect.bottom > -window.innerHeight * 0.5;
      setActive((prev) => (prev === next ? prev : next));
      // Any scroll at all starts the build, which gives a full viewport of
      // lead time before the scene is on screen. At rest (scrollY 0, the state
      // an initial page load and a Lighthouse run sit in) nothing is built.
      if (window.scrollY > 0 || rect.top < window.innerHeight) setMounted(true);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section id="command" aria-label="AARON command center" className="relative h-[150vh]">
      {/* Fixed scene — revealed once the orb hero scrolls away, covered again
          by the opaque content sections below. */}
      <div className="fixed inset-0">
        {mounted ? (
          <SceneCanvas className="h-full w-full" active={active}>
            <CommandCenterScene />
          </SceneCanvas>
        ) : (
          <EnvironmentLoading />
        )}
      </div>

      <Scanlines />
      <PortalOverlay />
    </section>
  );
}
