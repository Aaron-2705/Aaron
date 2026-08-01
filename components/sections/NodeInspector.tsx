"use client";

import {
  THREAT_HOTSPOTS,
  TOPOLOGY_NODES,
  type ProjectRef,
} from "@/data/infrastructure";
import { MISSIONS } from "@/data/projects";
import { HudPanel } from "@/components/ui/HudPanel";

import type { TopologySelection } from "./TopologyMap";

function projectName(ref: ProjectRef): string | null {
  if (!ref) return null;
  return MISSIONS.find((m) => m.id === ref)?.codeName ?? null;
}

/**
 * Detail panel for the Range diagram. Renders whichever of the two selectable
 * things is active: a device, or an OWASP hotspot pinned to one.
 */
export function NodeInspector({ selection }: { selection: TopologySelection }) {
  if (selection.kind === "hotspot") {
    const hotspot = THREAT_HOTSPOTS.find((h) => h.id === selection.id);
    if (!hotspot) return null;
    const node = TOPOLOGY_NODES.find((n) => n.id === hotspot.nodeId);

    return (
      <HudPanel brackets className="p-6">
        <p className="flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-[0.3em] text-alert">
          <span className="border border-alert/60 px-1.5 py-0.5">OWASP {hotspot.owasp}</span>
          {node && <span className="text-muted">ON {node.label}</span>}
        </p>
        <h3 className="t-h3 mt-4 text-foreground">{hotspot.title}</h3>

        <p className="mt-5 font-mono text-[10px] tracking-[0.3em] text-alert">RISK</p>
        <p className="t-body-sm mt-2 text-muted-strong">{hotspot.risk}</p>

        <p className="mt-5 font-mono text-[10px] tracking-[0.3em] text-success">MITIGATION</p>
        <p className="t-body-sm mt-2 text-muted-strong">{hotspot.mitigation}</p>

        <p className="mt-6 border-t border-border-dim pt-4 font-mono text-[10px] leading-relaxed text-muted">
          Risks in this lab design. Not findings against a live system.
        </p>
      </HudPanel>
    );
  }

  const node = TOPOLOGY_NODES.find((n) => n.id === selection.id);
  if (!node) return null;
  const planned = node.state === "planned";
  const owner = projectName(node.project);

  return (
    <HudPanel brackets className="p-6">
      <p className="flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-[0.3em] text-accent">
        {`NODE // ${node.label}`}
        {node.vlan && <span className="text-muted">VLAN {node.vlan}</span>}
      </p>

      <p
        className={`mt-3 inline-block border px-2 py-1 font-mono text-[10px] tracking-[0.2em] ${
          planned
            ? "border-muted/50 text-muted"
            : "border-success/50 text-success"
        }`}
      >
        {planned ? "PLANNED // NOT YET BUILT" : "BUILT // OPERATIONAL"}
      </p>

      <p className="t-body-sm mt-4 text-muted-strong">{node.role}</p>

      <p className="mt-6 font-mono text-[10px] tracking-[0.3em] text-muted">CONFIG</p>
      <ul className="mt-3 space-y-2">
        {node.config.map((item) => (
          <li
            key={item}
            className="border-l-2 border-accent/40 pl-3 font-mono text-xs leading-relaxed text-foreground/85"
          >
            {item}
          </li>
        ))}
      </ul>

      <p className="mt-6 border-t border-border-dim pt-4 font-mono text-[10px] leading-relaxed text-muted">
        {owner
          ? `OPERATION: ${owner}`
          : "OPERATION: unassigned. On the build list, not in a lab yet."}
      </p>
    </HudPanel>
  );
}
