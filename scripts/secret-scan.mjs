#!/usr/bin/env node
/**
 * Local secret scan over the full git history.
 *
 * Gitleaks is the enforcement mechanism (see .gitleaks.toml and the CI job);
 * this is the fallback that runs where the gitleaks binary is not installed,
 * so the check is never simply skipped. It applies the same project-specific
 * rules from .gitleaks.toml plus the highest-signal defaults, over every blob
 * in every commit rather than just the working tree, because a secret that was
 * committed and later deleted is still a leaked secret.
 *
 *   node scripts/secret-scan.mjs           # scan all history
 *   node scripts/secret-scan.mjs --staged  # pre-commit: staged content only
 *
 * Exits 1 on any finding.
 */

import { execFileSync } from "node:child_process";

const RULES = [
  { id: "resend-api-key", re: /\bre_[A-Za-z0-9_-]{16,}\b/g },
  { id: "aws-access-key-id", re: /\b(?:A3T[A-Z0-9]|AKIA|ASIA|ABIA|ACCA)[A-Z0-9]{16}\b/g },
  { id: "private-key", re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/g },
  { id: "github-token", re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g },
  { id: "slack-token", re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g },
  { id: "stripe-key", re: /\b[sr]k_(?:live|test)_[A-Za-z0-9]{20,}\b/g },
  { id: "google-api-key", re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { id: "jwt", re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g },
  {
    id: "generic-bearer-token",
    re: /authorization[ \t]*[:=][ \t]*['"]?bearer[ \t]+[A-Za-z0-9._-]{16,}/gi,
  },
  {
    // [ \t] not \s: \s matches newlines, so an EMPTY assignment would swallow
    // the line break and match the next line's key as its value. Caught by
    // planting a secret and confirming .env.example did not also fire.
    id: "contact-env-assignment",
    re: /\b(?:RESEND_API_KEY|CONTACT_TO_EMAIL|CONTACT_FROM_EMAIL)[ \t]*[:=][ \t]*['"]?[^\s'"#]+/gi,
  },
];

/** Mirrors the [allowlist] block in .gitleaks.toml. */
const ALLOWED_PATHS = [
  /^public\/draco\//,
  /^public\/models\/.*\.glb$/,
  /^public\/geo\/.*\.json$/,
  /^package-lock\.json$/,
  /^\.next\//,
  /^node_modules\//,
  /^docs\/security\/sbom\.cdx\.json$/,
  // The scanner's own rule table is a list of patterns, not credentials.
  /^scripts\/secret-scan\.mjs$/,
  /^\.gitleaks\.toml$/,
];

const ALLOWED_MATCHES = [
  /^(?:RESEND_API_KEY|CONTACT_TO_EMAIL|CONTACT_FROM_EMAIL)\s*=\s*$/i,
  /onboarding@resend\.dev/,
  /dhwanitsukhadiya685@gmail\.com/,
];

const git = (...args) =>
  execFileSync("git", args, { encoding: "utf8", maxBuffer: 512 * 1024 * 1024 });

// The escape, NOT a literal NUL byte: embedding the raw byte makes git treat
// this source file itself as binary, which kills its diffs and its greps.
const isBinary = (content) => content.includes(String.fromCharCode(0));

function scan(path, content, where, findings) {
  if (ALLOWED_PATHS.some((p) => p.test(path))) return;
  if (isBinary(content)) return;
  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    for (const m of content.matchAll(rule.re)) {
      if (ALLOWED_MATCHES.some((a) => a.test(m[0]))) continue;
      const line = content.slice(0, m.index).split("\n").length;
      findings.push({ rule: rule.id, path, line, where, sample: m[0].slice(0, 24) });
    }
  }
}

const staged = process.argv.includes("--staged");
const findings = [];
let scanned = 0;

if (staged) {
  const files = git("diff", "--cached", "--name-only", "--diff-filter=ACM")
    .split("\n")
    .filter(Boolean);
  for (const path of files) {
    let content;
    try {
      content = git("show", `:${path}`);
    } catch {
      continue;
    }
    scanned++;
    scan(path, content, "staged", findings);
  }
} else {
  // Every blob reachable from any commit, so deleted-but-committed secrets
  // are still caught.
  const seen = new Set();
  const commits = git("rev-list", "--all").split("\n").filter(Boolean);
  for (const commit of commits) {
    const entries = git("ls-tree", "-r", "--full-tree", commit).split("\n").filter(Boolean);
    for (const entry of entries) {
      const [meta, path] = entry.split("\t");
      const sha = meta.split(" ")[2];
      const key = `${sha}:${path}`;
      if (seen.has(key)) continue;
      seen.add(key);
      let content;
      try {
        content = git("cat-file", "-p", sha);
      } catch {
        continue;
      }
      scanned++;
      scan(path, content, commit.slice(0, 8), findings);
    }
  }
}

if (findings.length === 0) {
  console.log(`secret-scan: clean (${scanned} blobs scanned, ${RULES.length} rules)`);
  process.exit(0);
}

console.error(`secret-scan: ${findings.length} finding(s)\n`);
for (const f of findings) {
  console.error(`  [${f.rule}] ${f.path}:${f.line} (${f.where})  ${f.sample}...`);
}
process.exit(1);
