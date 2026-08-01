"use client";

import { createContext, useCallback, useContext, useState } from "react";

import type { BootContextValue, BootPhase } from "@/types";

const BootContext = createContext<BootContextValue | null>(null);

export function BootProvider({ children }: { children: React.ReactNode }) {
  // Starts "booting" so the loader is part of the server-rendered markup. With
  // an "idle" start the overlay only appeared once React had hydrated, which —
  // now that the hero itself is server-rendered — meant the hero painted and
  // was then covered by the loader. BootSequence skips immediately for
  // reduced-motion and repeat visits.
  const [phase, setPhase] = useState<BootPhase>("booting");

  const skip = useCallback(() => setPhase("complete"), []);

  return <BootContext.Provider value={{ phase, setPhase, skip }}>{children}</BootContext.Provider>;
}

export function useBoot(): BootContextValue {
  const ctx = useContext(BootContext);
  if (!ctx) throw new Error("useBoot must be used within BootProvider");
  return ctx;
}
