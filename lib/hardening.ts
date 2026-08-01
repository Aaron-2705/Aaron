/**
 * Response-header self-audit.
 *
 * This is deliberately NOT a hardcoded list of green ticks. The section that
 * renders it issues a real request against this origin and feeds the real
 * response headers through `auditHeaders`, so if a header is ever dropped from
 * next.config.ts the page says so on its own.
 *
 * Pure and DOM-free on purpose: `tests/logic.spec.ts` exercises every matcher
 * branch without launching a browser.
 */

export type Matcher =
  | { kind: "equals"; value: string }
  | { kind: "includes"; value: string }
  | { kind: "includes-all"; values: readonly string[] }
  | { kind: "excludes"; value: string }
  | { kind: "absent" };

export type ControlStatus = "enforced" | "missing" | "accepted" | "exempt";

export interface HeaderControl {
  id: string;
  /** Response header the control reads. */
  header: string;
  label: string;
  /** Human statement of the requirement, shown beside the verdict. */
  requirement: string;
  match: Matcher;
  /** Why this control exists at all. */
  rationale: string;
  /**
   * Set when the control is knowingly not met. A failing match then reports
   * `accepted` instead of `missing`, and the tradeoff text is required.
   */
  acceptedRisk?: boolean;
  tradeoff?: string;
  /**
   * True when the dev server legitimately relaxes this control (Turbopack HMR).
   * Reported as `exempt` under a dev profile rather than as a failure.
   */
  devExempt?: boolean;
}

export interface AuditRow {
  control: HeaderControl;
  status: ControlStatus;
  /** The header value actually observed, or null when the header was absent. */
  observed: string | null;
}

/** Case-insensitive header lookup over a plain record. */
export function readHeader(
  headers: Record<string, string>,
  name: string,
): string | null {
  const wanted = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === wanted) return value;
  }
  return null;
}

/** Does an observed header value satisfy a matcher? */
export function matches(match: Matcher, observed: string | null): boolean {
  if (match.kind === "absent") return observed === null;
  if (observed === null) return false;
  const value = observed.toLowerCase();
  switch (match.kind) {
    case "equals":
      return value.trim() === match.value.toLowerCase();
    case "includes":
      return value.includes(match.value.toLowerCase());
    case "includes-all":
      return match.values.every((v) => value.includes(v.toLowerCase()));
    case "excludes":
      return !value.includes(match.value.toLowerCase());
  }
}

/**
 * Grade every control against a real response.
 *
 * `isDev` downgrades dev-exempt controls to `exempt` rather than letting the
 * HMR-relaxed dev server report a red failure it would never report in prod.
 */
export function auditHeaders(
  controls: readonly HeaderControl[],
  headers: Record<string, string>,
  isDev = false,
): AuditRow[] {
  return controls.map((control) => {
    const observed = readHeader(headers, control.header);
    const ok = matches(control.match, observed);
    let status: ControlStatus;
    if (ok) status = "enforced";
    else if (isDev && control.devExempt) status = "exempt";
    else if (control.acceptedRisk) status = "accepted";
    else status = "missing";
    return { control, status, observed };
  });
}

/** Count of controls actually enforced, for the summary line. */
export function summarize(rows: readonly AuditRow[]) {
  const enforced = rows.filter((r) => r.status === "enforced").length;
  const missing = rows.filter((r) => r.status === "missing").length;
  const accepted = rows.filter((r) => r.status === "accepted").length;
  const exempt = rows.filter((r) => r.status === "exempt").length;
  return { total: rows.length, enforced, missing, accepted, exempt };
}
