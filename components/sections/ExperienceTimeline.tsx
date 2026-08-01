import { Reveal } from "@/components/animations/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TIMELINE } from "@/data/timeline";

const KIND_LABEL: Record<string, string> = {
  education: "EDUCATION",
  experience: "FIELD OPERATION",
  certification: "CERTIFICATION",
  project: "PROJECT",
};

/** Cinematic service-record timeline. */
export function ExperienceTimeline() {
  return (
    <section
      id="experience"
      aria-label="Experience timeline"
      className="relative z-10"
    >
      <SectionHeading title="SERVICE RECORD" />

      <ol className="relative pl-8">
        {/* Spine — a gradient that fades out at the end reads as a timeline,
            not just a border. */}
        <span
          aria-hidden="true"
          className="absolute left-0 top-2 bottom-2 w-px bg-gradient-to-b from-accent/50 via-accent/20 to-transparent"
        />
        {TIMELINE.map((entry, i) => (
          // <li> stays a direct child of <ol> for valid list semantics (a11y);
          // the entrance animation lives INSIDE via <Reveal>, not wrapping the <li>.
          <li
            key={entry.id}
            className={i === TIMELINE.length - 1 ? "relative" : "relative pb-16"}
          >
            <Reveal delay={i * 0.1}>
              <span
                aria-hidden="true"
                className="absolute -left-[37px] top-1.5 size-3 rotate-45 border border-accent bg-surface shadow-[0_0_14px_var(--accent-dim)]"
              />
              <p className="font-mono text-[10px] tracking-[0.3em] text-accent">{entry.period}</p>
              <p className="mt-1 font-mono text-[10px] tracking-[0.25em] text-muted">
                {KIND_LABEL[entry.kind]}
              </p>
              <h3 className="t-h3 mt-2">{entry.title}</h3>
              <p className="mt-1 font-mono text-xs text-muted">{entry.organization}</p>
              <ul className="mt-3 space-y-1.5">
                {entry.details.map((detail) => (
                  <li key={detail} className="font-mono text-xs leading-relaxed text-foreground/75">
                    <span aria-hidden="true" className="mr-2 text-accent/60">
                      ▸
                    </span>
                    {detail}
                  </li>
                ))}
              </ul>
            </Reveal>
          </li>
        ))}
      </ol>
    </section>
  );
}
