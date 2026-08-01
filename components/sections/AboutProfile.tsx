import { CountUp } from "@/components/animations/CountUp";
import { Reveal } from "@/components/animations/Reveal";
import { HudPanel } from "@/components/ui/HudPanel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PROFILE } from "@/data/profile";

/** About section styled as a personnel security file. */
export function AboutProfile() {
  return (
    <section
      id="about"
      aria-label="About Dhwanit"
      className="relative z-10"
    >
      <SectionHeading title="OPERATIVE PROFILE" />

      <Reveal className="mb-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {PROFILE.stats.map((stat) => (
            <HudPanel key={stat.label} className="p-5 text-center">
              <CountUp
                value={stat.value}
                suffix={stat.suffix}
                className="font-display text-3xl font-bold text-accent"
              />
              <p className="mt-2 font-mono text-[10px] tracking-[0.2em] text-muted">{stat.label}</p>
            </HudPanel>
          ))}
        </div>
      </Reveal>

      <div className="grid gap-6 md:grid-cols-[1fr_1.4fr]">
        <Reveal>
          <HudPanel brackets className="p-6">
            <p className="font-mono text-[10px] tracking-[0.3em] text-accent">IDENTITY RECORD</p>
            <h3 className="t-h3 mt-3">{PROFILE.name}</h3>
            <dl className="mt-5 space-y-3">
              {PROFILE.records.map((record) => (
                <div key={record.label} className="flex justify-between gap-4 border-b border-border-dim pb-2">
                  <dt className="font-mono text-[10px] tracking-[0.2em] text-muted">
                    {record.label}
                  </dt>
                  <dd className="text-right font-mono text-xs text-foreground/85">{record.value}</dd>
                </div>
              ))}
            </dl>
          </HudPanel>
        </Reveal>

        <Reveal delay={0.12}>
          <HudPanel className="h-full p-6">
            <p className="font-mono text-[10px] tracking-[0.3em] text-accent">BACKGROUND BRIEF</p>
            <p className="mt-4 text-sm leading-relaxed text-foreground/85">{PROFILE.summary}</p>
            <p className="mt-6 font-mono text-[10px] tracking-[0.3em] text-accent">
              TECHNICAL INTERESTS
            </p>
            <ul className="mt-3 space-y-2">
              {PROFILE.interests.map((interest) => (
                <li key={interest} className="font-mono text-xs text-foreground/80">
                  <span aria-hidden="true" className="mr-2 text-accent">
                    ▸
                  </span>
                  {interest}
                </li>
              ))}
            </ul>
          </HudPanel>
        </Reveal>
      </div>
    </section>
  );
}
