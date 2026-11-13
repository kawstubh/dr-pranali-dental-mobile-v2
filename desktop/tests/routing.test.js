import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createPortalNavigator,
  portalPath,
  resolvePortalRoute,
} from "../src/routing.js";

test("the portal root resolves to the Doctor dashboard", () => {
  assert.deepEqual(resolvePortalRoute("/"), {
    role: "doctor",
    page: "dashboard",
  });
});

test("the public patient surface exposes only home and guest booking", () => {
  assert.deepEqual(resolvePortalRoute("/patient"), {
    role: "patient",
    page: "home",
  });
  assert.deepEqual(resolvePortalRoute("/patient/home/"), {
    role: "patient",
    page: "home",
  });
  assert.deepEqual(resolvePortalRoute("/patient/booking/"), {
    role: "patient",
    page: "booking",
  });
  assert.deepEqual(resolvePortalRoute("/patient/records"), {
    role: "patient",
    page: "home",
  });
  assert.deepEqual(resolvePortalRoute("/patient/invoices"), {
    role: "patient",
    page: "home",
  });
});

test("Doctor clinical routes resolve to the matching workspace page", () => {
  assert.deepEqual(resolvePortalRoute("/doctor/clinical"), {
    role: "doctor",
    page: "clinical",
  });
  assert.deepEqual(resolvePortalRoute("/doctor/appointments"), {
    role: "doctor",
    page: "appointments",
  });
});

test("unknown role or page segments fail closed to the role's home page", () => {
  assert.deepEqual(resolvePortalRoute("/patient/not-a-page"), {
    role: "patient",
    page: "home",
  });
  assert.deepEqual(resolvePortalRoute("/unknown/clinical"), {
    role: "doctor",
    page: "dashboard",
  });
});

test("portal paths are canonical and cannot cross the role page allow-list", () => {
  assert.equal(portalPath("patient", "records"), "/patient/home");
  assert.equal(portalPath("doctor", "clinical"), "/doctor/clinical");
  assert.equal(portalPath("patient", "clinical"), "/patient/home");
  assert.equal(portalPath("doctor", "../../patient"), "/doctor/dashboard");
});

test("browser back and forward events restore the correct role and page", () => {
  const listeners = new Map();
  const fakeWindow = {
    location: { pathname: "/" },
    history: {
      pushState(_state, _title, path) {
        fakeWindow.location.pathname = path;
      },
    },
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
  };
  const routes = [];
  const router = createPortalNavigator(fakeWindow, (route) => routes.push(route));

  router.navigate("patient", "home");
  assert.equal(fakeWindow.location.pathname, "/patient/home");
  router.navigate("patient", "booking");
  assert.equal(fakeWindow.location.pathname, "/patient/booking");
  fakeWindow.location.pathname = "/doctor/appointments";
  listeners.get("popstate")();
  assert.deepEqual(routes.at(-1), {
    role: "doctor",
    page: "appointments",
  });

  router.dispose();
  assert.equal(listeners.has("popstate"), false);
});
