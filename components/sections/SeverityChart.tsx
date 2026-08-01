"use client";

import { bucketBySeverity, type LogEvent, type Severity } from "@/lib/siem";
import { captureTime } from "@/data/sampleLog";

const W = 680;
const H = 210;
const PAD = { top: 10, right: 8, bottom: 30, left: 34 };

/**
 * Severity is ordinal, so it gets a status ramp rather than the categorical
 * accent. Stacked lowest-to-highest, so the eye reads escalation upward.
 */
const RAMP: Array<{ severity: Severity; label: string; color: string }> = [
  { severity: "info", label: "INFO", color: "var(--muted)" },
  { severity: "notice", label: "NOTICE", color: "var(--accent)" },
  { severity: "warning", label: "WARNING", color: "var(--gold)" },
  { severity: "critical", label: "CRITICAL", color: "var(--alert)" },
];

const BUCKET_MS = 60_000;
const MAX_BAR_W = 24;
/** Surface-colored gap between stacked segments, per the chart spec. */
const SEG_GAP = 2;

export function SeverityChart({ events }: { events: LogEvent[] }) {
  const buckets = bucketBySeverity(events, BUCKET_MS);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const peak = Math.max(1, ...buckets.map((b) => b.total));
  // Round the axis up to a clean step so the gridlines read as real values.
  const step = peak <= 5 ? 1 : peak <= 10 ? 2 : 5;
  const axisMax = Math.ceil(peak / step) * step;
  const ticks = Array.from({ length: axisMax / step + 1 }, (_, i) => i * step);

  const slot = buckets.length > 0 ? plotW / buckets.length : plotW;
  const barW = Math.min(MAX_BAR_W, slot * 0.6);

  const total = events.length;
  const label =
    total === 0
      ? "Severity chart, no events ingested yet."
      : `Severity of ${total} sample events, grouped into ${buckets.length} one-minute buckets. Peak ${peak} events in a bucket.`;

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="w-full">
        {/* Horizontal gridlines only: no vertical rules on a time axis. */}
        {ticks.map((tick) => {
          const y = PAD.top + plotH - (tick / axisMax) * plotH;
          return (
            <g key={tick}>
              <line
                x1={PAD.left}
                y1={y}
                x2={W - PAD.right}
                y2={y}
                stroke="var(--border)"
                strokeWidth={1}
                strokeOpacity={tick === 0 ? 0.9 : 0.4}
              />
              <text
                x={PAD.left - 8}
                y={y + 3}
                textAnchor="end"
                fontSize={9}
                fill="var(--muted)"
                className="font-mono"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {buckets.map((bucket, i) => {
          const cx = PAD.left + slot * (i + 0.5);
          let cursor = PAD.top + plotH;
          return (
            <g key={bucket.start}>
              {RAMP.map(({ severity, color }) => {
                const count = bucket.counts[severity] ?? 0;
                if (count === 0) return null;
                const rawH = (count / axisMax) * plotH;
                const h = Math.max(1, rawH - SEG_GAP);
                cursor -= rawH;
                return (
                  <rect
                    key={severity}
                    x={cx - barW / 2}
                    y={cursor}
                    width={barW}
                    height={h}
                    fill={color}
                    fillOpacity={0.85}
                  />
                );
              })}
              <text
                x={cx}
                y={H - 10}
                textAnchor="middle"
                fontSize={9}
                fill="var(--muted)"
                className="font-mono"
              >
                {captureTime(bucket.start)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Status color is never carried alone: every band is named. */}
      <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[10px] tracking-[0.2em] text-muted">
        {RAMP.map(({ severity, label: name, color }) => (
          <span key={severity} className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block size-2.5"
              style={{ background: color }}
            />
            {name}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
