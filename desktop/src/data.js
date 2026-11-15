const LIST_KEYS = ["result", "data", "items", "results", "patients", "appointments", "workspaces", "records", "rows"];

function findList(value, keys, depth = 0) {
  if (Array.isArray(value)) return { found: true, rows: value };
  if (!value || typeof value !== "object" || depth > 4) return { found: false, rows: [] };

  for (const key of keys) {
    if (Array.isArray(value[key])) return { found: true, rows: value[key] };
  }
  for (const key of keys) {
    const nested = value[key];
    if (nested && typeof nested === "object") {
      const result = findList(nested, keys, depth + 1);
      if (result.found) return result;
    }
  }
  return { found: false, rows: [] };
}

export function normaliseList(value, preferredKeys = []) {
  const keys = [...new Set([...preferredKeys, ...LIST_KEYS])];
  const result = findList(value, keys);
  return result.found ? result.rows : [];
}

export function normaliseUser(value, depth = 0) {
  if (!value || typeof value !== "object" || depth > 4) return null;
  if (Object.prototype.hasOwnProperty.call(value, "user")) {
    return value.user && typeof value.user === "object" ? value.user : null;
  }
  for (const key of ["result", "data", "session"]) {
    const nested = value[key];
    if (nested && typeof nested === "object") {
      const user = normaliseUser(nested, depth + 1);
      if (user) return user;
    }
  }
  return value.id || value.email || value.clinic_id ? value : null;
}

export function localDateTimeFromParts(dateValue, timeLabel) {
  if (typeof dateValue !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return null;
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(String(timeLabel || "").trim());
  if (!match) return null;
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  const rawHour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3].toUpperCase();
  if (rawHour < 1 || rawHour > 12 || minute < 0 || minute > 59) return null;
  const hour = (rawHour % 12) + (meridiem === "PM" ? 12 : 0);
  date.setHours(hour, minute, 0, 0);
  return date;
}

export function localDateISO(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatTime(value) {
  const date = new Date(value || "");
  if (!Number.isFinite(date.getTime())) return "Time not recorded";
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function isSameLocalDay(value, reference = new Date()) {
  const date = new Date(value || "");
  return Number.isFinite(date.getTime()) && date.toDateString() === reference.toDateString();
}
