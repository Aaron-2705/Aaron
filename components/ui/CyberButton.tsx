"use client";

import { useRef } from "react";

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { playSound } from "@/lib/sound";
import { cn } from "@/lib/utils";

type CyberButtonProps = {
  variant?: "primary" | "ghost" | "alert";
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

/** Shared cyber-styled button with a subtle magnetic hover pull. */
export function CyberButton({ variant = "primary", className, onClick, ...props }: CyberButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (reducedMotion || !ref.current || e.pointerType !== "mouse") return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * 0.12;
    const y = (e.clientY - rect.top - rect.height / 2) * 0.18;
    ref.current.style.transform = `translate(${x}px, ${y}px)`;
  };

  const onPointerLeave = () => {
    if (ref.current) ref.current.style.transform = "";
  };

  return (
    <button
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onClick={(e) => {
        playSound("click");
        onClick?.(e);
      }}
      {...props}
      className={cn(
        "pointer-events-auto inline-flex min-h-11 items-center justify-center px-6 font-mono text-xs font-bold tracking-[0.25em] uppercase transition-all duration-200 active:scale-95",
        "border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50",
        variant === "primary" &&
          "border-accent bg-accent/10 text-accent hover:bg-accent hover:text-background hover:shadow-[0_0_24px_var(--accent-dim)]",
        variant === "ghost" &&
          "border-border-dim text-muted hover:border-accent hover:text-accent",
        variant === "alert" &&
          "border-alert bg-alert/10 text-alert hover:bg-alert hover:text-background",
        className,
      )}
    />
  );
}
