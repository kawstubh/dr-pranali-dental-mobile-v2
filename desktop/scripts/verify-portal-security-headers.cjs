const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

function inlineHash(relativeFile, tag) {
  const html = fs.readFileSync(path.join(__dirname, "..", relativeFile), "utf8");
  const expression = tag === "style"
    ? /<style[^>]*>([\s\S]*?)<\/style>/gi
    : /<script([^>]*)>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(expression)) {
    if (tag === "script" && /\bsrc\s*=/.test(match[1])) continue;
    const content = (tag === "style" ? match[1] : match[2]).replace(/\r\n?/g, "\n");
    return "sha256-" + crypto.createHash("sha256").update(content, "utf8").digest("base64");
  }
  throw new Error("Missing inline " + tag + " block in " + relativeFile);
}

(async () => {
  const response = await fetch("http://127.0.0.1:4176/", {
    method: "GET",
    signal: AbortSignal.timeout(10000),
  });
  assert.equal(response.status, 200, "Local Oralyn preview must serve the portal shell");

  const required = [
    "strict-transport-security",
    "content-security-policy",
    "x-content-type-options",
    "x-frame-options",
    "referrer-policy",
    "permissions-policy",
  ];
  for (const name of required) {
    assert.ok(response.headers.get(name), "Missing portal security header: " + name);
  }
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.match(response.headers.get("strict-transport-security"), /max-age=31536000/i);
  assert.match(response.headers.get("x-frame-options"), /^DENY$/i);
  const csp = response.headers.get("content-security-policy");
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /script-src 'self'/);
  assert.match(csp, /font-src 'self';/);
  assert.match(csp, /style-src 'self'/);
  assert.doesNotMatch(csp, /'unsafe-inline'/, "CSP must not permit unrestricted inline scripts or styles");
  const allowedInlineHashes = [
    inlineHash("public/patient/home/index.html", "style"),
    inlineHash("public/patient/booking/index.html", "style"),
    inlineHash("public/patient/booking/index.html", "script"),
  ];
  for (const hash of allowedInlineHashes) {
    assert.ok(csp.includes("'" + hash + "'"), "CSP must allow only the exact audited inline block: " + hash);
  }
  assert.ok(response.headers.get("content-security-policy").includes("img-src 'self' data: blob: https://static.wixstatic.com;"), "CSP must allow only the clinic photo CDN for image loads");
  assert.match(response.headers.get("content-security-policy"), /connect-src 'self' https:\/\/oralyn-staging-api-assistant\.onrender\.com/);
  await response.arrayBuffer();
  console.log("Oralyn portal preview security headers passed.");
})().catch((error) => {
  console.error("Portal security header check failed:", error);
  process.exitCode = 1;
});
