"use client";

import { Minus, SpeakerHigh } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import { TypingText } from "@/components/animations/TypingText";
import { HudPanel } from "@/components/ui/HudPanel";
import { PROFILE } from "@/data/profile";

type AssistantState = "open" | "collapsed";

/**
 * AARON assistant — a quiet launcher, tucked bottom-right. Opens only on click
 * (no auto-greeting, no per-module narration popups — those read as cheap).
 * Frontend-only; message pipeline is data-driven for a future AI backend.
 */
export function AaronAssistant() {
  const [state, setState] = useState<AssistantState>("collapsed");

  const speak = () => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(PROFILE.assistantIntro.join(" "));
    utterance.rate = 0.95;
    utterance.pitch = 0.8;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  return (
    <div className="fixed right-4 bottom-4 z-40 print:hidden">
      <AnimatePresence mode="wait">
        {state === "open" && (
          <motion.aside
            key="panel"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-80 max-w-[calc(100vw-2rem)] origin-bottom-right"
            aria-label="AARON assistant"
          >
            <HudPanel brackets className="p-4">
              <div className="mb-3 flex items-center justify-between border-b border-border-dim pb-2">
                <p className="font-mono text-[10px] tracking-[0.3em] text-accent">
                  <span className="mr-2 inline-block size-1.5 animate-pulse rounded-full bg-accent align-middle" />
                  AARON // ONLINE
                </p>
                <span className="flex items-center gap-3">
                  <button
                    onClick={speak}
                    aria-label="Hear AARON speak"
                    className="cursor-pointer text-muted transition-colors hover:text-accent"
                  >
                    <SpeakerHigh size={14} weight="duotone" />
                  </button>
                  <button
                    onClick={() => {
                      window.speechSynthesis?.cancel();
                      setState("collapsed");
                    }}
                    aria-label="Minimize assistant"
                    className="flex cursor-pointer items-center text-muted transition-colors hover:text-accent"
                  >
                    <Minus size={14} weight="bold" />
                  </button>
                </span>
              </div>
              <TypingText
                lines={PROFILE.assistantIntro}
                speed={22}
                className="space-y-1 font-mono text-xs leading-relaxed text-foreground/90"
              />
            </HudPanel>
          </motion.aside>
        )}

        {state === "collapsed" && (
          <motion.button
            key="launcher"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => setState("open")}
            aria-label="Open AARON assistant"
            className="group flex cursor-pointer items-center gap-2 rounded-full border border-accent/30 bg-surface/80 py-2 pr-4 pl-2.5 backdrop-blur-md transition-colors hover:border-accent/70"
          >
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex size-2.5 rounded-full bg-accent" />
            </span>
            <span className="font-mono text-[10px] tracking-[0.3em] text-accent">AARON</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
