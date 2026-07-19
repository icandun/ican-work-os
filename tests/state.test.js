import test from "node:test";
import assert from "node:assert/strict";
import { validateAppState } from "../worker/state.js";
import { SESSION_TTL_SECONDS } from "../worker/index.js";

test("keeps a signed-in device active for 30 days", () => {
  assert.equal(SESSION_TTL_SECONDS, 60 * 60 * 24 * 30);
});

const validHabit = {
  habits: [{
    id: "habit-a",
    group: "Test",
    name: "Habit A",
    points: 10,
    addons: [{ id: "habit-a-addon", name: "Addon", points: 5 }],
  }],
  checks: { "2026-07-18": { "habit-a": true } },
};

test("accepts valid Habit Ican state", () => {
  assert.deepEqual(validateAppState("habit-ican", validHabit), { ok: true });
});

test("rejects invalid dates and non-true check values", () => {
  const badDate = structuredClone(validHabit);
  badDate.checks = { "2026-02-31": { "habit-a": true } };
  assert.equal(validateAppState("habit-ican", badDate).code, "invalid_check_date");

  const badValue = structuredClone(validHabit);
  badValue.checks = { "2026-07-18": { "habit-a": false } };
  assert.equal(validateAppState("habit-ican", badValue).code, "check_value_must_be_true");
});

test("rejects malformed habits", () => {
  const bad = structuredClone(validHabit);
  bad.habits[0].points = "10";
  assert.equal(validateAppState("habit-ican", bad).code, "invalid_habit_points");
});
