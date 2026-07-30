export const MAX_RUNNING_ENTRIES = 5;
const OPEN_STATUSES = new Set(["Belum", "Berjalan"]);

export class TimerPolicyError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "TimerPolicyError";
    this.code = code;
  }
}

function startMs(entry) {
  const iso = Date.parse(entry?.startedAt || "");
  if (Number.isFinite(iso)) return iso;
  const legacy = entry?.date && entry?.start ? new Date(`${entry.date}T${entry.start}:00`).getTime() : NaN;
  return Number.isFinite(legacy) ? legacy : NaN;
}

function endMs(entry) {
  const iso = Date.parse(entry?.endedAt || "");
  if (Number.isFinite(iso)) return iso;
  if (!entry?.date || !entry?.end) return NaN;
  const start = startMs(entry);
  let legacy = new Date(`${entry.date}T${entry.end}:00`).getTime();
  if (Number.isFinite(start) && legacy < start) legacy += 24 * 60 * 60 * 1000;
  return legacy;
}

function emptyPlaceholder(entry) {
  return entry?.status === "Belum" && !entry.start && !entry.startedAt && !entry.end && !entry.endedAt && (Number(entry.duration) || 0) === 0;
}

function preferOpen(left, right) {
  if ((left.status === "Berjalan") !== (right.status === "Berjalan")) return left.status === "Berjalan" ? left : right;
  const leftStart = startMs(left);
  const rightStart = startMs(right);
  if (Number.isFinite(leftStart) && Number.isFinite(rightStart) && leftStart !== rightStart) return leftStart < rightStart ? left : right;
  return String(left.id) <= String(right.id) ? left : right;
}

function supersededByFinished(entry, entries) {
  if (!entry.triageId || !OPEN_STATUSES.has(entry.status)) return false;
  const start = startMs(entry);
  if (!Number.isFinite(start)) return false;
  return entries.some((other) => {
    if (other === entry || other.triageId !== entry.triageId || other.status !== "Selesai") return false;
    const otherStart = startMs(other);
    const otherEnd = endMs(other);
    return Number.isFinite(otherStart) && Number.isFinite(otherEnd) && otherStart <= start && start < otherEnd;
  });
}

export function normalizeTimerEntries(entries = [], triage = [], currentEntries = []) {
  const currentById = new Map(currentEntries.map((entry) => [entry?.id, entry]));
  const taskStatus = new Map(triage.map((task) => [task?.id, task?.status]));
  const candidates = entries
    .filter((entry) => entry?.id)
    .map((entry) => {
      const current = currentById.get(entry.id);
      return current?.status === "Selesai" && entry.status === "Berjalan" ? current : entry;
    })
    .filter((entry) => {
      if (entry.triageId && emptyPlaceholder(entry)) return false;
      if (entry.triageId && entry.status === "Belum" && taskStatus.get(entry.triageId) !== "🏃 Dikerjakan") return false;
      return true;
    });

  const viable = candidates.filter((entry) => !supersededByFinished(entry, candidates));
  const winners = new Map();
  for (const entry of viable) {
    if (!entry.triageId || !OPEN_STATUSES.has(entry.status)) continue;
    const current = winners.get(entry.triageId);
    winners.set(entry.triageId, current ? preferOpen(current, entry) : entry);
  }

  return viable.filter((entry) => !entry.triageId || !OPEN_STATUSES.has(entry.status) || winners.get(entry.triageId)?.id === entry.id);
}

export function prepareWorkTimerDocument(currentData, incomingData) {
  const triage = Array.isArray(incomingData?.triage)
    ? incomingData.triage.map((task) => task?.status === "✅ Selesai" ? task : { ...task, completedAt: null })
    : [];
  const currentEntries = Array.isArray(currentData?.execLog) ? currentData.execLog : [];
  const execLog = normalizeTimerEntries(
    Array.isArray(incomingData?.execLog) ? incomingData.execLog : [],
    triage,
    currentEntries,
  );
  const runningCount = execLog.filter((entry) => entry.status === "Berjalan").length;
  if (runningCount > MAX_RUNNING_ENTRIES && !incomingData?.timerRecovery?.active) {
    throw new TimerPolicyError(
      "timer_recovery_required",
      `Lebih dari ${MAX_RUNNING_ENTRIES} sesi aktif hanya dapat disimpan sebagai hasil recovery konflik offline.`,
    );
  }

  return {
    ...incomingData,
    triage,
    execLog,
    timerRecovery: runningCount > MAX_RUNNING_ENTRIES
      ? { active: true, detectedAt: incomingData.timerRecovery?.detectedAt || new Date().toISOString() }
      : null,
  };
}
