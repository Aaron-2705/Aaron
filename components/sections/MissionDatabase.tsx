"use client";

import { Graph, GlobeHemisphereWest, HardDrives, ShieldStar } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

import { Reveal } from "@/components/animations/Reveal";
import { FieldReports } from "@/components/sections/FieldReports";
import { HudPanel } from "@/components/ui/HudPanel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { MISSIONS } from "@/data/projects";
import type { MissionRecord } from "@/types/portfolio";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "SYSTEM ADMINISTRATION": <HardDrives size={18} weight="duotone" />,
  "CYBERSECURITY OPERATIONS": <ShieldStar size={18} weight="duotone" />,
  "NETWORK ENGINEERING": <Graph size={18} weight="duotone" />,
  "WEB SECURITY": <GlobeHemisphereWest size={18} weight="duotone" />,
};

function MissionFile({ mission, index }: { mission: MissionRecord; index: number }) {
  const [openState, setOpen] = useState(false);
  const [decrypting, setDecrypting] = useState(false);

  const toggle = () => {
    if (openState) {
      setOpen(false);
      return;
    }
    setDecrypting(true);
    window.setTimeout(() => {
      setDecrypting(false);
      setOpen(true);
    }, 550);
  };

  return (
    <Reveal delay={index * 0.08}>
      <HudPanel
        brackets
        className="p-6 transition-all duration-300 hover:-translate-y-1 hover:border-accent/60 hover:shadow-[0_8px_40px_-12px_var(--accent-dim)]"
      >
        <button
          onClick={toggle}
          aria-expanded={openState}
          className="w-full text-left"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.3em] text-accent">
              {CATEGORY_ICONS[mission.category]}
              {mission.codeName}
            </p>
            <p className="font-mono text-[10px] tracking-widest">
              <span className="mr-3 text-muted">{mission.category}</span>
              <span
                className={
                  mission.status === "COMPLETED" ? "text-success" : "text-accent"
                }
              >
                ● {mission.status}
              </span>
            </p>
          </div>
          <h3 className="t-h3 mt-3 text-foreground">
            {mission.title}
          </h3>
          <p className="mt-2 font-mono text-xs leading-relaxed text-muted">{mission.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {mission.technologies.map((tech) => (
              <span
                key={tech}
                className="border border-border-dim px-2 py-1 font-mono text-[10px] tracking-wider text-foreground/70"
              >
                {tech}
              </span>
            ))}
          </div>
          <p className="mt-4 font-mono text-[10px] tracking-[0.25em] text-accent">
            {decrypting ? (
              <span className="animate-pulse">▸ DECRYPTING FILE...</span>
            ) : openState ? (
              "▾ CLOSE FILE"
            ) : (
              "▸ ACCESS FILE"
            )}
          </p>
        </button>

        <AnimatePresence initial={false}>
          {openState && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="overflow-hidden"
            >
              <dl className="mt-4 space-y-4 border-t border-border-dim pt-4 font-mono text-xs leading-relaxed">
                <div>
                  <dt className="tracking-[0.25em] text-accent">CHALLENGES</dt>
                  <dd className="mt-1 text-foreground/80">{mission.challenges}</dd>
                </div>
                <div>
                  <dt className="tracking-[0.25em] text-accent">IMPLEMENTATION</dt>
                  <dd className="mt-1 text-foreground/80">{mission.implementation}</dd>
                </div>
                <div>
                  <dt className="tracking-[0.25em] text-accent">RESULTS</dt>
                  <dd className="mt-1 text-foreground/80">{mission.results}</dd>
                </div>
              </dl>
              {mission.repository ? (
                <a
                  href={mission.repository}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-draw mt-4 inline-block font-mono text-[10px] tracking-[0.25em] text-muted hover:text-accent"
                >
                  ▸ VIEW REPOSITORY
                </a>
              ) : (
                <p className="mt-4 font-mono text-[10px] tracking-[0.25em] text-muted">
                  {`▸ PERSONAL LAB${mission.year ? ` // ${mission.year}` : ""} // NO PUBLIC REPO`}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </HudPanel>
    </Reveal>
  );
}

/** Projects as classified mission files. Data-driven from data/projects.ts. */
export function MissionDatabase() {
  return (
    <section id="missions" aria-label="Project mission database" className="relative z-10">
      <SectionHeading
        title="MISSION ARCHIVE"
        subtitle="Personal home labs, on record. Access a file to review the challenges, implementation and results."
      />
      <div className="grid gap-6 md:grid-cols-2">
        {MISSIONS.map((mission, i) => (
          <MissionFile key={mission.id} mission={mission} index={i} />
        ))}
      </div>
      <FieldReports />
    </section>
  );
}
