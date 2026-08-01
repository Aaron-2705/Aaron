/**
 * Open signal for the root shell.
 *
 * `AdminTerminal` owns its own open state and is mounted as a page-level
 * overlay, so anything that wants to open it (the navbar button, a footer
 * link) raises this event rather than threading state through a provider.
 *
 * Deliberately separate from `lib/terminal.ts`: that module is pure and
 * DOM-free, which is what lets it be unit-tested without a browser.
 */
export const TERMINAL_OPEN_EVENT = "aaron:open-terminal";

export function openTerminal() {
  window.dispatchEvent(new CustomEvent(TERMINAL_OPEN_EVENT));
}
