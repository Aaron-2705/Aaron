"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

import { useTheme } from "@/components/providers/ThemeProvider";
import { HudPanel } from "@/components/ui/HudPanel";
import { SITE } from "@/data/site";
import { playSound } from "@/lib/sound";
import { runCommand, THEME_NAMES, type LineTone, type TerminalLine } from "@/lib/terminal";
import { TERMINAL_OPEN_EVENT } from "@/lib/terminalBus";

const BANNER: TerminalLine[] = [
  { text: "AARON ROOT SHELL", tone: "accent" },
  { text: `${SITE.fullName}`, tone: "muted" },
  { text: "" },
  { text: "Type a command. 'help' lists everything. 'exit' or ESC closes." },
  { text: "" },
];

const TONE_CLASS: Record<LineTone, string> = {
  accent: "text-accent",
  muted: "text-muted",
  alert: "text-alert",
  success: "text-success",
};

const PROMPT = "aaron@range:~$";

/** Past this the input scrolls, so the caret would detach from the text. */
const MAX_CARET_COL = 46;

/** Focusable descendants, for the dialog's focus trap. */
const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Scrollback lines carry a stable key. Index keys would be safe for an
 * append-only log, but `clear` empties the list, after which React reuses the
 * same <p> nodes by index and rewrites their text in place.
 */
interface Keyed extends TerminalLine {
  key: number;
}

let nextLineKey = 0;
const keyed = (lines: TerminalLine[]): Keyed[] =>
  lines.map((line) => ({ ...line, key: nextLineKey++ }));

/**
 * Hidden root shell. Activation: CTRL + SHIFT + D, then ENTER. Escape closes.
 *
 * This is a real shell, not a typewriter: input goes to `runCommand` in
 * `lib/terminal.ts`, which is pure and unit-tested, and the effects it asks for
 * (navigate, theme, clear, exit) are performed here.
 */
export function AdminTerminal() {
  const [armed, setArmed] = useState(false);
  const [open, setOpen] = useState(false);
  const [scrollback, setScrollback] = useState<Keyed[]>(() => keyed(BANNER));
  const [history, setHistory] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  /** -1 = editing a fresh line; otherwise an index into `history`. */
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [focused, setFocused] = useState(false);

  const { theme, setTheme } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const navTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (navTimerRef.current !== null) window.clearTimeout(navTimerRef.current);
    },
    [],
  );

  const close = useCallback(() => {
    setOpen(false);
    setArmed(false);
  }, []);

  // Visible entry point: the navbar button raises this. The CTRL+SHIFT+D
  // easter egg below still works, but it cannot be the only way in.
  useEffect(() => {
    const onOpen = () => {
      restoreFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setOpen(true);
      playSound("activate");
    };
    window.addEventListener(TERMINAL_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(TERMINAL_OPEN_EVENT, onOpen);
  }, []);

  // Activation and global escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (open && e.key === "Escape") {
        close();
        return;
      }
      // Focus trap. aria-modal="true" promises assistive tech that focus stays
      // inside; without this, Tab from the last theme button walks into the
      // page behind the backdrop, which the user cannot see.
      if (open && e.key === "Tab") {
        const panel = panelRef.current;
        if (!panel) return;
        const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        // Containment is checked first and for BOTH directions. Clicking the
        // backdrop blurs to <body>; testing it only in the shiftKey branch let
        // a plain Tab walk into the navbar behind the overlay.
        if (!panel.contains(active)) {
          e.preventDefault();
          (e.shiftKey ? last : first).focus();
          return;
        }
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
        return;
      }
      // Re-arming while open would let the next Enter (which also submits a
      // command) overwrite restoreFocusRef with the terminal's own input.
      if (!open && e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setArmed(true);
        return;
      }
      if (armed && e.key === "Enter") {
        restoreFocusRef.current =
          document.activeElement instanceof HTMLElement ? document.activeElement : null;
        setOpen(true);
        setArmed(false);
        playSound("activate");
      } else if (armed) {
        setArmed(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [armed, open, close]);

  // Focus the prompt on open; hand focus back on close.
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      return;
    }
    restoreFocusRef.current?.focus();
    restoreFocusRef.current = null;
  }, [open]);

  // Pin the scrollback to the newest line.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [scrollback]);

  const submit = () => {
    const input = draft;
    const echoed: TerminalLine[] = [{ text: `${PROMPT} ${input}` , tone: "muted" }];
    const trimmed = input.trim();

    setDraft("");
    setHistoryIndex(-1);

    if (trimmed === "") {
      setScrollback((prev) => [...prev, ...keyed(echoed)]);
      return;
    }

    const result = runCommand(input, { history });
    setHistory((prev) => [...prev, trimmed]);
    playSound("click");

    switch (result.action?.kind) {
      case "clear":
        setScrollback([]);
        return;
      case "exit":
        setScrollback((prev) => [...prev, ...keyed([...echoed, ...result.lines])]);
        close();
        return;
      case "theme":
        setTheme(result.action.name);
        break;
      case "navigate": {
        const id = result.action.id;
        close();
        // Let the dialog unmount before scrolling, so focus restoration and
        // the scroll do not fight each other. Tracked so it can be cleared.
        navTimerRef.current = window.setTimeout(() => {
          document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
        }, 60);
        break;
      }
      default:
        break;
    }

    setScrollback((prev) => [...prev, ...keyed([...echoed, ...result.lines])]);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const next = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(next);
      setDraft(history[next]);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex === -1) return;
      const next = historyIndex + 1;
      if (next >= history.length) {
        setHistoryIndex(-1);
        setDraft("");
      } else {
        setHistoryIndex(next);
        setDraft(history[next]);
      }
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-background/90 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="AARON root shell"
        >
          <HudPanel brackets className="w-full max-w-2xl p-6">
            <div className="mb-4 flex items-center justify-between border-b border-border-dim pb-3">
              <p className="font-mono text-[10px] tracking-[0.3em] text-alert">
                {`⚠ ${SITE.name} // ROOT SHELL`}
              </p>
              <button
                onClick={close}
                aria-label="Close terminal"
                className="font-mono text-xs text-muted hover:text-alert"
              >
                ✕ ESC
              </button>
            </div>

            <div
              ref={scrollRef}
              className="max-h-[45vh] overflow-y-auto font-mono text-xs leading-relaxed"
              aria-live="polite"
              aria-label="Terminal output"
            >
              {scrollback.map((line) => (
                <p
                  key={line.key}
                  className={`whitespace-pre-wrap ${line.tone ? TONE_CLASS[line.tone] : "text-foreground/85"}`}
                >
                  {line.text === "" ? " " : line.text}
                </p>
              ))}
            </div>

            {/* Prompt. Clicking anywhere on the row focuses the real input. */}
            <div
              className="mt-3 flex items-center gap-2 border-t border-border-dim pt-3"
              onClick={() => inputRef.current?.focus()}
            >
              <span aria-hidden className="font-mono text-xs text-success">
                {PROMPT}
              </span>
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    setHistoryIndex(-1);
                  }}
                  onKeyDown={onKeyDown}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  aria-label="Terminal command input"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  data-testid="terminal-input"
                  // The block caret below is this input's focus indicator, so
                  // the generic ring is suppressed: a shell prompt inside a
                  // boxed outline reads as a form field, not a terminal.
                  className="w-full bg-transparent font-mono text-xs text-foreground caret-transparent outline-none focus-visible:outline-none"
                />
                {/* Block caret sitting after the typed text. */}
                {focused && (
                  <span
                    aria-hidden
                    className="caret-blink pointer-events-none absolute top-0 font-mono text-xs text-accent"
                    style={{ left: `${Math.min(draft.length, MAX_CARET_COL)}ch` }}
                  >
                    █
                  </span>
                )}
              </div>
            </div>

            {/* Theme unlock switcher */}
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border-dim pt-4">
              <span className="font-mono text-[10px] tracking-[0.25em] text-muted">
                {"> theme.set"}
              </span>
              {THEME_NAMES.map((name) => (
                <button
                  key={name}
                  onClick={() => {
                    setTheme(name);
                    playSound("click");
                  }}
                  aria-pressed={theme === name}
                  className={`border px-3 py-1.5 font-mono text-[10px] tracking-[0.25em] uppercase transition-colors ${
                    theme === name
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-border-dim text-muted hover:border-accent hover:text-accent"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </HudPanel>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
