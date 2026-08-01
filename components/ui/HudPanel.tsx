import { cn } from "@/lib/utils";

interface HudPanelProps {
  children: React.ReactNode;
  className?: string;
  /** Adds the corner bracket decorations. */
  brackets?: boolean;
}

/** Shared HUD-style panel: carbon surface, thin border, optional brackets. */
export function HudPanel({ children, className, brackets = false }: HudPanelProps) {
  return (
    <div
      className={cn(
        "relative border border-border-dim bg-surface/80 backdrop-blur-sm",
        className,
      )}
    >
      {brackets && (
        <>
          <span aria-hidden className="absolute -top-px -left-px size-3 border-t-2 border-l-2 border-accent" />
          <span aria-hidden className="absolute -top-px -right-px size-3 border-t-2 border-r-2 border-accent" />
          <span aria-hidden className="absolute -bottom-px -left-px size-3 border-b-2 border-l-2 border-accent" />
          <span aria-hidden className="absolute -bottom-px -right-px size-3 border-b-2 border-r-2 border-accent" />
        </>
      )}
      {children}
    </div>
  );
}
