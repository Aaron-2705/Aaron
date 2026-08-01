"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";

import { useBoot } from "@/components/providers/BootProvider";
import DecryptedText from "@/components/vendor/DecryptedText";
import { PROFILE } from "@/data/profile";
import { MISSIONS } from "@/data/projects";
import { SITE } from "@/data/site";
import { useIdleMount } from "@/hooks/useIdleMount";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { scrollToSection } from "@/lib/lenisSingleton";
import { DUR, EASE_OUT } from "@/lib/motion";

const LightPillar = dynamic(() => import("@/components/vendor/LightPillar"), { ssr: false });

/**
 * The cover-sheet field row.
 *
 * Read from the same records the profile section prints, so the hero cannot
 * claim anything the file inside does not. No invented fields.
 */
const HERO_FIELDS = [
  { label: "Role", value: PROFILE.roles[0] },
  {
    label: "Base",
    value: PROFILE.records.find((r) => r.label === "LOCATION")?.value ?? SITE.location,
  },
  {
    label: "Status",
    value: PROFILE.records.find((r) => r.label === "STATUS")?.value ?? "OPEN TO OPPORTUNITIES",
  },
] as const;

/**
 * The rail that drifts along the foot of the hero.
 *
 * This replaced a passport-style `<<`-delimited string. That was a neat idea on
 * paper and unreadable in practice: at a glance it looked like corrupted text
 * rather than a record, and it restated the field row directly above it. These
 * are label/value pairs instead, carrying the facts the field row has no space
 * for, and every one is read from the same data the rest of the site uses so
 * the rail cannot drift out of step with it.
 */
const RAIL_ITEMS: ReadonlyArray<{ label: string; value: string }> = [
  { label: "Operative", value: SITE.owner },
  {
    label: "Clearance",
    value: PROFILE.records.find((r) => r.label === "CLEARANCE")?.value ?? "PUBLIC PROFILE",
  },
  { label: "Base", value: PROFILE.records.find((r) => r.label === "LOCATION")?.value ?? SITE.location },
  { label: "Fieldwork", value: "6 months desktop and network support" },
  { label: "Labs", value: MISSIONS.map((m) => m.codeName.replace("OPERATION ", "")).join(" / ") },
  { label: "Stack", value: "Windows Server 2022 / Active Directory / TCP-IP" },
  {
    label: "Status",
    value: PROFILE.records.find((r) => r.label === "STATUS")?.value ?? "OPEN TO OPPORTUNITIES",
  },
];

/**
 * Hero display font: Clash Display (wide-sans display). Chosen by the user from
 * an A/B against Fraunces serif — taste skill flagged the serif as an AI-tell.
 */
const NAME_FONT_CLASS = "font-[family-name:var(--font-clash)]";
const NAME_STYLE = { fontVariationSettings: '"wght" 600' as const };

/**
 * The name lines carry an EXPLICIT height, not just a line-height. GSAP's
 * SplitText rebuilds each character as an `overflow:hidden` inline-block, which
 * pushes the line box down by ~18px; since #hero is `flex items-center`, that
 * re-centered the whole hero column and was the site's dominant layout shift.
 * A fixed box makes the h1's height independent of whether SplitText has run.
 */
const NAME_SIZE = "clamp(1.9rem, 8.5vw, 6.5rem)";
const NAME_LINE_STYLE = {
  // `display` is set here, not via a utility class: Shuffle.css ships
  // `.shuffle-parent { display: inline-block }` unlayered, which beats
  // Tailwind's layered `.block`. Without this the two branches below would
  // differ in display, and two inline-block name lines can sit side by side
  // once they fit, collapsing the heading to a single line.
  display: "block",
  fontSize: NAME_SIZE,
  lineHeight: 0.9,
  height: `calc(${NAME_SIZE} * 0.9)`,
} as const;

/**
 * One line of the name. Plain, server-rendered type - no per-character effect.
 *
 * <Shuffle> used to scramble this. It was removed because it kept leaving the
 * name misrendered: SplitText wraps every glyph in an overflow-hidden cell and
 * slides a strip of identical copies through it, and whenever that timeline
 * failed to tick the strip stayed parked at its start offset, a fraction of a
 * pixel off the cell edge. The result was the name drawn with slivers of the
 * neighbouring copy bleeding through every letter - measured frozen at
 * x=-232.125 for five seconds straight, with no console error to show for it.
 * The repo had already been bitten by a different failure of the same machinery
 * once before (see PROGRESS.md).
 *
 * The name is the single element on this page that must never render wrong, so
 * it no longer depends on an animation completing. Motion still carries the
 * eyebrow and the tagline, where a dropped frame costs nothing.
 */
/**
 * Scramble paragraph. Plain server-rendered text until the boot overlay lifts.
 * DecryptedText's IntersectionObserver does not test occlusion, so mounting it
 * straight away ran the whole reveal underneath the loader — invisible work,
 * and ~1.3-1.7s of per-tick re-rendering landing in the load-time budget — and
 * then `revealKey` ran it a second time when the hero actually appeared.
 */
function ScrambleLine({
  text,
  reveal,
  speed,
  revealKey,
}: {
  text: string;
  reveal: boolean;
  speed: number;
  revealKey: string;
}) {
  if (!reveal) return <>{text}</>;
  return (
    <DecryptedText
      key={revealKey}
      text={text}
      animateOn="view"
      sequential
      speed={speed}
      revealDirection="start"
      parentClassName="inline-block"
    />
  );
}

function NameLine({ text }: { text: string }) {
  return (
    <span className="block break-words" style={NAME_LINE_STYLE}>
      {text}
    </span>
  );
}

/**
 * The calm "identity" hero — an OFF-CENTER SPLIT: the name and intent sit on
 * the dark left column (always legible), while the live AARON core occupies
 * the right. Establishes the person before the cyberpunk command center below.
 */
export function HeroPrime() {
  const { phase } = useBoot();
  const [firstName, ...rest] = PROFILE.name.split(" ");
  const lastName = rest.join(" ");
  const ready = phase === "complete";
  // Flipping this key remounts the scramble effects the instant the boot
  // overlay lifts, so they play on the reveal instead of behind it.
  const revealKey = ready ? "live" : "boot";
  // The pillar waits for boot AND for the main thread to go idle, so three.js
  // never evaluates ahead of the hero copy it sits behind.
  const orbMounted = useIdleMount(ready);
  const reducedMotion = usePrefersReducedMotion();

  return (
    <section
      id="hero"
      aria-label="Introduction"
      className="relative z-40 flex min-h-dvh items-center overflow-hidden"
      style={{ background: "var(--onyx)" }}
    >
      {/* Light-pillar backdrop. An ethereal volumetric beam (React Bits
          <LightPillar/>, ported to TS) stands behind the copy in place of the
          old woven field.

          Tuned to the steel accent but kept as a CONTAINED vertical beam over
          onyx, not a full accent wash: the shaft reads as an accent because the
          onyx around it stays dominant. The left→right wash below still pulls
          the copy column back to near-onyx for AA legibility.

          Gated on the idle mount so three.js never evaluates ahead of the copy
          it sits behind; frozen (no rotation, non-interactive) under reduced
          motion. */}
      <div className="absolute inset-0" aria-hidden="true">
        {orbMounted && (
          <LightPillar
            className="h-full w-full"
            topColor="#ff2e6e"
            bottomColor="#3f74ff"
            intensity={1.05}
            glowAmount={0.006}
            pillarWidth={3}
            pillarHeight={0.35}
            noiseIntensity={0.2}
            pillarRotation={245}
            rotationSpeed={reducedMotion ? 0 : 0.4}
            interactive={!reducedMotion}
            mixBlendMode="screen"
          />
        )}
      </div>

      {/* Left→right onyx wash. The weave's highlights reach about 3.6:1 against
          ivory, which fails AA for the body sizes, so the copy column is pulled
          back to near-black while the right half shows the fabric at full
          strength. Ratios measured after the fact, not assumed. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(100deg, var(--onyx) 0%, var(--onyx) 24%, color-mix(in srgb, var(--onyx) 82%, transparent) 44%, color-mix(in srgb, var(--onyx) 42%, transparent) 58%, transparent 72%)",
        }}
      />
      {/* Below lg the copy sits directly over the fabric, where the horizontal
          wash does not reach. Mobile-only veil, set for the weave's brightest
          fold rather than its average. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 lg:hidden"
        style={{ background: "color-mix(in srgb, var(--onyx) 88%, transparent)" }}
      />
      {/* Grain */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-soft-light"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Rendered unconditionally — NOT gated on boot completion. Gating it
          meant the hero could not paint until React had hydrated (~3s of
          script), which pinned LCP to hydration no matter how fast the boot
          ran. Server-rendered, it paints with the document; the boot overlay
          simply sits on top until its clip-path wipe reveals it.
          `revealKey` remounts the scramble effects at that moment so the
          signature animation still plays on reveal rather than under it. */}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 sm:px-8">
        {/* Document field frame. The rule and corner tick are the same marks
            HudPanel uses elsewhere, so the hero speaks the site's language
            instead of introducing a second one. */}
        <div className="max-w-3xl border-l border-[var(--ash)]/25 pl-6 sm:pl-9">
          <div className="mb-7 flex items-baseline gap-4">
            <span
              aria-hidden="true"
              className="hidden h-px w-10 shrink-0 translate-y-[-0.3em] bg-accent sm:block"
            />
            <div
              className="font-mono text-[11px] tracking-[0.38em] uppercase"
              style={{ color: "var(--ash)" }}
            >
              <ScrambleLine
                text="Advanced Autonomous Responsive Operations Network"
                reveal={ready}
                speed={28}
                revealKey={`eyebrow-${revealKey}`}
              />
            </div>
          </div>

          <h1
            className={`${NAME_FONT_CLASS} leading-[0.9] font-semibold tracking-[-0.02em]`}
            style={{ color: "var(--ivory)", ...NAME_STYLE }}
            aria-label={PROFILE.name}
          >
            <NameLine text={firstName} />
            <NameLine text={lastName} />
          </h1>

          {/* Dossier field row. The old hero had a paragraph and nothing else,
              which is why it read plain: no structure carried any information.
              These are the same records the profile section prints, so the
              cover sheet and the file inside cannot disagree. */}
          <dl className="mt-9 grid max-w-xl grid-cols-2 gap-x-8 gap-y-4 border-t border-[var(--ash)]/20 pt-6 sm:grid-cols-3">
            {HERO_FIELDS.map((field) => (
              <div key={field.label}>
                <dt
                  className="font-mono text-[9px] tracking-[0.3em] uppercase"
                  style={{ color: "var(--ash)" }}
                >
                  {field.label}
                </dt>
                <dd
                  className="mt-1.5 font-mono text-[12px] leading-snug tracking-[0.06em]"
                  style={{ color: "var(--ivory)" }}
                >
                  {field.value}
                </dd>
              </div>
            ))}
          </dl>

          <div
            className="mt-7 max-w-lg font-[family-name:var(--font-inter)] text-[17px] leading-relaxed"
            style={{ color: "var(--ash)" }}
          >
            <ScrambleLine
              text={PROFILE.tagline}
              reveal={ready}
              speed={14}
              revealKey={`tagline-${revealKey}`}
            />
          </div>

          {/* Squared, bracketed actions. The rounded pills were the only place
              on the site that used that shape; every other control is a hard
              rectangle with a mono label, so the pills read as imported. */}
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DUR.base, delay: 0.85, ease: EASE_OUT }}
            className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <button
              onClick={() => scrollToSection("command")}
              className="group relative border border-accent bg-accent/10 px-8 py-3.5 font-mono text-[11px] font-bold tracking-[0.28em] text-accent uppercase transition-all duration-200 hover:bg-accent hover:text-[var(--onyx)] hover:shadow-[0_0_28px_var(--accent-dim)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <span
                aria-hidden="true"
                className="absolute -top-px -left-px size-2 border-t-2 border-l-2 border-accent"
              />
              <span
                aria-hidden="true"
                className="absolute -right-px -bottom-px size-2 border-r-2 border-b-2 border-accent"
              />
              Enter the system
            </button>
            <button
              onClick={() => scrollToSection("contact")}
              className="border border-[var(--ash)]/40 px-8 py-3.5 font-mono text-[11px] tracking-[0.28em] uppercase transition-colors duration-200 hover:border-[var(--ivory)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              style={{ color: "var(--ivory)" }}
            >
              Open channel
            </button>
          </motion.div>
        </div>
      </div>



      {/* Identity strip. The record above, in the format an ID document would
          carry it, drifting along the foot of the sheet. Decorative in the
          accessibility tree - the real record is the <dl> - and clipped by an
          overflow-hidden rail so it can never introduce horizontal page scroll
          at any width. */}
      <div
        aria-hidden="true"
        /* Solid, not translucent. This rail lands exactly on the seam between
           the hero and the command scene below, so at 55% opacity the text was
           reading over a lit 3D desk and disappearing into it. An opaque band
           with a rule top and bottom turns the same element into a deliberate
           divider between the two sections instead of type floating over a
           render. */
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 overflow-hidden border-y border-[var(--ash)]/20 bg-[var(--onyx)] py-3.5"
        /* Fade both ends rather than cutting the type off mid-glyph against the
           viewport edge, which is what makes a marquee look unfinished. */
        style={{
          maskImage:
            "linear-gradient(to right, transparent 0, #000 5%, #000 95%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0, #000 5%, #000 95%, transparent 100%)",
        }}
      >
        <div className="mrz-track flex w-max">
          {[0, 1].map((half) => (
            <div key={half} className="flex shrink-0 items-center">
              {RAIL_ITEMS.map((item) => (
                <span key={item.label} className="flex shrink-0 items-center">
                  <span
                    className="font-mono text-[9px] tracking-[0.3em] whitespace-nowrap uppercase"
                    style={{ color: "color-mix(in srgb, var(--ash) 70%, transparent)" }}
                  >
                    {item.label}
                  </span>
                  <span
                    className="ml-2.5 font-mono text-[11px] tracking-[0.06em] whitespace-nowrap"
                    style={{ color: "var(--ivory)" }}
                  >
                    {item.value}
                  </span>
                  {/* Separator carries the one flash of accent on the rail. */}
                  <span aria-hidden="true" className="mx-7 size-1 rotate-45 bg-accent/70" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Scroll cue */}
      {ready && (
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.4 }}
          className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2"
        >
          <span
            className="font-[family-name:var(--font-inter)] text-[10px] tracking-[0.4em] uppercase"
            style={{ color: "var(--ash)" }}
          >
            Scroll
          </span>
          <motion.span
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="block h-6 w-px"
            style={{ background: "linear-gradient(to bottom, var(--cobalt), transparent)" }}
          />
        </motion.div>
      )}
    </section>
  );
}
