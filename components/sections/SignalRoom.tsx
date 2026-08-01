"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Reveal } from "@/components/animations/Reveal";
import { HudPanel } from "@/components/ui/HudPanel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { captureTime, SAMPLE_LOG } from "@/data/sampleLog";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { analyze, FAILED_LOGIN_RULE, type Severity } from "@/lib/siem";
import { playSound } from "@/lib/sound";

import { SeverityChart } from "./SeverityChart";

/** Milliseconds between ingested events at 1x. */
const TICK_MS = 320;

const SEVERITY_CLASS: Record<Severity, string> = {
  info: "text-muted",
  notice: "text-accent",
  warning: "text-[var(--gold)]",
  critical: "text-alert",
};

/**
 * SIGNAL ROOM — a client-side SIEM over clearly-labeled sample data.
 *
 * The replay is presentation; the detection is not. Every tick re-runs
 * `analyze()` from `lib/siem.ts` over the events ingested so far, so the alert
 * that appears is computed from the data by a real sliding-window rule rather
 * than scheduled to appear at a certain moment.
 */
export function SignalRoom() {
  const reducedMotion = usePrefersReducedMotion();
  const [ingested, setIngested] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 4>(1);
  const feedRef = useRef<HTMLOListElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  /** An explicit PAUSE must survive scrolling back into view. */
  const pausedByUserRef = useRef(false);

  const done = ingested >= SAMPLE_LOG.length;
  const events = useMemo(() => SAMPLE_LOG.slice(0, ingested), [ingested]);
  const { alerts, flagged } = useMemo(() => analyze(events), [events]);

  // Reduced motion: no replay at all. Analyze the whole log up front so the
  // section is complete and static on arrival.
  useEffect(() => {
    if (!reducedMotion) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to the OS motion preference, which is only known on the client
    setIngested(SAMPLE_LOG.length);
  }, [reducedMotion]);

  // Play while the section is on screen, pause when it leaves. The observer
  // stays connected: disconnecting after the first intersection would let the
  // whole replay run while the visitor is elsewhere, so they would come back
  // to a finished, static feed and never see the one thing that must move.
  // rootMargin rather than a threshold, because the section is several
  // viewports tall and a 0.25 threshold can never be met on a phone.
  useEffect(() => {
    if (reducedMotion) return;
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (pausedByUserRef.current) return;
        setPlaying(entry.isIntersecting);
      },
      { rootMargin: "-15% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reducedMotion]);

  // The replay timer.
  useEffect(() => {
    if (!playing || done || reducedMotion) return;
    const id = window.setInterval(() => {
      setIngested((n) => Math.min(n + 1, SAMPLE_LOG.length));
    }, TICK_MS / speed);
    return () => window.clearInterval(id);
  }, [playing, done, speed, reducedMotion]);

  // Keep the newest row in view without scrolling the page.
  useEffect(() => {
    const feed = feedRef.current;
    if (feed && !reducedMotion) feed.scrollTop = feed.scrollHeight;
  }, [ingested, reducedMotion]);

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  // `alerts` is sorted worst-first, so [0] is the headline detection. The
  // summary below is read off the alert rather than asserted, so it stays true
  // if the sample log ever changes.
  const worstAlert = alerts[0];
  // Not memoized: `alerts` and `events` are fresh references every tick, so a
  // memo here would recompute regardless while pretending otherwise.
  const targetedUsers = worstAlert
    ? [
        ...new Set(
          events
            .filter((e) => worstAlert.triggeredBy.includes(e.id) && e.user)
            .map((e) => e.user as string),
        ),
      ].join(", ")
    : "";

  return (
    <section
      ref={sectionRef}
      id="siem"
      aria-label="Signal Room, client-side SIEM demonstration"
      className="relative z-10"
    >
      <SectionHeading
        title="SIGNAL ROOM"
        subtitle="A log stream, a detection rule, and whatever the rule finds. The analysis runs in your browser over a sample log shipped with this site."
      />

      <Reveal className="mb-6 flex flex-wrap items-center gap-3">
        <span className="border border-[var(--gold)]/60 px-2 py-1 font-mono text-[10px] tracking-[0.25em] text-[var(--gold)]">
          SAMPLE DATA
        </span>
        <span className="font-mono text-[10px] leading-relaxed tracking-[0.15em] text-muted">
          Synthetic log, written for this demo. Not a capture from a real network.
        </span>
      </Reveal>

      <div className="grid items-start gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* Feed */}
        <Reveal>
          <HudPanel brackets className="p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-dim pb-4">
              <p className="font-mono text-[10px] tracking-[0.3em] text-accent">
                EVENT FEED // {ingested} / {SAMPLE_LOG.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (done) {
                      // Exhausted: the only useful action is to run it again.
                      pausedByUserRef.current = false;
                      setIngested(0);
                      setPlaying(true);
                    } else {
                      const next = !playing;
                      pausedByUserRef.current = !next;
                      setPlaying(next);
                    }
                    playSound("click");
                  }}
                  aria-label={done ? "Replay from the start" : playing ? "Pause replay" : "Play replay"}
                  className="border border-border-dim px-3 py-1.5 font-mono text-[10px] tracking-[0.2em] text-muted transition-colors hover:border-accent hover:text-accent"
                >
                  {done ? "REPLAY" : playing ? "PAUSE" : "PLAY"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    pausedByUserRef.current = false;
                    setIngested(0);
                    setPlaying(true);
                    playSound("click");
                  }}
                  className="border border-border-dim px-3 py-1.5 font-mono text-[10px] tracking-[0.2em] text-muted transition-colors hover:border-accent hover:text-accent"
                >
                  RESET
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSpeed((s) => (s === 1 ? 4 : 1));
                    playSound("click");
                  }}
                  aria-label={`Replay speed ${speed}x, click to change`}
                  className="border border-border-dim px-3 py-1.5 font-mono text-[10px] tracking-[0.2em] text-muted transition-colors hover:border-accent hover:text-accent"
                >
                  {speed}X
                </button>
              </div>
            </div>

            {/* Deliberately NOT a live region. One <li> lands every 320ms, so
                announcing each row would trap a screen-reader user in ~20s of
                unstoppable narration and bury the alert rail, which is the
                actual signal. The throttled status line below speaks instead. */}
            <p className="sr-only" role="status">
              {done
                ? `Replay complete. ${SAMPLE_LOG.length} sample events analyzed, ${alerts.length} detection${alerts.length === 1 ? "" : "s"} raised.`
                : `Ingesting sample events. ${criticalCount} critical detection${criticalCount === 1 ? "" : "s"} so far.`}
            </p>
            <ol
              ref={feedRef}
              aria-label="Ingested log events"
              className="mt-4 max-h-[22rem] overflow-y-auto"
            >
              {events.length === 0 && (
                <li className="py-3 font-mono text-xs text-muted">
                  Waiting for the first event...
                </li>
              )}
              {events.map((event) => {
                const isFlagged = flagged.has(event.id);
                return (
                  <li
                    key={event.id}
                    data-flagged={isFlagged || undefined}
                    className={`border-l-2 py-1.5 pl-3 font-mono text-[11px] leading-relaxed ${
                      isFlagged ? "border-alert bg-alert/10" : "border-border-dim"
                    }`}
                  >
                    <span className="text-muted">{captureTime(event.ts)}</span>{" "}
                    <span className="text-muted-strong">{event.source}</span>{" "}
                    <span className={SEVERITY_CLASS[event.severity]}>{event.action}</span>{" "}
                    <span className="text-foreground/80">{event.message}</span>
                    {isFlagged && (
                      <span className="ml-2 text-alert">{"<< FLAGGED"}</span>
                    )}
                  </li>
                );
              })}
            </ol>
          </HudPanel>
        </Reveal>

        {/* Alert rail */}
        <Reveal delay={0.15}>
          <HudPanel brackets className="p-6">
            <p className="font-mono text-[10px] tracking-[0.3em] text-accent">
              DETECTIONS // {alerts.length}
            </p>

            <div
              className="mt-4 border border-border-dim p-3"
              aria-label="Active detection rule"
            >
              <p className="font-mono text-[10px] tracking-[0.2em] text-muted">RULE</p>
              <p className="mt-1 font-mono text-xs text-foreground">
                {FAILED_LOGIN_RULE.name}
              </p>
              <p className="mt-2 font-mono text-[10px] leading-relaxed text-muted">
                {FAILED_LOGIN_RULE.criticalAt} or more failed logons from one
                source inside a {FAILED_LOGIN_RULE.windowMs / 1000}s sliding
                window raises a critical alert. {FAILED_LOGIN_RULE.warnAt}{" "}
                raises a warning.
              </p>
            </div>

            <ul className="mt-5 space-y-3" aria-live="polite">
              {alerts.length === 0 && (
                <li className="font-mono text-[11px] leading-relaxed text-muted">
                  Nothing above threshold yet. The rule is running on every
                  event as it arrives.
                </li>
              )}
              {alerts.map((alert) => (
                <li
                  key={alert.id}
                  data-testid="siem-alert"
                  data-severity={alert.severity}
                  className={`border-l-2 p-3 ${
                    alert.severity === "critical"
                      ? "border-alert bg-alert/10"
                      : "border-[var(--gold)] bg-[var(--gold)]/10"
                  }`}
                >
                  <p
                    className={`font-mono text-[10px] tracking-[0.25em] ${
                      alert.severity === "critical" ? "text-alert" : "text-[var(--gold)]"
                    }`}
                  >
                    {alert.severity.toUpperCase()}
                    {" // "}
                    {alert.rule}
                  </p>
                  <p className="mt-2 font-mono text-[11px] leading-relaxed text-foreground/90">
                    {alert.summary}
                  </p>
                  <p className="mt-2 font-mono text-[10px] text-muted">
                    {captureTime(alert.firstTs)} to {captureTime(alert.lastTs)}
                    {" // "}
                    {alert.triggeredBy.length} events
                  </p>
                </li>
              ))}
            </ul>

            <p className="mt-6 border-t border-border-dim pt-4 font-mono text-[10px] leading-relaxed text-muted">
              {worstAlert
                ? `${worstAlert.count} failed attempts against ${targetedUsers || "one account"} from ${worstAlert.source}. The account lockout control in the Range panel above is what stops this.`
                : "Detections appear here when the rule's threshold is crossed."}
            </p>
          </HudPanel>
        </Reveal>
      </div>

      <Reveal className="mt-8">
        <HudPanel brackets className="p-4 sm:p-6">
          <p className="mb-4 font-mono text-[10px] tracking-[0.3em] text-muted">
            SEVERITY BY MINUTE
          </p>
          <SeverityChart events={events} />
        </HudPanel>
      </Reveal>
    </section>
  );
}
