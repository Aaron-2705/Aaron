"use client";

import { motion } from "framer-motion";

import { DUR, EASE_OUT, REVEAL_Y } from "@/lib/motion";

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

/**
 * Fade-and-rise reveal when the element enters the viewport.
 * Reduced motion is handled globally by <MotionConfig reducedMotion="user">
 * (transform disabled), so `initial` is unconditional — server and client
 * render identical markup.
 */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: REVEAL_Y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: DUR.base, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}
