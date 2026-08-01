"use client";

// Adapted from React Bits <Shuffle /> (gsap + SplitText). Ported to TS.
import { useRef, useState, useMemo, createElement, type CSSProperties } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText as GSAPSplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

import "./Shuffle.css";

gsap.registerPlugin(ScrollTrigger, GSAPSplitText, useGSAP);

type ShuffleDirection = "left" | "right" | "up" | "down";

interface ShuffleProps {
  text: string;
  className?: string;
  style?: CSSProperties;
  shuffleDirection?: ShuffleDirection;
  duration?: number;
  maxDelay?: number;
  ease?: string;
  threshold?: number;
  rootMargin?: string;
  tag?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span";
  textAlign?: CSSProperties["textAlign"];
  onShuffleComplete?: () => void;
  shuffleTimes?: number;
  animationMode?: "evenodd" | "random";
  loop?: boolean;
  loopDelay?: number;
  stagger?: number;
  scrambleCharset?: string;
  colorFrom?: string;
  colorTo?: string;
  triggerOnce?: boolean;
  respectReducedMotion?: boolean;
  triggerOnHover?: boolean;
}

export default function Shuffle({
  text,
  className = "",
  style = {},
  shuffleDirection = "right",
  duration = 0.35,
  maxDelay = 0,
  ease = "power3.out",
  threshold = 0.1,
  rootMargin = "-100px",
  tag = "p",
  textAlign = "center",
  onShuffleComplete,
  shuffleTimes = 1,
  animationMode = "evenodd",
  loop = false,
  loopDelay = 0,
  stagger = 0.03,
  scrambleCharset = "",
  colorFrom,
  colorTo,
  triggerOnce = true,
  respectReducedMotion = true,
  triggerOnHover = true,
}: ShuffleProps) {
  const ref = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);

  const splitRef = useRef<GSAPSplitText | null>(null);
  const wrappersRef = useRef<HTMLElement[]>([]);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const playingRef = useRef(false);
  const hoverHandlerRef = useRef<(() => void) | null>(null);

  const scrollTriggerStart = useMemo(() => {
    const startPct = (1 - threshold) * 100;
    const mm = /^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/.exec(rootMargin || "");
    const mv = mm ? parseFloat(mm[1]) : 0;
    const mu = mm ? mm[2] || "px" : "px";
    const sign = mv === 0 ? "" : mv < 0 ? `-=${Math.abs(mv)}${mu}` : `+=${mv}${mu}`;
    return `top ${startPct}%${sign}`;
  }, [threshold, rootMargin]);

  useGSAP(
    () => {
      if (!ref.current || !text) return;
      if (
        respectReducedMotion &&
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        setReady(true);
        onShuffleComplete?.();
        return;
      }

      const el = ref.current;
      const start = scrollTriggerStart;

      const removeHover = () => {
        if (hoverHandlerRef.current && ref.current) {
          ref.current.removeEventListener("mouseenter", hoverHandlerRef.current);
          hoverHandlerRef.current = null;
        }
      };

      const teardown = () => {
        tlRef.current?.kill();
        tlRef.current = null;
        if (wrappersRef.current.length) {
          wrappersRef.current.forEach((wrap) => {
            const inner = wrap.firstElementChild;
            const orig = inner?.querySelector('[data-orig="1"]');
            if (orig && wrap.parentNode) wrap.parentNode.replaceChild(orig, wrap);
          });
          wrappersRef.current = [];
        }
        try {
          splitRef.current?.revert();
        } catch {
          /* noop */
        }
        splitRef.current = null;
        playingRef.current = false;
      };

      const build = () => {
        teardown();
        splitRef.current = new GSAPSplitText(el, {
          type: "chars",
          charsClass: "shuffle-char",
          wordsClass: "shuffle-word",
          linesClass: "shuffle-line",
          smartWrap: true,
          reduceWhiteSpace: false,
          // "auto" stamps aria-label onto the split element, which is invalid on
          // a role-less <span> (axe: aria-prohibited-attr). "hidden" keeps the
          // char soup out of the a11y tree and leaves naming to the host element.
          aria: "hidden",
        });
        const chars = splitRef.current.chars || [];
        wrappersRef.current = [];
        const rolls = Math.max(1, Math.floor(shuffleTimes));
        const rand = (set: string) => set.charAt(Math.floor(Math.random() * set.length)) || "";
        const vertical = shuffleDirection === "up" || shuffleDirection === "down";

        chars.forEach((charEl) => {
          const ch = charEl as HTMLElement;
          const parent = ch.parentElement;
          if (!parent) return;
          const w = ch.getBoundingClientRect().width;
          const h = ch.getBoundingClientRect().height;
          if (!w) return;

          const wrap = document.createElement("span");
          Object.assign(wrap.style, {
            display: "inline-block",
            overflow: "hidden",
            width: w + "px",
            height: vertical ? h + "px" : "auto",
            verticalAlign: "bottom",
          });
          const inner = document.createElement("span");
          Object.assign(inner.style, {
            display: "inline-block",
            whiteSpace: vertical ? "normal" : "nowrap",
            willChange: "transform",
          });
          parent.insertBefore(wrap, ch);
          wrap.appendChild(inner);

          const cell: CSSProperties = {
            display: vertical ? "block" : "inline-block",
            width: w + "px",
            textAlign: "center",
          };
          const firstOrig = ch.cloneNode(true) as HTMLElement;
          Object.assign(firstOrig.style, cell);
          ch.setAttribute("data-orig", "1");
          Object.assign(ch.style, cell);
          inner.appendChild(firstOrig);
          for (let k = 0; k < rolls; k++) {
            const c = ch.cloneNode(true) as HTMLElement;
            if (scrambleCharset) c.textContent = rand(scrambleCharset);
            Object.assign(c.style, cell);
            inner.appendChild(c);
          }
          inner.appendChild(ch);

          const steps = rolls + 1;
          if (shuffleDirection === "right" || shuffleDirection === "down") {
            const firstCopy = inner.firstElementChild;
            const real = inner.lastElementChild;
            if (real) inner.insertBefore(real, inner.firstChild);
            if (firstCopy) inner.appendChild(firstCopy);
          }

          let startX = 0,
            finalX = 0,
            startY = 0,
            finalY = 0;
          if (shuffleDirection === "right") startX = -steps * w;
          else if (shuffleDirection === "left") finalX = -steps * w;
          else if (shuffleDirection === "down") startY = -steps * h;
          else if (shuffleDirection === "up") finalY = -steps * h;

          if (!vertical) {
            gsap.set(inner, { x: startX, y: 0, force3D: true });
            inner.setAttribute("data-start-x", String(startX));
            inner.setAttribute("data-final-x", String(finalX));
          } else {
            gsap.set(inner, { x: 0, y: startY, force3D: true });
            inner.setAttribute("data-start-y", String(startY));
            inner.setAttribute("data-final-y", String(finalY));
          }
          if (colorFrom) inner.style.color = colorFrom;
          wrappersRef.current.push(wrap);
        });
      };

      const inners = () =>
        wrappersRef.current.map((w) => w.firstElementChild as HTMLElement).filter(Boolean);

      const cleanupToStill = () => {
        wrappersRef.current.forEach((w) => {
          const strip = w.firstElementChild as HTMLElement | null;
          if (!strip) return;
          const real = strip.querySelector('[data-orig="1"]');
          if (!real) return;
          strip.replaceChildren(real);
          strip.style.transform = "none";
          strip.style.willChange = "auto";
        });
      };

      const play = () => {
        const strips = inners();
        if (!strips.length) return;
        playingRef.current = true;
        const vertical = shuffleDirection === "up" || shuffleDirection === "down";
        const tl = gsap.timeline({
          smoothChildTiming: true,
          repeat: loop ? -1 : 0,
          repeatDelay: loop ? loopDelay : 0,
          onComplete: () => {
            playingRef.current = false;
            if (!loop) {
              cleanupToStill();
              if (colorTo) gsap.set(strips, { color: colorTo });
              onShuffleComplete?.();
              armHover();
            }
          },
        });

        const addTween = (targets: HTMLElement[], at: number) => {
          const vars: gsap.TweenVars = {
            duration,
            ease,
            force3D: true,
            stagger: animationMode === "evenodd" ? stagger : 0,
          };
          if (vertical)
            vars.y = (_i: number, t: Element) => parseFloat(t.getAttribute("data-final-y") || "0");
          else
            vars.x = (_i: number, t: Element) => parseFloat(t.getAttribute("data-final-x") || "0");
          tl.to(targets, vars, at);
          if (colorFrom && colorTo) tl.to(targets, { color: colorTo, duration, ease }, at);
        };

        if (animationMode === "evenodd") {
          const odd = strips.filter((_, i) => i % 2 === 1);
          const even = strips.filter((_, i) => i % 2 === 0);
          const oddTotal = duration + Math.max(0, odd.length - 1) * stagger;
          const evenStart = odd.length ? oddTotal * 0.7 : 0;
          if (odd.length) addTween(odd, 0);
          if (even.length) addTween(even, evenStart);
        } else {
          strips.forEach((strip) => {
            const d = Math.random() * maxDelay;
            const vars: gsap.TweenVars = { duration, ease, force3D: true };
            if (vertical) vars.y = parseFloat(strip.getAttribute("data-final-y") || "0");
            else vars.x = parseFloat(strip.getAttribute("data-final-x") || "0");
            tl.to(strip, vars, d);
            if (colorFrom && colorTo)
              tl.fromTo(strip, { color: colorFrom }, { color: colorTo, duration, ease }, d);
          });
        }
        tlRef.current = tl;
      };

      const armHover = () => {
        if (!triggerOnHover || !ref.current) return;
        removeHover();
        const handler = () => {
          if (playingRef.current) return;
          build();
          play();
        };
        hoverHandlerRef.current = handler;
        ref.current.addEventListener("mouseenter", handler);
      };

      // For an element that is already in view both the ScrollTrigger onEnter
      // AND the manual in-view check below fire, which built the split twice
      // and left two timelines racing over the same character strips: the
      // first one's onComplete ran cleanupToStill() against the second one's
      // mid-flight wrappers, so the strips parked between cells and the text
      // rendered with neighbouring glyphs bleeding through. Whichever path
      // fires first wins; the rest is a no-op.
      let created = false;
      const create = () => {
        // Latch only when the animation is meant to run once. With
        // triggerOnce=false the ScrollTrigger is expected to replay on every
        // re-entry, so latching unconditionally would silently disable it.
        if (created && triggerOnce) return;
        created = true;
        build();
        play();
        armHover();
        setReady(true);
      };

      // SplitText measures a cell width PER CHARACTER and clips each strip to
      // it. Building while a webfont is still swapping measures the fallback's
      // metrics, so once the real face lands every strip is the wrong width and
      // sits between cells - the name then renders with neighbouring glyphs
      // bleeding through it.
      //
      // This was always latent and purely a race: it only surfaced once the
      // hero got lighter and hydration started beating the font. Waiting for
      // document.fonts makes it deterministic instead of a coin toss.
      let cancelled = false;
      const createWhenFontsReady = () => {
        if (created && triggerOnce) return;
        if (typeof document !== "undefined" && document.fonts?.status !== "loaded") {
          void document.fonts.ready.then(() => {
            if (!cancelled) create();
          });
          return;
        }
        create();
      };

      const st = ScrollTrigger.create({
        trigger: el,
        start,
        once: triggerOnce,
        onEnter: createWhenFontsReady,
      });
      // Also fire immediately if already in view (hero above the fold).
      if (el.getBoundingClientRect().top < window.innerHeight) createWhenFontsReady();

      return () => {
        cancelled = true;
        st.kill();
        removeHover();
        teardown();
        setReady(false);
      };
    },
    {
      dependencies: [
        text,
        duration,
        maxDelay,
        ease,
        scrollTriggerStart,
        shuffleDirection,
        shuffleTimes,
        animationMode,
        loop,
        loopDelay,
        stagger,
        scrambleCharset,
        colorFrom,
        colorTo,
        triggerOnce,
        respectReducedMotion,
        triggerOnHover,
      ],
      scope: ref,
    },
  );

  const commonStyle = useMemo<CSSProperties>(() => ({ textAlign, ...style }), [textAlign, style]);
  const classes = `shuffle-parent ${ready ? "is-ready" : ""} ${className}`.trim();
  // eslint-disable-next-line react-hooks/refs -- ref is forwarded to the element, not read during render
  return createElement(tag || "p", { ref, className: classes, style: commonStyle }, text);
}
