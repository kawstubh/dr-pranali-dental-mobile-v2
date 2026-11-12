import React from "react";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("patient treatment journey hides prior records during initial load and retains explicit empty states", async () => {
  const vite = await createServer({
    configFile: path.join(root, "vite.config.js"),
    root,
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "error",
    optimizeDeps: { noDiscovery: true, include: [] },
  });

  try {
    const { PatientCareManagement } = await vite.ssrLoadModule("/src/careScreens.jsx");
    const markup = renderToStaticMarkup(
      React.createElement(PatientCareManagement, {
        page: "journey",
        session: { access_token: "synthetic-session-token" },
        patientId: "synthetic-patient-record",
        patientChart: [],
      }),
    );

    assert.match(markup, /Loading information shared by your clinic/);
    assert.doesNotMatch(markup, /Clinic-shared treatment plans|Clinical notes shared by your clinic/);

    const source = fs.readFileSync(path.join(root, "src", "careScreens.jsx"), "utf8");
    assert.match(source, /Clinic-shared treatment plans/);
    assert.match(source, /Clinical notes shared by your clinic/);
    assert.match(source, /Your clinic has not shared a treatment plan yet/);
    assert.match(source, /Your clinic has not shared clinical notes yet/);
  } finally {
    await vite.close();
  }
});
