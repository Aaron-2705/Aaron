# DAST baseline — AARON portfolio

**Date:** 2026-07-28
**Target:** `http://localhost:3000` — **production build** (`next build` +
`next start`), not the dev server
**Result:** 0 FAIL, 0 WARN, 5 active probes clean, 23 URLs crawled

## Why a production build

The dev server relaxes the CSP with `'unsafe-eval'` for Turbopack hot reload.
Scanning it would report a finding that does not exist in what ships. Confirmed
on the scanned build:

```
script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'
has 'unsafe-eval': false
x-powered-by:      (absent)
/api/* cache-control: no-store, max-age=0
```

## Tooling

Docker is not installed on this machine, so the ZAP container could not run
locally. Both paths are wired:

- `.github/workflows/dast.yml` runs `zaproxy/action-baseline@v0.12.0` against a
  production build, tuned by `.zap/rules.tsv`, on a weekly schedule and on
  manual dispatch.
- `scripts/dast-baseline.mjs` implements the same passive rule IDs and runs
  anywhere Node runs, so the gate is never skipped for want of a container. It
  runs as a second CI job and was the tool used for this report.

This is a substitution, stated plainly. The local scanner is not ZAP and does
not claim ZAP's coverage; it covers the passive header and disclosure rules plus
a small set of safe active probes.

## Passive rules evaluated

| Rule | Check | Result |
|---|---|---|
| 10015 | Cache-control on `/api/*` | PASS — `no-store, max-age=0` |
| 10017 | Cross-domain JS inclusion | PASS — zero third-party script |
| 10019 | Content-Type present | PASS |
| 10020 | Anti-clickjacking | PASS — `X-Frame-Options: DENY` + `frame-ancestors 'none'` |
| 10021 | X-Content-Type-Options | PASS — `nosniff` |
| 10023 / 90022 | Debug / application error disclosure | PASS (see tuning below) |
| 10035 | Strict-Transport-Security | PASS |
| 10036 | Server version leak | PASS |
| 10037 | X-Powered-By | PASS — header removed via `poweredByHeader: false` |
| 10038 | CSP present | PASS |
| 10054 | Cookie SameSite | N/A — the app sets no cookies |
| 10063 | Permissions-Policy | PASS |
| 10098 | Cross-domain misconfiguration | PASS — no `Access-Control-Allow-Origin` |

## Active probes

| Probe | Result |
|---|---|
| Path traversal and dotfile exposure (`/.env`, `/.env.local`, `/.git/config`, `/package.json`, encoded `..%2f`) | PASS — all 404 |
| Reflected XSS via query string | PASS — no query parameter is reflected into the document |
| Open redirect | PASS |
| HTTP method tampering on `/api/contact` (GET/PUT/DELETE/PATCH) | PASS — 405 on all |
| SQL injection payload into the contact fields | PASS — no database exists; no 5xx |

## Tuning: one rule was wrong, not one finding

The first run reported **3 FAILs on rule 90022 (Application Error Disclosure)**.
All three were false positives, and the cause was the rule, not the site:

```
/                                    "No stack trace, upstream body or provider detail is ev..."
/_next/static/chunks/2kqrbujyxigm8.js "To get a more detailed stack trace and pinpoint the issue..."
/_next/static/chunks/04p4ad5rrbj2b.js (the same hardening copy, in the RSC payload)
```

The rule matched the **phrase** "stack trace" rather than the **shape** of one,
so it fired on this site's own hardening copy promising that no stack trace is
ever echoed, and on a React error-message string inside a bundle.

Rewritten to match structural patterns only (a V8 frame on its own line, a
Python traceback header, `ECONNREFUSED`/`ENOENT:`, a named error followed by a
frame), with minified script responses exempt because vendor error-handling code
legitimately carries those tokens as string literals.

**The tightened rule was then re-verified against synthetic inputs**, so that
"0 findings" means the rule still works rather than that it was silenced:

| Input | Detected | Expected |
|---|---|---|
| Node `TypeError` + `at handler (/app/route.ts:42:11)` | yes | yes |
| Python `Traceback (most recent call last):` | yes | yes |
| `Error: connect ECONNREFUSED 127.0.0.1:5432` | yes | yes |
| `ENOENT: no such file or directory, open '/srv/app/.env'` | yes | yes |
| This site's copy about not echoing stack traces | no | no |
| React's "more detailed stack trace" hint string | no | no |
| Ordinary page copy containing an IP and a port | no | no |

7/7. Re-scan after the fix: **0 FAIL, 0 WARN**.

## Rules deliberately not enforced

Recorded in `.zap/rules.tsv` with reasons rather than left at defaults:

- **10202 Absence of Anti-CSRF Tokens — IGNORE.** The single form posts JSON to a
  same-origin route that now requires `application/json`, which is not a
  CORS-simple content type, so it cannot be submitted cross-origin without a
  preflight that no `Access-Control-Allow-Origin` will ever satisfy. A token
  would add ceremony, not security.
- **10096 Timestamp Disclosure — IGNORE.** The SIEM demo renders synthetic
  sample-log timestamps on purpose, and says so on the page.
- **10003 Vulnerable JS Library — IGNORE.** Covered properly by `npm audit` and
  the SBOM correlation in `.github/workflows/security.yml`.
- **10055 CSP `unsafe-inline` — WARN, not FAIL.** A real, accepted limitation,
  documented on the site itself as an ACCEPTED RISK with its tradeoff.
