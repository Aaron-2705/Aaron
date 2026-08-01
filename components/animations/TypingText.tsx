"use client";

import { useEffect, useState } from "react";

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

interface TypingTextProps {
  lines: readonly string[];
  /** ms per character. */
  speed?: number;
  /** ms pause between lines. */
  linePause?: number;
  className?: string;
  onComplete?: () => void;
}

/** Terminal-style typing animation. Renders instantly for reduced motion. */
export function TypingText({
  lines,
  speed = 28,
  linePause = 350,
  className,
  onComplete,
}: TypingTextProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [lineIndex, setLineIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);

  const done = lineIndex >= lines.length;

  useEffect(() => {
    if (reducedMotion || done) return;
    const line = lines[lineIndex];
    const timeout = window.setTimeout(
      () => {
        if (charIndex < line.length) {
          setCharIndex(charIndex + 1);
        } else {
          setLineIndex(lineIndex + 1);
          setCharIndex(0);
        }
      },
      charIndex < line.length ? speed : linePause,
    );
    return () => window.clearTimeout(timeout);
  }, [reducedMotion, done, lines, lineIndex, charIndex, speed, linePause]);

  useEffect(() => {
    if (done || reducedMotion) onComplete?.();
  }, [done, reducedMotion, onComplete]);

  const visible = reducedMotion
    ? lines
    : [...lines.slice(0, lineIndex), ...(done ? [] : [lines[lineIndex].slice(0, charIndex)])];

  return (
    <div className={className} aria-label={lines.join(" ")}>
      {visible.map((line, i) => (
        <p key={i}>
          {line}
          {!reducedMotion && !done && i === visible.length - 1 && (
            <span className="animate-pulse text-accent">▊</span>
          )}
        </p>
      ))}
    </div>
  );
}
