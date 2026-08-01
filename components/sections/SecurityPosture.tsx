"use client";

import { ArrowsClockwise, ShieldCheck } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Reveal } from "@/components/animations/Reveal";
import { HudPanel } from "@/components/ui/HudPanel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { HEADER_CONTROLS, PIPELINE_CONTROLS } from "@/data/hardening";
import { auditHeaders, summarize, type AuditRow, type ControlStatus } from "@/lib/hardening";
import { playSound } from "@/lib/sound";

const IS_DEV = process.env.NODE_ENV === "development";

const STATUS_STYLE: Record<ControlStatus, { label: string; className: string }> = {
  enforced: { label: "ENFORCED", className: "border-accent/60 text-accent" },
  accepted: {
    label: "ACCEPTED RISK",
    className: "border-[var(--gold)]/60 text-[var(--gold)]",
  },
  exempt: { label: "DEV EXEMPT", className: "border-border-dim text-muted-strong" },
  missing: { label: "MISSING", className: "border-alert/60 text-alert" },
};

type AuditState =
  | { phase: "running" }
  | { phase: "done"; rows: AuditRow[] }
  | { phase: "error"; reason: string };

/**
 * The probe target.
 *
 * The security headers are applied to every path on this origin, so the audit
 * asks for the smallest thing it can: the 295-byte favicon rather than the
 * 160KB document. An earlier version issued a HEAD against "/" instead, which
 * the browser reported as an aborted request (a HEAD carries no body to read),
 * so the page that audits itself was itself generating a failed request.
 */
const PROBE_PATH = "/icon.svg";

/**
 * Collect this origin's real response headers.
 *
 * Same-origin responses expose every header to script, so the audit grades what
 * the server actually sent rather than what the config claims.
 */
async function fetchOwnHeaders(signal: AbortSignal): Promise<Record<string, string>> {
  const response = await fetch(`${window.location.origin}${PROBE_PATH}`, {
    cache: "no-store",
    signal,
  });
  const out: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

/**
 * HOW I SECURED THIS SITE.
 *
 * The controls are implemented in next.config.ts and app/api/contact/route.ts
 * first; this section then grades them by issuing a real request against the
 * running origin. Nothing here is a hardcoded green tick - drop a header from
 * the config and this panel reports MISSING on the next load.
 */
export function SecurityPosture() {
  // Starts in `running`: the audit is the section's whole point, so there is no
  // honest idle state to render. Nothing here calls setState synchronously -
  // every transition lands in a promise or observer callback - which keeps the
  // effect clear of the cascading-render pattern React lints against.
  const [state, setState] = useState<AuditState>({ phase: "running" });
  const sectionRef = useRef<HTMLElement>(null);

  const run = useCallback((controller: AbortController) => {
    fetchOwnHeaders(controller.signal)
      .then((headers) => {
        setState({
          phase: "done",
          rows: auditHeaders(HEADER_CONTROLS, headers, IS_DEV),
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          phase: "error",
          reason: error instanceof Error ? error.message : "request failed",
        });
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const element = sectionRef.current;
    // Deferred to first approach rather than fired on hydration: this section
    // sits near the foot of the page, and an extra request at mount would
    // compete with the hero for the main thread it does not need to.
    if (!element || typeof IntersectionObserver === "undefined") {
      run(controller);
      return () => controller.abort();
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        run(controller);
      },
      { rootMargin: "300px" },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      controller.abort();
    };
  }, [run]);

  const rerun = () => {
    playSound("click");
    setState({ phase: "running" });
    run(new AbortController());
  };

  const rows = state.phase === "done" ? state.rows : [];
  const totals = summarize(rows);

  return (
    <section
      ref={sectionRef}
      id="hardening"
      aria-label="How I secured this site"
      className="relative z-10"
    >
      <SectionHeading
        title="HOW I SECURED THIS SITE"
        subtitle="The portfolio of a security-minded engineer should survive being pointed at. Every control below is implemented in this repository, and the header controls are graded live against the response this page was served with."
      />

      <div className="grid items-start gap-8 lg:grid-cols-[1.5fr_1fr]">
        <Reveal className="min-w-0">
          <HudPanel brackets className="p-4 sm:p-6">
            <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border-dim pb-4">
              <div className="flex items-center gap-3">
                <ShieldCheck
                  aria-hidden
                  weight="duotone"
                  className="size-5 text-accent"
                />
                <h3 className="font-mono text-[11px] tracking-[0.25em] text-foreground">
                  LIVE HEADER AUDIT
                </h3>
              </div>
              <button
                type="button"
                onClick={rerun}
                disabled={state.phase === "running"}
                className="flex items-center gap-2 border border-border-dim px-3 py-1.5 font-mono text-[10px] tracking-[0.25em] text-muted-strong transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
              >
                <ArrowsClockwise aria-hidden weight="bold" className="size-3" />
                RE-RUN
              </button>
            </header>

            <p
              className="mb-5 font-mono text-[10px] leading-relaxed tracking-[0.15em] text-muted"
              aria-live="polite"
            >
              {state.phase === "running" && "REQUESTING OWN ORIGIN…"}
              {state.phase === "error" &&
                `AUDIT UNAVAILABLE // ${state.reason.toUpperCase()}`}
              {state.phase === "done" &&
                `${totals.enforced}/${totals.total} ENFORCED · ${totals.accepted} ACCEPTED RISK · ${totals.exempt} DEV EXEMPT · ${totals.missing} MISSING · PROFILE ${IS_DEV ? "DEVELOPMENT" : "PRODUCTION"}`}
            </p>

            <ul className="flex flex-col gap-px bg-border-dim">
              {rows.map(({ control, status, observed }) => {
                const style = STATUS_STYLE[status];
                return (
                  <li key={control.id} className="bg-background/60 p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                      <h4 className="font-mono text-[11px] tracking-[0.2em] text-foreground">
                        {control.label}
                      </h4>
                      <span
                        className={`border px-2 py-0.5 font-mono text-[9px] tracking-[0.25em] ${style.className}`}
                      >
                        {style.label}
                      </span>
                    </div>
                    <p className="mt-2 font-mono text-[10px] tracking-[0.1em] text-muted-strong">
                      {control.header} → {control.requirement}
                    </p>
                    <p className="t-body-sm mt-2 text-muted">{control.rationale}</p>
                    {control.tradeoff && (
                      <p className="mt-2 border-l-2 border-[var(--gold)]/50 pl-3 font-mono text-[10px] leading-relaxed tracking-[0.05em] text-muted">
                        TRADEOFF // {control.tradeoff}
                      </p>
                    )}
                    {status === "missing" && observed !== null && (
                      <p className="mt-2 font-mono text-[10px] tracking-[0.1em] text-alert">
                        OBSERVED // {observed}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </HudPanel>
        </Reveal>

        <Reveal delay={0.15} className="min-w-0">
          <HudPanel className="p-4 sm:p-6">
            <h3 className="mb-2 font-mono text-[11px] tracking-[0.25em] text-foreground">
              NOT VISIBLE FROM A HEADER
            </h3>
            <p className="t-body-sm mb-5 text-muted">
              These are claims about the code and the build, not live checks, so
              each one names the file to read instead of pretending to a green
              tick it cannot earn from the browser.
            </p>
            <ul className="flex flex-col gap-5">
              {PIPELINE_CONTROLS.map((control) => (
                <li key={control.id} className="border-l-2 border-accent/40 pl-4">
                  <h4 className="font-mono text-[11px] tracking-[0.2em] text-foreground">
                    {control.label}
                  </h4>
                  <p className="t-body-sm mt-2 text-muted">{control.detail}</p>
                  <p className="mt-2 font-mono text-[10px] tracking-[0.15em] text-muted-strong">
                    {control.evidence}
                  </p>
                </li>
              ))}
            </ul>
          </HudPanel>
        </Reveal>
      </div>
    </section>
  );
}
