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

test("staging build manifest records verified account-free booking gates without claiming release readiness", () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "oralyn-build-manifest-"));
  const assetDir = path.join(outputDir, "assets");
  fs.mkdirSync(assetDir);
  const asset = Buffer.from("synthetic static portal asset");
  fs.writeFileSync(path.join(assetDir, "app.js"), asset);
  fs.writeFileSync(
    path.join(outputDir, "sw.js"),
    'const CACHE_NAME = "oralyn-portal-shell-__ORALYN_BUILD_ID__";\n',
    "utf8",
  );

  try {
    execFileSync(process.execPath, [scriptPath], {
      cwd: desktopRoot,
      env: {
        ...process.env,
        ORALYN_BUILD_DIR: outputDir,
        ORALYN_ENVIRONMENT: "staging",
        GITHUB_SHA: "synthetic-commit-123",
        GITHUB_REF_NAME: "feat/oralyn-desktop-app",
        VITE_DENTAL_API_URL: "https://oralyn-staging-api-synthetic.onrender.com/",
        ORALYN_PORTAL_ORIGIN: "https://oralyn-web-portal-spa.onrender.com",
        ORALYN_BACKEND_STACK_VERIFIED: "true",
        ORALYN_CORS_VERIFIED: "true",
        ORALYN_DATABASE_IDENTITY_VERIFIED: "true",
        ORALYN_SECURITY_HEADERS_VERIFIED: "true",
        ORALYN_GUEST_BOOKING_E2E_VERIFIED: "true",
        ORALYN_MOBILE_BROWSER_E2E_VERIFIED: "true",
      },
      stdio: "pipe",
    });

    const manifest = JSON.parse(fs.readFileSync(path.join(outputDir, "oralyn-build-manifest.json"), "utf8"));
    assert.equal(manifest.environment, "staging");
    assert.equal(manifest.commit_sha, "synthetic-commit-123");
    assert.equal(
      manifest.service_worker_cache_name,
      "oralyn-portal-shell-synthetic-commit-123",
    );
    assert.ok(
      fs.readFileSync(path.join(outputDir, "sw.js"), "utf8")
        .includes("oralyn-portal-shell-synthetic-commit-123"),
    );
    assert.equal(manifest.api_origin, "https://oralyn-staging-api-synthetic.onrender.com");
    assert.equal(manifest.portal_origin, "https://oralyn-web-portal-spa.onrender.com");
    assert.equal(manifest.checks.backend_stack_verified, true);
    assert.equal(manifest.checks.cors_verified_for_portal_origin, true);
    assert.equal(manifest.checks.database_identity_verified, true);
    assert.equal(manifest.checks.https_security_headers_verified, true);
    assert.equal(manifest.checks.doctor_auth_e2e_verified, false);
    assert.equal(manifest.checks.patient_guest_booking_e2e_verified, true);
    assert.equal(manifest.checks.mobile_browser_e2e_verified, true);
    assert.equal(Object.hasOwn(manifest.checks, "supabase_auth_configured"), false);
    assert.equal(manifest.patient_ai_enabled, false);
    assert.equal(manifest.native_apk_required_for_release, false);
    assert.equal(manifest.release_status, "BLOCKED");
    assert.ok(!manifest.blockers.includes("supabase_auth_configured"));
    assert.ok(!manifest.blockers.includes("isolated_portal_origin_assigned"));
    assert.ok(!manifest.blockers.includes("cors_verified_for_portal_origin"));
    for (const gate of [
      "backup_restore_verified",
      "error_monitoring_verified",
      "rollback_plan_verified",
      "doctor_auth_e2e_verified",
      "assistant_role_e2e_verified",
      "patient_account_routes_disabled_verified",
      "guest_booking_idempotency_verified",
      "assistant_ui_api_verified",
      "cross_tenant_e2e_verified",
      "authenticated_screenshots_verified",
      "private_document_storage_verified",
    ]) {
      assert.equal(manifest.checks[gate], false, gate);
      assert.ok(manifest.blockers.includes(gate), gate);
    }
    assert.equal(
      manifest.files.find((file) => file.path === "assets/app.js")?.sha256,
      crypto.createHash("sha256").update(asset).digest("hex"),
    );

  } finally {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
});

test("staging manifests reject insecure or non-canonical API origins", () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "oralyn-build-manifest-insecure-"));
  fs.writeFileSync(path.join(outputDir, "index.html"), "<!doctype html>");
  fs.writeFileSync(
    path.join(outputDir, "sw.js"),
    'const CACHE_NAME = "oralyn-portal-shell-__ORALYN_BUILD_ID__";\n',
    "utf8",
  );
  try {
    assert.throws(() => execFileSync(process.execPath, [scriptPath], {
      cwd: desktopRoot,
      env: {
        ...process.env,
        ORALYN_BUILD_DIR: outputDir,
        ORALYN_ENVIRONMENT: "staging",
        VITE_DENTAL_API_URL: "http://oralyn-api.example.test",
      },
      stdio: "pipe",
    }));
    assert.throws(() => execFileSync(process.execPath, [scriptPath], {
      cwd: desktopRoot,
      env: {
        ...process.env,
        ORALYN_BUILD_DIR: outputDir,
        ORALYN_ENVIRONMENT: "staging",
        VITE_DENTAL_API_URL: "https://oralyn-api.example.test/v1",
      },
      stdio: "pipe",
    }));
  } finally {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
});
