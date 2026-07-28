const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export function validateAppState(appId, data) {
  if (!isPlainObject(data)) return invalid("state_must_be_object");
  if (appId === "habit-ican") return validateHabitState(data);
  if (appId === "ican-work-os") return valid();
  return invalid("unknown_app");
}

export function normalizeAppState(appId, data) {
  if (appId !== "ican-work-os" || !isPlainObject(data) || !Array.isArray(data.execLog)) {
    return data;
  }

  const execLog = data.execLog.filter((entry) => !isEmptyTriagePlaceholder(entry));
  return execLog.length === data.execLog.length ? data : { ...data, execLog };
}

function isEmptyTriagePlaceholder(entry) {
  return Boolean(entry?.triageId) &&
    entry.status === "Belum" &&
    !entry.start &&
    !entry.end &&
    (Number(entry.duration) || 0) === 0;
}

function validateHabitState(data) {
  if (!Array.isArray(data.habits)) return invalid("habits_must_be_array");
  if (!isPlainObject(data.checks)) return invalid("checks_must_be_object");
  if (data.habits.length > 200) return invalid("too_many_habits");

  const ids = new Set();
  for (const habit of data.habits) {
    const result = validateHabit(habit, ids);
    if (!result.ok) return result;
  }

  for (const [date, day] of Object.entries(data.checks)) {
    if (!isValidDateKey(date)) return invalid("invalid_check_date", date);
    if (!isPlainObject(day)) return invalid("check_day_must_be_object", date);
    if (Object.keys(day).length > 1000) return invalid("too_many_daily_checks", date);
    for (const [id, checked] of Object.entries(day)) {
      if (!SAFE_ID.test(id)) return invalid("invalid_check_id", `${date}.${id}`);
      if (checked !== true) return invalid("check_value_must_be_true", `${date}.${id}`);
    }
  }

  return valid();
}

function validateHabit(habit, ids) {
  if (!isPlainObject(habit)) return invalid("habit_must_be_object");
  if (!SAFE_ID.test(String(habit.id || ""))) return invalid("invalid_habit_id");
  if (ids.has(habit.id)) return invalid("duplicate_habit_id", habit.id);
  ids.add(habit.id);
  if (!isShortString(habit.name, 240)) return invalid("invalid_habit_name", habit.id);
  if (!isShortString(habit.group, 120)) return invalid("invalid_habit_group", habit.id);
  if (!isPoints(habit.points)) return invalid("invalid_habit_points", habit.id);
  if (habit.icon != null && !isShortString(habit.icon, 32)) return invalid("invalid_habit_icon", habit.id);
  if (!Array.isArray(habit.addons || [])) return invalid("addons_must_be_array", habit.id);
  if ((habit.addons || []).length > 50) return invalid("too_many_addons", habit.id);

  for (const addon of habit.addons || []) {
    if (!isPlainObject(addon)) return invalid("addon_must_be_object", habit.id);
    if (!SAFE_ID.test(String(addon.id || ""))) return invalid("invalid_addon_id", habit.id);
    if (ids.has(addon.id)) return invalid("duplicate_item_id", addon.id);
    ids.add(addon.id);
    if (!isShortString(addon.name, 240)) return invalid("invalid_addon_name", addon.id);
    if (!isPoints(addon.points)) return invalid("invalid_addon_points", addon.id);
  }
  return valid();
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isShortString(value, max) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

function isPoints(value) {
  return Number.isInteger(value) && value >= 0 && value <= 100000;
}

function isValidDateKey(value) {
  if (!DATE_KEY.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function valid() {
  return { ok: true };
}

function invalid(code, path = "") {
  return { ok: false, code, path };
}
