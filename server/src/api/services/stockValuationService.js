import prisma from "../../loaders/prisma.js";

const INBOUND_TYPES = ["INBOUND", "RETURN_IN", "TRANSFER_IN", "ADJUSTMENT"];

const round2 = (n) => parseFloat((Number(n) || 0).toFixed(2));
const round3 = (n) => parseFloat((Number(n) || 0).toFixed(3));

export const productKey = (depotId, articleId, variantId) =>
  `${depotId}:${articleId ?? "null"}:${variantId ?? "null"}`;

const INBOUND_SELECT = {
  depotId: true,
  articleId: true,
  variantId: true,
  quantityChange: true,
  unitCost: true,
  transactionType: true,
  createdAt: true,
  article: { select: { prixAchat: true } },
  variant: { select: { article: { select: { prixAchat: true } } } },
  bonReception: {
    select: {
      document: {
        select: {
          lines: {
            select: {
              articleId: true,
              variantId: true,
              unitPrice: true,
            },
          },
        },
      },
    },
  },
};

/**
 * Cost of one inbound layer:
 *  1. unitCost stored on the transaction (current BR / inventory / initial stock)
 *  2. matching Bon Réception line unitPrice (historical receptions)
 *  3. catalog prixAchat as last resort
 */
export const resolveTxnUnitCost = (txn) => {
  if (txn.unitCost != null && txn.unitCost !== "") {
    const stored = parseFloat(txn.unitCost);
    if (!Number.isNaN(stored)) return stored;
  }

  const lines = txn.bonReception?.document?.lines ?? [];
  const match = lines.find((line) =>
    txn.variantId
      ? line.variantId === txn.variantId
      : line.articleId === txn.articleId,
  );
  if (match) {
    const fromBr = parseFloat(match.unitPrice);
    if (!Number.isNaN(fromBr)) return fromBr;
  }

  const catalog = txn.article
    ? parseFloat(txn.article.prixAchat)
    : parseFloat(txn.variant?.article?.prixAchat ?? 0);
  return Number.isNaN(catalog) ? 0 : catalog;
};

const catalogCostFromStock = (stock) => {
  const raw = stock.article
    ? parseFloat(stock.article.prixAchat)
    : parseFloat(stock.variant?.article?.prixAchat ?? 0);
  return Number.isNaN(raw) ? 0 : raw;
};

/**
 * FIFO remaining inventory: leftover qty is attributed to the newest
 * inbound lots first (oldest lots are assumed sold/consumed).
 */
export const valueRemainingFifo = (
  remainingQty,
  layersNewestFirst,
  fallbackCost = 0,
) => {
  let left = Math.max(0, parseFloat(remainingQty) || 0);
  let value = 0;
  const used = [];

  for (const layer of layersNewestFirst) {
    if (left <= 1e-9) break;
    const take = Math.min(left, layer.qty);
    if (take <= 0) continue;
    const layerValue = take * layer.unitCost;
    value += layerValue;
    used.push({
      quantity: round3(take),
      unitCost: round2(layer.unitCost),
      value: round2(layerValue),
      date: layer.date,
    });
    left -= take;
  }

  if (left > 1e-9) {
    const layerValue = left * fallbackCost;
    value += layerValue;
    used.push({
      quantity: round3(left),
      unitCost: round2(fallbackCost),
      value: round2(layerValue),
      date: null,
    });
  }

  return { valeurStock: round2(value), costLayers: used };
};

const toLayer = (txn) => ({
  qty: parseFloat(txn.quantityChange) || 0,
  unitCost: resolveTxnUnitCost(txn),
  date: txn.createdAt,
});

const groupLayers = (txns) => {
  const map = new Map();
  for (const txn of txns) {
    const key = productKey(txn.depotId, txn.articleId, txn.variantId);
    const list = map.get(key) || [];
    list.push(toLayer(txn));
    map.set(key, list);
  }
  return map;
};

/**
 * Attach valeurStock + costLayers to stock rows (FIFO remaining lots).
 */
export const attachStockValues = async (stocks) => {
  if (!stocks?.length) return stocks;

  const or = stocks.map((s) =>
    s.variantId
      ? { depotId: s.depotId, variantId: s.variantId }
      : { depotId: s.depotId, articleId: s.articleId },
  );

  const txns = await prisma.stockTransaction.findMany({
    where: {
      OR: or,
      quantityChange: { gt: 0 },
      transactionType: { in: INBOUND_TYPES },
    },
    orderBy: { createdAt: "desc" },
    select: INBOUND_SELECT,
  });

  const layersByProduct = groupLayers(txns);

  return stocks.map((stock) => {
    const key = productKey(stock.depotId, stock.articleId, stock.variantId);
    const layers = layersByProduct.get(key) || [];
    const fallback = catalogCostFromStock(stock);
    const { valeurStock, costLayers } = valueRemainingFifo(
      stock.quantityAvailable,
      layers,
      fallback,
    );
    return { ...stock, valeurStock, costLayers };
  });
};

/**
 * Company-wide remaining stock value + inbound purchase series for the dashboard.
 */
export const getStockValuationOverview = async ({
  societeId,
  dateFrom,
  dateTo,
  granularity,
  fillSeries,
  periodKey,
}) => {
  const depotWhere = societeId ? { societeId } : {};

  const [stocks, inboundTxns] = await Promise.all([
    prisma.stockByDepot.findMany({
      where: { depot: depotWhere, quantityAvailable: { gt: 0 } },
      select: {
        depotId: true,
        articleId: true,
        variantId: true,
        quantityAvailable: true,
        depot: { select: { id: true, name: true } },
        article: { select: { prixAchat: true } },
        variant: { select: { article: { select: { prixAchat: true } } } },
      },
    }),
    prisma.stockTransaction.findMany({
      where: {
        depot: depotWhere,
        quantityChange: { gt: 0 },
        transactionType: { in: INBOUND_TYPES },
      },
      orderBy: { createdAt: "desc" },
      select: INBOUND_SELECT,
    }),
  ]);

  const layersByProduct = groupLayers(inboundTxns);
  const byDepotMap = new Map();
  let total = 0;

  for (const stock of stocks) {
    const key = productKey(stock.depotId, stock.articleId, stock.variantId);
    const layers = layersByProduct.get(key) || [];
    const fallback = catalogCostFromStock(stock);
    const { valeurStock } = valueRemainingFifo(
      stock.quantityAvailable,
      layers,
      fallback,
    );
    total += valeurStock;

    const depotId = stock.depot?.id ?? stock.depotId;
    const existing = byDepotMap.get(depotId) || {
      id: depotId,
      name: stock.depot?.name || `#${depotId}`,
      value: 0,
    };
    existing.value = round2(existing.value + valeurStock);
    byDepotMap.set(depotId, existing);
  }

  const amountByPeriod = new Map();
  const countByPeriod = new Map();
  let inboundValue = 0;

  for (const txn of inboundTxns) {
    if (txn.transactionType !== "INBOUND") continue;
    const created = new Date(txn.createdAt);
    if (dateFrom && created < dateFrom) continue;
    if (dateTo && created > dateTo) continue;

    const amount = (parseFloat(txn.quantityChange) || 0) * resolveTxnUnitCost(txn);
    inboundValue += amount;

    if (granularity && periodKey) {
      const key = periodKey(created, granularity);
      amountByPeriod.set(key, (amountByPeriod.get(key) || 0) + amount);
      countByPeriod.set(key, (countByPeriod.get(key) || 0) + 1);
    }
  }

  const byDepot = [...byDepotMap.values()].sort((a, b) => b.value - a.value);
  const series =
    fillSeries && dateFrom && dateTo && granularity
      ? fillSeries(amountByPeriod, countByPeriod, dateFrom, dateTo, granularity)
      : [];

  return {
    total: round2(total),
    inboundValue: round2(inboundValue),
    byDepot,
    series,
  };
};
