"use client";

import { useRef, useState } from "react";

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const GLYPHS = "█▓▒░<>/\\|01·";

/** Text that scrambles briefly on hover — used for nav links. */
export function HoverScramble({ text, className }: { text: string; className?: string }) {
  const reducedMotion = usePrefersReducedMotion();
  const [display, setDisplay] = useState(text);
  const intervalRef = useRef<number | null>(null);

  const start = () => {
    if (reducedMotion || intervalRef.current !== null) return;
    let frame = 0;
    const total = 8;
    intervalRef.current = window.setInterval(() => {
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
      if (frame >= total && intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, 30);
  };

  return (
    <span className={className} onPointerEnter={start} aria-label={text}>
      {display}
    </span>
  );
}
