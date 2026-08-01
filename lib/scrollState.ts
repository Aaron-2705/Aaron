/**
 * Shared scroll state — the scroll-driven storytelling foundation.
 * Written by the scroll tracker hook, read inside useFrame loops
 * (mutable singleton avoids React re-renders at 60fps).
 */
export interface ScrollState {
  /** Normalized page scroll progress: 0 → top, 1 → bottom. */
  progress: number;
}

export const scrollState: ScrollState = {
  progress: 0,
};
