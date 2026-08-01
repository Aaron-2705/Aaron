"use client";

import { motion } from "framer-motion";

import { DUR, EASE_OUT } from "@/lib/motion";

/**
 * Clip-path reveal between major sections — content wipes in from a
 * horizontal slit as the section enters the viewport.
 * Reduced motion is handled globally by <MotionConfig reducedMotion="user">,
 * so `initial` is unconditional (server + client render identical markup).
 */
export function SectionShell({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ clipPath: "inset(14% 0% 14% 0%)", opacity: 0.25 }}
      whileInView={{ clipPath: "inset(0% 0% 0% 0%)", opacity: 1 }}
      viewport={{ once: true, margin: "-15%" }}
      transition={{ duration: DUR.slow, ease: EASE_OUT }}
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-[clamp(5rem,11vh,9rem)] sm:px-8">
        {children}
      </div>
    </motion.div>
  );
}
