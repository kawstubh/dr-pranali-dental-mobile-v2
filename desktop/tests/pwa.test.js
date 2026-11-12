import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "public", "manifest.webmanifest"), "utf8"));
const serviceWorker = fs.readFileSync(path.join(root, "public", "sw.js"), "utf8");
const app = fs.readFileSync(path.join(root, "src", "main.jsx"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

test("Oralyn manifest is installable and uses approved brand icon derivatives", () => {
  assert.equal(manifest.name, "Oralyn Dental Care Portal");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.theme_color, "#0C3B82");
  assert.deepEqual(manifest.icons.map((icon) => icon.sizes).sort(), ["192x192", "512x512"]);
  for (const icon of manifest.icons) {
    const iconPath = path.join(root, "public", icon.src.replace(/^\//, ""));
    assert.ok(fs.statSync(iconPath).size > 1000);
  }
  assert.ok(html.includes('rel="manifest" href="/manifest.webmanifest"'));
});

test("service worker caches only the application shell and static assets, never API or authenticated data", () => {
  assert.ok(serviceWorker.includes("oralyn-portal-shell-v1"));
  assert.ok(serviceWorker.includes("auth\\/v1"));
  assert.ok(serviceWorker.includes("storage\\/v1"));
  assert.ok(serviceWorker.includes('request.headers.has("authorization")'));
  assert.ok(serviceWorker.includes('request.mode === "navigate"'));
  assert.ok(serviceWorker.includes('request.destination === "script"'));
  assert.ok(!serviceWorker.includes('cache.put("/v1'));
});

test("real browser evidence includes a common 390 by 844 mobile viewport", () => {
  const captureScript = fs.readFileSync(path.join(root, "scripts", "capture-actual-desktop.cjs"), "utf8");
  assert.match(captureScript, /capture\(screenshotName \+ "-390x844\.png", 390, 844, true\)/);
  assert.match(captureScript, /deviceScaleFactor: 1, mobile/);
});

test("PWA update flow waits for a user refresh before activating a waiting worker", () => {
  assert.ok(app.includes('navigator.serviceWorker.register("/sw.js"'));
  assert.ok(app.includes('pwaRegistration.waiting.postMessage({ type: "SKIP_WAITING" })'));
  assert.ok(app.includes("A new Oralyn portal update is ready"));
  assert.ok(serviceWorker.includes('event.data?.type === "SKIP_WAITING"'));
});
