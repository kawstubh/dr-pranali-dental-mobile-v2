import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const viteConfig = readFileSync(new URL("../vite.config.js", import.meta.url), "utf8");

test("local Vite API proxy targets the canonical Oralyn staging API", () => {
  assert.match(
    viteConfig,
    /target:\s*"https:\/\/oralyn-staging-api-assistant\.onrender\.com"/,
  );
});


const marketingHome = readFileSync(new URL("../public/oralyn/index.html", import.meta.url), "utf8");

test("Oralyn marketing photography host is explicitly allowlisted by the image CSP", () => {
  const policy = viteConfig.match(/["']Content-Security-Policy["']:\s*"([^"]+)"/)?.[1] || "";
  assert.ok(marketingHome.includes("https://images.unsplash.com"));
  assert.ok(policy.includes("img-src 'self' data: blob: https://static.wixstatic.com https://images.unsplash.com;"));
  assert.doesNotMatch(policy, /img-src[^;]*\*/);
});
