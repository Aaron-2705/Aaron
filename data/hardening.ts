import type { HeaderControl } from "@/lib/hardening";

/**
 * The controls the live self-audit grades.
 *
 * Every entry here must correspond to a header actually set in
 * `next.config.ts`. If the two drift apart the section renders MISSING, which
 * is the point: the page is a check on the config, not a description of it.
 */
export const HEADER_CONTROLS: readonly HeaderControl[] = [
  {
    id: "csp",
    header: "content-security-policy",
    label: "Content Security Policy",
    requirement: "default-src 'self' with object, frame-ancestors, base-uri and form-action locked",
    match: {
      kind: "includes-all",
      values: [
        "default-src 'self'",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ],
    },
    rationale:
      "The single highest-leverage control. Even if an injection lands, there is no origin it can call home to, no plugin it can spawn, and no form it can retarget.",
  },
  {
    id: "csp-no-eval",
    header: "content-security-policy",
    label: "No eval() in scripts",
    requirement: "script-src omits 'unsafe-eval'",
    match: { kind: "excludes", value: "'unsafe-eval'" },
    devExempt: true,
    rationale:
      "Removes the shortest path from a string-injection bug to arbitrary code execution. Draco's WASM decoder needs 'wasm-unsafe-eval', which permits WebAssembly compilation only and does not restore eval().",
    tradeoff:
      "The dev server re-enables it for Turbopack hot reload, so this row reads EXEMPT under the development profile and ENFORCED in a production build.",
  },
  {
    id: "csp-inline",
    header: "content-security-policy",
    label: "No inline scripts",
    requirement: "script-src omits 'unsafe-inline'",
    match: { kind: "excludes", value: "'unsafe-inline'" },
    acceptedRisk: true,
    rationale:
      "Nonce or hash based script allowlisting is what a CSP is really for. Without it, an injected <script> tag would still run.",
    tradeoff:
      "Accepted, not overlooked. Next.js ships an inline bootstrap script and framer-motion writes inline styles, so removing 'unsafe-inline' needs nonce plumbing through a middleware layer this static site does not have. The residual risk is bounded by the fact that the only untrusted input on the site is the contact form, which is never reflected back into the page.",
  },
  {
    id: "xfo",
    header: "x-frame-options",
    label: "Clickjacking",
    requirement: "X-Frame-Options: DENY",
    match: { kind: "equals", value: "DENY" },
    rationale:
      "Belt to the CSP frame-ancestors braces. Nothing on this origin may be framed, so no invisible overlay can borrow a click.",
  },
  {
    id: "nosniff",
    header: "x-content-type-options",
    label: "MIME sniffing",
    requirement: "X-Content-Type-Options: nosniff",
    match: { kind: "equals", value: "nosniff" },
    rationale:
      "Stops a browser from re-guessing a response's type and executing an asset that was served as something inert.",
  },
  {
    id: "referrer",
    header: "referrer-policy",
    label: "Referrer leakage",
    requirement: "strict-origin-when-cross-origin",
    match: { kind: "equals", value: "strict-origin-when-cross-origin" },
    rationale:
      "Outbound links carry the origin, never the full path. Nothing about which section a visitor was reading leaves the site.",
  },
  {
    id: "permissions",
    header: "permissions-policy",
    label: "Device APIs",
    requirement: "camera, microphone, geolocation and payment all denied",
    match: {
      kind: "includes-all",
      values: ["camera=()", "microphone=()", "geolocation=()", "payment=()"],
    },
    rationale:
      "This site needs no device access whatsoever, so every powerful feature is switched off explicitly rather than left at the browser default.",
  },
  {
    id: "hsts",
    header: "strict-transport-security",
    label: "Transport downgrade",
    requirement: "max-age 2 years, includeSubDomains, preload",
    match: { kind: "includes", value: "max-age=63072000" },
    rationale:
      "After the first visit the browser refuses to speak plain HTTP to this host at all, which closes the SSL-strip window on hostile networks.",
  },
  {
    id: "coop",
    header: "cross-origin-opener-policy",
    label: "Cross-origin isolation",
    requirement: "same-origin",
    match: { kind: "equals", value: "same-origin" },
    rationale:
      "Severs window.opener, so a page that opens this one cannot reach back into its browsing context.",
  },
  {
    id: "corp",
    header: "cross-origin-resource-policy",
    label: "Resource embedding",
    requirement: "same-origin",
    match: { kind: "equals", value: "same-origin" },
    rationale:
      "Other origins cannot pull this site's assets into their own documents.",
  },
  {
    id: "powered-by",
    header: "x-powered-by",
    label: "Version disclosure",
    requirement: "header absent entirely",
    match: { kind: "absent" },
    rationale:
      "Free reconnaissance denied. A scanner has to work out the framework rather than read it off a header.",
  },
];

export interface PipelineControl {
  id: string;
  label: string;
  detail: string;
  evidence: string;
}

/**
 * Controls that cannot be proven from a response header. These are stated as
 * claims about the build and the code, and each names where to verify it,
 * rather than being dressed up as a live check.
 */
export const PIPELINE_CONTROLS: readonly PipelineControl[] = [
  {
    id: "api-validation",
    label: "Server-side input validation",
    detail:
      "The contact endpoint re-validates name, email and message lengths on the server and returns field-scoped codes. Client-side checks are treated as a convenience, never as a control.",
    evidence: "app/api/contact/route.ts",
  },
  {
    id: "api-honeypot",
    label: "Honeypot + two-tier rate limit",
    detail:
      "A hidden field no human ever fills silently absorbs bots. Submissions are capped at 5 per IP per hour and 60 across all callers, because the per-IP key comes from a header a caller can forge. Testing this endpoint is what found that bypass.",
    evidence: "lib/rateLimit.ts",
  },
  {
    id: "api-body-cap",
    label: "Bounded request body",
    detail:
      "The body is read as a stream and cut off at 16 KB rather than parsed and then measured, so an oversized upload is dropped instead of buffered. Non-JSON content types are refused outright, which closes the no-preflight cross-origin POST.",
    evidence: "app/api/contact/route.ts",
  },
  {
    id: "api-errors",
    label: "Opaque error responses",
    detail:
      "Failures return fixed machine codes such as DELIVERY_FAILED. No stack trace, upstream body or provider detail is ever echoed to the caller.",
    evidence: "app/api/contact/route.ts",
  },
  {
    id: "secrets",
    label: "Secrets never in git",
    detail:
      "The API key lives only in .env.local, which is gitignored. A committed gitleaks config plus a pre-commit hook and a CI job scan every commit and every pull request.",
    evidence: ".gitleaks.toml",
  },
  {
    id: "supply-chain",
    label: "Supply chain review",
    detail:
      "Every direct dependency was checked for dependency-confusion exposure, an SBOM is generated from the lockfile, and npm audit runs in CI. Findings are recorded rather than silently ignored.",
    evidence: "docs/security/",
  },
  {
    id: "api-test",
    label: "The endpoint was actually attacked",
    detail:
      "This endpoint was tested against the OWASP API Top 10 rather than assumed safe: method tampering, mass assignment, type confusion, CRLF injection into the mail headers, oversized bodies and rate-limit evasion. Three findings came out of it, all fixed and re-tested, and the report keeps the failing responses in it.",
    evidence: "docs/security/2026-07-28-api-security-test.md",
  },
  {
    id: "no-third-party",
    label: "Zero third-party runtime",
    detail:
      "No CDN scripts, no analytics, no font or tag manager calls. Fonts, the Draco decoder and the world geometry are all self-hosted, which is why default-src 'self' can stay closed.",
    evidence: "public/",
  },
];
