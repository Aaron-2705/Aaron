#!/usr/bin/env node
/**
 * Dependency-confusion check.
 *
 * Every name declared in package.json must already exist on the public npm
 * registry. A declared name that does NOT exist publicly is one an attacker can
 * register, and a build that resolves from a merged public/private feed would
 * then pull theirs on the next install.
 *
 * Also asserts that every lockfile entry resolves from registry.npmjs.org and
 * carries an integrity hash, so a substituted host or an unverifiable tarball
 * fails the check rather than being installed quietly.
 *
 * Exits 1 on any finding.
 */

import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const lock = JSON.parse(
  readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"),
);

const names = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.devDependencies ?? {}),
  ...Object.keys(pkg.optionalDependencies ?? {}),
];

const findings = [];

// 1. Claimable names.
for (const name of names) {
  const url = `https://registry.npmjs.org/${name.replace("/", "%2f")}`;
  let status = 0;
  try {
    status = (await fetch(url, { method: "HEAD" })).status;
  } catch (error) {
    findings.push(`could not resolve "${name}": ${error.message}`);
    continue;
  }
  if (status === 404) {
    findings.push(`CLAIMABLE: "${name}" does not exist on the public registry`);
  } else if (status !== 200) {
    findings.push(`unexpected status ${status} for "${name}"`);
  }
}

// 2. Lockfile provenance.
const ALLOWED_HOST = "https://registry.npmjs.org/";
let checked = 0;
for (const [path, entry] of Object.entries(lock.packages ?? {})) {
  if (!path || !entry.resolved) continue;
  checked++;
  if (!entry.resolved.startsWith(ALLOWED_HOST)) {
    findings.push(`FOREIGN HOST: ${path} resolves from ${entry.resolved}`);
  }
  if (!entry.integrity) {
    findings.push(`NO INTEGRITY: ${path} has no subresource hash`);
  }
}

if (findings.length > 0) {
  console.error(`dependency-confusion: ${findings.length} finding(s)\n`);
  for (const f of findings) console.error(`  ${f}`);
  process.exit(1);
}

console.log(
  `dependency-confusion: clean (${names.length} declared names all public, ` +
    `${checked} lockfile entries pinned to ${ALLOWED_HOST} with integrity hashes)`,
);
