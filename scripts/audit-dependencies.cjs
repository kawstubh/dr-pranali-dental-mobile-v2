#!/usr/bin/env node
"use strict";

// npm audit has no native .auditignore support. This wrapper reads the
// repository's explicit advisory allowlist and fails closed on any unlisted
// high/critical advisory. Run it from either the Patient or Doctor app root.

const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const policyPath = path.resolve(__dirname, "..", ".auditignore");
const policy = JSON.parse(fs.readFileSync(policyPath, "utf8"));
if (policy.reviewAfter && new Date(`${policy.reviewAfter}T23:59:59Z`) < new Date()) {
  console.error(`The .auditignore exception review date has expired: ${policy.reviewAfter}`);
  process.exit(2);
}
const allowed = policy.advisories || {};

let auditText;
try {
  auditText = execSync("npm audit --omit=dev --json", {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 20 * 1024 * 1024,
  });
} catch (error) {
  // npm audit returns exit code 1 when it finds advisories, while still
  // returning the JSON report on stdout.
  auditText = error && typeof error.stdout === "string" ? error.stdout : "";
  if (!auditText.trim()) {
    console.error("Dependency audit failed before a JSON report was produced.");
    if (error && error.stderr) console.error(String(error.stderr));
    process.exit(2);
  }
}

let report;
try {
  report = JSON.parse(auditText);
} catch {
  console.error("Dependency audit did not return valid JSON; refusing to waive anything.");
  process.exit(2);
}

const vulnerabilities = report.vulnerabilities || {};
const memo = new Map();

function advisoryLeaves(packageName, stack = new Set()) {
  if (stack.has(packageName)) return [];
  if (memo.has(packageName) && stack.size === 0) return memo.get(packageName);
  const vulnerability = vulnerabilities[packageName];
  if (!vulnerability) return [];

  const nextStack = new Set(stack);
  nextStack.add(packageName);
  const leaves = [];
  for (const item of vulnerability.via || []) {
    if (typeof item === "string") {
      leaves.push(...advisoryLeaves(item, nextStack));
    } else if (item && typeof item === "object" && item.url) {
      leaves.push({ name: item.name, url: item.url, title: item.title });
    }
  }
  if (stack.size === 0) memo.set(packageName, leaves);
  return leaves;
}

const blocking = [];
const waived = [];
for (const [packageName, vulnerability] of Object.entries(vulnerabilities)) {
  if (!["high", "critical"].includes(vulnerability.severity)) continue;
  const leaves = advisoryLeaves(packageName);
  const fullyCovered =
    leaves.length > 0 &&
    leaves.every((item) => {
      const exception = allowed[item.url];
      return Boolean(exception && exception.package === item.name);
    });

  if (fullyCovered) {
    waived.push({ packageName, severity: vulnerability.severity, nodes: vulnerability.nodes || [] });
  } else {
    blocking.push({
      packageName,
      severity: vulnerability.severity,
      advisories: [...new Set(leaves.map((item) => item.url || item.name || "unknown"))],
      nodes: vulnerability.nodes || [],
    });
  }
}

for (const item of waived) {
  console.log(`WAIVED (reviewed toolchain advisory only): ${item.packageName} [${item.severity}]`);
}
if (waived.length) {
  console.log(`Applied .auditignore review deadline: ${policy.reviewAfter || "not set"}`);
}
if (blocking.length) {
  console.error("Blocking high/critical advisories not covered by the reviewed exception list:");
  console.error(JSON.stringify(blocking, null, 2));
  process.exit(1);
}
console.log(
  `Dependency audit policy passed: ${waived.length} reviewed package findings waived; no unapproved high/critical findings.`
);
