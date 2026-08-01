"use client";

import {
  MAP_H,
  MAP_W,
  THREAT_HOTSPOTS,
  TOPOLOGY_LINKS,
  TOPOLOGY_NODES,
  type TopologyNode,
} from "@/data/infrastructure";

export type RangeLayer = "topology" | "threat";

export interface TopologySelection {
  kind: "node" | "hotspot";
  id: string;
}

interface TopologyMapProps {
  layer: RangeLayer;
  selection: TopologySelection;
  onSelect: (selection: TopologySelection) => void;
}

const NODE_BY_ID = new Map(TOPOLOGY_NODES.map((n) => [n.id, n]));

/** Half-extent of each node's chrome, used to trim link endpoints. */
const RADIUS: Record<TopologyNode["kind"], { rx: number; ry: number }> = {
  cloud: { rx: 46, ry: 26 },
  gateway: { rx: 52, ry: 24 },
  // Wide enough for "VLAN 20 DMZ" at 12px mono plus its letter-spacing.
  switch: { rx: 66, ry: 22 },
  host: { rx: 56, ry: 24 },
  client: { rx: 56, ry: 24 },
};

/**
 * Trim a link so it stops at the edge of each node's box rather than at its
 * centre, which keeps the line from disappearing under the label.
 */
function trim(from: TopologyNode, to: TopologyNode) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const a = RADIUS[from.kind];
  const b = RADIUS[to.kind];
  // Scale by the box half-extent along the link direction.
  const inset = (r: { rx: number; ry: number }) =>
    Math.min(r.rx / (Math.abs(ux) || 1e-6), r.ry / (Math.abs(uy) || 1e-6));
  const fromInset = Math.min(inset(a), len / 2 - 2);
  const toInset = Math.min(inset(b), len / 2 - 2);
  return {
    x1: from.x + ux * fromInset,
    y1: from.y + uy * fromInset,
    x2: to.x - ux * toInset,
    y2: to.y - uy * toInset,
  };
}

function NodeChrome({ node, selected }: { node: TopologyNode; selected: boolean }) {
  const planned = node.state === "planned";
  const stroke = planned ? "var(--muted)" : "var(--accent)";
  const { rx, ry } = RADIUS[node.kind];

  const shared = {
    fill: selected ? "var(--accent-dim)" : "var(--surface-elevated)",
    stroke,
    strokeWidth: selected ? 2 : 1.25,
    strokeDasharray: planned ? "4 4" : undefined,
  };

  return (
    <>
      {node.kind === "cloud" ? (
        <ellipse rx={rx} ry={ry} {...shared} />
      ) : (
        <rect
          x={-rx}
          y={-ry}
          width={rx * 2}
          height={ry * 2}
          rx={node.kind === "gateway" ? 12 : 3}
          {...shared}
        />
      )}
      <text
        textAnchor="middle"
        dy={4}
        fontSize={12}
        letterSpacing={0.8}
        fill={planned ? "var(--muted-strong)" : "var(--foreground)"}
        className="pointer-events-none font-mono"
      >
        {node.label}
      </text>
      {planned && (
        <text
          textAnchor="middle"
          dy={ry + 15}
          fontSize={8}
          letterSpacing={2.5}
          fill="var(--muted)"
          className="pointer-events-none font-mono"
        >
          PLANNED
        </text>
      )}
      {selected && (
        <rect
          x={-rx - 6}
          y={-ry - 6}
          width={(rx + 6) * 2}
          height={(ry + 6) * 2}
          fill="none"
          stroke="var(--accent)"
          strokeOpacity={0.45}
          strokeWidth={1}
        />
      )}
      {/* Keyboard focus ring. See .topo-focus-ring in globals.css. */}
      <rect
        className="topo-focus-ring"
        x={-rx - 5}
        y={-ry - 5}
        width={(rx + 5) * 2}
        height={(ry + 5) * 2}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2}
      />
    </>
  );
}

/**
 * The Range diagram. SVG rather than canvas so every node is a real focusable
 * element with real text: keyboard operable, screen-reader legible and crisp at
 * any width.
 */
export function TopologyMap({ layer, selection, onSelect }: TopologyMapProps) {
  return (
    <svg
      viewBox={`0 0 ${MAP_W} ${MAP_H}`}
      role="group"
      aria-label={
        layer === "topology"
          ? "Home lab network topology. Select a device to inspect it."
          : "Home lab network topology with OWASP Top 10 threat annotations. Select a marker to read the risk and its mitigation."
      }
      className="w-full touch-manipulation select-none"
    >
      {/* Links */}
      {TOPOLOGY_LINKS.map((link) => {
        const from = NODE_BY_ID.get(link.from);
        const to = NODE_BY_ID.get(link.to);
        if (!from || !to) return null;
        const { x1, y1, x2, y2 } = trim(from, to);
        const built = link.state === "built";
        const conceptual = link.state === "conceptual";
        return (
          <g key={`${link.from}-${link.to}`}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              // --border is too close to the surface to read as a line at all;
              // planned edges use the muted ink so the estate is legible.
              // Conceptual edges join the two labs, which live in separate
              // simulators: dotted, and never animated, so they cannot be
              // mistaken for traffic that actually flows.
              stroke={built ? "var(--accent)" : "var(--muted)"}
              strokeOpacity={built ? 0.8 : conceptual ? 0.7 : 0.55}
              strokeWidth={built ? 1.75 : 1.25}
              strokeDasharray={built ? "8 8" : conceptual ? "1 5" : "5 5"}
              strokeLinecap={conceptual ? "round" : undefined}
              className={built ? "packet-flow" : undefined}
            />
            {link.label && (
              <text
                x={(x1 + x2) / 2}
                y={(y1 + y2) / 2 - 6}
                textAnchor="middle"
                fontSize={8}
                letterSpacing={2}
                fill="var(--muted)"
                className="pointer-events-none font-mono"
              >
                {link.label}
              </text>
            )}
          </g>
        );
      })}

      {/* Nodes */}
      {TOPOLOGY_NODES.map((node) => {
        // Nodes stay selectable in both layers, so the ring must not be gated
        // on the layer: `selection.kind` already makes the two exclusive.
        const selected = selection.kind === "node" && selection.id === node.id;
        return (
          <g
            key={node.id}
            data-node={node.id}
            transform={`translate(${node.x}, ${node.y})`}
            role="button"
            tabIndex={0}
            // aria-current, not aria-pressed: selection is exclusive across the
            // map, so aria-pressed would announce nine "not pressed" buttons.
            aria-current={selected ? "true" : undefined}
            aria-label={`${node.label}. ${node.state === "planned" ? "Planned, not yet built." : "Built."} ${node.role}`}
            onClick={() => onSelect({ kind: "node", id: node.id })}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect({ kind: "node", id: node.id });
              }
            }}
            className="topo-node cursor-pointer"
          >
            <NodeChrome node={node} selected={selected} />
          </g>
        );
      })}

      {/* OWASP threat-model overlay */}
      {layer === "threat" &&
        THREAT_HOTSPOTS.map((hotspot) => {
          const node = NODE_BY_ID.get(hotspot.nodeId);
          if (!node) return null;
          const selected = selection.kind === "hotspot" && selection.id === hotspot.id;
          const cx = node.x + RADIUS[node.kind].rx + 4;
          const cy = node.y - RADIUS[node.kind].ry - 2;
          return (
            <g
              key={hotspot.id}
              data-hotspot={hotspot.id}
              transform={`translate(${cx}, ${cy})`}
              role="button"
              tabIndex={0}
              aria-current={selected ? "true" : undefined}
              aria-label={`OWASP ${hotspot.owasp}, ${hotspot.title}, on ${node.label}`}
              onClick={() => onSelect({ kind: "hotspot", id: hotspot.id })}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect({ kind: "hotspot", id: hotspot.id });
                }
              }}
              className="topo-node cursor-pointer"
            >
              <circle
                r={selected ? 16 : 13}
                fill={selected ? "var(--alert)" : "var(--surface)"}
                stroke="var(--alert)"
                strokeWidth={1.5}
                style={{ transition: "r 0.2s" }}
              />
              <circle
                className="topo-focus-ring"
                r={20}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={2}
              />
              <text
                textAnchor="middle"
                dy={4}
                fontSize={10}
                fontWeight={700}
                letterSpacing={0.5}
                fill={selected ? "var(--background)" : "var(--alert)"}
                className="pointer-events-none font-mono"
              >
                {hotspot.owasp}
              </text>
            </g>
          );
        })}
    </svg>
  );
}
