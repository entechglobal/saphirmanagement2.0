import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";
import { CAISSE_INCLUDE } from "./caisseWalletHelper.js";

const WALLET_TYPES = ["CENTRAL", "SOCIETE", "USER", "BANK", "COFFRE"];

const pad2 = (n) => String(n).padStart(2, "0");

const parseRange = (query) => {
  const now = new Date();
  const dateFrom = query.dateFrom ? new Date(query.dateFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
  const dateTo = query.dateTo ? new Date(query.dateTo) : now;

  if (Number.isNaN(dateFrom.getTime()) || Number.isNaN(dateTo.getTime())) {
    throw new ApiError("Invalid date range", 400);
  }
  if (dateFrom > dateTo) {
    throw new ApiError("dateFrom must be before dateTo", 400);
  }

  return { dateFrom, dateTo };
};

const resolveGranularity = (dateFrom, dateTo) => {
  const hours = (dateTo - dateFrom) / 3_600_000;
  if (hours <= 48) return "hour";
  if (hours <= 24 * 92) return "day";
  return "month";
};

const periodKey = (date, granularity) => {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  const h = pad2(date.getHours());
  if (granularity === "hour") return `${y}-${m}-${d} ${h}:00`;
  if (granularity === "month") return `${y}-${m}`;
  return `${y}-${m}-${d}`;
};

const alignStart = (date, granularity) => {
  const x = new Date(date);
  if (granularity === "month") {
    x.setDate(1);
    x.setHours(0, 0, 0, 0);
  } else if (granularity === "day") {
    x.setHours(0, 0, 0, 0);
  } else {
    x.setMinutes(0, 0, 0);
  }
  return x;
};

const nextPeriod = (date, granularity) => {
  const x = new Date(date);
  if (granularity === "hour") x.setHours(x.getHours() + 1);
  else if (granularity === "month") x.setMonth(x.getMonth() + 1);
  else x.setDate(x.getDate() + 1);
  return x;
};

const fillSeries = (amountMap, countMap, dateFrom, dateTo, granularity) => {
  const series = [];
  let cursor = alignStart(dateFrom, granularity);
  const end = dateTo.getTime();
  let guard = 0;
  while (cursor.getTime() <= end && guard < 800) {
    const key = periodKey(cursor, granularity);
    series.push({
      period: key,
      amount: amountMap.get(key) || 0,
      count: countMap.get(key) || 0,
    });
    cursor = nextPeriod(cursor, granularity);
    guard += 1;
  }
  return series;
};

const aggregatePayments = (rows, dateFrom, dateTo, granularity, partnerKey, partnerName) => {
  const amountByPeriod = new Map();
  const countByPeriod = new Map();
  const amountByMode = new Map();
  const countByMode = new Map();
  const partners = new Map();

  let collected = 0;
  let documentAmount = 0;

  for (const row of rows) {
    const amount = Number(row.montantRegle) || 0;
    const docAmount = Number(row.documentAmount) || 0;
    collected += amount;
    documentAmount += docAmount;

    const key = periodKey(new Date(row.date), granularity);
    amountByPeriod.set(key, (amountByPeriod.get(key) || 0) + amount);
    countByPeriod.set(key, (countByPeriod.get(key) || 0) + 1);

    const mode = row.modeReglement || "AUTRE";
    amountByMode.set(mode, (amountByMode.get(mode) || 0) + amount);
    countByMode.set(mode, (countByMode.get(mode) || 0) + 1);

    const id = row[partnerKey];
    const existing = partners.get(id) || {
      id,
      name: row[partnerName] || `#${id}`,
      amount: 0,
      count: 0,
    };
    existing.amount += amount;
    existing.count += 1;
    partners.set(id, existing);
  }

  const byPartner = [...partners.values()].sort((a, b) => b.amount - a.amount);
  const byMode = [...amountByMode.entries()]
    .map(([mode, amount]) => ({
      mode,
      amount,
      count: countByMode.get(mode) || 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    totals: {
      collected,
      documentAmount,
      paymentCount: rows.length,
      partnerCount: byPartner.length,
      average: rows.length ? collected / rows.length : 0,
    },
    byPartner,
    byMode,
    series: fillSeries(amountByPeriod, countByPeriod, dateFrom, dateTo, granularity),
  };
};

export const getOverview = async (query, societeId) => {
  const { dateFrom, dateTo } = parseRange(query);
  const granularity = resolveGranularity(dateFrom, dateTo);
  const dateFilter = { gte: dateFrom, lte: dateTo };
  const societeWhere = societeId ? { societeId } : {};

  const [clientRows, fournisseurRows] = await Promise.all([
    prisma.reglementClient.findMany({
      where: { ...societeWhere, date: dateFilter },
      select: {
        date: true,
        montantRegle: true,
        montantBL: true,
        modeReglement: true,
        clientId: true,
        client: { select: { name: true } },
      },
    }),
    prisma.reglementFournisseur.findMany({
      where: { ...societeWhere, date: dateFilter },
      select: {
        date: true,
        montantRegle: true,
        montantBR: true,
        modeReglement: true,
        fournisseurId: true,
        fournisseur: { select: { name: true } },
      },
    }),
  ]);

  const clientMapped = clientRows.map((r) => ({
    date: r.date,
    montantRegle: r.montantRegle,
    documentAmount: r.montantBL,
    modeReglement: r.modeReglement,
    partnerId: r.clientId,
    partnerName: r.client?.name,
  }));

  const fournisseurMapped = fournisseurRows.map((r) => ({
    date: r.date,
    montantRegle: r.montantRegle,
    documentAmount: r.montantBR,
    modeReglement: r.modeReglement,
    partnerId: r.fournisseurId,
    partnerName: r.fournisseur?.name,
  }));

  const clients = aggregatePayments(
    clientMapped,
    dateFrom,
    dateTo,
    granularity,
    "partnerId",
    "partnerName",
  );
  const fournisseurs = aggregatePayments(
    fournisseurMapped,
    dateFrom,
    dateTo,
    granularity,
    "partnerId",
    "partnerName",
  );

  return {
    dateFrom,
    dateTo,
    granularity,
    clients,
    fournisseurs,
    net: (clients.totals.collected || 0) - (fournisseurs.totals.collected || 0),
  };
};

export const getWalletsOverview = async () => {
  const caisses = await prisma.caisse.findMany({
    where: { caisseType: { in: WALLET_TYPES } },
    include: CAISSE_INCLUDE,
    orderBy: [{ caisseType: "asc" }, { name: "asc" }],
  });

  const mapWallet = (c) => ({
    id: c.id,
    name: c.name,
    caisseType: c.caisseType,
    currentBalance: Number(c.currentBalance) || 0,
    active: c.active,
    user: c.user,
    banque: c.banque,
    societe: c.societe,
  });

  const central = caisses.filter((c) => c.caisseType === "CENTRAL").map(mapWallet);
  const societe = caisses.filter((c) => c.caisseType === "SOCIETE").map(mapWallet);
  const users = caisses.filter((c) => c.caisseType === "USER").map(mapWallet);
  const banks = caisses.filter((c) => c.caisseType === "BANK").map(mapWallet);
  const coffres = caisses.filter((c) => c.caisseType === "COFFRE").map(mapWallet);

  const sum = (list) => list.reduce((acc, w) => acc + w.currentBalance, 0);
  const all = [...central, ...societe, ...users, ...banks, ...coffres];

  return {
    central,
    societe,
    users,
    banks,
    coffres,
    totals: {
      central: sum(central),
      societe: sum(societe),
      users: sum(users),
      banks: sum(banks),
      coffres: sum(coffres),
      grand: sum(all),
    },
  };
};
