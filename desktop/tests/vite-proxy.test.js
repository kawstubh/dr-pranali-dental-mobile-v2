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
