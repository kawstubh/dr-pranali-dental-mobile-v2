import test from "node:test";
import assert from "node:assert/strict";
import { buildPatientCrmRows, getPatientCrmSummary } from "../src/crm.js";

test("builds clinic-scoped CRM rows from existing appointment and patient records", () => {
  const rows = buildPatientCrmRows(
    [
      { id: 2, patient_id: "p1", starts_at: "2026-11-25T10:00:00Z", status: "requested" },
      { id: 1, patient_id: "p2", patient_name: "Explicit Name", status: "completed" },
      { id: 3, patient_id: "missing", status: "unknown" },
    ],
    [{ id: "p1", name: "Asha", phone: "9000000000" }, { id: "p2", name: "Ignored", phone: "9111111111" }],
  );
  assert.equal(rows.length, 3);
  assert.equal(rows[0].patientName, "Asha");
  assert.equal(rows[0].phone, "9000000000");
  assert.equal(rows[1].patientName, "Explicit Name");
  assert.equal(rows[2].status, "requested");
});

test("summarises appointment conversion stages without inventing lead records", () => {
  const summary = getPatientCrmSummary([
    { status: "requested" },
    { status: "confirmed" },
    { status: "scheduled" },
    { status: "rescheduled" },
    { status: "completed" },
    { status: "no_show" },
  ]);
  assert.deepEqual(summary, { total: 6, awaiting: 1, booked: 3, completed: 1, noShows: 1 });
});
