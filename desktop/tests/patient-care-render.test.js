import React from "react";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("patient treatment journey renders shared notes and empty states without runtime errors", async () => {
  const vite = await createServer({
    configFile: path.join(root, "vite.config.js"),
    root,
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "error",
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

    assert.match(markup, /Clinic-shared treatment plans/);
    assert.match(markup, /Clinical notes shared by your clinic/);
    assert.match(markup, /Your clinic has not shared a treatment plan yet/);
    assert.match(markup, /Your clinic has not shared clinical notes yet/);
  } finally {
    await vite.close();
  }
});
