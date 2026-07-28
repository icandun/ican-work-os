import assert from "node:assert/strict";

const apiRoot = process.env.TEST_API_ROOT || "http://127.0.0.1:8788/api";
const email = `integration-${Date.now()}@example.local`;

async function request(path, options = {}) {
  const response = await fetch(`${apiRoot}${path}`, options);
  const data = await response.json();
  return { response, data };
}

const login = await request("/auth/dev", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email }),
});
assert.equal(login.response.status, 200);
const headers = { "Content-Type": "application/json", Authorization: `Bearer ${login.data.token}` };
const baseState = {
  habits: [{ id: "habit-a", group: "Test", name: "Habit A", points: 10, addons: [] }],
  checks: {},
};

const initial = await request("/apps/habit-ican/state", {
  method: "PUT", headers, body: JSON.stringify({ data: baseState, baseRevision: 0 }),
});
assert.equal(initial.response.status, 200);
assert.equal(initial.data.revision, 1);

const left = structuredClone(baseState);
left.checks["2026-07-18"] = { "habit-a": true };
const right = structuredClone(baseState);
right.checks["2026-07-19"] = { "habit-a": true };
const concurrent = await Promise.all([
  request("/apps/habit-ican/state", { method: "PUT", headers, body: JSON.stringify({ data: left, baseRevision: 1 }) }),
  request("/apps/habit-ican/state", { method: "PUT", headers, body: JSON.stringify({ data: right, baseRevision: 1 }) }),
]);
assert.deepEqual(concurrent.map((item) => item.response.status).sort(), [200, 409]);

const invalid = await request("/apps/habit-ican/state", {
  method: "PUT", headers, body: JSON.stringify({ data: { habits: "broken", checks: {} }, baseRevision: 2 }),
});
assert.equal(invalid.response.status, 400);
assert.equal(invalid.data.error, "invalid_schema");

const versions = await request("/apps/habit-ican/versions?limit=10", { headers });
assert.equal(versions.response.status, 200);
assert.ok(versions.data.versions.length >= 2);

const current = await request("/apps/habit-ican/state", { headers });
const restore = await request("/apps/habit-ican/versions/1/restore", {
  method: "POST", headers, body: JSON.stringify({ baseRevision: current.data.revision }),
});
assert.equal(restore.response.status, 200);
assert.equal(restore.data.revision, current.data.revision + 1);

const finishedSession = {
  id: "finished-session",
  triageId: "triage-a",
  status: "Selesai",
  start: "09:00",
  end: "10:30",
  duration: 90,
};
const emptyPlaceholder = {
  id: "legacy-placeholder",
  triageId: "triage-a",
  status: "Belum",
  start: "",
  end: "",
  duration: 0,
};
const manualPending = {
  id: "manual-pending",
  status: "Belum",
  start: "",
  end: "",
  duration: 0,
};
const legacyWorkState = {
  triage: [{ id: "triage-a", title: "Integration task", status: "Dikerjakan" }],
  execLog: [finishedSession, emptyPlaceholder, manualPending],
};

const normalizedWork = await request("/apps/ican-work-os/state", {
  method: "PUT", headers, body: JSON.stringify({ data: legacyWorkState, baseRevision: 0 }),
});
assert.equal(normalizedWork.response.status, 200);
assert.equal(normalizedWork.data.revision, 1);
assert.deepEqual(normalizedWork.data.data.execLog, [finishedSession, manualPending]);

const repeatedLegacyWork = await request("/apps/ican-work-os/state", {
  method: "PUT", headers, body: JSON.stringify({ data: legacyWorkState, baseRevision: 1 }),
});
assert.equal(repeatedLegacyWork.response.status, 200);
assert.equal(repeatedLegacyWork.data.revision, 1);
assert.deepEqual(repeatedLegacyWork.data.data.execLog, [finishedSession, manualPending]);

console.log("integration ok: atomic conflict, validation, versions, restore, Work normalization");
