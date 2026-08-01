# Supply chain and secret hygiene review

**Date:** 2026-07-28
**Scope:** `aaron/` — 29 declared dependencies, 517 lockfile entries, 87
production components, full git history (431 unique blobs).

## 1. Secret scanning

**Control:** `.gitleaks.toml` (extends the upstream default ruleset, plus three
project rules for the Resend key, contact env assignments and hardcoded bearer
tokens), enforced by `.github/workflows/security.yml` on every push and pull
request with `fetch-depth: 0`, and locally by `.githooks/pre-commit`.

The gitleaks binary is not installed on the development machine, so
`scripts/secret-scan.mjs` implements the same project rules plus the
highest-signal defaults and runs over **every blob in every commit**, not just
the working tree — a secret that was committed and later deleted is still
leaked. Both run in CI; the fallback exists so the check is never skipped.

**Result: clean.** 431 blobs, 10 rules, zero findings.

**The scanner was verified rather than trusted.** A throwaway repository was
seeded with a Resend key in `.env.local`, an AWS access key ID and a GitHub PAT,
then the `.env.local` was `git rm --cached`ed and committed again so the secret
survived only in history.

| Expectation | Result |
|---|---|
| Resend key found in a commit where the file was later deleted | Found |
| AWS access key ID found | Found |
| GitHub PAT found | Found |
| `.env.example` with empty values NOT flagged | Initially flagged — **bug, fixed** |
| `onboarding@resend.dev` NOT flagged | Correctly ignored |

The false positive was a real defect in the rule: `\s*` matches newlines, so a
key name followed by an equals sign and *no* value swallowed the line break and
reported the **next** line's key as its value. Changed to `[ \t]*` in both the
scanner and `.gitleaks.toml`. Re-tested: 4 true positives, 0 false positives.

The pre-commit hook then blocked the commit of this very document, because an
earlier draft spelled that example out literally. The rule was left strict and
the prose was reworded, which is the correct way round.

**Repository state:** `.env*` is gitignored with a `!.env.example` exception;
`git ls-files` confirms `.env.example` is the only env file ever tracked, and it
ships every key blank.

## 2. Dependency confusion

**Control:** `scripts/dependency-confusion.mjs`, wired into CI.

All 29 declared names resolve on the public registry (HTTP 200), so there are no
internal names an attacker could claim. There is no `.npmrc` and no private or
merged feed, which removes the substitution precondition entirely rather than
mitigating it.

The script additionally asserts lockfile provenance: **all 517 entries resolve
from `https://registry.npmjs.org/` and every one carries an `integrity` hash**
(`lockfileVersion: 3`). A substituted host or a hash-less tarball fails CI.

**Result: clean.**

## 3. SBOM and vulnerability correlation

**SBOM:** `docs/security/sbom.cdx.json`, CycloneDX 1.5, 87 production components
(`npm sbom --sbom-format cyclonedx --omit dev`). CI regenerates it and fails if
it has drifted from the lockfile.

`syft` and `grype` are not available on this machine, and the NVD keyless API
allows 5 requests per 30 seconds (~9 minutes for 87 components). Correlation was
run against **OSV.dev's batch API by PURL** instead, which aggregates GHSA and
NVD for the npm ecosystem and needs no key. This is a substitution, stated
plainly rather than glossed over.

**Two independent tools, identical result.** OSV and `npm audit` both report
exactly `postcss` and `sharp`, and nothing else, across the production tree.

### Finding SC-001 — Next.js 16.2.10 carried nine advisories — FIXED

`npm audit` reported nine advisories against Next 16.2.10 directly, including
SSRF in Server Actions on custom servers (GHSA-89xv-2m56-2m9x), SSRF via
attacker-controlled rewrite hostnames (GHSA-p9j2-gv94-2wf4), two cache-confusion
issues, an unbounded Server Action payload, and unauthenticated disclosure of
internal Server Function endpoints (GHSA-955p-x3mx-jcvp).

`fixAvailable` was **16.2.12, not a semver-major**. Upgraded. All nine direct
advisories are gone; `next` is now flagged only transitively through the
`postcss` and `sharp` it bundles.

This supersedes the note in `PROGRESS.md` that the postcss finding had "no
upstream fix" — that was true when written and is no longer true.

### Finding SC-002 — sharp / libvips, unreachable — SURFACE REMOVED

`sharp@0.34.5` inherits four libvips CVEs (GHSA-f88m-g3jw-g9cj). No fixed
version is reachable from Next 16.2.12's tree.

Exploitation requires feeding a malicious image to sharp. The application uses
`next/image` **nowhere** and serves no remote images, and with no
`images.remotePatterns` configured the optimizer rejects foreign URLs (verified:
400). But `/_next/image` was still live and still piped local files through
sharp:

```
GET /_next/image?url=%2Fprojects%2Fproject-1.png&w=640&q=75  ->  200 image/png
```

That is dead attack surface with no callers, so it was removed rather than
merely argued away: `images: { unoptimized: true }` in `next.config.ts`.

```
after:  /_next/image?...                ->  404
        /projects/project-1.png         ->  200 image/png   (unaffected)
```

**Residual risk: none reachable.** sharp remains installed as a Next dependency
but has no code path to it.

### Finding SC-003 — postcss, build-time only — ACCEPTED

Three advisories, the highest being path traversal and arbitrary `.map` file
disclosure via an attacker-controlled `sourceMappingURL` in a CSS comment
(GHSA-r28c-9q8g-f849, affects `<=8.5.17`; the bundled version is 8.4.31). No
fixed version is reachable from Next 16.2.12.

All three require postcss to process **attacker-controlled CSS**. This project's
only stylesheet is first-party (`app/globals.css`), compiled at build time on a
trusted machine. `next start` does not run postcss at request time, so the
component is absent from the request path entirely.

**Accepted.** Re-evaluate when Next ships a postcss bump; CI's weekly schedule
exists to surface that.

### Finding SC-004 — dev-only eslint chain — ACCEPTED

Eight `high` advisories in `eslint`, `eslint-config-next`, `minimatch` and
`brace-expansion`, all reducing to one DoS via unbounded brace expansion
(GHSA-mh99-v99m-4gvg). `fixAvailable` requires `eslint@10` and
`eslint-config-next@0.2.4`, both semver-major.

These are `devDependencies`. They are absent from the SBOM (`--omit dev`), never
reach a visitor, and process only this repository's own file globs — there is no
untrusted input to expand. CI audits with `--omit dev` for exactly this reason.

**Accepted.** Revisit when `eslint-config-next` supports eslint 10 without a
breaking upgrade.

## 4. Install-script inventory

26 packages in the tree declare lifecycle hooks. 24 are `prepare`, which npm
runs only for git and local dependencies, never for registry tarballs — noise.
The two that execute on `npm ci` are `sharp` (`install: node install/check.js`,
fetching its prebuilt native binary) and `unrs-resolver`
(`postinstall: node postinstall.js`, same pattern). Both are well-known
native-binary packages pulled in by Next and its lint tooling, and both are
integrity-pinned in the lockfile.

## 5. Unused dependencies

`vanta` is not present. Every declared dependency has at least one import:
`cobe` (`TransmissionGlobe`), `ogl` (`vendor/Aurora`), `d3-force`
(`SkillsConstellation`), `d3-geo` (`OriginGlobe`), `@react-three/postprocessing`
(`Effects`), `gsap`, `lenis`. Nothing to remove.

## Summary

| Check | Result |
|---|---|
| Secret scan, full history | Clean (431 blobs) — and the scanner itself verified against planted secrets |
| Dependency confusion | Clean (29/29 public, no private feed) |
| Lockfile provenance | Clean (517/517 npmjs.org + integrity) |
| Production advisories | 9 fixed by upgrade, 1 surface removed, 1 accepted (build-time only) |
| Dev-only advisories | 8 accepted, documented, excluded from the CI gate |
