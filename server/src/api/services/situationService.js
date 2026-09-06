import prisma from "../../loaders/prisma.js";

const TOLERANCE = 0.001;

const buildKeywordOr = (keyword, partnerField) => {
  const or = [
    { documentNumber: { contains: keyword } },
    { [partnerField]: { name: { contains: keyword } } },
  ];
  return or;
};

const paginate = (rows, page, limit) => {
  const total = rows.length;
  const numberOfPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  return {
    data: rows.slice(start, start + limit),
    results: total,
    pagination: { page, limit, numberOfPages },
  };
};

const computeSummary = (rows) => ({
  documentCount: rows.length,
  totalAmountDue: rows.reduce((s, r) => s + r.amountDue, 0),
  totalPaid: rows.reduce((s, r) => s + r.amountPaid, 0),
  totalReste: rows.reduce((s, r) => s + r.reste, 0),
});

/** Prisma to-one relation filter: scalars go under `is`, not next to `isNot`. */
const relatedWithOptionalDate = (startDate, endDate) => {
  if (!startDate && !endDate) return { isNot: null };
  return {
    is: {
      documentDate: {
        ...(startDate && { gte: startDate }),
        ...(endDate && { lte: endDate }),
      },
    },
  };
};

/**
 * Situation client — all Bon de livraison lines, optionally filtered by payment.
 * paymentStatus: all (default) | paid | unpaid
 */
export const getClientSituation = async (query, societeId) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  const keyword = query.keyword?.trim();
  const clientId = query.clientId ? parseInt(query.clientId, 10) : undefined;
  const startDate = query.startDate ? new Date(query.startDate) : null;
  const endDate = query.endDate ? new Date(query.endDate) : null;
  const paymentStatus = ["paid", "unpaid"].includes(query.paymentStatus)
    ? query.paymentStatus
    : "all";

  const where = {
    bonLivraison: relatedWithOptionalDate(startDate, endDate),
  };

  if (societeId) where.societeId = societeId;
  if (clientId) where.clientId = clientId;
  if (keyword) where.OR = buildKeywordOr(keyword, "client");

  const docs = await prisma.clientDocument.findMany({
    where,
    select: {
      id: true,
      documentNumber: true,
      amountDue: true,
      amountPaid: true,
      totalTTC: true,
      status: true,
      clientId: true,
      clientName: true,
      client: { select: { id: true, name: true, phone: true } },
      bonLivraison: { select: { id: true, documentDate: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = docs
    .map((d) => {
      const amountDue = Number(d.amountDue);
      const amountPaid = Number(d.amountPaid);
      const reste = amountDue - amountPaid;
      const isPaid = reste <= TOLERANCE;
      return {
        id: d.bonLivraison?.id ?? d.id,
        documentId: d.id,
        documentNumber: d.documentNumber,
        documentDate: d.bonLivraison?.documentDate ?? null,
        clientId: d.clientId,
        partnerName: d.client?.name ?? d.clientName ?? "—",
        partnerPhone: d.client?.phone ?? null,
        amountDue,
        amountPaid,
        reste: isPaid ? 0 : reste,
        isPaid,
        status: d.status,
      };
    })
    .filter((r) => {
      if (paymentStatus === "paid") return r.isPaid;
      if (paymentStatus === "unpaid") return !r.isPaid;
      return true;
    });

  const summary = computeSummary(rows);
  const { data, results, pagination } = paginate(rows, page, limit);

  return { data, summary, results, pagination };
};

/**
 * Situation fournisseur — unpaid / partial Bon de réception lines.
 */
export const getFournisseurSituation = async (query, societeId) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  const keyword = query.keyword?.trim();
  const fournisseurId = query.fournisseurId
    ? parseInt(query.fournisseurId, 10)
    : undefined;
  const startDate = query.startDate ? new Date(query.startDate) : null;
  const endDate = query.endDate ? new Date(query.endDate) : null;

  const where = {
    bonReception: relatedWithOptionalDate(startDate, endDate),
  };

  if (societeId) where.societeId = societeId;
  if (fournisseurId) where.fournisseurId = fournisseurId;
  if (keyword) where.OR = buildKeywordOr(keyword, "fournisseur");

  const docs = await prisma.fournisseurDocument.findMany({
    where,
    select: {
      id: true,
      documentNumber: true,
      amountDue: true,
      amountPaid: true,
      totalTTC: true,
      status: true,
      fournisseurId: true,
      fournisseur: { select: { id: true, name: true, phone: true } },
      bonReception: { select: { id: true, documentDate: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = docs
    .map((d) => {
      const amountDue = Number(d.amountDue);
      const amountPaid = Number(d.amountPaid);
      const reste = amountDue - amountPaid;
      return {
        id: d.bonReception?.id ?? d.id,
        documentId: d.id,
        documentNumber: d.documentNumber,
        documentDate: d.bonReception?.documentDate ?? null,
        fournisseurId: d.fournisseurId,
        partnerName: d.fournisseur?.name ?? "—",
        partnerPhone: d.fournisseur?.phone ?? null,
        amountDue,
        amountPaid,
        reste,
        status: d.status,
      };
    })
    .filter((r) => r.reste > TOLERANCE);

  const summary = computeSummary(rows);
  const { data, results, pagination } = paginate(rows, page, limit);

  return { data, summary, results, pagination };
};
