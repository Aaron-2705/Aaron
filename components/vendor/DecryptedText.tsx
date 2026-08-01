"use client";

// Adapted from React Bits <DecryptedText />. Uses the installed framer-motion
// instead of the standalone `motion` package.
import { useEffect, useState, useRef, useMemo, useCallback, type CSSProperties } from "react";
import { motion } from "framer-motion";

const styles: Record<string, CSSProperties> = {
  wrapper: { display: "inline-block", whiteSpace: "pre-wrap", position: "relative" },
  /**
   * Zero-CLS scramble geometry.
   *
   * The scramble swaps every glyph for a random one of a different advance
   * width. Animating that in normal flow re-wraps the text on every tick and
   * shifts everything around it — measured at ~0.5-1.0 CLS from the two hero
   * instances alone, since the hero is a vertically centred full-viewport
   * column and any height change re-centres the whole thing.
   *
   * So the layout is driven entirely by the REAL text and never by the
   * scramble: each word is an inline-block cell (line breaking therefore
   * matches the final text exactly and can only happen between words) and each
   * character is a `.dt-cell` holding its real glyph, with the scramble glyph
   * painted over it by a pseudo-element (see `.dt-cell` in globals.css). No box
   * ever changes origin, so nothing shifts — and because the real character is
   * what lives in the DOM, the text stays selectable and copyable.
   */
  word: { display: "inline-block", whiteSpace: "pre" },
  srOnly: {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: 0,
    margin: "-1px",
    overflow: "hidden",
    clip: "rect(0,0,0,0)",
    border: 0,
  },
};

type AnimateOn = "view" | "hover" | "inViewHover" | "click";

interface DecryptedTextProps {
  text: string;
  speed?: number;
  maxIterations?: number;
  sequential?: boolean;
  revealDirection?: "start" | "end" | "center";
  useOriginalCharsOnly?: boolean;
  characters?: string;
  className?: string;
  parentClassName?: string;
  encryptedClassName?: string;
  animateOn?: AnimateOn;
  [key: string]: unknown;
}

export default function DecryptedText({
  text,
  speed = 50,
  maxIterations = 10,
  sequential = false,
  revealDirection = "start",
  useOriginalCharsOnly = false,
  characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()_+",
  className = "",
  parentClassName = "",
  encryptedClassName = "",
  animateOn = "hover",
  ...props
}: DecryptedTextProps) {
  const [displayText, setDisplayText] = useState(text);
  const [isAnimating, setIsAnimating] = useState(false);
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [hasAnimated, setHasAnimated] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  /**
   * Words and the whitespace between them, each tagged with its offset into
   * `text` so a cell can look up its own scramble glyph. Whitespace stays as
   * plain text so the browser breaks lines exactly where it would for the
   * un-scrambled string.
   */
  const tokens = useMemo(() => {
    const out: { value: string; start: number; isSpace: boolean }[] = [];
    let start = 0;
    for (const value of text.split(/(\s+)/)) {
      if (value) out.push({ value, start, isSpace: /^\s+$/.test(value) });
      start += value.length;
    }
    return out;
  }, [text]);

  const availableChars = useMemo(
    () =>
      useOriginalCharsOnly
        ? Array.from(new Set(text.split(""))).filter((c) => c !== " ")
        : characters.split(""),
    [useOriginalCharsOnly, text, characters],
  );

  const shuffleText = useCallback(
    (original: string, revealed: Set<number>) =>
      original
        .split("")
        .map((char, i) => {
          if (char === " ") return " ";
          if (revealed.has(i)) return original[i];
          return availableChars[Math.floor(Math.random() * availableChars.length)];
        })
        .join(""),
    [availableChars],
  );

  const triggerDecrypt = useCallback(() => {
    setRevealedIndices(new Set());
    setIsAnimating(true);
  }, []);

  useEffect(() => {
    if (!isAnimating) return;
    let currentIteration = 0;
    const getNextIndex = (revealed: Set<number>): number => {
      const len = text.length;
      switch (revealDirection) {
        case "end":
          return len - 1 - revealed.size;
        case "center": {
          const middle = Math.floor(len / 2);
          const offset = Math.floor(revealed.size / 2);
          const next = revealed.size % 2 === 0 ? middle + offset : middle - offset - 1;
          if (next >= 0 && next < len && !revealed.has(next)) return next;
          for (let i = 0; i < len; i++) if (!revealed.has(i)) return i;
          return 0;
        }
        default:
          return revealed.size;
      }
    };
    const interval = setInterval(() => {
      setRevealedIndices((prev) => {
        if (sequential) {
          if (prev.size < text.length) {
            const next = getNextIndex(prev);
            const nextSet = new Set(prev);
            nextSet.add(next);
            setDisplayText(shuffleText(text, nextSet));
            return nextSet;
          }
          clearInterval(interval);
          setIsAnimating(false);
          return prev;
        }
        setDisplayText(shuffleText(text, prev));
        currentIteration++;
        if (currentIteration >= maxIterations) {
          clearInterval(interval);
          setIsAnimating(false);
          setDisplayText(text);
        }
        return prev;
      });
    }, speed);
    return () => clearInterval(interval);
  }, [isAnimating, text, speed, maxIterations, sequential, revealDirection, shuffleText]);

  useEffect(() => {
    if (animateOn !== "view" && animateOn !== "inViewHover") return;
    // Respect reduced motion — leave the text plain, matching the rest of the site.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            triggerDecrypt();
            setHasAnimated(true);
          }
        });
      },
      { threshold: 0.1 },
    );
    const el = containerRef.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
  }, [animateOn, hasAnimated, triggerDecrypt]);

  const hoverProps =
    animateOn === "hover" || animateOn === "inViewHover"
      ? {
          onMouseEnter: () => {
            if (!isAnimating) triggerDecrypt();
          },
        }
      : {};

  return (
    <motion.span
      className={parentClassName}
      ref={containerRef}
      style={styles.wrapper}
      {...hoverProps}
      {...props}
    >
      <span style={styles.srOnly}>{text}</span>
      <span aria-hidden="true">
        {tokens.map((token) =>
          token.isSpace ? (
            <span key={token.start}>{token.value}</span>
          ) : (
            <span key={token.start} style={styles.word}>
              {token.value.split("").map((char, i) => {
                const index = token.start + i;
                const revealed = revealedIndices.has(index) || !isAnimating;
                const glyph = revealed ? undefined : (displayText[index] ?? char);
                return (
                  <span
                    key={index}
                    className={`dt-cell ${revealed ? className : encryptedClassName}`.trim()}
                    data-glyph={glyph}
                  >
                    <span className="dt-real">{char}</span>
                  </span>
                );
              })}
            </span>
          ),
        )}
      </span>
    </motion.span>
  );
}
