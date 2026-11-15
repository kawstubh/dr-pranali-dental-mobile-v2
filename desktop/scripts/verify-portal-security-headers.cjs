const assert = require("node:assert/strict");

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
  assert.match(response.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  assert.ok(response.headers.get("content-security-policy").includes("img-src 'self' data: blob: https://static.wixstatic.com;"), "CSP must allow only the clinic photo CDN for image loads");
  assert.match(response.headers.get("content-security-policy"), /connect-src 'self' https:\/\/oralyn-staging-api-assistant\.onrender\.com/);
  await response.arrayBuffer();
  console.log("Oralyn portal preview security headers passed.");
})().catch((error) => {
  console.error("Portal security header check failed:", error);
  process.exitCode = 1;
});
