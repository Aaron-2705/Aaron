"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

import dynamic from "next/dynamic";

import { ParallaxDrift } from "@/components/animations/ParallaxDrift";
import { Reveal } from "@/components/animations/Reveal";
import { CyberButton } from "@/components/ui/CyberButton";

const TransmissionGlobe = dynamic(
  () => import("@/components/sections/TransmissionGlobe").then((m) => m.TransmissionGlobe),
  { ssr: false },
);
import { HudPanel } from "@/components/ui/HudPanel";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SITE } from "@/data/site";
import type { ContactPayload } from "@/types/portfolio";

type TransmissionState = "idle" | "encrypting" | "complete" | "failed";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(payload: ContactPayload): Partial<Record<keyof ContactPayload, string>> {
  const errors: Partial<Record<keyof ContactPayload, string>> = {};
  if (payload.name.trim().length < 2) errors.name = "IDENTITY REQUIRED (MIN 2 CHARACTERS)";
  if (!EMAIL_PATTERN.test(payload.email)) errors.email = "VALID CHANNEL (EMAIL) REQUIRED";
  if (payload.message.trim().length < 10) errors.message = "MESSAGE TOO SHORT (MIN 10 CHARACTERS)";
  return errors;
}

/**
 * Secure transmission terminal.
 * Posts to /api/contact (Resend relay, server-validated, rate-limited).
 * If the relay is unconfigured or unreachable, falls back to mailto:.
 */
export function ContactTerminal() {
  const [payload, setPayload] = useState<ContactPayload>({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof ContactPayload, string>>>({});
  const [state, setState] = useState<TransmissionState>("idle");
  const [honeypot, setHoneypot] = useState("");

  const update =
    (field: keyof ContactPayload) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setPayload({ ...payload, [field]: e.target.value });

  const mailtoFallback = () => {
    const subject = encodeURIComponent(`AARON transmission from ${payload.name}`);
    const body = encodeURIComponent(`${payload.message}\n\n- ${payload.name} (${payload.email})`);
    window.location.href = `mailto:${SITE.email}?subject=${subject}&body=${body}`;
  };

  const transmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validate(payload);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setState("encrypting");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, company: honeypot }),
      });
      if (response.ok) {
        setState("complete");
        return;
      }
      if (response.status === 422) {
        const data = (await response.json()) as { fields?: typeof errors };
        setErrors(data.fields ?? {});
        setState("idle");
        return;
      }
      if (response.status === 429) {
        setState("failed");
        return;
      }
      // Relay unconfigured/unreachable — open the operator's mail client.
      setState("complete");
      mailtoFallback();
    } catch {
      setState("complete");
      mailtoFallback();
    }
  };

  const inputClass =
    "w-full border border-border-dim bg-surface px-4 py-3 font-mono text-xs text-foreground placeholder:text-muted/60 focus:border-accent focus:shadow-[0_0_18px_var(--accent-dim)] focus:outline-none transition-[border-color,box-shadow] duration-200";

  return (
    <section
      id="contact"
      aria-label="Contact"
      className="relative z-10"
    >
      <SectionHeading
        code="SECURE CHANNEL // ENCRYPTED"
        title="CONTACT TERMINAL"
        subtitle="Open a secure transmission. All channels are monitored by AARON."
      />

      <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.3fr]">
        <Reveal>
          <ParallaxDrift strength={0.06}>
            <TransmissionGlobe />
          </ParallaxDrift>
        </Reveal>

        <Reveal delay={0.1}>
          <HudPanel brackets className="p-6 sm:p-8">
          <form onSubmit={transmit} noValidate aria-label="Contact form">
            {/* Honeypot — hidden from real users, bots fill it */}
            <div aria-hidden="true" className="absolute -left-[9999px] top-0 h-0 overflow-hidden">
              <label htmlFor="contact-company">Company</label>
              <input
                id="contact-company"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="contact-name" className="mb-2 block font-mono text-[10px] tracking-[0.25em] text-muted">
                  OPERATOR NAME
                </label>
                <input
                  id="contact-name"
                  type="text"
                  autoComplete="name"
                  value={payload.name}
                  onChange={update("name")}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? "contact-name-error" : undefined}
                  className={inputClass}
                  placeholder="IDENTIFY YOURSELF"
                />
                {errors.name && (
                  <p id="contact-name-error" role="alert" className="mt-1 font-mono text-[10px] text-alert">
                    {errors.name}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="contact-email" className="mb-2 block font-mono text-[10px] tracking-[0.25em] text-muted">
                  RETURN CHANNEL
                </label>
                <input
                  id="contact-email"
                  type="email"
                  autoComplete="email"
                  value={payload.email}
                  onChange={update("email")}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "contact-email-error" : undefined}
                  className={inputClass}
                  placeholder="EMAIL ADDRESS"
                />
                {errors.email && (
                  <p id="contact-email-error" role="alert" className="mt-1 font-mono text-[10px] text-alert">
                    {errors.email}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-5">
              <label htmlFor="contact-message" className="mb-2 block font-mono text-[10px] tracking-[0.25em] text-muted">
                TRANSMISSION CONTENT
              </label>
              <textarea
                id="contact-message"
                rows={5}
                value={payload.message}
                onChange={update("message")}
                aria-invalid={!!errors.message}
                aria-describedby={errors.message ? "contact-message-error" : undefined}
                className={inputClass}
                placeholder="COMPOSE MESSAGE..."
              />
              {errors.message && (
                <p id="contact-message-error" role="alert" className="mt-1 font-mono text-[10px] text-alert">
                  {errors.message}
                </p>
              )}
            </div>

            <div className="mt-6 flex items-center gap-4">
              <CyberButton type="submit" disabled={state === "encrypting"}>
                Send Transmission
              </CyberButton>
              <AnimatePresence mode="wait">
                {state === "encrypting" && (
                  <motion.p
                    key="encrypting"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="animate-pulse font-mono text-[10px] tracking-[0.25em] text-accent"
                    role="status"
                  >
                    ENCRYPTING...
                  </motion.p>
                )}
                {state === "failed" && (
                  <motion.p
                    key="failed"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="font-mono text-[10px] tracking-[0.25em] text-alert"
                    role="status"
                  >
                    ✕ CHANNEL BUSY // TRY AGAIN LATER
                  </motion.p>
                )}
                {state === "complete" && (
                  <motion.p
                    key="complete"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="font-mono text-[10px] tracking-[0.25em] text-success"
                    role="status"
                  >
                    ✓ TRANSMISSION COMPLETE
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </form>
          </HudPanel>
        </Reveal>
      </div>
    </section>
  );
}
