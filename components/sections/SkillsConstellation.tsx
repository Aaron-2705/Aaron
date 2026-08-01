"use client";

import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import { useEffect, useMemo, useRef, useState } from "react";

import { Reveal } from "@/components/animations/Reveal";
import { HudPanel } from "@/components/ui/HudPanel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SKILL_NODES } from "@/data/skills";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const W = 860;
const H = 620;

interface GraphNode extends SimulationNodeDatum {
  id: string;
  label: string;
  kind: "core" | "category" | "skill";
  category?: string;
  tier?: "operational" | "learning";
}

type GraphLink = SimulationLinkDatum<GraphNode> & { kind: "spine" | "branch" };

function buildGraph(): { nodes: GraphNode[]; links: GraphLink[] } {
  const nodes: GraphNode[] = [{ id: "core", label: "AARON", kind: "core", fx: W / 2, fy: H / 2 }];
  const links: GraphLink[] = [];
  SKILL_NODES.forEach((category, i) => {
    const angle = (i / SKILL_NODES.length) * Math.PI * 2;
    nodes.push({
      id: category.id,
      label: category.label,
      kind: "category",
      tier: category.tier ?? "operational",
      x: W / 2 + Math.cos(angle) * 180,
      y: H / 2 + Math.sin(angle) * 180,
    });
    links.push({ source: "core", target: category.id, kind: "spine" });
    category.skills.forEach((skill) => {
      const id = `${category.id}:${skill}`;
      nodes.push({
        id,
        label: skill,
        kind: "skill",
        category: category.id,
        tier: category.tier ?? "operational",
        x: W / 2 + Math.cos(angle) * 260 + (Math.random() - 0.5) * 60,
        y: H / 2 + Math.sin(angle) * 260 + (Math.random() - 0.5) * 60,
      });
      links.push({ source: category.id, target: id, kind: "branch" });
    });
  });
  return { nodes, links };
}

/**
 * Interactive skills constellation.
 * Real d3-force physics: nodes float, react, and can be dragged.
 * DOM updated imperatively on simulation ticks — zero React re-renders.
 */
export function SkillsConstellation() {
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<Simulation<GraphNode, GraphLink> | null>(null);
  const [active, setActive] = useState<string>(SKILL_NODES[0].id);
  const reducedMotion = usePrefersReducedMotion();

  const graph = useMemo(() => buildGraph(), []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const nodeEls = new Map<string, SVGGElement>();
    const linkEls: Array<{ el: SVGLineElement; link: GraphLink }> = [];
    svg.querySelectorAll<SVGGElement>("[data-node]").forEach((el) => {
      nodeEls.set(el.dataset.node as string, el);
    });
    svg.querySelectorAll<SVGLineElement>("[data-link]").forEach((el, i) => {
      linkEls.push({ el, link: graph.links[i] });
    });

    const render = () => {
      for (const node of graph.nodes) {
        const el = nodeEls.get(node.id);
        if (el) el.setAttribute("transform", `translate(${node.x ?? 0}, ${node.y ?? 0})`);
      }
      for (const { el, link } of linkEls) {
        const s = link.source as GraphNode;
        const t = link.target as GraphNode;
        el.setAttribute("x1", String(s.x ?? 0));
        el.setAttribute("y1", String(s.y ?? 0));
        el.setAttribute("x2", String(t.x ?? 0));
        el.setAttribute("y2", String(t.y ?? 0));
      }
    };

    const simulation = forceSimulation<GraphNode>(graph.nodes)
      .force(
        "link",
        forceLink<GraphNode, GraphLink>(graph.links)
          .id((d) => d.id)
          .distance((l) => (l.kind === "spine" ? 170 : 58))
          .strength((l) => (l.kind === "spine" ? 0.9 : 0.5)),
      )
      .force("charge", forceManyBody().strength(-120))
      .force("center", forceCenter(W / 2, H / 2))
      .force("collide", forceCollide<GraphNode>((d) => (d.kind === "skill" ? 26 : 44)))
      .on("tick", render);
    simRef.current = simulation;

    if (reducedMotion) {
      simulation.tick(200);
      simulation.stop();
      render();
    }

    // Gentle perpetual drift — but only while the section is on screen.
    let visible = false;
    const visObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) simulation.stop();
      else simulation.restart();
    });
    visObserver.observe(svg);
    const drift = reducedMotion
      ? 0
      : window.setInterval(() => {
          if (visible && simulation.alpha() < 0.06) simulation.alpha(0.06).restart();
        }, 2400);

    // Dragging with a click threshold — pointer capture must not start until
    // real movement, otherwise it swallows the category click events.
    let pressed: GraphNode | null = null;
    let dragging = false;
    let downX = 0;
    let downY = 0;
    const toSvgPoint = (e: PointerEvent) => {
      const rect = svg.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * W,
        y: ((e.clientY - rect.top) / rect.height) * H,
      };
    };
    const onDown = (e: PointerEvent) => {
      const target = (e.target as Element).closest<SVGGElement>("[data-node]");
      if (!target || target.dataset.node === "core") return;
      pressed = graph.nodes.find((n) => n.id === target.dataset.node) ?? null;
      dragging = false;
      downX = e.clientX;
      downY = e.clientY;
    };
    const onMove = (e: PointerEvent) => {
      if (!pressed) return;
      if (!dragging) {
        if (Math.hypot(e.clientX - downX, e.clientY - downY) < 6) return;
        dragging = true;
        simulation.alphaTarget(0.25).restart();
        svg.setPointerCapture(e.pointerId);
      }
      const p = toSvgPoint(e);
      pressed.fx = p.x;
      pressed.fy = p.y;
    };
    const onUp = () => {
      if (pressed && dragging) {
        pressed.fx = null;
        pressed.fy = null;
        simulation.alphaTarget(0);
      }
      pressed = null;
      dragging = false;
    };
    svg.addEventListener("pointerdown", onDown);
    svg.addEventListener("pointermove", onMove);
    svg.addEventListener("pointerup", onUp);
    svg.addEventListener("pointercancel", onUp);

    return () => {
      window.clearInterval(drift);
      visObserver.disconnect();
      simulation.stop();
      svg.removeEventListener("pointerdown", onDown);
      svg.removeEventListener("pointermove", onMove);
      svg.removeEventListener("pointerup", onUp);
      svg.removeEventListener("pointercancel", onUp);
    };
  }, [graph, reducedMotion]);

  const activeNode = SKILL_NODES.find((n) => n.id === active) ?? SKILL_NODES[0];

  return (
    <section
      id="skills"
      aria-label="Skills network"
      className="relative z-10"
    >
      <SectionHeading
        code="ARSENAL // OPERATIONAL"
        title="SKILLS CONSTELLATION"
        subtitle="A live map of capabilities. Drag the nodes; the network reacts. Select a domain to inspect it."
      />

      <div className="grid items-start gap-8 lg:grid-cols-[1.5fr_1fr]">
        <Reveal>
          <HudPanel brackets className="overflow-hidden">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              role="group"
              aria-label="Interactive skill constellation, drag nodes to explore"
              className="w-full cursor-grab touch-none select-none active:cursor-grabbing"
            >
              {/* Links (order matters: must match graph.links) */}
              {graph.links.map((link, i) => {
                const sourceId =
                  typeof link.source === "object"
                    ? (link.source as GraphNode).id
                    : String(link.source);
                const isActive =
                  sourceId === active || sourceId === "core";
                return (
                  <line
                    key={i}
                    data-link=""
                    stroke={
                      link.kind === "spine"
                        ? "var(--accent)"
                        : isActive
                          ? "var(--accent)"
                          : "var(--border)"
                    }
                    strokeOpacity={link.kind === "spine" ? 0.5 : isActive ? 0.55 : 0.35}
                    strokeWidth={link.kind === "spine" ? 1.5 : 1}
                    strokeDasharray={link.kind === "spine" ? "6 6" : undefined}
                    className={link.kind === "spine" ? "link-flow" : undefined}
                  />
                );
              })}

              {/* Nodes */}
              {graph.nodes.map((node) => (
                <g
                  key={node.id}
                  data-node={node.id}
                  // A bare <g> has no implicit role, so aria-label on it is a
                  // prohibited attribute (axe: aria-prohibited-attr). Category
                  // nodes are real buttons; the rest are labelled graphics.
                  role={node.kind === "category" ? "button" : "img"}
                  tabIndex={node.kind === "category" ? 0 : undefined}
                  aria-pressed={node.kind === "category" ? node.id === active : undefined}
                  aria-label={node.label}
                  onClick={() => node.kind === "category" && setActive(node.id)}
                  onKeyDown={(e) => {
                    if (node.kind === "category" && (e.key === "Enter" || e.key === " "))
                      setActive(node.id);
                  }}
                  className={node.kind === "category" ? "cursor-pointer outline-none" : undefined}
                >
                  {node.kind === "core" && (
                    <>
                      <circle r={40} fill="var(--surface)" stroke="var(--accent)" strokeWidth={1.5} />
                      <circle r={48} fill="none" stroke="var(--accent)" strokeOpacity={0.25} className="core-ring" />
                      <text
                        textAnchor="middle"
                        dy={5}
                        fill="var(--accent)"
                        fontSize={14}
                        letterSpacing={3}
                        className="font-mono font-bold"
                      >
                        AARON
                      </text>
                    </>
                  )}
                  {node.kind === "category" && (
                    <>
                      {/* Learning-tier domains wear a dashed ring so an
                          exploratory capability never reads as a proven one. */}
                      {node.tier === "learning" && (
                        <circle
                          r={node.id === active ? 22 : 18}
                          fill="none"
                          stroke="var(--muted)"
                          strokeWidth={1}
                          strokeDasharray="3 4"
                          strokeOpacity={0.7}
                        />
                      )}
                      <circle
                        r={node.id === active ? 16 : 12}
                        fill={node.id === active ? "var(--accent)" : "var(--surface-elevated)"}
                        stroke="var(--accent)"
                        strokeWidth={1.5}
                        style={{ transition: "r 0.2s" }}
                      />
                      <text
                        textAnchor="middle"
                        dy={-22}
                        fill={node.id === active ? "var(--accent)" : "var(--muted)"}
                        fontSize={12}
                        letterSpacing={2}
                        className="pointer-events-none font-mono uppercase"
                      >
                        {node.label}
                      </text>
                      {node.tier === "learning" && (
                        <text
                          textAnchor="middle"
                          dy={30}
                          fill="var(--muted)"
                          fontSize={8}
                          letterSpacing={3}
                          className="pointer-events-none font-mono uppercase"
                        >
                          LAB / LEARNING
                        </text>
                      )}
                    </>
                  )}
                  {node.kind === "skill" && (
                    <>
                      <circle
                        r={node.category === active ? 5 : 3}
                        fill={node.category === active ? "var(--accent)" : "var(--border)"}
                        style={{ transition: "r 0.3s, fill 0.3s" }}
                      />
                      {/* Only the active domain shows labels — keeps the
                          constellation legible instead of a wall of text. */}
                      {node.category === active && (
                        <text
                          textAnchor="middle"
                          dy={-11}
                          fill="var(--foreground)"
                          fontSize={10}
                          opacity={0.95}
                          className="pointer-events-none font-mono"
                        >
                          {node.label}
                        </text>
                      )}
                    </>
                  )}
                </g>
              ))}
            </svg>
          </HudPanel>
        </Reveal>

        <Reveal delay={0.15}>
          <HudPanel brackets className="p-6">
            <p className="flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-[0.3em] text-accent">
              {`NODE // ${activeNode.label}`}
              {activeNode.tier === "learning" && (
                <span className="border border-muted/50 px-1.5 py-0.5 tracking-[0.2em] text-muted">
                  LAB / LEARNING
                </span>
              )}
            </p>
            {activeNode.tier === "learning" && (
              <p className="mt-3 font-mono text-[10px] leading-relaxed text-muted">
                Actively studied in the lab. Listed for honesty, not claimed as
                proven proficiency.
              </p>
            )}
            <ul className="mt-4 space-y-2">
              {activeNode.skills.map((skill) => (
                <li
                  key={`${activeNode.id}-${skill}`}
                  className="border-l-2 border-accent/40 pl-3 font-mono text-xs text-foreground/85"
                >
                  {skill}
                </li>
              ))}
            </ul>
            <p className="mt-6 border-t border-border-dim pt-4 font-mono text-[10px] leading-relaxed text-muted">
              {activeNode.tier === "learning"
                ? `STATUS: IN TRAINING // ${activeNode.skills.length} IN STUDY`
                : `STATUS: OPERATIONAL // ${activeNode.skills.length} CAPABILITIES INDEXED`}
            </p>
          </HudPanel>
        </Reveal>
      </div>
    </section>
  );
}
