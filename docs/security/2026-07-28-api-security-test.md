# API security test — POST /api/contact

**Date:** 2026-07-28
**Target:** `http://localhost:3000/api/contact` (Next.js 16 route handler, dev server)
**Framework:** OWASP API Security Top 10 (2023)
**Scope:** the single public endpoint this site exposes. There is no
authentication, no session, no database and no user-owned object anywhere in
the application, so API1 (BOLA), API2 (Broken Authentication), API5 (BFLA) and
API7 (SSRF) have no attack surface to test. That is a property of the design,
not a gap in the testing.

## Method

Every case below was fired at the running endpoint with `fetch`, and every
result quoted is a real response, not a code reading. Findings were fixed and
then re-tested in the same session.

## Findings

### API-001 — Unrestricted resource consumption via unbounded request body

**Severity:** Medium · **OWASP:** API4:2023 · **Status:** FIXED

`request.json()` buffered the entire body into memory before any length check
ran. An 8 MB message was fully read and only then rejected with 422.

```
POST /api/contact   {"message": "x".repeat(8*1024*1024)}
-> 422 in 128ms   (8MB buffered first)
```

**Fix:** `readBoundedText` streams the body with a 16 KB cap and cancels the
reader the moment the cap is passed. `Content-Length` is checked first as a
cheap early reject, but the authoritative count comes from bytes actually
received, because `Content-Length` is caller-supplied and a chunked request
need not send one at all.

**Re-test:**
```
8MB with Content-Length      -> 413 PAYLOAD_TOO_LARGE in 71ms
2MB chunked, no Content-Length -> 413 PAYLOAD_TOO_LARGE
```

Aborting a large upload mid-stream resets that connection, so the client's next
keep-alive request on the same socket may fail once. That is the intended cost
of refusing to buffer the body, not a defect.

### API-002 — Rate limit bypass by rotating X-Forwarded-For

**Severity:** Medium · **OWASP:** API4:2023 · **Status:** FIXED

The per-IP limiter keyed solely on the first entry of `X-Forwarded-For`. That
header is caller-controlled unless a proxy overwrites it, so a single caller
could reset their own bucket on every request and relay without limit.

```
7 requests, X-Forwarded-For rotated per request
-> 503,503,503,503,503,503,503     (no 429 — limit never engaged)
```

**Fix:** `lib/rateLimit.ts` adds a second bucket counting every request in the
window regardless of key: 5 per IP per hour, 60 across all callers per hour.
There is no header a caller can forge to escape the global bucket. A rejected
attempt is deliberately not recorded, so a blocked caller cannot extend their
own block by hammering.

**Re-test:**
```
same IP, 7 requests      -> 503,503,503,503,503,429,429
rotated IP, 70 requests  -> 429 from the point the global bucket fills
```

The window logic is covered by six unit tests in `tests/logic.spec.ts`,
including both window boundaries and the rotation bypass itself.

**Residual, accepted:** the counters are in-memory, so each serverless instance
holds its own. Documented on the site rather than presented as distributed rate
limiting.

### API-003 — Content-Type not enforced

**Severity:** Low · **OWASP:** API8:2023 · **Status:** FIXED

The endpoint parsed any body regardless of `Content-Type`. `text/plain` is a
CORS-simple content type, so the endpoint could be POSTed to cross-origin with
no preflight at all.

```
Content-Type: text/plain  -> 503 (body parsed and accepted)
```

**Fix:** non-JSON content types are rejected with 415 before the body is read.

**Re-test:**
```
Content-Type: text/plain  -> 415 UNSUPPORTED_MEDIA_TYPE
no Content-Type           -> 415 UNSUPPORTED_MEDIA_TYPE
```

## Cases tested that passed unchanged

| Case | OWASP | Result |
|---|---|---|
| `GET`, `PUT`, `DELETE` on the endpoint | API4 | 405 for all three |
| CORS preflight from a foreign origin | API8 | 204, no `Access-Control-Allow-Origin` |
| Mass assignment (`role`, `to`, `RESEND_API_KEY` injected into the body) | API3 | Ignored; only the four known fields are destructured |
| Malformed JSON | API8 | 400 `INVALID_PAYLOAD`, no parser message echoed |
| `null` body, array body, `{name:{},email:{}}` type confusion | API8 | 422 with field codes, no crash, no stack trace |
| CRLF injection into the mail headers via `email` | API8 | 422 — the address pattern rejects all whitespace, so `\r\n` cannot pass |
| CRLF injection via `name` into the mail subject | API8 | Stripped and truncated to 80 chars before use |
| Honeypot field populated | API4 | 200 `{ok:true}`, nothing relayed |
| Error bodies across every failure path | API8 | Fixed machine codes only; no stack trace, upstream body or provider detail |

## Not applicable

API1 BOLA, API2 Broken Authentication, API5 BFLA — no authentication, no
sessions and no user-owned objects exist. API6 unrestricted access to sensitive
business flows and API7 SSRF — the endpoint accepts no URL and reaches exactly
one hardcoded upstream. API9 improper inventory — one endpoint, no versions.
API10 unsafe consumption of third-party APIs — the Resend response is checked
for `ok` only; no part of its body is parsed or reflected.
