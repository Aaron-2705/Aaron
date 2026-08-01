import { DownloadSimple, FilePdf } from "@phosphor-icons/react/dist/ssr";

import { Reveal } from "@/components/animations/Reveal";
import { HudPanel } from "@/components/ui/HudPanel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RESUME, RESUME_PDF } from "@/data/resume";

/**
 * FULL DOSSIER.
 *
 * The record is rendered inline from `data/resume.json`, the same file the PDF
 * generator reads, so what a visitor reads here and what they download are the
 * same document by construction rather than by discipline.
 *
 * Deliberately not an <iframe> of the PDF: X-Frame-Options is DENY and the CSP
 * sets frame-src 'none' for the whole origin, and weakening a real security
 * control to embed a viewer would contradict the section directly above this
 * one. Rendering the content is better anyway - it is selectable, searchable,
 * responsive and screen-reader navigable, which a framed PDF is not.
 */

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border-dim pt-5">
      <h3 className="mb-3 font-mono text-[10px] tracking-[0.3em] text-accent">{label}</h3>
      {children}
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 flex flex-col gap-1.5">
      {items.map((item) => (
        <li key={item} className="t-body-sm flex gap-2 text-muted">
          <span aria-hidden className="mt-[0.45em] size-1 shrink-0 bg-accent/70" />
          {item}
        </li>
      ))}
    </ul>
  );
}

export function ResumeSection() {
  const { contact } = RESUME;

  return (
    <section id="resume" aria-label="Full dossier" className="relative z-10">
      <SectionHeading
        title="FULL DOSSIER"
        subtitle="The complete personnel record, rendered from the same source the PDF is generated from."
      />

      <div className="grid items-start gap-8 lg:grid-cols-[1.6fr_1fr]">
        {/* -------------------------------------------------- the record */}
        <Reveal className="min-w-0">
          <HudPanel brackets className="flex flex-col gap-5 p-5 sm:p-8">
            <header>
              <h3 className="font-display text-2xl tracking-tight text-foreground">
                {RESUME.name}
              </h3>
              <p className="t-eyebrow mt-1 text-accent">{RESUME.title}</p>
              {/* Only the channels that are actually set. `phone` is optional
                  and currently omitted, so filtering beats rendering an empty
                  <li> and a stray separator. */}
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] tracking-[0.12em] text-muted-strong">
                {[contact.phone, contact.email, contact.location, contact.linkedin]
                  .filter((channel): channel is string => Boolean(channel))
                  .map((channel) => (
                    <li key={channel}>{channel}</li>
                  ))}
              </ul>
            </header>

            <Block label="SUMMARY">
              <p className="t-body-sm text-muted">{RESUME.summary}</p>
            </Block>

            <Block label="EXPERIENCE">
              {RESUME.experience.map((job) => (
                <article key={`${job.org}-${job.role}`}>
                  <h4 className="t-body-sm font-semibold text-foreground">
                    {job.role}, {job.org}
                  </h4>
                  <p className="mt-0.5 font-mono text-[10px] tracking-[0.15em] text-muted-strong">
                    {job.period}
                  </p>
                  <Bullets items={job.bullets} />
                </article>
              ))}
            </Block>

            <Block label="HOME-LAB PROJECTS">
              <div className="flex flex-col gap-4">
                {RESUME.projects.map((project) => (
                  <article key={project.name}>
                    <h4 className="t-body-sm font-semibold text-foreground">
                      {project.name}
                    </h4>
                    <Bullets items={project.bullets} />
                  </article>
                ))}
              </div>
            </Block>

            <Block label="TECHNICAL SKILLS">
              <dl className="flex flex-col gap-2">
                {RESUME.skills.map((group) => (
                  <div key={group.label} className="sm:flex sm:gap-3">
                    <dt className="t-body-sm font-semibold text-foreground sm:w-40 sm:shrink-0">
                      {group.label}
                    </dt>
                    <dd className="t-body-sm text-muted">{group.items}</dd>
                  </div>
                ))}
              </dl>
            </Block>

            <Block label="EDUCATION">
              <div className="flex flex-col gap-3">
                {RESUME.education.map((school) => (
                  <article key={school.institution}>
                    <h4 className="t-body-sm font-semibold text-foreground">
                      {school.institution}
                    </h4>
                    <p className="mt-0.5 font-mono text-[10px] tracking-[0.12em] text-muted-strong">
                      {school.credential} · {school.detail} · {school.location} ·{" "}
                      {school.period}
                    </p>
                  </article>
                ))}
              </div>
            </Block>

            <Block label="CERTIFICATIONS">
              <Bullets items={[...RESUME.certifications]} />
            </Block>
          </HudPanel>
        </Reveal>

        {/* ------------------------------------------------------ export */}
        <Reveal delay={0.15} className="min-w-0">
          <HudPanel className="flex flex-col gap-5 p-5 sm:p-6 lg:sticky lg:top-24">
            <div className="flex items-center gap-3">
              <FilePdf aria-hidden weight="duotone" className="size-6 text-accent" />
              <div>
                <h3 className="font-mono text-[11px] tracking-[0.25em] text-foreground">
                  EXPORT RECORD
                </h3>
                <p className="mt-1 font-mono text-[10px] tracking-[0.15em] text-muted-strong">
                  PDF · 1 PAGE · LETTER
                </p>
              </div>
            </div>

            <p className="t-body-sm text-muted">
              Generated straight from the record above, so the download is never a
              stale copy. Single column, real text, no images, so an applicant
              tracking system can read every line of it.
            </p>

            <div className="flex flex-col gap-2">
              <a
                href={RESUME_PDF}
                download
                className="flex items-center justify-center gap-2 border border-accent bg-accent/10 px-6 py-3 font-mono text-xs font-bold tracking-[0.25em] text-accent uppercase transition-all duration-200 hover:bg-accent hover:text-background hover:shadow-[0_0_24px_var(--accent-dim)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <DownloadSimple aria-hidden weight="bold" className="size-4" />
                Download PDF
              </a>
              <a
                href={RESUME_PDF}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-border-dim px-6 py-3 text-center font-mono text-xs tracking-[0.25em] text-muted-strong uppercase transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Open in new tab
              </a>
            </div>
          </HudPanel>
        </Reveal>
      </div>
    </section>
  );
}
