"use client";

import { CheckCircle, EnvelopeSimple, GithubLogo, LinkedinLogo } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

import { SITE } from "@/data/site";

/** Local visitor log — playful "ACCESS LOG" line, all client-side. */
function AccessLog() {
  const [log, setLog] = useState<{ visit: number; last: string | null } | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const last = window.localStorage.getItem("aaron-last-access");
      let visits = Number(window.localStorage.getItem("aaron-visits") ?? "0");
      if (!window.sessionStorage.getItem("aaron-visit-counted")) {
        visits += 1;
        window.localStorage.setItem("aaron-visits", String(visits));
        window.localStorage.setItem("aaron-last-access", new Date().toISOString());
        window.sessionStorage.setItem("aaron-visit-counted", "1");
      }
      setLog({ visit: visits, last });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!log) return null;

  return (
    <p className="font-mono text-[10px] tracking-[0.2em] text-muted-strong">
      ACCESS LOG // SESSION #{String(log.visit).padStart(4, "0")}
      {log.last && ` // PREVIOUS ACCESS ${new Date(log.last).toLocaleString()}`}
    </p>
  );
}

/** Email action: copies the address, morphs into a confirmation tick. */
function CopyEmail() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SITE.email);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.location.href = `mailto:${SITE.email}`;
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="flex cursor-pointer items-center gap-2 font-mono text-xs tracking-widest text-muted transition-all hover:text-accent"
      aria-live="polite"
    >
      {copied ? (
        <>
          <CheckCircle size={16} weight="duotone" className="text-success" />
          <span className="text-success">COPIED</span>
        </>
      ) : (
        <>
          <EnvelopeSimple size={16} weight="duotone" />
          EMAIL
        </>
      )}
    </button>
  );
}

/** Minimal footer — system shutdown message with social links. */
export function Footer() {
  return (
    <footer className="relative z-30 border-t border-border-dim bg-surface/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-10 text-center sm:px-8">
        <p className="font-display text-sm font-bold tracking-[0.3em] text-accent">
          {SITE.name} SYSTEM
        </p>
        <p className="font-mono text-[10px] tracking-[0.3em] text-muted">SESSION COMPLETE</p>
        <nav aria-label="Social links" className="mt-2 flex gap-6">
          <a
            href={SITE.socials.github}
            target="_blank"
            rel="noopener noreferrer"
            className="link-draw flex items-center gap-2 font-mono text-xs tracking-widest text-muted transition-colors hover:text-accent"
          >
            <GithubLogo size={16} weight="duotone" />
            GITHUB
          </a>
          <a
            href={SITE.socials.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="link-draw flex items-center gap-2 font-mono text-xs tracking-widest text-muted transition-colors hover:text-accent"
          >
            <LinkedinLogo size={16} weight="duotone" />
            LINKEDIN
          </a>
          <CopyEmail />
        </nav>
        <AccessLog />
        <p className="mt-4 font-mono text-[10px] text-muted">
          © {new Date().getFullYear()} {SITE.owner} · {SITE.fullName}
        </p>
      </div>
    </footer>
  );
}
