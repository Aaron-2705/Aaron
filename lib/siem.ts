/**
 * Client-side log analysis for the Signal Room demo.
 *
 * This is real detection logic, not a scripted animation: `analyze` runs a true
 * per-source sliding window over whatever events it is handed, so the alerts the
 * UI shows are derived from the data rather than baked into it. It is pure and
 * total (empty or malformed input yields an empty result, never an exception),
 * which is what makes it unit-testable in `tests/logic.spec.ts`.
 *
 * The corpus it runs against is clearly-labeled synthetic sample data.
 */

export type Severity = "info" | "notice" | "warning" | "critical";

export const SEVERITIES: Severity[] = ["info", "notice", "warning", "critical"];

export interface LogEvent {
  id: string;
  /** Epoch milliseconds. */
  ts: number;
  /** Source IP or host. */
  source: string;
  user?: string;
  /** Dotted event type, e.g. "auth.login" or "fw.deny". */
  action: string;
  outcome: "success" | "failure";
  message: string;
  severity: Severity;
}

export interface Alert {
  id: string;
  rule: string;
  severity: "warning" | "critical";
  source: string;
  count: number;
  windowMs: number;
  firstTs: number;
  lastTs: number;
  summary: string;
  /** Ids of the events inside the densest window. */
  triggeredBy: string[];
}

/**
 * Brute-force authentication detection.
 * Thresholds are deliberately visible so the UI can state the rule verbatim.
 */
export const FAILED_LOGIN_RULE = {
  id: "auth.bruteforce",
  name: "FAILED LOGON BURST",
  windowMs: 60_000,
  warnAt: 3,
  criticalAt: 5,
} as const;

interface DensestWindow {
  count: number;
  ids: string[];
  firstTs: number;
  lastTs: number;
}

/**
 * The densest `windowMs`-wide window over an ascending list of timestamps.
 * Two pointers: for each right edge, advance the left edge past anything that
 * has aged out. This is what makes the rule genuinely time-based rather than a
 * running total that never forgets.
 */
function densestWindow(events: LogEvent[], windowMs: number): DensestWindow {
  const best: DensestWindow = { count: 0, ids: [], firstTs: 0, lastTs: 0 };
  let left = 0;
  for (let right = 0; right < events.length; right++) {
    while (events[right].ts - events[left].ts >= windowMs) left++;
    const count = right - left + 1;
    if (count > best.count) {
      best.count = count;
      best.ids = events.slice(left, right + 1).map((e) => e.id);
      best.firstTs = events[left].ts;
      best.lastTs = events[right].ts;
    }
  }
  return best;
}

/**
 * Run every detection rule over `events`.
 * Returns the alerts raised plus the set of event ids that contributed to one,
 * so the feed can highlight exactly the rows that mattered.
 */
export function analyze(events: LogEvent[]): { alerts: Alert[]; flagged: Set<string> } {
  const alerts: Alert[] = [];
  const flagged = new Set<string>();

  if (!Array.isArray(events) || events.length === 0) return { alerts, flagged };

  // Rule 1 — failed logon burst, per source.
  const bySource = new Map<string, LogEvent[]>();
  for (const event of events) {
    if (event.action !== "auth.login" || event.outcome !== "failure") continue;
    const bucket = bySource.get(event.source);
    if (bucket) bucket.push(event);
    else bySource.set(event.source, [event]);
  }

  for (const [source, failures] of bySource) {
    const ordered = [...failures].sort((a, b) => a.ts - b.ts);
    const window = densestWindow(ordered, FAILED_LOGIN_RULE.windowMs);
    if (window.count < FAILED_LOGIN_RULE.warnAt) continue;

    const severity: Alert["severity"] =
      window.count >= FAILED_LOGIN_RULE.criticalAt ? "critical" : "warning";
    const seconds = Math.round(FAILED_LOGIN_RULE.windowMs / 1000);

    alerts.push({
      id: `${FAILED_LOGIN_RULE.id}:${source}`,
      rule: FAILED_LOGIN_RULE.name,
      severity,
      source,
      count: window.count,
      windowMs: FAILED_LOGIN_RULE.windowMs,
      firstTs: window.firstTs,
      lastTs: window.lastTs,
      summary: `${window.count} failed logons from ${source} within ${seconds}s (threshold ${FAILED_LOGIN_RULE.criticalAt}).`,
      triggeredBy: window.ids,
    });
    for (const id of window.ids) flagged.add(id);
  }

  // Critical first, then by recency, so the rail reads worst-first.
  alerts.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "critical" ? -1 : 1;
    return b.lastTs - a.lastTs;
  });

  return { alerts, flagged };
}

export interface SeverityBucket {
  start: number;
  counts: Record<Severity, number>;
  total: number;
}

const emptyCounts = (): Record<Severity, number> => ({
  info: 0,
  notice: 0,
  warning: 0,
  critical: 0,
});

/**
 * Group events into contiguous `bucketMs` buckets anchored on the first event,
 * counting each severity separately. Empty buckets are preserved so the chart
 * shows real gaps in traffic rather than silently compressing time.
 */
export function bucketBySeverity(events: LogEvent[], bucketMs: number): SeverityBucket[] {
  if (!Array.isArray(events) || events.length === 0 || bucketMs <= 0) return [];

  // A loop rather than Math.min(...spread): this module is documented as total
  // over its input, and a spread blows the argument limit on large inputs.
  let start = events[0].ts;
  let end = events[0].ts;
  for (const event of events) {
    if (event.ts < start) start = event.ts;
    if (event.ts > end) end = event.ts;
  }
  const lastIndex = Math.floor((end - start) / bucketMs);

  const buckets: SeverityBucket[] = Array.from({ length: lastIndex + 1 }, (_, i) => ({
    start: start + i * bucketMs,
    counts: emptyCounts(),
    total: 0,
  }));

  for (const event of events) {
    const bucket = buckets[Math.floor((event.ts - start) / bucketMs)];
    if (!bucket) continue;
    bucket.counts[event.severity] = (bucket.counts[event.severity] ?? 0) + 1;
    bucket.total += 1;
  }

  return buckets;
}
