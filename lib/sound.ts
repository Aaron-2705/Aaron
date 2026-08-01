"use client";

/**
 * Sound design — synthesized with WebAudio, zero audio assets.
 * Strictly opt-in (navbar toggle); never autoplays.
 */
export type SoundName = "boot" | "keypress" | "click" | "activate";

const STORAGE_KEY = "aaron-sound";

let enabled = false;
let ctx: AudioContext | null = null;
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  enabled = window.localStorage.getItem(STORAGE_KEY) === "1";
}

/** Subscribe to sound-enabled changes (for useSyncExternalStore). */
export function subscribeSound(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function setSoundEnabled(value: boolean): void {
  enabled = value;
  window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  if (value) getCtx();
  listeners.forEach((listener) => listener());
}

export function isSoundEnabled(): boolean {
  return enabled;
}

function tone(
  audio: AudioContext,
  {
    freq,
    endFreq,
    duration,
    type = "sine",
    gain = 0.06,
  }: { freq: number; endFreq?: number; duration: number; type?: OscillatorType; gain?: number },
): void {
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  const now = audio.currentTime;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
  amp.gain.setValueAtTime(gain, now);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(amp).connect(audio.destination);
  osc.start(now);
  osc.stop(now + duration);
}

export function playSound(name: SoundName): void {
  if (!enabled) return;
  const audio = getCtx();
  if (!audio) return;

  switch (name) {
    case "click":
      tone(audio, { freq: 1400, endFreq: 900, duration: 0.07, type: "square", gain: 0.025 });
      break;
    case "keypress":
      tone(audio, { freq: 2200, endFreq: 1500, duration: 0.04, type: "square", gain: 0.015 });
      break;
    case "boot":
      tone(audio, { freq: 80, endFreq: 320, duration: 1.1, type: "sawtooth", gain: 0.04 });
      tone(audio, { freq: 440, endFreq: 880, duration: 0.9, type: "sine", gain: 0.02 });
      break;
    case "activate":
      tone(audio, { freq: 520, endFreq: 1040, duration: 0.25, type: "triangle", gain: 0.05 });
      break;
  }
}
