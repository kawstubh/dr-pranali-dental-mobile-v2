import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const cataloguePath = path.join(repositoryRoot, "shared", "dentalServices.ts");
const homePath = path.join(repositoryRoot, "desktop", "public", "patient", "home", "index.html");
const bookingPath = path.join(repositoryRoot, "desktop", "public", "patient", "booking", "index.html");
const publicServicesPath = path.join(repositoryRoot, "desktop", "public", "services");

const catalogue = readFileSync(cataloguePath, "utf8");
const home = readFileSync(homePath, "utf8");
const booking = readFileSync(bookingPath, "utf8");
const services = [...catalogue.matchAll(
  /\{\s*id:\s*'([^']+)'\s*,\s*name:\s*'([^']+)'\s*,\s*description:\s*'([^']+)'\s*,\s*category:\s*'([^']+)'\s*,\s*icon:\s*'[^']+'\s*,\s*image:\s*'([^']+)'\s*\}/g,
)].map((match) => ({
  id: match[1],
  name: match[2],
  description: match[3],
  category: match[4],
  image: match[5],
}));

const escapeHtml = (value) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

test("the public catalogue publishes all twenty shared dental services with local images", () => {
  assert.equal(services.length, 20);
  assert.equal(new Set(services.map((service) => service.id)).size, 20);
  assert.equal(new Set(services.map((service) => service.image)).size, 20);
  assert.equal((home.match(/<article class="service-card">/g) || []).length, 20);
  assert.ok(home.includes("@media(max-width:700px){.service-grid{grid-template-columns:repeat(2"));
  assert.ok(home.includes("@media(max-width:380px){.service-grid{grid-template-columns:1fr"));

  for (const service of services) {
    const image = `${service.image}.png`;
    assert.ok(existsSync(path.join(publicServicesPath, image)), `Missing public image ${image}`);
    assert.ok(home.includes(`/services/${image}`), `Home page does not reference ${image}`);
    assert.ok(home.includes(escapeHtml(service.name)), `Home page is missing ${service.name}`);
    assert.ok(home.includes(`/patient/booking/?service=${service.id}`), `Service link is missing for ${service.id}`);
    assert.ok(booking.includes(`<option value="${escapeHtml(service.name)}">`), `Booking option is missing for ${service.name}`);
    assert.ok(booking.includes(`"${service.id}":"${service.name}"`), `Booking preselection is missing for ${service.id}`);
  }
});

test("public service pages remain account-free and patient AI-free", () => {
  for (const page of [home, booking]) {
    assert.doesNotMatch(page, /patient\/(?:login|signup|register)|supabase.*auth|intelligence_request\s*:\s*true/i);
    assert.match(page, /No patient account|No account/i);
  }
  assert.match(booking, /intelligence_request:\s*false/);
  assert.match(booking, /new URLSearchParams\(window\.location\.search\)/);
  assert.match(booking, /Other dental concern/);
});
