"use client";

import { useEffect, useRef, useState } from "react";

import { useActiveModule } from "@/components/providers/ActiveModuleProvider";
import { MODULES } from "@/data/modules";

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Persistent session HUD — frames the whole visit as one operator session.
 * Live timecode, current module, clearance, progress, ACCESS status.
 * Reads the shared active-module source; bottom-left, clear of the AARON
 * launcher (bottom-right). Hidden until the boot hands over is handled by
 * page mount order.
 */
export function SessionHud() {
  const { activeId, activeIndex, total, progress } = useActiveModule();
  const active = MODULES.find((m) => m.id === activeId) ?? MODULES[0];

  // Session clock — starts at 00:00 on the client (no SSR value → no mismatch).
  const [seconds, setSeconds] = useState(0);
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <aside
      aria-hidden="true"
      className="pointer-events-none fixed bottom-4 left-4 z-40 hidden select-none sm:block"
    >
      <div className="relative border border-border-dim/80 bg-surface/70 px-4 py-3 font-mono backdrop-blur-md">
        {/* Corner ticks */}
        <span className="absolute -top-px -left-px size-2.5 border-t-2 border-l-2 border-accent" />
        <span className="absolute -bottom-px -right-px size-2.5 border-r-2 border-b-2 border-accent" />

        <div className="flex items-center gap-3 text-[10px] tracking-[0.25em] text-muted-strong">
          <span className="flex items-center gap-1.5 text-success">
            <span className="inline-block size-1.5 animate-pulse rounded-full bg-success" />
            ACCESS: GRANTED
          </span>
          <span className="text-border-dim">|</span>
          <span>SESSION {formatClock(seconds)}</span>
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-[10px] tracking-[0.2em] text-muted">MODULE</span>
          <span className="text-xs tracking-[0.15em] text-accent">{active.name}</span>
        </div>

        <div className="mt-1 flex items-center gap-2 text-[10px] tracking-[0.2em] text-muted">
          <span>CLEARANCE</span>
          <span className="text-foreground/80">{active.clearance}</span>
        </div>

        {/* Progress */}
        <div className="mt-2.5 w-44">
          <div className="h-px w-full overflow-hidden bg-border-dim">
            <div
              className="h-full bg-accent shadow-[0_0_8px_var(--accent)] transition-[width] duration-300 ease-out"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[9px] tracking-[0.2em] text-muted">
            <span>
              {String(activeIndex + 1).padStart(2, "0")}/{String(total).padStart(2, "0")}
            </span>
            <span>{Math.round(progress * 100)}%</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
