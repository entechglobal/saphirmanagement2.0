import prisma from "../../loaders/prisma.js";

const TOLERANCE = 0.001;
const TOP_PARTNERS = 8;

const round2 = (n) => parseFloat((Number(n) || 0).toFixed(2));

const aggregateSide = (
  docs,
  { getDate, getPartnerId, getPartnerName, dateFrom, dateTo, granularity, fillSeries, periodKey },
) => {
  const amountByPeriod = new Map();
  const countByPeriod = new Map();
  const partners = new Map();

  let totalReste = 0;
  let totalAmountDue = 0;
  let totalPaid = 0;
  let documentCount = 0;

  for (const doc of docs) {
    const amountDue = Number(doc.amountDue) || 0;
    const amountPaid = Number(doc.amountPaid) || 0;
    const reste = amountDue - amountPaid;
    if (reste <= TOLERANCE) continue;

    totalReste += reste;
    totalAmountDue += amountDue;
    totalPaid += amountPaid;
    documentCount += 1;

    const partnerId = getPartnerId(doc);
    const existing = partners.get(partnerId) || {
      id: partnerId,
      name: getPartnerName(doc) || `#${partnerId}`,
      amount: 0,
      count: 0,
    };
    existing.amount += reste;
    existing.count += 1;
    partners.set(partnerId, existing);

    const dated = getDate(doc);
    if (!dated || !periodKey || !dateFrom || !dateTo) continue;
    if (dated < dateFrom || dated > dateTo) continue;

    const key = periodKey(dated, granularity);
    amountByPeriod.set(key, (amountByPeriod.get(key) || 0) + reste);
    countByPeriod.set(key, (countByPeriod.get(key) || 0) + 1);
  }

  const byPartner = [...partners.values()]
    .map((p) => ({ ...p, amount: round2(p.amount) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, TOP_PARTNERS);

  return {
    totalReste: round2(totalReste),
    totalAmountDue: round2(totalAmountDue),
    totalPaid: round2(totalPaid),
    documentCount,
    partnerCount: partners.size,
    byPartner,
    series:
      fillSeries && dateFrom && dateTo && granularity
        ? fillSeries(amountByPeriod, countByPeriod, dateFrom, dateTo, granularity).map((row) => ({
            ...row,
            amount: round2(row.amount),
          }))
        : [],
  };
};

/**
 * Current outstanding:
 *  - clients: reste on BLs (ADVANCED + standalone STANDARD, to avoid PREPARE double-count)
 *  - fournisseurs: reste on Bons de réception
 * Totals are a snapshot (all unpaid). Series is remaining of docs dated in the range.
 */
export const getDebtCreditExposure = async ({
  societeId,
  dateFrom,
  dateTo,
  granularity,
  fillSeries,
  periodKey,
}) => {
  const societeWhere = societeId ? { societeId } : {};
  const helpers = { dateFrom, dateTo, granularity, fillSeries, periodKey };

  const [clientDocs, fournisseurDocs] = await Promise.all([
    prisma.clientDocument.findMany({
      where: {
        ...societeWhere,
        status: { notIn: ["CANCELLED", "DRAFT"] },
        bonLivraison: {
          is: {
            OR: [{ type: "ADVANCED" }, { type: "STANDARD", sourceOrderId: null }],
          },
        },
      },
      select: {
        amountDue: true,
        amountPaid: true,
        clientId: true,
        clientName: true,
        client: { select: { name: true } },
        bonLivraison: { select: { documentDate: true } },
      },
    }),
    prisma.fournisseurDocument.findMany({
      where: {
        ...societeWhere,
        status: { notIn: ["CANCELLED", "DRAFT"] },
        bonReception: { isNot: null },
      },
      select: {
        amountDue: true,
        amountPaid: true,
        fournisseurId: true,
        fournisseur: { select: { name: true } },
        bonReception: { select: { documentDate: true } },
      },
    }),
  ]);

  const clients = aggregateSide(clientDocs, {
    ...helpers,
    getDate: (d) => (d.bonLivraison?.documentDate ? new Date(d.bonLivraison.documentDate) : null),
    getPartnerId: (d) => d.clientId ?? 0,
    getPartnerName: (d) => d.client?.name || d.clientName,
  });

  const fournisseurs = aggregateSide(fournisseurDocs, {
    ...helpers,
    getDate: (d) =>
      d.bonReception?.documentDate ? new Date(d.bonReception.documentDate) : null,
    getPartnerId: (d) => d.fournisseurId,
    getPartnerName: (d) => d.fournisseur?.name,
  });

  return {
    clients,
    fournisseurs,
    gap: round2(clients.totalReste - fournisseurs.totalReste),
  };
};
