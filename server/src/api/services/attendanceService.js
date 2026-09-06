import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";

const PUNCH_TYPES = {
  0: "CHECK_IN",
  1: "CHECK_OUT",
  2: "BREAK_OUT",
  3: "BREAK_IN",
  4: "OT_IN",
  5: "OT_OUT",
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
      deviceUid: toInt(raw.deviceUid ?? raw.uid ?? raw.userSn),
      punchTime,
      punchType: toInt(raw.punchType ?? raw.type ?? raw.state) ?? 0,
      verifyMode: toInt(raw.verifyMode ?? raw.verify),
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
      societeId: true,
      deviceIp: true,
      deviceUserId: true,
      punchTime: true,
    },
  });

  const existingKeys = new Set(
    existing.map(
      (e) =>
        `${e.societeId}|${e.deviceIp}|${e.deviceUserId}|${e.punchTime.toISOString()}`,
    ),
  );

  const seen = new Set();
  const toInsert = [];
  let skippedDuplicates = 0;

  for (const c of candidates) {
    const key = `${c.societeId}|${c.deviceIp}|${c.deviceUserId}|${c.punchTime.toISOString()}`;
    if (existingKeys.has(key) || seen.has(key)) {
      skippedDuplicates += 1;
      continue;
    }
    seen.add(key);
    toInsert.push(c);
  }

  if (toInsert.length) {
    await prisma.attendanceRecord.createMany({
      data: toInsert,
      skipDuplicates: true,
    });
  }

  return {
    imported: toInsert.length,
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
