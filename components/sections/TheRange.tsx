"use client";

import { useState } from "react";

import { Reveal } from "@/components/animations/Reveal";
import { HudPanel } from "@/components/ui/HudPanel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { THREAT_HOTSPOTS } from "@/data/infrastructure";
import { playSound } from "@/lib/sound";

import { HardeningToggle } from "./HardeningToggle";
import { NodeInspector } from "./NodeInspector";
import { TopologyMap, type RangeLayer, type TopologySelection } from "./TopologyMap";

const LAYERS: Array<{ id: RangeLayer; label: string }> = [
  { id: "topology", label: "TOPOLOGY" },
  { id: "threat", label: "THREAT MODEL" },
];

/**
 * THE RANGE — the home lab as an explorable diagram.
 *
 * Two layers over one map: the estate itself, and an OWASP Top 10 overlay
 * pinned to the parts of it each risk applies to. Below the map, the same
 * lab's domain shown misconfigured against hardened.
 */
export function TheRange() {
  const [layer, setLayer] = useState<RangeLayer>("topology");
  const [selection, setSelection] = useState<TopologySelection>({
    kind: "node",
    id: "dc01",
  });

  const switchLayer = (next: RangeLayer) => {
    setLayer(next);
    playSound("click");
    // Each layer selects different things, so hand the inspector something
    // valid for the layer being entered rather than leaving a stale panel.
    setSelection(
      next === "threat"
        ? { kind: "hotspot", id: THREAT_HOTSPOTS[0].id }
        : { kind: "node", id: "dc01" },
    );
  };

  return (
    <section id="range" aria-label="The Range, home lab topology" className="relative z-10">
      <SectionHeading
        code="THE RANGE // HOME LAB"
        title="NETWORK TOPOLOGY"
        subtitle="The lab estate end to end. Select any device to read its role and configuration, or switch to the threat model to see where the OWASP Top 10 actually bites."
      />

      {/* Layer switch + legend */}
      <Reveal className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div
          role="group"
          aria-label="Diagram layer"
          className="flex border border-border-dim"
        >
          {LAYERS.map((option) => {
            const active = layer === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => switchLayer(option.id)}
                aria-pressed={active}
                className={`px-4 py-2 font-mono text-[10px] tracking-[0.25em] transition-colors ${
                  active ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] tracking-[0.2em] text-muted">
          <li className="flex items-center gap-2">
            <span aria-hidden className="inline-block h-0 w-6 border-t-2 border-accent" />
            BUILT
          </li>
          <li className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-0 w-6 border-t-2 border-dashed border-muted"
            />
            PLANNED, NOT YET BUILT
          </li>
          <li className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-0 w-6 border-t-2 border-dotted border-muted"
            />
            SEPARATE LABS, NOT WIRED TOGETHER
          </li>
        </ul>
      </Reveal>

      <Reveal className="mb-6">
        <p className="t-body-sm max-w-3xl text-muted">
          Two real labs, drawn as one intended estate. The routed and switched
          fabric was modeled in Cisco Packet Tracer; the domain runs on Windows
          Server 2022 in VirtualBox. Both were built, but they are separate
          environments, so the dotted edges between them show intent rather than
          a cable that exists. Everything dashed is still on the build list.
        </p>
      </Reveal>

      <div className="grid items-start gap-8 lg:grid-cols-[1.6fr_1fr]">
        {/* min-w-0: a grid item defaults to min-width:auto, which would size
            the column to the map's 600px min-content and push the whole page
            into horizontal scroll instead of letting the map pan internally. */}
        <Reveal className="min-w-0">
          <HudPanel brackets className="p-2 sm:p-4">
            {/* Below ~640px the map would scale down to unreadable 4px labels.
                It pans inside this container instead, which keeps the page
                itself free of horizontal scroll. */}
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                <TopologyMap layer={layer} selection={selection} onSelect={setSelection} />
              </div>
            </div>
          </HudPanel>
          <p className="mt-2 font-mono text-[10px] tracking-[0.2em] text-muted sm:hidden">
            Drag the map sideways to pan.
          </p>
        </Reveal>

        <Reveal delay={0.15} className="min-w-0">
          <NodeInspector selection={selection} />
        </Reveal>
      </div>

      <HardeningToggle />
    </section>
  );
}
