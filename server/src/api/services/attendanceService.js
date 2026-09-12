import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";
import {
  amountForHours,
  analyzeDay,
  buildPunchBuckets,
  expectedWorkMinutes,
  minutesToHours,
  resolveAttendanceSettings,
  sanitizeAttendanceSettings,
} from "../utils/attendanceSettings.js";

const PUNCH_TYPES = {
  0: "CHECK_IN",
  1: "CHECK_OUT",
  2: "BREAK_OUT",
  3: "BREAK_IN",
  4: "CHECK_OUT",
  5: "CHECK_IN",
};

const PUNCH_TYPE_GROUPS = {
  check_in: [0, 5],
  check_out: [1, 4],
  break_out: [2],
  break_in: [3],
};

const applyPunchTypeFilter = (where, punchType) => {
  if (punchType == null || punchType === "") return;
  const raw = String(punchType);
  if (PUNCH_TYPE_GROUPS[raw]) {
    where.punchType = { in: PUNCH_TYPE_GROUPS[raw] };
    return;
  }
  const n = toInt(raw);
  if (n !== null) where.punchType = n;
};

const toInt = (value) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
};

const parsePunchTime = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const normalizeDeviceIp = (ip) => String(ip || "").trim().slice(0, 64);

/**
 * Active société users the desktop bridge can enroll on the device.
 * Device PIN / userid is the app user id.
 */
export const getEnrollableUsers = async (societeId) => {
  const where = {
    active: true,
    ...(societeId ? { societeId } : {}),
  };

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      societeId: true,
      active: true,
      role: { select: { id: true, name: true } },
    },
    orderBy: { name: "asc" },
    take: 1000,
  });

  return users;
};

/**
 * Import punch logs from attendance-link.
 * Dedup key: societeId + deviceIp + deviceUserId + punchTime
 * deviceUserId is the app User.id written as the ZKTeco PIN.
 */
export const importRecords = async (payload, currentUser, societeId) => {
  const records = Array.isArray(payload?.records) ? payload.records : [];
  if (!records.length) {
    throw new ApiError("No attendance records to import", 400);
  }
  if (records.length > 5000) {
    throw new ApiError("Import is limited to 5000 records per request", 400);
  }

  const resolvedSocieteId = societeId || currentUser.societeId;
  if (!resolvedSocieteId && !currentUser.isSuperAdmin) {
    throw new ApiError("Société context is required to import attendance", 400);
  }

  const deviceIp = normalizeDeviceIp(payload?.deviceIp);
  const deviceSn = payload?.deviceSn ? String(payload.deviceSn).slice(0, 64) : null;

  const parsed = [];
  let invalid = 0;

  for (const raw of records) {
    const deviceUserId = String(
      raw.deviceUserId ?? raw.userId ?? raw.userid ?? "",
    ).trim();
    const punchTime = parsePunchTime(raw.punchTime ?? raw.recordTime ?? raw.attTime);
    if (!deviceUserId || !punchTime) {
      invalid += 1;
      continue;
    }
    parsed.push({
      deviceUserId,
      deviceUid: toInt(raw.deviceUid ?? raw.uid ?? raw.userSn ?? raw.sn),
      punchTime,
      // punchType is in/out (device state). Never use raw.type — that is verify mode.
      punchType: toInt(raw.punchType ?? raw.state ?? raw.status) ?? 0,
      verifyMode: toInt(raw.verifyMode ?? raw.verify ?? raw.type),
      deviceIp: normalizeDeviceIp(raw.deviceIp) || deviceIp,
      deviceSn: raw.deviceSn ? String(raw.deviceSn).slice(0, 64) : deviceSn,
    });
  }

  const userIds = [
    ...new Set(
      parsed.map((r) => toInt(r.deviceUserId)).filter((id) => id && id > 0),
    ),
  ];

  const users = userIds.length
    ? await prisma.user.findMany({
        where: {
          id: { in: userIds },
          ...(resolvedSocieteId ? { societeId: resolvedSocieteId } : {}),
        },
        select: { id: true, societeId: true },
      })
    : [];

  const userById = new Map(users.map((u) => [u.id, u]));

  const candidates = [];
  let unmatchedUsers = 0;
  const unmatchedSamples = [];

  for (const rec of parsed) {
    const appUserId = toInt(rec.deviceUserId);
    const user = appUserId ? userById.get(appUserId) : null;
    if (!user) {
      unmatchedUsers += 1;
      if (unmatchedSamples.length < 10) unmatchedSamples.push(rec.deviceUserId);
      continue;
    }
    const rowSocieteId = resolvedSocieteId || user.societeId;
    if (!rowSocieteId) {
      unmatchedUsers += 1;
      continue;
    }
    candidates.push({
      societeId: rowSocieteId,
      userId: user.id,
      deviceUserId: rec.deviceUserId,
      deviceUid: rec.deviceUid,
      punchTime: rec.punchTime,
      punchType: rec.punchType,
      verifyMode: rec.verifyMode,
      deviceIp: rec.deviceIp || "",
      deviceSn: rec.deviceSn,
    });
  }

  if (!candidates.length) {
    return {
      imported: 0,
      updated: 0,
      skippedDuplicates: 0,
      unmatchedUsers,
      invalid,
      unmatchedSamples,
    };
  }

  const existing = await prisma.attendanceRecord.findMany({
    where: {
      OR: candidates.map((c) => ({
        societeId: c.societeId,
        deviceIp: c.deviceIp,
        deviceUserId: c.deviceUserId,
        punchTime: c.punchTime,
      })),
    },
    select: {
      id: true,
      societeId: true,
      deviceIp: true,
      deviceUserId: true,
      punchTime: true,
      punchType: true,
      verifyMode: true,
    },
  });

  const existingByKey = new Map(
    existing.map((e) => [
      `${e.societeId}|${e.deviceIp}|${e.deviceUserId}|${e.punchTime.toISOString()}`,
      e,
    ]),
  );

  const seen = new Set();
  const toInsert = [];
  const toUpdate = [];
  let skippedDuplicates = 0;

  for (const c of candidates) {
    const key = `${c.societeId}|${c.deviceIp}|${c.deviceUserId}|${c.punchTime.toISOString()}`;
    if (seen.has(key)) {
      skippedDuplicates += 1;
      continue;
    }
    seen.add(key);
    const prev = existingByKey.get(key);
    if (prev) {
      const typeChanged = prev.punchType !== c.punchType;
      const verifyChanged = (prev.verifyMode ?? null) !== (c.verifyMode ?? null);
      if (typeChanged || verifyChanged) {
        toUpdate.push({
          id: prev.id,
          punchType: c.punchType,
          verifyMode: c.verifyMode,
        });
      } else {
        skippedDuplicates += 1;
      }
      continue;
    }
    toInsert.push(c);
  }

  if (toInsert.length) {
    await prisma.attendanceRecord.createMany({
      data: toInsert,
      skipDuplicates: true,
    });
  }

  if (toUpdate.length) {
    const chunkSize = 25;
    for (let i = 0; i < toUpdate.length; i += chunkSize) {
      const chunk = toUpdate.slice(i, i + chunkSize);
      await prisma.$transaction(
        chunk.map((row) =>
          prisma.attendanceRecord.update({
            where: { id: row.id },
            data: { punchType: row.punchType, verifyMode: row.verifyMode },
          }),
        ),
      );
    }
  }

  return {
    imported: toInsert.length,
    updated: toUpdate.length,
    skippedDuplicates,
    unmatchedUsers,
    invalid,
    unmatchedSamples,
  };
};

export const getAll = async (query, societeId) => {
  const page = Math.max(1, toInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, toInt(query.limit) || 20));
  const skip = (page - 1) * limit;

  const where = {};
  if (societeId) where.societeId = societeId;
  if (toInt(query.userId)) where.userId = toInt(query.userId);
  applyPunchTypeFilter(where, query.punchType);

  if (query.dateFrom || query.dateTo) {
    where.punchTime = {};
    if (query.dateFrom) {
      const from = parsePunchTime(query.dateFrom);
      if (from) where.punchTime.gte = from;
    }
    if (query.dateTo) {
      const to = parsePunchTime(query.dateTo);
      if (to) where.punchTime.lte = to;
    }
  }

  if (query.search) {
    const search = String(query.search).trim();
    if (search) {
      where.user = {
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
        ],
      };
    }
  }

  const [total, data] = await Promise.all([
    prisma.attendanceRecord.count({ where }),
    prisma.attendanceRecord.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, role: { select: { name: true } } },
        },
      },
      orderBy: { punchTime: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return {
    data: data.map((row) => ({
      ...row,
      punchTypeLabel: PUNCH_TYPES[row.punchType] || `TYPE_${row.punchType}`,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getStats = async (societeId, query = {}) => {
  const where = societeId ? { societeId } : {};
  if (toInt(query.userId)) where.userId = toInt(query.userId);
  applyPunchTypeFilter(where, query.punchType);
  if (query.dateFrom || query.dateTo) {
    where.punchTime = {};
    if (query.dateFrom) {
      const from = parsePunchTime(query.dateFrom);
      if (from) where.punchTime.gte = from;
    }
    if (query.dateTo) {
      const to = parsePunchTime(query.dateTo);
      if (to) where.punchTime.lte = to;
    }
  }

  const [total, today] = await Promise.all([
    prisma.attendanceRecord.count({ where }),
    prisma.attendanceRecord.count({
      where: {
        ...where,
        punchTime: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
  ]);

  return { total, today };
};

const settingsPayload = (raw, configured) => {
  const settings = resolveAttendanceSettings(raw);
  return {
    ...settings,
    configured,
    expectedMinutesPerDay: expectedWorkMinutes(settings),
    expectedHoursPerDay: minutesToHours(expectedWorkMinutes(settings)),
  };
};

export const getSettings = async (societeId) => {
  if (!societeId) {
    throw new ApiError("Société is required to load attendance settings", 400);
  }

  const societe = await prisma.societe.findUnique({
    where: { id: societeId },
    select: { id: true, raisonSocial: true, attendanceSettings: true },
  });
  if (!societe) {
    throw new ApiError("Société not found", 404);
  }

  return {
    societeId: societe.id,
    societeName: societe.raisonSocial,
    settings: settingsPayload(societe.attendanceSettings, societe.attendanceSettings != null),
  };
};

export const updateSettings = async (societeId, raw) => {
  if (!societeId) {
    throw new ApiError("Société is required to save attendance settings", 400);
  }

  const existing = await prisma.societe.findUnique({
    where: { id: societeId },
    select: { id: true, raisonSocial: true },
  });
  if (!existing) {
    throw new ApiError("Société not found", 404);
  }

  const attendanceSettings = sanitizeAttendanceSettings(raw);
  const societe = await prisma.societe.update({
    where: { id: societeId },
    data: { attendanceSettings },
    select: { id: true, raisonSocial: true, attendanceSettings: true },
  });

  return {
    societeId: societe.id,
    societeName: societe.raisonSocial,
    settings: settingsPayload(societe.attendanceSettings, true),
  };
};

const roundMoney = (n) => Math.round((Number(n) || 0) * 100) / 100;

export const getSummary = async (query, societeId) => {
  const page = Math.max(1, toInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, toInt(query.limit) || 50));
  const skip = (page - 1) * limit;

  const where = {};
  if (societeId) where.societeId = societeId;
  if (toInt(query.userId)) where.userId = toInt(query.userId);

  if (query.dateFrom || query.dateTo) {
    where.punchTime = {};
    if (query.dateFrom) {
      const from = parsePunchTime(query.dateFrom);
      if (from) where.punchTime.gte = from;
    }
    if (query.dateTo) {
      const to = parsePunchTime(query.dateTo);
      if (to) where.punchTime.lte = to;
    }
  }

  if (query.search) {
    const search = String(query.search).trim();
    if (search) {
      where.user = {
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
        ],
      };
    }
  }

  const records = await prisma.attendanceRecord.findMany({
    where,
    include: {
      user: {
        select: { id: true, name: true, email: true, societeId: true },
      },
    },
    orderBy: { punchTime: "asc" },
    take: 50000,
  });

  const societeIds = [
    ...new Set(records.map((r) => r.societeId).filter(Boolean)),
  ];
  if (societeId && !societeIds.includes(societeId)) societeIds.push(societeId);

  const societes = societeIds.length
    ? await prisma.societe.findMany({
        where: { id: { in: societeIds } },
        select: { id: true, attendanceSettings: true },
      })
    : [];

  const settingsBySociete = new Map(
    societes.map((s) => [s.id, resolveAttendanceSettings(s.attendanceSettings)]),
  );

  const fallbackSettings = societeId
    ? settingsBySociete.get(societeId) || resolveAttendanceSettings(null)
    : resolveAttendanceSettings(null);

  const days = buildPunchBuckets(records);
  const byUser = new Map();

  for (const day of days) {
    const settings =
      settingsBySociete.get(day.societeId) || fallbackSettings;
    const analysis = analyzeDay(day.punches, settings);
    const lateHours = minutesToHours(analysis.lateMinutes);
    const overtimeHours = minutesToHours(analysis.overtimeMinutes);
    const lateAmount = -amountForHours(
      lateHours,
      settings.blockHours,
      settings.amount,
    );
    const overtimeAmount = amountForHours(
      overtimeHours,
      settings.blockHours,
      settings.amount,
    );

    if (!byUser.has(day.userId)) {
      byUser.set(day.userId, {
        userId: day.userId,
        name: day.user?.name || "",
        email: day.user?.email || "",
        days: 0,
        expectedMinutes: 0,
        workedMinutes: 0,
        lateMinutes: 0,
        overtimeMinutes: 0,
        lateAmount: 0,
        overtimeAmount: 0,
        netAmount: 0,
      });
    }

    const row = byUser.get(day.userId);
    row.days += 1;
    row.expectedMinutes += analysis.expectedMinutes;
    row.workedMinutes += analysis.workedMinutes;
    row.lateMinutes += analysis.lateMinutes;
    row.overtimeMinutes += analysis.overtimeMinutes;
    row.lateAmount = roundMoney(row.lateAmount + lateAmount);
    row.overtimeAmount = roundMoney(row.overtimeAmount + overtimeAmount);
    row.netAmount = roundMoney(row.lateAmount + row.overtimeAmount);
  }

  const allRows = [...byUser.values()].sort((a, b) =>
    String(a.name).localeCompare(String(b.name), "fr"),
  );

  const totals = allRows.reduce(
    (acc, row) => {
      acc.users += 1;
      acc.days += row.days;
      acc.expectedMinutes += row.expectedMinutes;
      acc.workedMinutes += row.workedMinutes;
      acc.lateMinutes += row.lateMinutes;
      acc.overtimeMinutes += row.overtimeMinutes;
      acc.lateAmount = roundMoney(acc.lateAmount + row.lateAmount);
      acc.overtimeAmount = roundMoney(acc.overtimeAmount + row.overtimeAmount);
      acc.netAmount = roundMoney(acc.netAmount + row.netAmount);
      return acc;
    },
    {
      users: 0,
      days: 0,
      expectedMinutes: 0,
      workedMinutes: 0,
      lateMinutes: 0,
      overtimeMinutes: 0,
      lateAmount: 0,
      overtimeAmount: 0,
      netAmount: 0,
    },
  );

  const data = allRows.slice(skip, skip + limit).map((row) => ({
    ...row,
    expectedHours: minutesToHours(row.expectedMinutes),
    workedHours: minutesToHours(row.workedMinutes),
    lateHours: minutesToHours(row.lateMinutes),
    overtimeHours: minutesToHours(row.overtimeMinutes),
  }));

  return {
    settings: settingsPayload(
      societeId
        ? societes.find((s) => s.id === societeId)?.attendanceSettings
        : fallbackSettings,
      Boolean(
        societeId &&
          societes.find((s) => s.id === societeId)?.attendanceSettings != null,
      ),
    ),
    totals: {
      ...totals,
      expectedHours: minutesToHours(totals.expectedMinutes),
      workedHours: minutesToHours(totals.workedMinutes),
      lateHours: minutesToHours(totals.lateMinutes),
      overtimeHours: minutesToHours(totals.overtimeMinutes),
    },
    data,
    pagination: {
      page,
      limit,
      total: allRows.length,
      totalPages: Math.ceil(allRows.length / limit) || 1,
    },
  };
};
