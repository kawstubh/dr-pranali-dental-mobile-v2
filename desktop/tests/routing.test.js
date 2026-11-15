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

test("all patient SPA paths redirect to the account-free static pages", () => {
  const home = { role: "doctor", page: "dashboard", redirectTo: "/patient/home/" };
  const booking = { role: "doctor", page: "dashboard", redirectTo: "/patient/booking/" };
  assert.deepEqual(resolvePortalRoute("/patient"), home);
  assert.deepEqual(resolvePortalRoute("/patient/home"), home);
  assert.deepEqual(resolvePortalRoute("/patient/home/"), home);
  assert.deepEqual(resolvePortalRoute("/patient/records"), home);
  assert.deepEqual(resolvePortalRoute("/patient/invoices"), home);
  assert.deepEqual(resolvePortalRoute("/patient/booking"), booking);
  assert.deepEqual(resolvePortalRoute("/patient/booking/"), booking);
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

test("unknown role or page segments fail closed to the Doctor dashboard or public home", () => {
  assert.deepEqual(resolvePortalRoute("/patient/not-a-page"), {
    role: "doctor",
    page: "dashboard",
    redirectTo: "/patient/home/",
  });
  assert.deepEqual(resolvePortalRoute("/unknown/clinical"), {
    role: "doctor",
    page: "dashboard",
  });
});

test("portal paths use static public patient pages and Doctor allow-list", () => {
  assert.equal(portalPath("patient", "home"), "/patient/home/");
  assert.equal(portalPath("patient", "booking"), "/patient/booking/");
  assert.equal(portalPath("patient", "records"), "/patient/home/");
  assert.equal(portalPath("doctor", "clinical"), "/doctor/clinical");
  assert.equal(portalPath("patient", "clinical"), "/patient/home/");
  assert.equal(portalPath("doctor", "../../patient"), "/doctor/dashboard");
});

test("patient navigation performs a full load of public pages; Doctor history remains SPA", () => {
  const listeners = new Map();
  const assigned = [];
  const fakeWindow = {
    location: {
      pathname: "/",
      assign(path) {
        assigned.push(path);
        fakeWindow.location.pathname = path;
      },
    },
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
  assert.equal(fakeWindow.location.pathname, "/patient/home/");
  router.navigate("patient", "booking");
  assert.equal(fakeWindow.location.pathname, "/patient/booking/");
  assert.deepEqual(assigned, ["/patient/home/", "/patient/booking/"]);

  fakeWindow.location.pathname = "/doctor/appointments";
  listeners.get("popstate")();
  assert.deepEqual(routes.at(-1), {
    role: "doctor",
    page: "appointments",
  });

  fakeWindow.location.pathname = "/patient/records";
  listeners.get("popstate")();
  assert.equal(assigned.at(-1), "/patient/home/");

  router.dispose();
  assert.equal(listeners.has("popstate"), false);
});
