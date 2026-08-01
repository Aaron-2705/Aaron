"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

import Aurora from "@/components/vendor/Aurora";
import { useBoot } from "@/components/providers/BootProvider";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { SITE } from "@/data/site";
import { playSound } from "@/lib/sound";

const BOOT_LINES = [
  "AARON SYSTEM",
  "INITIALIZING...",
  "CHECKING SECURITY MODULES...",
  "LOADING ENVIRONMENT...",
  "NETWORK STATUS: SECURE",
  "ACCESS GRANTED",
];

// Kept deliberately snappy: the six boot lines are the fixed floor on how soon
// the hero (the LCP element) can paint, so 420ms/line cost ~2.5s of pure render
// delay. 165ms still reads as a terminal boot, without holding first paint.
const LINE_INTERVAL = 165;
const SESSION_KEY = "aaron-boot-complete";

/**
 * Cinematic opening: black screen → logo → terminal messages → power on.
 * The progress bar tracks REAL loading — document fonts blended with the
 * boot-line ramp. It deliberately does NOT track three.js assets: importing
 * drei's loading store here pulled three into the critical path and delayed
 * first paint of the hero by seconds. The 3D streams in behind the hero.
 * Runs once per session. Skippable via button, Escape or Enter.
 */
export function BootSequence() {
  const { phase, skip } = useBoot();
  const reducedMotion = usePrefersReducedMotion();
  const [lineCount, setLineCount] = useState(0);
  const [fontsReady, setFontsReady] = useState(false);
  const [displayed, setDisplayed] = useState(0);
  const displayedRef = useRef(0);

  const finish = useCallback(() => {
    window.sessionStorage.setItem(SESSION_KEY, "1");
    skip();
  }, [skip]);

  // Decide whether to boot at all. The provider starts in "booting" so the
  // loader is server-rendered; this runs on hydration and dismisses it
  // immediately for reduced-motion users and repeat visits in the session.
  useEffect(() => {
    if (phase !== "booting") return;
    if (reducedMotion || window.sessionStorage.getItem(SESSION_KEY)) skip();
    // Only ever decides once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real signal: document fonts.
  useEffect(() => {
    let cancelled = false;
    // Never let font loading be the reason the loader hangs: a rejection or a
    // font that never settles would otherwise pin the bar below 100 until the
    // hard cap. Resolve either way, and swallow the rejection so it cannot
    // surface as an unhandled promise error.
    const fallback = window.setTimeout(() => {
      if (!cancelled) setFontsReady(true);
    }, 3000);
    document.fonts.ready
      .then(() => {
        if (!cancelled) setFontsReady(true);
      })
      .catch(() => {
        if (!cancelled) setFontsReady(true);
      });
    return () => {
      cancelled = true;
      window.clearTimeout(fallback);
    };
  }, []);

  // Smooth the bar toward the blended target; finish when everything lands.
  useEffect(() => {
    if (phase !== "booting") return;
    const linesDone = lineCount >= BOOT_LINES.length;
    // Fonts + boot lines are the only things the hero actually needs. The
    // workstation GLB lives in #command, below the fold; waiting on it pinned
    // LCP to the GLB and held first paint for seconds.
    const target =
      linesDone && fontsReady
        ? 100
        : 30 * (fontsReady ? 1 : 0) + 0.7 * ((lineCount / BOOT_LINES.length) * 100);

    let raf: number;
    const tick = () => {
      const current = displayedRef.current;
      const next = Math.min(100, current + (Math.max(target, current) - current) * 0.14);
      if (next - current > 0.01) {
        displayedRef.current = next;
        setDisplayed(next);
      }
      if (linesDone && next >= 99) {
        displayedRef.current = 100;
        setDisplayed(100);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, lineCount, fontsReady]);

  // Reveal terminal lines one by one, then finish once the bar lands.
  useEffect(() => {
    if (phase !== "booting") return;
    if (lineCount >= BOOT_LINES.length) {
      if (displayed < 100) return;
      const timeout = window.setTimeout(finish, 320);
      return () => window.clearTimeout(timeout);
    }
    const timeout = window.setTimeout(() => {
      playSound(lineCount === 0 ? "boot" : "keypress");
      setLineCount((count) => count + 1);
    }, LINE_INTERVAL);
    return () => window.clearTimeout(timeout);
  }, [phase, lineCount, displayed, finish]);

  // Hard cap: never hold the user on the loader longer than ~9s even if
  // assets are still streaming — the scene keeps loading behind the hero.
  useEffect(() => {
    if (phase !== "booting") return;
    const timeout = window.setTimeout(finish, 9000);
    return () => window.clearTimeout(timeout);
  }, [phase, finish]);

  // Keyboard skip.
  useEffect(() => {
    if (phase !== "booting") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, finish]);

  return (
    <AnimatePresence>
      {phase === "booting" && (
        <motion.div
          role="status"
          aria-label="System booting"
          exit={{
            clipPath: "inset(0 0 100% 0)",
            opacity: 0.4,
            transition: { duration: 0.9, ease: [0.83, 0, 0.17, 1] },
          }}
          style={{ clipPath: "inset(0 0 0% 0)", background: "var(--onyx)" }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
        >
          {/* Ambient "identity" aurora (React Bits), steel-toned. Two mirrored
              layers frame the name top and bottom. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-80">
            <Aurora
              colorStops={["#12224d", "#3f74ff", "#7ba0ff"]}
              amplitude={1.1}
              blend={0.55}
              speed={0.9}
            />
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rotate-180 opacity-40"
          >
            <Aurora
              colorStops={["#0f1c3a", "#2f5fd6", "#5b83e6"]}
              amplitude={0.9}
              blend={0.5}
              speed={0.7}
            />
          </div>

          {/* Calm grain */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-soft-light"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }}
          />
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="font-[family-name:var(--font-serif)] text-5xl font-semibold sm:text-7xl"
            style={{ color: "var(--ivory)", fontVariationSettings: '"opsz" 144' }}
          >
            {SITE.name}
          </motion.p>

          <div
            className="mt-8 flex h-44 w-72 flex-col items-center justify-start text-center font-[family-name:var(--font-inter)] text-[13px] leading-6 tracking-[0.06em] sm:w-96"
            style={{ color: "var(--ash)" }}
          >
            {BOOT_LINES.slice(0, lineCount).map((line, i) => (
              <motion.p
                key={line}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ color: i === BOOT_LINES.length - 1 ? "var(--ivory)" : "var(--ash)" }}
              >
                {line}
              </motion.p>
            ))}
          </div>

          {/* Boot progress — tied to real font loading + the boot-line ramp */}
          <div className="mt-4 w-72 sm:w-96">
            <div className="h-px overflow-hidden" style={{ background: "#ffffff1a" }}>
              <div
                className="h-full transition-[width] duration-150 ease-out"
                style={{ width: `${displayed}%`, background: "var(--cobalt)" }}
              />
            </div>
            <p
              className="mt-3 text-right font-[family-name:var(--font-inter)] text-[10px] tracking-[0.3em]"
              style={{ color: "var(--ash)" }}
            >
              {Math.round(displayed)}%
            </p>
          </div>

          <button
            onClick={finish}
            className="absolute right-8 bottom-8 rounded-full border px-5 py-2 font-[family-name:var(--font-inter)] text-[11px] tracking-[0.2em] transition-colors"
            style={{ borderColor: "var(--ash)", color: "var(--ash)" }}
          >
            Skip
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
