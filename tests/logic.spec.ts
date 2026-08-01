import { expect, test } from "@playwright/test";

import {
  analyze,
  bucketBySeverity,
  FAILED_LOGIN_RULE,
  type LogEvent,
  type Severity,
} from "@/lib/siem";
import { HEADER_CONTROLS } from "@/data/hardening";
import {
  auditHeaders,
  matches,
  readHeader,
  summarize,
  type HeaderControl,
} from "@/lib/hardening";
import { createRateLimiter } from "@/lib/rateLimit";
import { COMMAND_NAMES, runCommand, type TerminalContext } from "@/lib/terminal";

/**
 * Pure-logic specs. These never request the `page` fixture, so Playwright runs
 * them without launching a browser — a fast TDD loop for the two modules that
 * hold every branch worth testing.
 */

const ctx = (history: string[] = []): TerminalContext => ({ history });
const text = (input: string) =>
  runCommand(input, ctx())
    .lines.map((l) => l.text)
    .join("\n");

test.describe("terminal parser", () => {
  test("help lists every registered command", () => {
    const out = text("help");
    for (const name of COMMAND_NAMES) {
      expect(out, `help should mention "${name}"`).toContain(name);
    }
  });

  test("whoami prints the real owner", () => {
    expect(text("whoami")).toMatch(/dhwanit sukhadiya/i);
  });

  test("projects names both real labs", () => {
    const out = text("projects");
    expect(out).toContain("OPERATION BLACKGATE");
    expect(out).toContain("OPERATION WIRETAP");
  });

  test("project <id> prints that lab's detail", () => {
    const out = text("project blackgate");
    expect(out).toMatch(/windows server 2022/i);
    expect(out).not.toMatch(/wiretap/i);
  });

  test("project with an unknown id prints usage and the valid ids", () => {
    const out = text("project nope");
    expect(out).toMatch(/blackgate/i);
    expect(out).toMatch(/wiretap/i);
  });

  test("skills separates operational from learning tiers", () => {
    const out = text("skills");
    expect(out).toMatch(/learning/i);
    expect(out).toContain("Kali Linux");
    expect(out).toContain("Active Directory");
  });

  test("goto a real section returns a navigate action", () => {
    const result = runCommand("goto contact", ctx());
    expect(result.action).toEqual({ kind: "navigate", id: "contact" });
  });

  test("goto an unknown section does not navigate and lists valid ids", () => {
    const result = runCommand("goto nowhere", ctx());
    expect(result.action).toBeUndefined();
    expect(result.lines.map((l) => l.text).join("\n")).toContain("range");
  });

  test("clear returns a clear action", () => {
    expect(runCommand("clear", ctx()).action).toEqual({ kind: "clear" });
  });

  test("theme with a known name returns a theme action", () => {
    expect(runCommand("theme matrix", ctx()).action).toEqual({
      kind: "theme",
      name: "matrix",
    });
  });

  test("theme with an unknown name does not switch", () => {
    const result = runCommand("theme bogus", ctx());
    expect(result.action).toBeUndefined();
    expect(result.lines.map((l) => l.text).join("\n")).toMatch(/steel/i);
  });

  test("exit returns an exit action", () => {
    expect(runCommand("exit", ctx()).action).toEqual({ kind: "exit" });
  });

  test("unknown input reports command not found and suggests a near match", () => {
    const out = text("whoamii");
    expect(out).toMatch(/command not found/i);
    expect(out).toMatch(/whoami/);
  });

  test("empty and whitespace-only input produce nothing", () => {
    expect(runCommand("", ctx()).lines).toEqual([]);
    expect(runCommand("   ", ctx()).lines).toEqual([]);
    expect(runCommand("", ctx()).action).toBeUndefined();
  });

  test("history reflects the supplied context", () => {
    const out = runCommand("history", ctx(["whoami", "projects"]))
      .lines.map((l) => l.text)
      .join("\n");
    expect(out).toContain("whoami");
    expect(out).toContain("projects");
  });

  test("command parsing is case-insensitive and tolerates extra whitespace", () => {
    expect(runCommand("  GOTO   contact ", ctx()).action).toEqual({
      kind: "navigate",
      id: "contact",
    });
  });

  test("every registered command produces output or an effect, and never throws", () => {
    for (const name of COMMAND_NAMES) {
      const result = runCommand(name, ctx());
      const produced = result.lines.length > 0 || result.action !== undefined;
      expect(produced, `"${name}" should print something or perform an action`).toBe(true);
    }
  });
});

const T0 = 1_760_000_000_000;

/** Build a failed-login event `atMs` after T0 from `source`. */
function failure(id: string, atMs: number, source: string): LogEvent {
  return {
    id,
    ts: T0 + atMs,
    source,
    user: "administrator",
    action: "auth.login",
    outcome: "failure",
    message: `Failed logon for administrator from ${source}`,
    severity: "notice",
  };
}

function success(id: string, atMs: number, source: string): LogEvent {
  return {
    id,
    ts: T0 + atMs,
    source,
    user: "dsukhadiya",
    action: "auth.login",
    outcome: "success",
    message: `Successful logon from ${source}`,
    severity: "info",
  };
}

test.describe("siem detection", () => {
  test("empty input yields no alerts and nothing flagged", () => {
    const result = analyze([]);
    expect(result.alerts).toEqual([]);
    expect(result.flagged.size).toBe(0);
  });

  test("failures below the critical threshold raise only a warning", () => {
    const events = [0, 5_000, 10_000, 15_000].map((t, i) =>
      failure(`e${i}`, t, "10.10.20.55"),
    );
    const { alerts } = analyze(events);
    expect(alerts.some((a) => a.severity === "critical")).toBe(false);
    expect(alerts.some((a) => a.severity === "warning")).toBe(true);
  });

  test("a spike inside the window raises one critical alert naming the source", () => {
    const events = [0, 5_000, 10_000, 15_000, 20_000].map((t, i) =>
      failure(`e${i}`, t, "10.10.20.55"),
    );
    const { alerts, flagged } = analyze(events);
    const critical = alerts.filter((a) => a.severity === "critical");
    expect(critical).toHaveLength(1);
    expect(critical[0].source).toBe("10.10.20.55");
    expect(critical[0].count).toBeGreaterThanOrEqual(FAILED_LOGIN_RULE.criticalAt);
    expect(critical[0].windowMs).toBe(FAILED_LOGIN_RULE.windowMs);
    expect(flagged.size).toBeGreaterThanOrEqual(FAILED_LOGIN_RULE.criticalAt);
  });

  test("the window really slides: the same failures spread over 90s do not fire", () => {
    const events = [0, 22_000, 44_000, 66_000, 88_000].map((t, i) =>
      failure(`e${i}`, t, "10.10.20.55"),
    );
    const { alerts } = analyze(events);
    expect(alerts.some((a) => a.severity === "critical")).toBe(false);
  });

  test("the rule is per-source: five distinct IPs do not fire", () => {
    const events = [0, 5_000, 10_000, 15_000, 20_000].map((t, i) =>
      failure(`e${i}`, t, `10.10.20.${i + 1}`),
    );
    const { alerts } = analyze(events);
    expect(alerts.some((a) => a.severity === "critical")).toBe(false);
  });

  test("successful logons never count toward the rule", () => {
    const events = [0, 5_000, 10_000, 15_000, 20_000].map((t, i) =>
      success(`e${i}`, t, "10.10.20.55"),
    );
    expect(analyze(events).alerts).toEqual([]);
  });

  test("flagged contains the ids of the events that triggered the alert", () => {
    const events = [0, 5_000, 10_000, 15_000, 20_000].map((t, i) =>
      failure(`e${i}`, t, "10.10.20.55"),
    );
    const { flagged } = analyze(events);
    for (const e of events) expect(flagged.has(e.id)).toBe(true);
  });

  test("bucketBySeverity groups by boundary and preserves the total", () => {
    const events: LogEvent[] = [
      failure("a", 0, "10.0.0.1"),
      failure("b", 30_000, "10.0.0.1"),
      success("c", 70_000, "10.0.0.2"),
      success("d", 130_000, "10.0.0.2"),
    ];
    const buckets = bucketBySeverity(events, 60_000);
    expect(buckets).toHaveLength(3);
    expect(buckets[0].total).toBe(2);
    expect(buckets[1].total).toBe(1);
    expect(buckets[2].total).toBe(1);
    const sum = buckets.reduce((acc, b) => acc + b.total, 0);
    expect(sum).toBe(events.length);
  });

  test("bucketBySeverity counts each severity separately", () => {
    const events: LogEvent[] = [failure("a", 0, "10.0.0.1"), success("b", 1_000, "10.0.0.2")];
    const [bucket] = bucketBySeverity(events, 60_000);
    const counts = bucket.counts as Record<Severity, number>;
    expect(counts.notice).toBe(1);
    expect(counts.info).toBe(1);
    expect(counts.critical).toBe(0);
  });

  test("bucketBySeverity on empty input returns no buckets", () => {
    expect(bucketBySeverity([], 60_000)).toEqual([]);
  });

  test("the window is half-open: failures spanning exactly 60s do not fire", () => {
    // 0, 15, 30, 45, 60s -> the first and last are exactly windowMs apart, so
    // they never share a window. This pins the boundary the UI copy describes.
    const events = [0, 15_000, 30_000, 45_000, 60_000].map((t, i) =>
      failure(`e${i}`, t, "10.10.20.55"),
    );
    const { alerts } = analyze(events);
    expect(alerts.some((a) => a.severity === "critical")).toBe(false);
    expect(alerts[0]?.count).toBe(4);
  });

  test("failures 1ms inside the window do fire", () => {
    const events = [0, 15_000, 30_000, 45_000, 59_999].map((t, i) =>
      failure(`e${i}`, t, "10.10.20.55"),
    );
    const { alerts } = analyze(events);
    expect(alerts.some((a) => a.severity === "critical")).toBe(true);
  });

  test("exactly warnAt failures raise a warning, one fewer raises nothing", () => {
    const at = [0, 5_000, 10_000]
      .slice(0, FAILED_LOGIN_RULE.warnAt)
      .map((t, i) => failure(`w${i}`, t, "10.0.0.9"));
    expect(analyze(at).alerts).toHaveLength(1);
    expect(analyze(at.slice(0, -1)).alerts).toHaveLength(0);
  });

  test("analyze does not depend on input order", () => {
    const ordered = [0, 5_000, 10_000, 15_000, 20_000].map((t, i) =>
      failure(`e${i}`, t, "10.10.20.55"),
    );
    const shuffled = [ordered[3], ordered[0], ordered[4], ordered[2], ordered[1]];
    expect(analyze(shuffled).alerts[0].count).toBe(analyze(ordered).alerts[0].count);
  });

  test("bucketBySeverity tolerates unsorted input", () => {
    const events: LogEvent[] = [
      success("late", 130_000, "10.0.0.2"),
      failure("early", 0, "10.0.0.1"),
      success("mid", 70_000, "10.0.0.2"),
    ];
    const buckets = bucketBySeverity(events, 60_000);
    expect(buckets).toHaveLength(3);
    expect(buckets.reduce((a, b) => a + b.total, 0)).toBe(3);
    expect(buckets[0].counts.notice).toBe(1);
  });
});

test.describe("header self-audit", () => {
  const control = (over: Partial<HeaderControl> = {}): HeaderControl => ({
    id: "t",
    header: "x-test",
    label: "Test",
    requirement: "r",
    match: { kind: "equals", value: "DENY" },
    rationale: "why",
    ...over,
  });

  test("readHeader is case-insensitive on the header name", () => {
    const headers = { "Content-Security-Policy": "default-src 'self'" };
    expect(readHeader(headers, "content-security-policy")).toBe("default-src 'self'");
    expect(readHeader(headers, "CONTENT-SECURITY-POLICY")).toBe("default-src 'self'");
    expect(readHeader(headers, "x-nope")).toBeNull();
  });

  test("equals ignores case and surrounding whitespace", () => {
    expect(matches({ kind: "equals", value: "DENY" }, " deny ")).toBe(true);
    expect(matches({ kind: "equals", value: "DENY" }, "sameorigin")).toBe(false);
  });

  test("includes-all requires every directive", () => {
    const m = { kind: "includes-all", values: ["a=1", "b=2"] } as const;
    expect(matches(m, "a=1; b=2; c=3")).toBe(true);
    expect(matches(m, "a=1; c=3")).toBe(false);
  });

  test("excludes passes only when the token is absent", () => {
    const m = { kind: "excludes", value: "'unsafe-eval'" } as const;
    expect(matches(m, "script-src 'self' 'unsafe-eval'")).toBe(false);
    expect(matches(m, "script-src 'self'")).toBe(true);
  });

  test("'wasm-unsafe-eval' is not mistaken for 'unsafe-eval'", () => {
    // The quoted-token form is load-bearing: a bare "unsafe-eval" substring
    // check would flag the WASM source expression, which permits WebAssembly
    // compilation only and does not restore eval(). Getting this wrong would
    // make the site report a failure it does not have.
    const m = { kind: "excludes", value: "'unsafe-eval'" } as const;
    expect(matches(m, "script-src 'self' 'wasm-unsafe-eval'")).toBe(true);
  });

  test("absent is the only matcher a null header can satisfy", () => {
    expect(matches({ kind: "absent" }, null)).toBe(true);
    expect(matches({ kind: "absent" }, "Next.js")).toBe(false);
    expect(matches({ kind: "equals", value: "DENY" }, null)).toBe(false);
    expect(matches({ kind: "includes", value: "x" }, null)).toBe(false);
    expect(matches({ kind: "includes-all", values: ["x"] }, null)).toBe(false);
    expect(matches({ kind: "excludes", value: "x" }, null)).toBe(false);
  });

  test("a satisfied control reports enforced", () => {
    const [row] = auditHeaders([control()], { "X-Test": "DENY" });
    expect(row.status).toBe("enforced");
    expect(row.observed).toBe("DENY");
  });

  test("a plain failure reports missing and surfaces what was observed", () => {
    const [row] = auditHeaders([control()], { "x-test": "SAMEORIGIN" });
    expect(row.status).toBe("missing");
    expect(row.observed).toBe("SAMEORIGIN");
  });

  test("acceptedRisk downgrades a failure rather than hiding it", () => {
    const [row] = auditHeaders([control({ acceptedRisk: true })], {});
    expect(row.status).toBe("accepted");
  });

  test("devExempt only applies under the dev profile, and outranks acceptedRisk", () => {
    const c = control({ devExempt: true, acceptedRisk: true });
    expect(auditHeaders([c], {}, true)[0].status).toBe("exempt");
    expect(auditHeaders([c], {}, false)[0].status).toBe("accepted");
  });

  test("summarize partitions every row exactly once", () => {
    const rows = auditHeaders(
      [
        control({ id: "a" }),
        control({ id: "b", header: "x-missing" }),
        control({ id: "c", header: "x-missing", acceptedRisk: true }),
        control({ id: "d", header: "x-missing", devExempt: true }),
      ],
      { "x-test": "DENY" },
      true,
    );
    const s = summarize(rows);
    expect(s).toEqual({ total: 4, enforced: 1, missing: 1, accepted: 1, exempt: 1 });
  });

  test("every shipped control names a header that next.config.ts actually sets", () => {
    // Guards the drift the section is designed to catch: a control whose
    // header is not in this list can never be graded against a real response.
    const served = [
      "content-security-policy",
      "x-frame-options",
      "x-content-type-options",
      "referrer-policy",
      "permissions-policy",
      "strict-transport-security",
      "cross-origin-opener-policy",
      "cross-origin-resource-policy",
      "x-powered-by",
    ];
    for (const c of HEADER_CONTROLS) {
      expect(served, `${c.id} reads an unserved header`).toContain(c.header);
    }
  });

  test("every acceptedRisk control explains the tradeoff", () => {
    for (const c of HEADER_CONTROLS) {
      if (c.acceptedRisk) expect(c.tradeoff, `${c.id} has no tradeoff text`).toBeTruthy();
    }
  });
});

test.describe("contact rate limiter", () => {
  const make = () => createRateLimiter({ perKey: 3, global: 5, windowMs: 1000 });

  test("allows up to the per-key limit then rejects", () => {
    const l = make();
    expect([0, 1, 2].map((i) => l.check("a", i))).toEqual(["ok", "ok", "ok"]);
    expect(l.check("a", 3)).toBe("per-key");
  });

  test("a rejected attempt is not recorded, so it cannot push the window", () => {
    const l = make();
    for (const t of [0, 1, 2]) l.check("a", t);
    // Hammering at t=3..900 must not extend the block past the original window.
    for (let t = 3; t < 900; t++) expect(l.check("a", t)).toBe("per-key");
    // The first three land at 0,1,2; once t exceeds 1000 they age out in order.
    expect(l.check("a", 1001)).toBe("ok");
  });

  test("keys are independent up to the global ceiling", () => {
    const l = make();
    expect(l.check("a", 0)).toBe("ok");
    expect(l.check("b", 0)).toBe("ok");
    expect(l.check("c", 0)).toBe("ok");
  });

  test("a limiter with only a per-key ceiling has no global one", () => {
    const l = createRateLimiter({ perKey: 2, windowMs: 1000 });
    // 50 distinct keys, no global cap configured: none may be refused.
    for (let i = 0; i < 50; i++) expect(l.check(`ip-${i}`, i)).toBe("ok");
  });

  test("a limiter with only a global ceiling ignores the key entirely", () => {
    // This is how the outbound-mail budget is enforced: one bucket, no key.
    const l = createRateLimiter({ global: 3, windowMs: 1000 });
    expect([0, 1, 2].map((t) => l.check("relay", t))).toEqual(["ok", "ok", "ok"]);
    expect(l.check("relay", 3)).toBe("global");
    // A different key does not buy a fresh allowance.
    expect(l.check("other", 4)).toBe("global");
  });

  test("rotating the key cannot escape the global ceiling", () => {
    // This is the exact bypass found against the live endpoint: one caller
    // forging a fresh X-Forwarded-For per request.
    const l = make();
    const results = Array.from({ length: 8 }, (_, i) => l.check(`ip-${i}`, i));
    expect(results.slice(0, 5).every((r) => r === "ok")).toBe(true);
    expect(results.slice(5)).toEqual(["global", "global", "global"]);
  });

  test("the global window rolls forward too", () => {
    const l = make();
    for (let i = 0; i < 5; i++) l.check(`ip-${i}`, i);
    expect(l.check("ip-x", 6)).toBe("global");
    // All five recorded hits sit at t=0..4, so past t=1004 they have all aged out.
    expect(l.check("ip-x", 1005)).toBe("ok");
  });

  test("the boundary is exclusive on both sides", () => {
    const l = createRateLimiter({ perKey: 1, global: 99, windowMs: 1000 });
    expect(l.check("a", 0)).toBe("ok");
    // t=1000 is exactly windowMs later: windowStart is 0, and the filter keeps
    // strictly-greater timestamps, so the hit at 0 has aged out.
    expect(l.check("a", 1000)).toBe("ok");
    expect(l.check("a", 1500)).toBe("per-key");
  });
});
