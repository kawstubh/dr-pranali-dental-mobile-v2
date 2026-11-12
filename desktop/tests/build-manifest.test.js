import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.join(here, "..");
const scriptPath = path.join(desktopRoot, "scripts", "write-build-manifest.cjs");

test("staging build manifest records checksums without embedding Supabase credentials or claiming release readiness", () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "oralyn-build-manifest-"));
  const assetDir = path.join(outputDir, "assets");
  fs.mkdirSync(assetDir);
  const asset = Buffer.from("synthetic static portal asset");
  fs.writeFileSync(path.join(assetDir, "app.js"), asset);

  try {
    execFileSync(process.execPath, [scriptPath], {
      cwd: desktopRoot,
      env: {
        ...process.env,
        ORALYN_BUILD_DIR: outputDir,
        ORALYN_ENVIRONMENT: "staging",
        GITHUB_SHA: "synthetic-commit-123",
        GITHUB_REF_NAME: "feat/oralyn-desktop-app",
        VITE_DENTAL_API_URL: "https://oralyn-multitenant-staging.onrender.com/",
        VITE_SUPABASE_URL: "",
        VITE_SUPABASE_PUBLISHABLE_KEY: "must-not-be-copied-into-the-manifest",
      },
      stdio: "pipe",
    });

    const manifest = JSON.parse(fs.readFileSync(path.join(outputDir, "oralyn-build-manifest.json"), "utf8"));
    assert.equal(manifest.environment, "staging");
    assert.equal(manifest.commit_sha, "synthetic-commit-123");
    assert.equal(manifest.api_origin, "https://oralyn-multitenant-staging.onrender.com");
    assert.equal(manifest.portal_origin, null);
    assert.equal(manifest.patient_ai_enabled, false);
    assert.equal(manifest.native_apk_required_for_release, false);
    assert.equal(manifest.checks.supabase_auth_configured, false);
    assert.equal(manifest.release_status, "BLOCKED");
    assert.ok(manifest.blockers.includes("supabase_auth_configured"));
    assert.ok(manifest.blockers.includes("isolated_portal_origin_assigned"));
    assert.ok(manifest.blockers.includes("cors_verified_for_portal_origin"));
    assert.equal(
      manifest.files.find((file) => file.path === "assets/app.js")?.sha256,
      crypto.createHash("sha256").update(asset).digest("hex"),
    );
    assert.ok(!JSON.stringify(manifest).includes("must-not-be-copied-into-the-manifest"));
  } finally {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
});
