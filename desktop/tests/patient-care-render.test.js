import React from "react";
import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("Doctor care modules render safe no-selection states without patient-account UI", async () => {
  const vite = await createServer({
    configFile: path.join(root, "vite.config.js"),
    root,
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "error",
    optimizeDeps: { noDiscovery: true, include: [] },
  });

  try {
    const screens = await vite.ssrLoadModule("/src/careScreens.jsx");
    assert.equal(typeof screens.DoctorCareManagement, "function");
    assert.equal(typeof screens.DoctorClinicalNotes, "function");
    assert.equal(typeof screens.PatientCommunication, "function");
    assert.equal(screens.PatientCareManagement, undefined);

    const careMarkup = renderToStaticMarkup(
      React.createElement(screens.DoctorCareManagement, {
        page: "files",
        token: "",
        activePatient: null,
        ping: () => {},
      }),
    );
    assert.match(careMarkup, /Choose a clinic patient before opening their protected records/);
    assert.match(careMarkup, /No sample clinical or financial records are displayed/);

    const notesMarkup = renderToStaticMarkup(
      React.createElement(screens.DoctorClinicalNotes, {
        token: "",
        activePatient: null,
      }),
    );
    assert.match(notesMarkup, /Select a patient from the clinical workspace before opening their notes/);

    const messagesMarkup = renderToStaticMarkup(
      React.createElement(screens.PatientCommunication, {
        token: "",
        activePatient: null,
      }),
    );
    assert.match(messagesMarkup, /Select a patient from the clinic directory to open their conversation/);

    const source = await import("node:fs").then(({ readFileSync }) =>
      readFileSync(path.join(root, "src", "careScreens.jsx"), "utf8"),
    );
    assert.doesNotMatch(source, /export function PatientCareManagement/);
    assert.doesNotMatch(source, /patientClinicalNotes|patientMessages|sendPatientMessage/);
  } finally {
    await vite.close();
  }
});
