import test from "node:test";
import assert from "node:assert/strict";
import {
  normaliseList,
  normaliseUser,
  localDateTimeFromParts,
  localDateISO,
  isSameLocalDay,
} from "../src/data.js";

test("normalises direct and wrapped clinic lists, including empty workspaces", () => {
  assert.deepEqual(normaliseList([{ id: "p1" }]), [{ id: "p1" }]);
  assert.deepEqual(normaliseList({ result: [{ id: "p2" }] }), [{ id: "p2" }]);
  assert.deepEqual(normaliseList({ data: { patients: [{ id: "p3" }] }}, ["patients"]), [{ id: "p3" }]);
  assert.deepEqual(normaliseList({ result: { workspaces: [] } }, ["workspaces"]), []);
  assert.deepEqual(normaliseList({ data: { result: { appointments: [{ id: "a1" }] } } }, ["appointments"]), [{ id: "a1" }]);
  assert.deepEqual(normaliseList({ total: 0 }), []);
  assert.deepEqual(normaliseList(null), []);
});

test("normalises authenticated user payloads without treating wrappers as users", () => {
  const user = { id: "doctor-1", email: "doctor@example.test" };
  assert.equal(normaliseUser({ user }), user);
  assert.equal(normaliseUser({ result: { data: { user } } }), user);
  assert.equal(normaliseUser({ user: null }), null);
  assert.equal(normaliseUser({ error: "invalid" }), null);
});

test("builds clinic-local appointment times without parsing locale-dependent strings", () => {
  const morning = localDateTimeFromParts("2026-11-12", "10:00 AM");
  const afternoon = localDateTimeFromParts("2026-11-12", "01:00 PM");
  const evening = localDateTimeFromParts("2026-11-12", "08:30 PM");
  assert.equal(morning.getHours(), 10);
  assert.equal(afternoon.getHours(), 13);
  assert.equal(evening.getHours(), 20);
  assert.equal(evening.getMinutes(), 30);
  assert.equal(localDateTimeFromParts("2026-02-31", "10:00 AM"), null);
  assert.equal(localDateTimeFromParts("2026-11-12", "13:00 PM"), null);
  assert.equal(localDateTimeFromParts("2026-11-12", "09:00 AM").getHours(), 9);
});

test("uses local calendar dates for date controls and same-day appointment filters", () => {
  const reference = new Date(2026, 10, 12, 9, 0, 0);
  assert.equal(localDateISO(reference), "2026-11-12");
  assert.equal(isSameLocalDay(new Date(2026, 10, 12, 23, 0, 0), reference), true);
  assert.equal(isSameLocalDay(new Date(2026, 10, 13, 0, 0, 0), reference), false);
  assert.equal(isSameLocalDay("not-a-date", reference), false);
});
