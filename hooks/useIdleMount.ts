"use client";

import { useEffect, useState } from "react";

/** Longest we will wait on `load` before scheduling anyway. */
const LOAD_DEADLINE_MS = 4000;

/**
 * Gate for an expensive, non-critical mount — currently the hero's R3F canvas.
 *
 * three.js + R3F cost ~1.4s of script evaluation. Mounting them during
 * hydration put that work inside the window Lighthouse measures as blocking
 * time and delayed the hero's first paint. Waiting for an idle callback moves
 * it to the first moment the main thread is actually free; `timeout` bounds
 * the wait so a permanently busy thread still gets the scene.
 *
 * Returns false on the server and on the first client render, so markup is
 * identical across hydration.
 */
export function useIdleMount(enabled = true, timeout = 1200): boolean {
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    if (!enabled || idle) return;

    let cancel: (() => void) | undefined;

    // Wait for `load` first: until then the browser is still fetching and
    // executing everything the page actually needs, and an idle callback fired
    // in a gap between those tasks would drop three.js right back into the
    // critical path.
    const schedule = () => {
      const ric = window.requestIdleCallback;
      if (!ric) {
        const id = window.setTimeout(() => setIdle(true), timeout);
        cancel = () => window.clearTimeout(id);
        return;
      }
      const handle = ric(() => setIdle(true), { timeout });
      cancel = () => window.cancelIdleCallback?.(handle);
    };

    if (document.readyState === "complete") {
      schedule();
    } else {
      // A hung subresource means `load` never fires. Race it with an absolute
      // deadline so a stalled request can't permanently withhold the mount.
      const deadline = window.setTimeout(() => {
        window.removeEventListener("load", schedule);
        schedule();
      }, LOAD_DEADLINE_MS);
      const onLoad = () => {
        window.clearTimeout(deadline);
        schedule();
      };
      window.addEventListener("load", onLoad, { once: true });
      cancel = () => {
        window.clearTimeout(deadline);
        window.removeEventListener("load", onLoad);
      };
    }

    return () => cancel?.();
  }, [enabled, idle, timeout]);

  return idle;
}
