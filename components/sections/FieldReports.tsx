"use client";

import { TerminalWindow } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { Reveal } from "@/components/animations/Reveal";
import { HudPanel } from "@/components/ui/HudPanel";
import { FIELD_REPORTS, type FieldReport } from "@/data/fieldReports";

/** Optional live augmentation — only attempted when a user is configured. */
const GITHUB_USER = process.env.NEXT_PUBLIC_GITHUB_USER;

const EVENT_VERBS: Record<string, string> = {
  PushEvent: "PUSHED COMMITS TO",
  CreateEvent: "CREATED",
  WatchEvent: "STARRED",
  ForkEvent: "FORKED",
  PullRequestEvent: "OPENED PR ON",
  IssuesEvent: "FILED ISSUE ON",
  PublicEvent: "PUBLISHED",
};

/**
 * Activity log rendered as "field reports". Always shows a curated static log
 * (no external dependency, no console noise). If NEXT_PUBLIC_GITHUB_USER is set,
 * it silently tries to prepend live GitHub events; any failure is ignored and
 * the static log stays.
 */
export function FieldReports() {
  const [reports, setReports] = useState<FieldReport[]>(FIELD_REPORTS);

  useEffect(() => {
    if (!GITHUB_USER) return;
    const controller = new AbortController();
    fetch(`https://api.github.com/users/${GITHUB_USER}/events/public?per_page=10`, {
      signal: controller.signal,
      headers: { Accept: "application/vnd.github+json" },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((events: Array<{ id: string; type: string; repo?: { name: string }; created_at: string }>) => {
        if (!Array.isArray(events) || events.length === 0) return;
        const live = events
          .filter((event) => EVENT_VERBS[event.type])
          .slice(0, 5)
          .map((event) => ({
            id: event.id,
            action: EVENT_VERBS[event.type],
            repo: event.repo?.name ?? "unknown",
            date: new Date(event.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
          }));
        if (live.length > 0) setReports(live);
      })
      .catch(() => {
        // Offline / rate-limited — keep the static log.
      });
    return () => controller.abort();
  }, []);

  return (
    <Reveal className="mt-10">
      <HudPanel className="p-6">
        <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.3em] text-accent">
          <TerminalWindow size={16} weight="duotone" />
          FIELD REPORTS // LAB ACTIVITY
        </p>
        <ul className="mt-4 space-y-2">
          {reports.map((report) => (
            <li key={report.id} className="flex flex-wrap gap-x-3 font-mono text-xs text-foreground/80">
              <span className="text-muted">[{report.date}]</span>
              <span className="text-accent">{report.action}</span>
              <span>{report.repo}</span>
            </li>
          ))}
        </ul>
      </HudPanel>
    </Reveal>
  );
}
