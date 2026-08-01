/**
 * Subtle CRT scanline + vignette overlay. Pure CSS, zero runtime cost.
 * Sits above the 3D canvas, below all content.
 */
export function Scanlines() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-10 opacity-[0.07]"
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg, transparent, transparent 2px, var(--foreground) 3px)",
      }}
    />
  );
}
