"use client";

import { SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";
import { useSyncExternalStore } from "react";

import { isSoundEnabled, playSound, setSoundEnabled, subscribeSound } from "@/lib/sound";

/** Opt-in audio toggle — sounds are synthesized, off by default. */
export function SoundToggle() {
  // Server snapshot always false — avoids hydration mismatch when the
  // stored preference is "enabled".
  const on = useSyncExternalStore(subscribeSound, isSoundEnabled, () => false);

  const toggle = () => {
    const next = !on;
    setSoundEnabled(next);
    if (next) playSound("activate");
  };

  return (
    <button
      onClick={toggle}
      aria-label={on ? "Disable interface sounds" : "Enable interface sounds"}
      aria-pressed={on}
      className="text-muted transition-colors hover:text-accent"
    >
      {on ? <SpeakerHigh size={16} weight="duotone" /> : <SpeakerSlash size={16} weight="duotone" />}
    </button>
  );
}
