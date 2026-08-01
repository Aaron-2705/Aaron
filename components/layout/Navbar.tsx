"use client";

import { TerminalWindow } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { HoverScramble } from "@/components/animations/HoverScramble";
import { useActiveModule } from "@/components/providers/ActiveModuleProvider";
import { SoundToggle } from "@/components/ui/SoundToggle";
import { NAV_LINKS, SITE } from "@/data/site";
import { scrollToSection } from "@/lib/lenisSingleton";
import { openTerminal } from "@/lib/terminalBus";
import { cn } from "@/lib/utils";

/** HUD-style navigation with active-section tracking and mobile menu. */
export function Navbar() {
  const { activeId: active } = useActiveModule();
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const linkClass = (id: string) =>
    cn(
      "link-draw font-mono text-xs tracking-widest transition-colors hover:text-accent",
      active === id ? "text-accent" : "text-muted",
    );

  // /landing ships its own full-bleed chrome; the HUD nav would collide with it.
  if (pathname === "/landing") return null;

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border-dim bg-background/70 backdrop-blur-md">
      <nav
        aria-label="Primary"
        className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-8"
      >
        <Link
          href="/"
          className="font-display text-sm font-bold tracking-[0.3em] text-accent"
          aria-label={`${SITE.name} home`}
        >
          {SITE.name}
        </Link>

        {/* lg, not md: ten sections do not fit on one 768px row. The gap tightens
            at lg so the tenth link cannot push the row past the viewport, and
            opens back up once there is room at xl. */}
        <ul className="hidden items-center gap-3 lg:flex xl:gap-5">
          {NAV_LINKS.map((link) => (
            <li key={link.id}>
              <a
                href={`#${link.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection(link.id);
                }}
                className={linkClass(link.id)}
                aria-current={active === link.id ? "true" : undefined}
              >
                {active === link.id && (
                  <span aria-hidden="true" className="mr-1">
                    ▸
                  </span>
                )}
                <HoverScramble text={link.label} />
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-4">
          <button
            onClick={openTerminal}
            aria-label="Open the AARON root shell"
            title="Root shell (Ctrl+Shift+D, then Enter)"
            className="text-muted transition-colors hover:text-accent"
          >
            <TerminalWindow size={16} weight="duotone" />
          </button>
          <SoundToggle />
          <span className="hidden font-mono text-[10px] tracking-widest text-muted sm:block">
            <span className="mr-1 inline-block size-1.5 animate-pulse rounded-full bg-success align-middle" />
            SYSTEM ONLINE
          </span>
          <button
            className="lg:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span className="font-mono text-lg text-accent">{menuOpen ? "✕" : "≡"}</span>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-border-dim bg-background/95 lg:hidden"
          >
            {NAV_LINKS.map((link) => (
              <li key={link.id}>
                <a
                  href={`#${link.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setMenuOpen(false);
                    scrollToSection(link.id);
                  }}
                  className={cn("block px-6 py-3", linkClass(link.id))}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </header>
  );
}
