"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

/**
 * LandingHero — landonorris.com-style hero.
 * Cream backdrop + contour squiggles, giant condensed name lockup,
 * cutout portrait with wavy "glitch strips" that slice the face and
 * drift with the cursor. Fully self-contained: swap
 * /public/hero/face.png to change the portrait, nothing else needed.
 */

const CREAM = "#f2efe9";
const INK = "#111110";
const LIME = "#d7ee3c";

// Wavy horizontal band clip-paths (percent coords, many points = organic edge).
function wavyBand(top: number, height: number, seed: number): string {
  const pts: string[] = [];
  const n = 14;
  for (let i = 0; i <= n; i += 1) {
    const x = (i / n) * 100;
    const y = top + Math.sin(i * 1.7 + seed) * 2.2 + Math.cos(i * 0.9 + seed * 2) * 1.4;
    pts.push(`${x.toFixed(2)}% ${y.toFixed(2)}%`);
  }
  for (let i = n; i >= 0; i -= 1) {
    const x = (i / n) * 100;
    const y =
      top + height + Math.sin(i * 1.3 + seed * 3) * 2.4 + Math.cos(i * 1.1 + seed) * 1.6;
    pts.push(`${x.toFixed(2)}% ${y.toFixed(2)}%`);
  }
  return `polygon(${pts.join(", ")})`;
}

const STRIP_BROW = wavyBand(13, 8, 1.3); // headband across the forehead
const STRIP_EYES = wavyBand(32, 33, 4.1); // visor smear over eyes down past the mouth
const STRIP_MOUTH = wavyBand(52, 18, 2.7); // opaque metal so the mouth reads as visor, not a grin

const FACE_SRC = "/hero/face.png";

/**
 * Both the sliced face copies and the textures painted over them are drawn as
 * backgrounds with identical sizing, so a mask cut from the same file lands
 * pixel-on-pixel and the texture never spills past the silhouette.
 */
const faceLayer = {
  backgroundImage: `url(${FACE_SRC})`,
  backgroundSize: "contain",
  backgroundPosition: "bottom center",
  backgroundRepeat: "no-repeat",
} as const;

const faceMask = {
  maskImage: `url(${FACE_SRC})`,
  maskSize: "contain",
  maskPosition: "bottom center",
  maskRepeat: "no-repeat",
  WebkitMaskImage: `url(${FACE_SRC})`,
  WebkitMaskSize: "contain",
  WebkitMaskPosition: "bottom center",
  WebkitMaskRepeat: "no-repeat",
} as const;

export function LandingHero() {
  const portraitRef = useRef<HTMLDivElement>(null);
  const stripBrowRef = useRef<HTMLDivElement>(null);
  const stripEyesRef = useRef<HTMLDivElement>(null);

  // Cursor-driven drift: strips slide opposite ways, portrait tilts a hair.
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let raf = 0;
    let targetX = 0;
    let curBrow = 0;
    let curEyes = 0;

    const onMove = (e: PointerEvent) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 2; // -1..1
    };

    const tick = () => {
      curBrow += (targetX * 26 - curBrow) * 0.06;
      curEyes += (targetX * -34 - curEyes) * 0.08;
      if (stripBrowRef.current) {
        stripBrowRef.current.style.transform = `translateX(${curBrow.toFixed(2)}px)`;
      }
      if (stripEyesRef.current) {
        stripEyesRef.current.style.transform = `translateX(${curEyes.toFixed(2)}px)`;
      }
      if (portraitRef.current) {
        portraitRef.current.style.transform = `translateX(${(curBrow * 0.15).toFixed(2)}px)`;
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove);
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section
      className="relative h-svh min-h-[620px] w-full overflow-hidden"
      style={{ background: CREAM, color: INK }}
      aria-label="Dhwanit Sukhadiya"
    >
      {/* ---- contour squiggle backdrop ---- */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <g stroke={INK} strokeOpacity="0.08" strokeWidth="1.5">
          <path d="M-60 220 C 220 80, 400 320, 700 200 S 1160 60, 1500 240" />
          <path d="M-60 300 C 240 160, 420 400, 720 280 S 1180 140, 1500 320" />
          <path d="M-60 640 C 260 500, 480 760, 780 620 S 1220 480, 1500 660" />
          <path d="M-60 720 C 280 580, 500 840, 800 700 S 1240 560, 1500 740" />
        </g>
        <g fill={INK} fillOpacity="0.05">
          <path d="M140 560 c 60 -90, 200 -70, 210 20 c 8 78 -96 128 -160 82 c -50 -36 -76 -66 -50 -102 Z" />
          <path d="M1180 260 c 70 -80, 190 -40, 190 40 c 0 84 -110 118 -168 66 c -44 -40 -52 -72 -22 -106 Z" />
        </g>
      </svg>

      {/* ---- top bar ---- */}
      <header className="absolute inset-x-0 top-0 z-40 flex items-start justify-between px-5 pt-5 sm:px-8 sm:pt-7">
        <h1
          className="select-none leading-[0.82] tracking-tight"
          style={{
            fontFamily: "var(--font-hero-display), Impact, sans-serif",
            fontSize: "clamp(2rem, 4.2vw, 3.6rem)",
            textTransform: "uppercase",
          }}
        >
          Dhwanit
          <br />
          Sukhadiya
        </h1>

        <div className="flex items-center gap-3">
          <a
            href="/resume"
            className="flex items-center gap-2 px-5 py-3 text-sm font-bold uppercase tracking-wide transition-transform hover:scale-[1.04]"
            style={{ background: LIME, color: INK, borderRadius: 10 }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 8h12l-1 12H7L6 8Zm3 0V6a3 3 0 0 1 6 0v2"
                stroke={INK}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Resume
          </a>
          <button
            type="button"
            aria-label="Menu"
            className="flex h-12 w-12 flex-col items-center justify-center gap-1.5 rounded-xl border-2 transition-transform hover:scale-[1.04]"
            style={{ borderColor: INK, background: CREAM }}
          >
            <span className="block h-0.5 w-5" style={{ background: INK }} />
            <span className="mr-3.5 block h-0.5 w-3 self-end" style={{ background: INK }} />
          </button>
        </div>
      </header>

      {/* ---- LN-style monogram ---- */}
      <div
        aria-hidden
        className="absolute left-1/2 top-6 z-30 -translate-x-1/2 select-none text-4xl font-black italic sm:top-8"
        style={{ fontFamily: "var(--font-hero-display), Impact, sans-serif" }}
      >
        DS
      </div>

      {/* ---- portrait + glitch strips ---- */}
      <div
        ref={portraitRef}
        className="absolute bottom-0 left-1/2 z-20 aspect-[546/871] -translate-x-1/2 will-change-transform"
        style={{
          // Box locked to the cutout's own ratio so the strip percentages land
          // on the same features at every viewport width.
          height: "min(90svh, 155vw)",
          // neck dissolves into the backdrop instead of ending on a hard cut
          maskImage: "linear-gradient(180deg, #000 0 82%, transparent 97%)",
          WebkitMaskImage: "linear-gradient(180deg, #000 0 82%, transparent 97%)",
        }}
      >
        {/* base cutout */}
        <Image
          src={FACE_SRC}
          alt="Portrait of Dhwanit Sukhadiya"
          fill
          priority
          sizes="(max-width: 640px) 92vw, 560px"
          className="object-contain object-bottom"
        />

        {/* strip 1 — brow band: slice shoved left, warm bandana weave */}
        <div
          ref={stripBrowRef}
          aria-hidden
          className="absolute inset-0 will-change-transform"
          style={{ clipPath: STRIP_BROW }}
        >
          <div
            className="absolute inset-0"
            style={{ transform: "translateX(-3%) scaleX(1.08)" }}
          >
            <div className="absolute inset-0" style={faceLayer} />
            <div
              className="absolute inset-0"
              style={{
                ...faceMask,
                background:
                  "repeating-linear-gradient(102deg, #c8931f 0 10px, #221e16 10px 19px, #d7ee3c 19px 22px, #221e16 22px 33px)",
                opacity: 0.92,
              }}
            />
          </div>
        </div>

        {/* strip 2 — eye band: slice shoved right, chrome smear */}
        <div
          ref={stripEyesRef}
          aria-hidden
          className="absolute inset-0 will-change-transform"
          style={{ clipPath: STRIP_EYES }}
        >
          <div
            className="absolute inset-0"
            style={{ transform: "translateX(4%) scaleX(0.94) scaleY(1.04)" }}
          >
            <div
              className="absolute inset-0"
              style={{ ...faceLayer, filter: "grayscale(1) contrast(1.35) brightness(0.9)" }}
            />
            <div
              className="absolute inset-0 mix-blend-hard-light"
              style={{
                ...faceMask,
                background:
                  "linear-gradient(92deg, #e6e7ec 0%, #4a4b53 13%, #ffffff 27%, #16161c 44%, #d5d6de 58%, #3c3c45 74%, #fafaff 90%, #6e6e79 100%)",
                opacity: 0.95,
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                ...faceMask,
                clipPath: STRIP_MOUTH,
                background:
                  "linear-gradient(92deg, #e6e7ec 0%, #4a4b53 13%, #ffffff 27%, #16161c 44%, #d5d6de 58%, #3c3c45 74%, #fafaff 90%, #6e6e79 100%)",
              }}
            />
          </div>
        </div>
      </div>

      {/* ---- bottom-left chip card ---- */}
      <aside
        className="absolute bottom-6 left-5 z-40 hidden w-40 sm:left-8 sm:block"
        aria-label="Current status"
      >
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em]">
          Now Building
        </p>
        <div
          className="flex flex-col items-center gap-3 border-2 px-4 py-5"
          style={{
            borderColor: INK,
            borderRadius: 14,
            background: "rgba(255,255,255,0.35)",
          }}
        >
          <svg width="72" height="40" viewBox="0 0 72 40" fill="none" aria-hidden>
            <path
              d="M4 32 C 14 8, 26 8, 32 20 S 48 36, 56 20 S 66 6, 68 10"
              stroke={INK}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
          <p className="text-center text-[11px] font-bold uppercase leading-tight tracking-wide">
            Project
            <br />
            Aaron
          </p>
          <div className="h-px w-full" style={{ background: INK, opacity: 0.25 }} />
          <p className="text-center text-[10px] font-semibold uppercase leading-tight tracking-wider opacity-70">
            Security engineer
            <br />
            since 2024
          </p>
        </div>
      </aside>
    </section>
  );
}
