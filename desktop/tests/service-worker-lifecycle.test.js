import assert from "node:assert/strict";
import { test } from "node:test";

import { createControllerChangeHandler } from "../src/serviceWorkerLifecycle.js";

test("initial service worker control does not force a page reload", () => {
  const serviceWorker = { controller: null };
  let reloads = 0;
  const handler = createControllerChangeHandler(serviceWorker, () => reloads++);

  serviceWorker.controller = { version: "initial" };
  handler();

  assert.equal(reloads, 0);
});

test("a real controller replacement reloads once to activate the new worker", () => {
  const serviceWorker = { controller: { version: "old" } };
  let reloads = 0;
  const handler = createControllerChangeHandler(serviceWorker, () => reloads++);

  serviceWorker.controller = { version: "new" };
  handler();
  handler();

  assert.equal(reloads, 1);
});

test("unchanged or temporarily absent controllers do not trigger reloads", () => {
  const original = { version: "active" };
  const serviceWorker = { controller: original };
  let reloads = 0;
  const handler = createControllerChangeHandler(serviceWorker, () => reloads++);

  handler();
  serviceWorker.controller = null;
  handler();
  serviceWorker.controller = original;
  handler();

  assert.equal(reloads, 0);
});

test("the handler validates its browser dependencies", () => {
  assert.throws(() => createControllerChangeHandler(null, () => {}), TypeError);
  assert.throws(() => createControllerChangeHandler({ controller: null }, null), TypeError);
});
