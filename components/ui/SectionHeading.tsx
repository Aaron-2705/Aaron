import { Reveal } from "@/components/animations/Reveal";
import { ScrambleText } from "@/components/animations/ScrambleText";

interface SectionHeadingProps {
  /**
   * Optional mono eyebrow. Deliberately rationed: the taste system caps
   * eyebrows at ceil(sections / 3), so most sections lead with the title alone.
   */
  code?: string;
  title: string;
  subtitle?: string;
}

/** Terminal-flavored section heading shared by all portfolio sections. */
export function SectionHeading({ code, title, subtitle }: SectionHeadingProps) {
  return (
    <Reveal className="mb-12">
      {code && (
        <p className="t-eyebrow text-accent">
          <span aria-hidden="true">▸ </span>
          {code}
        </p>
      )}
      <h2 className="t-h2 mt-3 text-foreground">
        <ScrambleText text={title} />
      </h2>
      {subtitle && <p className="t-body mt-4 max-w-xl text-muted">{subtitle}</p>}
    </Reveal>
  );
}
