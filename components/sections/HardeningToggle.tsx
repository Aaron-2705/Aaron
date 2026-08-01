"use client";

import { useMemo, useState } from "react";

import { Reveal } from "@/components/animations/Reveal";
import { HudPanel } from "@/components/ui/HudPanel";
import { HARDENING_CONTROLS, RISK_INDEX_TOTAL } from "@/data/infrastructure";
import { playSound } from "@/lib/sound";

type Posture = "weak" | "hardened";
type PostureMap = Record<string, Posture>;

const allOf = (posture: Posture): PostureMap =>
  Object.fromEntries(HARDENING_CONTROLS.map((c) => [c.id, posture]));

/**
 * The BLACKGATE domain, before and after hardening.
 *
 * Every control toggles independently, so the risk index is a genuine sum over
 * the weights printed beside each row rather than a two-state number dressed up
 * as a model. Flip one control and the arithmetic moves by exactly its weight,
 * which is what the caption claims.
 */
export function HardeningToggle() {
  const [postures, setPostures] = useState<PostureMap>(() => allOf("weak"));

  const riskIndex = useMemo(
    () =>
      HARDENING_CONTROLS.reduce(
        (sum, control) => (postures[control.id] === "weak" ? sum + control.weight : sum),
        0,
      ),
    [postures],
  );

  const pct = Math.round((riskIndex / RISK_INDEX_TOTAL) * 100);
  const allWeak = riskIndex === RISK_INDEX_TOTAL;
  const allHardened = riskIndex === 0;

  const setAll = (posture: Posture) => {
    setPostures(allOf(posture));
    playSound("click");
  };

  const toggle = (id: string) => {
    setPostures((prev) => ({ ...prev, [id]: prev[id] === "weak" ? "hardened" : "weak" }));
    playSound("click");
  };

  return (
    <Reveal className="mt-16">
      <HudPanel brackets className="p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-mono text-[10px] tracking-[0.3em] text-muted">
              OPERATION BLACKGATE // DOMAIN POSTURE
            </p>
            <h3 className="t-h3 mt-3 text-foreground">Attack surface, before and after</h3>
            <p className="t-body-sm mt-3 max-w-xl text-muted-strong">
              Six Active Directory controls, in the state Windows ships them and
              the state Group Policy leaves them. Flip them one at a time, or set
              the whole domain at once, and watch the index move.
            </p>
          </div>

          <div
            role="group"
            aria-label="Set every control at once"
            className="flex shrink-0 border border-border-dim"
          >
            <button
              type="button"
              onClick={() => setAll("weak")}
              aria-pressed={allWeak}
              className={`px-4 py-2 font-mono text-[10px] tracking-[0.25em] transition-colors ${
                allWeak ? "bg-alert/15 text-alert" : "text-muted hover:text-foreground"
              }`}
            >
              MISCONFIGURED
            </button>
            <button
              type="button"
              onClick={() => setAll("hardened")}
              aria-pressed={allHardened}
              className={`px-4 py-2 font-mono text-[10px] tracking-[0.25em] transition-colors ${
                allHardened ? "bg-success/15 text-success" : "text-muted hover:text-foreground"
              }`}
            >
              HARDENED
            </button>
          </div>
        </div>

        {/* Risk index */}
        <div className="mt-8 border-t border-border-dim pt-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <p className="font-mono text-[10px] tracking-[0.3em] text-muted">LAB RISK INDEX</p>
            <p
              data-testid="risk-index"
              className={`font-mono text-2xl ${
                allHardened ? "text-success" : riskIndex > RISK_INDEX_TOTAL / 2 ? "text-alert" : "text-[var(--gold)]"
              }`}
            >
              {riskIndex}
              <span className="text-sm text-muted"> / {RISK_INDEX_TOTAL}</span>
            </p>
          </div>
          <div
            className="mt-3 h-2 w-full border border-border-dim"
            role="img"
            aria-label={`Lab risk index ${riskIndex} out of ${RISK_INDEX_TOTAL}`}
          >
            <div
              className={`h-full transition-[width] duration-500 ${
                allHardened
                  ? "bg-success"
                  : riskIndex > RISK_INDEX_TOTAL / 2
                    ? "bg-alert"
                    : "bg-[var(--gold)]"
              }`}
              // Width tracks risk monotonically. Filling the bar at zero risk
              // would contradict both the number beside it and the aria-label,
              // and would hand sighted and screen-reader users opposite
              // readings at exactly the moment the domain is fully hardened.
              style={{ width: `${Math.max(pct, 2)}%` }}
            />
          </div>
          <p className="mt-3 font-mono text-[10px] leading-relaxed text-muted">
            The sum of the weights below for every control still in its weak
            state. An illustrative lab score for this diagram, not an industry
            rating.
          </p>
        </div>

        {/* Diff table */}
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-left">
            <caption className="sr-only">
              Active Directory controls. Each row toggles between its weak and hardened state.
            </caption>
            <thead>
              <tr className="border-b border-border-dim">
                <th scope="col" className="py-3 pr-4 font-mono text-[10px] tracking-[0.25em] text-muted">
                  CONTROL
                </th>
                <th scope="col" className="py-3 pr-4 font-mono text-[10px] tracking-[0.25em] text-muted">
                  STATE
                </th>
                <th scope="col" className="py-3 text-right font-mono text-[10px] tracking-[0.25em] text-muted">
                  WEIGHT
                </th>
              </tr>
            </thead>
            <tbody>
              {HARDENING_CONTROLS.map((control) => {
                const weak = postures[control.id] === "weak";
                return (
                  <tr key={control.id} className="border-b border-border-dim/60 align-top">
                    <th
                      scope="row"
                      className="py-4 pr-4 font-mono text-xs font-normal text-foreground"
                    >
                      {control.control}
                    </th>
                    <td className="py-4 pr-4">
                      <button
                        type="button"
                        onClick={() => toggle(control.id)}
                        aria-pressed={!weak}
                        aria-label={`${control.control}: currently ${
                          weak ? control.weak : control.hardened
                        }. Activate to switch.`}
                        data-testid={`toggle-${control.id}`}
                        className="group w-full text-left"
                      >
                        <span
                          className={`block font-mono text-xs underline-offset-4 group-hover:underline ${
                            weak ? "text-alert" : "text-success"
                          }`}
                          data-testid={`control-${control.id}`}
                        >
                          {weak ? control.weak : control.hardened}
                        </span>
                        <span className="mt-1 block font-mono text-[10px] text-muted line-through decoration-muted/50">
                          {weak ? control.hardened : control.weak}
                        </span>
                      </button>
                      <p className="mt-2 max-w-md font-mono text-[10px] leading-relaxed text-muted">
                        {control.note}
                      </p>
                    </td>
                    <td
                      className={`py-4 text-right font-mono text-xs ${weak ? "text-alert" : "text-muted"}`}
                    >
                      {weak ? `+${control.weight}` : "0"}
                      <span className="block text-[10px] text-muted">of {control.weight}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </HudPanel>
    </Reveal>
  );
}
