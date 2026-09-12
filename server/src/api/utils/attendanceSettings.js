import ApiError from "./apiError.js";

export const ATTENDANCE_TZ = "Africa/Casablanca";

export const DEFAULT_ATTENDANCE_SETTINGS = {
  morningStart: "09:30",
  morningEnd: "13:30",
  afternoonStart: "14:30",
  afternoonEnd: "18:00",
  blockHours: 1,
  amount: 50,
};

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

export const parseHm = (value) => {
  const raw = String(value ?? "").trim().slice(0, 5);
  const match = TIME_RE.exec(raw);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

export const formatHm = (minutes) => {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

export const minutesToHours = (minutes) =>
  Math.round(((Number(minutes) || 0) / 60) * 100) / 100;

const toPositiveNumber = (value, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
};

const toNonNegativeNumber = (value, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
};

const parseJson = (value) => {
  if (value == null || value === "") return null;
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return null;
};

export const expectedWorkMinutes = (settings) => {
  const morningStart = parseHm(settings.morningStart);
  const morningEnd = parseHm(settings.morningEnd);
  const afternoonStart = parseHm(settings.afternoonStart);
  const afternoonEnd = parseHm(settings.afternoonEnd);
  if (
    morningStart == null ||
    morningEnd == null ||
    afternoonStart == null ||
    afternoonEnd == null
  ) {
    return 0;
  }
  return Math.max(0, morningEnd - morningStart) + Math.max(0, afternoonEnd - afternoonStart);
};

export const resolveAttendanceSettings = (raw) => {
  const parsed = parseJson(raw) || {};
  const merged = {
    ...DEFAULT_ATTENDANCE_SETTINGS,
    morningStart: parsed.morningStart || DEFAULT_ATTENDANCE_SETTINGS.morningStart,
    morningEnd: parsed.morningEnd || DEFAULT_ATTENDANCE_SETTINGS.morningEnd,
    afternoonStart: parsed.afternoonStart || DEFAULT_ATTENDANCE_SETTINGS.afternoonStart,
    afternoonEnd: parsed.afternoonEnd || DEFAULT_ATTENDANCE_SETTINGS.afternoonEnd,
    blockHours: toPositiveNumber(
      parsed.blockHours,
      DEFAULT_ATTENDANCE_SETTINGS.blockHours,
    ),
    amount: toNonNegativeNumber(parsed.amount, DEFAULT_ATTENDANCE_SETTINGS.amount),
  };

  const times = [
    merged.morningStart,
    merged.morningEnd,
    merged.afternoonStart,
    merged.afternoonEnd,
  ];
  if (times.some((t) => parseHm(t) == null)) {
    return { ...DEFAULT_ATTENDANCE_SETTINGS };
  }

  return merged;
};

export const sanitizeAttendanceSettings = (raw) => {
  const parsed = parseJson(raw) || raw || {};

  const toHm = (value, key) => {
    const minutes = parseHm(value);
    if (minutes == null) {
      throw new ApiError(`${key} must be a valid time (HH:MM)`, 400);
    }
    return formatHm(minutes);
  };

  const morningStart = toHm(parsed.morningStart, "morningStart");
  const morningEnd = toHm(parsed.morningEnd, "morningEnd");
  const afternoonStart = toHm(parsed.afternoonStart, "afternoonStart");
  const afternoonEnd = toHm(parsed.afternoonEnd, "afternoonEnd");

  const mStart = parseHm(morningStart);
  const mEnd = parseHm(morningEnd);
  const aStart = parseHm(afternoonStart);
  const aEnd = parseHm(afternoonEnd);

  if (!(mStart < mEnd && mEnd <= aStart && aStart < aEnd)) {
    throw new ApiError(
      "Standard hours must follow morning start < morning end ≤ afternoon start < afternoon end",
      400,
    );
  }

  const blockHours = Number(parsed.blockHours);
  if (!Number.isFinite(blockHours) || blockHours <= 0 || blockHours > 24) {
    throw new ApiError("blockHours must be a number between 0 and 24", 400);
  }

  const amount = Number(parsed.amount);
  if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000) {
    throw new ApiError("amount must be a number greater than or equal to 0", 400);
  }

  return {
    morningStart,
    morningEnd,
    afternoonStart,
    afternoonEnd,
    blockHours: Math.round(blockHours * 100) / 100,
    amount: Math.round(amount * 100) / 100,
  };
};

export const amountForHours = (hours, blockHours, amount) => {
  const h = Number(hours) || 0;
  const block = Number(blockHours) || 0;
  const amt = Number(amount) || 0;
  if (block <= 0 || amt === 0 || h === 0) return 0;
  return Math.round((h / block) * amt * 100) / 100;
};

const zonedFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: ATTENDANCE_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export const zonedPunchParts = (date) => {
  const parts = {};
  for (const part of zonedFormatter.formatToParts(date)) {
    if (part.type !== "literal") parts[part.type] = part.value;
  }
  let hour = Number(parts.hour);
  if (hour === 24) hour = 0;
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: hour * 60 + Number(parts.minute),
  };
};

const punchKind = (type) => {
  if (type === 0 || type === 5) return "in";
  if (type === 1 || type === 4) return "out";
  if (type === 2) return "break_out";
  if (type === 3) return "break_in";
  return "other";
};

export const analyzeDay = (punches, settings) => {
  const morningStart = parseHm(settings.morningStart);
  const morningEnd = parseHm(settings.morningEnd);
  const afternoonStart = parseHm(settings.afternoonStart);
  const afternoonEnd = parseHm(settings.afternoonEnd);

  const sorted = [...punches].sort((a, b) => a.minutes - b.minutes);
  const firstIn = sorted.find((p) => p.kind === "in") || sorted[0];
  const lastOut =
    [...sorted].reverse().find((p) => p.kind === "out") || sorted[sorted.length - 1];
  const breakOut = sorted.find((p) => p.kind === "break_out");
  const breakIn = [...sorted].reverse().find((p) => p.kind === "break_in");

  const arrival = firstIn?.minutes ?? null;
  const departure = lastOut?.minutes ?? null;
  const pauseStart = breakOut?.minutes ?? null;
  const pauseEnd = breakIn?.minutes ?? null;

  let lateMinutes = 0;
  let overtimeMinutes = 0;

  if (arrival != null) {
    lateMinutes += Math.max(0, arrival - morningStart);
    overtimeMinutes += Math.max(0, morningStart - arrival);
  }
  if (pauseEnd != null) {
    lateMinutes += Math.max(0, pauseEnd - afternoonStart);
    overtimeMinutes += Math.max(0, afternoonStart - pauseEnd);
  }
  if (departure != null) {
    lateMinutes += Math.max(0, afternoonEnd - departure);
    overtimeMinutes += Math.max(0, departure - afternoonEnd);
  }

  const expectedMinutes = expectedWorkMinutes(settings);
  let workedMinutes = 0;
  if (arrival != null && departure != null && departure > arrival) {
    let pause = 0;
    if (pauseStart != null && pauseEnd != null && pauseEnd > pauseStart) {
      pause = pauseEnd - pauseStart;
    } else if (arrival < morningEnd && departure > afternoonStart) {
      pause = Math.max(0, afternoonStart - morningEnd);
    }
    workedMinutes = Math.max(0, departure - arrival - pause);
  }

  return {
    arrival,
    departure,
    lateMinutes,
    overtimeMinutes,
    workedMinutes,
    expectedMinutes,
  };
};

export const buildPunchBuckets = (records) => {
  const buckets = new Map();
  for (const row of records) {
    const punchTime = row.punchTime instanceof Date ? row.punchTime : new Date(row.punchTime);
    if (Number.isNaN(punchTime.getTime())) continue;
    const { dateKey, minutes } = zonedPunchParts(punchTime);
    const userId = row.userId;
    const key = `${userId}|${dateKey}`;
    if (!buckets.has(key)) {
      buckets.set(key, {
        userId,
        societeId: row.societeId,
        dateKey,
        user: row.user,
        punches: [],
      });
    }
    buckets.get(key).punches.push({
      minutes,
      kind: punchKind(row.punchType),
      punchType: row.punchType,
    });
  }
  return [...buckets.values()];
};

export { punchKind };
