"use client";

/** Endless scrolling status strip — tools, protocols, signals. */
const ITEMS = [
  "WIRESHARK",
  "NMAP",
  "BURP SUITE",
  "ACTIVE DIRECTORY",
  "KALI LINUX",
  "METASPLOIT",
  "CISCO CLI",
  "WINDOWS SERVER",
  "PYTHON",
  "VLAN // OSPF",
  "POWERSHELL",
  "OSINT",
];

export function StatusTicker() {
  const row = ITEMS.map((item, i) => (
    <span key={i} className="mx-6 inline-flex items-center gap-6">
      <span className="font-mono text-[11px] tracking-[0.3em] text-muted-strong">{item}</span>
      <span aria-hidden="true" className="size-1 rounded-full bg-accent/60" />
    </span>
  ));

  return (
    <div
      aria-hidden="true"
      className="relative z-30 overflow-hidden border-y border-border-dim bg-surface/60 py-3 backdrop-blur-sm"
    >
      <div className="ticker-track flex w-max">
        <div className="flex shrink-0 items-center">{row}</div>
        <div className="flex shrink-0 items-center">{row}</div>
      </div>
    </div>
  );
}
