import assert from "node:assert/strict";
import test from "node:test";
import { MAX_RUNNING_ENTRIES, TimerPolicyError, normalizeTimerEntries, prepareWorkTimerDocument } from "../worker/work-timer-guard.js";

const task = (id) => ({ id, task: `Task ${id}`, status: "🏃 Dikerjakan", completedAt: "2026-07-20" });
const running = (id, triageId, minute = 0) => ({
  id,
  triageId,
  date: "2026-07-30",
  start: `09:${String(minute).padStart(2, "0")}`,
  startedAt: `2026-07-30T02:${String(minute).padStart(2, "0")}:00.000Z`,
  end: "",
  duration: 0,
  status: "Berjalan",
});

test("semantic normalization keeps one open session per triage task", () => {
  const triage = [task("a")];
  const result = normalizeTimerEntries([running("hp", "a", 1), running("mac", "a", 0)], triage);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "mac");
});

test("different tasks remain concurrently active", () => {
  const triage = [task("a"), task("b")];
  const result = normalizeTimerEntries([running("one", "a"), running("two", "b")], triage);
  assert.deepEqual(result.map((entry) => entry.id), ["one", "two"]);
});

test("a stale device cannot reopen a finished execution entry", () => {
  const current = { ...running("one", "a"), status: "Selesai", end: "10:00", endedAt: "2026-07-30T03:00:00.000Z", duration: 60 };
  const result = normalizeTimerEntries([running("one", "a")], [task("a")], [current]);
  assert.equal(result[0].status, "Selesai");
  assert.equal(result[0].duration, 60);
});

test("ordinary writes cannot create a sixth online timer", () => {
  const triage = Array.from({ length: 6 }, (_, index) => task(String(index)));
  const execLog = triage.map((item, index) => running(`ex-${index}`, item.id, index));
  assert.throws(
    () => prepareWorkTimerDocument({ triage: [], execLog: [] }, { triage, execLog }),
    (error) => error instanceof TimerPolicyError && error.code === "timer_recovery_required",
  );
});

test("offline overflow is preserved and marked for recovery", () => {
  const triage = Array.from({ length: 7 }, (_, index) => task(String(index)));
  const execLog = triage.map((item, index) => running(`ex-${index}`, item.id, index));
  const result = prepareWorkTimerDocument(null, {
    triage,
    execLog,
    timerRecovery: { active: true, detectedAt: "2026-07-30T04:00:00.000Z" },
  });
  assert.equal(result.execLog.length, 7);
  assert.equal(result.timerRecovery.active, true);
  assert.equal(MAX_RUNNING_ENTRIES, 5);
});

test("completedAt is cleared for every non-Done task", () => {
  const result = prepareWorkTimerDocument(null, { triage: [task("a")], execLog: [] });
  assert.equal(result.triage[0].completedAt, null);
});
