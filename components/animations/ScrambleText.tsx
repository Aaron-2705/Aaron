"use client";

import { useEffect, useRef, useState } from "react";

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const GLYPHS = "█▓▒░<>/\\|01·×+";

interface ScrambleTextProps {
  text: string;
  className?: string;
  /** ms per frame. */
  frameMs?: number;
}

/**
 * Decrypt-style text: scrambles into place when scrolled into view.
 * Readable-first: resolves quickly, renders plain for reduced motion.
 */
export function ScrambleText({ text, className, frameMs = 36 }: ScrambleTextProps) {
  const reducedMotion = usePrefersReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(text);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (reducedMotion || started || !ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [reducedMotion, started]);

  useEffect(() => {
    if (!started) return;
    let frame = 0;
    const total = 20;
    const interval = window.setInterval(() => {
      frame += 1;
      const resolved = Math.floor((frame / total) * text.length);
      setDisplay(
        text
          .split("")
          .map((char, i) =>
            i < resolved || char === " "
              ? char
              : GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
          )
          .join(""),
      );
      if (frame >= total) window.clearInterval(interval);
    }, frameMs);
    return () => window.clearInterval(interval);
  }, [started, text, frameMs]);

  return (
    <span ref={ref} className={className} aria-label={text}>
      {display}
    </span>
  );
}
