import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";
import timeRangeUtility from "../utils/timeRangeUtility.js";
import productVisibilityUtility from "../utils/productVisibilityUtility.js";
import stockManagementService from "./domain/stockManagementService.js";
import { generateDocumentPDF, formatDate } from "../utils/pdfGenerator.js";

/* ============================================================
   HELPER: Generate Document Number (private)
   Format: BR-{YEAR}-{6-digit-sequence}
   Sequence is per-société per-year, resets every January.
============================================================ */
const generateDocumentNumber = async (societeId) => {
  const year = new Date().getFullYear();
  const prefix = `BR-${year}`;

  const lastDoc = await prisma.fournisseurDocument.findFirst({
    where: {
      societeId,
      documentNumber: { startsWith: prefix },
      bonReception: { isNot: null },
    },
    orderBy: { documentNumber: "desc" },
    select: { documentNumber: true },
  });

  let nextNumber = 1;
  if (lastDoc) {
    nextNumber = parseInt(lastDoc.documentNumber.split("-")[2]) + 1;
  }

  return `${prefix}-${String(nextNumber).padStart(6, "0")}`;
};

/* ============================================================
   GET NEXT DOCUMENT NUMBER (exported — used by controller)
============================================================ */
export const getNextDocumentNumber = async (query, user) => {
  const societeId = user.isSuperAdmin
    ? query.societeId
      ? parseInt(query.societeId)
      : null
    : user.societeId;

  if (!societeId) {
    throw new ApiError(
      "societeId is required. Pass ?societeId= for Super Admin.",
      400,
    );
  }

  const year = new Date().getFullYear();
  const prefix = `BR-${year}`;

  const lastDoc = await prisma.fournisseurDocument.findFirst({
    where: {
      societeId,
      documentNumber: { startsWith: prefix },
      bonReception: { isNot: null },
    },
    orderBy: { documentNumber: "desc" },
    select: { documentNumber: true },
  });

  let nextSequence = 1;
  if (lastDoc) {
    nextSequence = parseInt(lastDoc.documentNumber.split("-")[2]) + 1;
  }

  return {
    nextNumber: `${prefix}-${String(nextSequence).padStart(6, "0")}`,
    year,
    sequence: nextSequence,
  };
};

/* ============================================================
   GET PRODUCTS FOR BON RECEPTION
   Returns the product catalog (articles without variants +
   variants) with purchase/sale prices, for line selection.
   No stock validation or quantity fields — receiving stock
   never fails an availability check.
============================================================ */
export const getProductsForBonReception = async (query, user) => {
  const { depotId, search, page = 1, limit = 50 } = query;

  if (!depotId) throw new ApiError("depotId is required", 400);
  const parsedDepotId = parseInt(depotId);

  const articleWhere = { visible: true };

  if (search) {
    articleWhere.OR = [
      { name: { contains: search } },
      { barcode: { contains: search } },
      { variants: { some: { barcode: { contains: search } } } },
      { variants: { some: { name: { contains: search } } } },
    ];
  }

  const articles = await prisma.article.findMany({
    where: articleWhere,
    include: {
      stockByDepot: {
        where: { depotId: parsedDepotId },
        select: { quantityAvailable: true },
      },
      variants: {
        include: {
          variantAttributes: {
            include: {
              attribute: { select: { name: true } },
              attributeValue: { select: { value: true } },
            },
          },
          stockByDepot: {
            where: { depotId: parsedDepotId },
            select: { quantityAvailable: true },
          },
        },
      },
    },
    skip: (page - 1) * limit,
    take: parseInt(limit),
    orderBy: { name: "asc" },
  });

  const products = [];

  for (const article of articles) {
    if (article.variants.length === 0) {
      products.push({
        type: "article",
        id: article.id,
        articleId: article.id,
        variantId: null,
        barcode: article.barcode,
        name: article.name,
        prixAchat: parseFloat(article.prixAchat),
        prixVente1: parseFloat(article.prixVente1),
        prixVente2: parseFloat(article.prixVente2),
        prixVente3: parseFloat(article.prixVente3),
        quantityStock: parseFloat(
          article.stockByDepot[0]?.quantityAvailable ?? 0,
        ),
      });
    } else {
      for (const variant of article.variants) {
        if (search) {
          const s = search.toLowerCase();
          const matches =
            variant.barcode?.toLowerCase().includes(s) ||
            variant.name?.toLowerCase().includes(s) ||
            article.name.toLowerCase().includes(s) ||
            article.barcode.toLowerCase().includes(s);
          if (!matches) continue;
        }

        const attributes = variant.variantAttributes
          .map((va) => va.attributeValue.value)
          .join(", ");

        products.push({
          type: "variant",
          id: variant.id,
          articleId: article.id,
          variantId: variant.id,
          barcode: variant.barcode,
          name: `${article.name} (${attributes})`,
          prixAchat: parseFloat(article.prixAchat),
          prixVente1: parseFloat(article.prixVente1),
          prixVente2: parseFloat(article.prixVente2),
          prixVente3: parseFloat(article.prixVente3),
          quantityStock: parseFloat(
            variant.stockByDepot[0]?.quantityAvailable ?? 0,
          ),
        });
      }
    }
  }

  const total = await prisma.article.count({ where: articleWhere });

  return {
    products,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
};

/* ============================================================
   HELPER: Validate Fournisseur Access
============================================================ */
const validateFournisseurAccess = async (frsId, user) => {
  const fournisseur = await prisma.fournisseur.findFirst({
    where: {
      id: frsId,
      ...(user.isSuperAdmin ? {} : { societeId: user.societeId }),
    },
    select: { id: true, name: true, societeId: true, active: true },
  });

  if (!fournisseur)
    throw new ApiError("Fournisseur not found or access denied", 404);
  if (!fournisseur.active)
    throw new ApiError(
      "Cannot create bon de réception for inactive fournisseur",
      400,
    );

  return fournisseur;
};

/* ============================================================
   HELPER: Validate Depot Access
============================================================ */
const validateDepotAccess = async (depotId, user) => {
  if (!depotId)
    throw new ApiError("Depot is required for bon de réception", 400);

  const depot = await prisma.depot.findFirst({
    where: {
      id: depotId,
      ...(user.isSuperAdmin ? {} : { societeId: user.societeId }),
    },
    select: { id: true, code: true, name: true, societeId: true, active: true },
  });

  if (!depot) throw new ApiError("Depot not found or access denied", 404);
  if (!depot.active)
    throw new ApiError("Cannot receive stock at inactive depot", 400);

  return depot;
};

/* ============================================================
   HELPER: Validate Lines (structure + visibility)
============================================================ */
const validateLines = async (lines) => {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new ApiError("At least one line is required", 400);
  }

  const seenProducts = new Set();

  lines.forEach((line, index) => {
    if (!line.articleId && !line.variantId) {
      throw new ApiError(
        `Line ${index + 1}: Either articleId or variantId is required`,
        400,
      );
    }

    if (line.articleId && line.variantId) {
      throw new ApiError(
        `Line ${index + 1}: Provide either articleId OR variantId, not both`,
        400,
      );
    }

    const key = line.articleId
      ? `article_${line.articleId}`
      : `variant_${line.variantId}`;

    if (seenProducts.has(key)) {
      throw new ApiError(`Line ${index + 1}: Duplicate product`, 400);
    }
    seenProducts.add(key);

    if (!line.quantity || parseFloat(line.quantity) <= 0) {
      throw new ApiError(
        `Line ${index + 1}: Quantity must be greater than 0`,
        400,
      );
    }

    if (line.remise !== undefined && line.remise !== null) {
      const remise = parseFloat(line.remise);
      if (isNaN(remise) || remise < 0 || remise > 1) {
        throw new ApiError(
          `Line ${index + 1}: remise must be between 0 and 1`,
          400,
        );
      }
    }

    for (const field of [
      "newPrixAchat",
      "newPrixVente1",
      "newPrixVente2",
      "newPrixVente3",
    ]) {
      if (line[field] !== undefined && line[field] !== null) {
        const value = parseFloat(line[field]);
        if (isNaN(value) || value <= 0) {
          throw new ApiError(
            `Line ${index + 1}: ${field} must be greater than 0`,
            400,
          );
        }
      }
    }
  });

  await productVisibilityUtility.validateBatchProductVisibility(
    lines.map((line) => ({
      articleId: line.articleId,
      variantId: line.variantId,
    })),
    "bon de réception",
  );
};

/* ============================================================
   HELPER: Resolve article for a line (with family for TVA)
   For variant lines, the parent Article is returned — price
   updates always target the parent Article (variants have no
   price fields of their own).
============================================================ */
const resolveLineArticle = async (tx, articleId, variantId) => {
  if (articleId) {
    return await tx.article.findUnique({
      where: { id: articleId },
      include: {
        family: { select: { id: true, name: true, TVA: true, remise: true } },
      },
    });
  }

  if (variantId) {
    const variant = await tx.articleVariant.findUnique({
      where: { id: variantId },
      include: {
        article: {
          include: {
            family: {
              select: { id: true, name: true, TVA: true, remise: true },
            },
          },
        },
      },
    });
    return variant?.article ?? null;
  }

  return null;
};

/* ============================================================
   HELPER: Categorize Lines by Stock Management
============================================================ */
const categorizeByStockManagement = async (lines) => {
  const stockManaged = [];
  const nonStockManaged = [];

  for (const line of lines) {
    const isManaged = await stockManagementService.isProductStockManaged(
      line.articleId,
      line.variantId,
    );
    (isManaged ? stockManaged : nonStockManaged).push(line);
  }

  return { stockManaged, nonStockManaged };
};

/* ============================================================
   HELPER: Build line financials + collect price updates

   Cost source: newPrixAchat if provided, else article.prixAchat
   (current catalog price). unitPrice is treated as TTC, mirroring
   how BonRetourClient treats article.prixAchat as TTC.

   Price updates (newPrixAchat/newPrixVente1-3) always target the
   parent Article — applied immediately, regardless of DRAFT or
   COMPLETED status.
============================================================ */
const buildLineFinancials = async (tx, line, lineNumber) => {
  const article = await resolveLineArticle(tx, line.articleId, line.variantId);
  if (!article) {
    throw new ApiError(`Line ${lineNumber}: Product not found`, 404);
  }

  const tvaRate = parseFloat(article.family.TVA || 0);
  const lineRemise = parseFloat(line.remise || 0);
  const unitCost =
    line.newPrixAchat !== undefined && line.newPrixAchat !== null
      ? parseFloat(line.newPrixAchat)
      : parseFloat(article.prixAchat);

  const quantity = parseFloat(line.quantity);
  const totalBeforeDiscount = quantity * unitCost;
  const discountAmount = totalBeforeDiscount * lineRemise;
  const totalTTC = totalBeforeDiscount - discountAmount;
  const totalHT = totalTTC / (1 + tvaRate);
  const totalTVA = totalTTC - totalHT;

  const financials = {
    articleId: line.articleId || null,
    variantId: line.variantId || null,
    lineNumber,
    description: article.name,
    quantity,
    unitPrice: unitCost,
    discount: lineRemise,
    totalHT: parseFloat(totalHT.toFixed(2)),
    tvaRate,
    totalTVA: parseFloat(totalTVA.toFixed(2)),
    totalTTC: parseFloat(totalTTC.toFixed(2)),
  };

  const priceData = {};
  if (line.newPrixAchat !== undefined && line.newPrixAchat !== null)
    priceData.prixAchat = parseFloat(line.newPrixAchat);
  if (line.newPrixVente1 !== undefined && line.newPrixVente1 !== null)
    priceData.prixVente1 = parseFloat(line.newPrixVente1);
  if (line.newPrixVente2 !== undefined && line.newPrixVente2 !== null)
    priceData.prixVente2 = parseFloat(line.newPrixVente2);
  if (line.newPrixVente3 !== undefined && line.newPrixVente3 !== null)
    priceData.prixVente3 = parseFloat(line.newPrixVente3);

  const priceUpdate =
    Object.keys(priceData).length > 0
      ? { articleId: article.id, data: priceData }
      : null;

  return { financials, priceUpdate };
};

/* ============================================================
   HELPER: Full Prisma include block (reused across read ops)
============================================================ */
const FULL_BR_INCLUDE = {
  document: {
    include: {
      fournisseur: {
        select: {
          id: true,
          name: true,
          type: true,
          phone: true,
          email: true,
          address: true,
          ice: true,
        },
      },
      societe: {
        select: {
          id: true,
          raisonSocial: true,
          address: true,
          tel: true,
          email: true,
          ice: true,
          logo: true,
          phone: true,
          documentHeaderConfig: true,
        },
      },
      lines: {
        include: {
          article: {
            select: {
              id: true,
              barcode: true,
              name: true,
              gereEnStock: true,
              visible: true,
              prixAchat: true,
              prixVente1: true,
              prixVente2: true,
              prixVente3: true,
              unitePrincipale: {
                select: { id: true, name: true, symbol: true },
              },
              family: { select: { id: true, name: true, TVA: true } },
            },
          },
          variant: {
            select: {
              id: true,
              barcode: true,
              name: true,
              article: {
                select: {
                  id: true,
                  name: true,
                  gereEnStock: true,
                  visible: true,
                  prixAchat: true,
                  prixVente1: true,
                  prixVente2: true,
                  prixVente3: true,
                  family: { select: { id: true, name: true, TVA: true } },
                },
              },
            },
          },
        },
        orderBy: { lineNumber: "asc" },
      },
      user: { select: { id: true, name: true, email: true } },
    },
  },
  depot: { select: { id: true, code: true, name: true, address: true } },
  stockTransactions: {
    include: {
      article: { select: { id: true, name: true } },
      variant: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  },
};

/* ============================================================
   GET ALL BON RECEPTIONS
============================================================ */
export const getAll = async (query, user) => {
  const {
    frsId,
    depotId,
    status,
    startDate,
    endDate,
    search,
    page = 1,
    limit = 50,
  } = query;

  // ── Build documentDate filter ───────────────────────────────────────
  const documentDateFilter = {};
  if (startDate) documentDateFilter.gte = new Date(startDate);
  if (endDate) documentDateFilter.lte = new Date(endDate);

  const baseWhere = {
    document: {
      ...(user.isSuperAdmin ? {} : { societeId: user.societeId }),
      ...(frsId && { fournisseurId: parseInt(frsId) }),
      ...(status && { status }),
    },
    ...(depotId && { depotId: parseInt(depotId) }),
    ...(Object.keys(documentDateFilter).length > 0 && {
      dateReception: documentDateFilter,
    }),
  };

  const where = search
    ? {
        AND: [
          baseWhere,
          {
            OR: [
              { documentReference: { contains: search } },
              { document: { fournisseur: { name: { contains: search } } } },
            ],
          },
        ],
      }
    : baseWhere;

  // 1. Fetch all without pagination
  const all = await prisma.bonReception.findMany({
    where,
    include: {
      document: {
        include: {
          fournisseur: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ documentDate: "desc" }, { createdAt: "desc" }],
  });

  // 2. Filter by system hours on documentDate before pagination
  const filtered = await timeRangeUtility.filterBySystemHours(
    all,
    "dateReception",
  );

  // 3. Paginate manually
  const parsedPage = parseInt(page);
  const parsedLimit = parseInt(limit);
  const total = filtered.length;
  const bonReceptions = filtered.slice(
    (parsedPage - 1) * parsedLimit,
    parsedPage * parsedLimit,
  );

  const fmt = (d) =>
    d
      ? new Date(d).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : null;
  // Format date + time (dd/MM/yyyy HH:mm)
  const fmtDateTime = (d) =>
    d
      ? new Date(d).toLocaleString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

  const data = bonReceptions.map((br) => ({
    id: br.id,
    documentNumber: br.document.documentNumber,
    documentReference: br.documentReference,
    dateReception: fmtDateTime(br.dateReception),
    frsName: br.document.fournisseur.name,
    totalHT: parseFloat(br.document.totalHT),
    totalTVA: parseFloat(br.document.totalTVA),
    totalTTC: parseFloat(br.document.totalTTC),
    status: br.document.status,
  }));

  return {
    bonReceptions: data,
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit),
    },
  };
};

/* ============================================================
   GET BON RECEPTION BY ID
============================================================ */
export const getById = async (id, user) => {
  const br = await prisma.bonReception.findUnique({
    where: { id },
    include: FULL_BR_INCLUDE,
  });

  if (!br) throw new ApiError("Bon de réception not found", 404);

  if (!user.isSuperAdmin && br.document.societeId !== user.societeId) {
    throw new ApiError("Access denied", 403);
  }

  return br;
};

/* ============================================================
   CREATE BON RECEPTION

   DRAFT:     document + lines saved only — no stock movement.
   COMPLETED: INBOUND stock transactions for every line (stock
              increases at depotId) + StockByDepot updated for
              stock-managed products.

   Price updates (newPrixAchat/newPrixVente1-3) are applied to
   the article catalog immediately, regardless of status.
============================================================ */
export const create = async (data, user) => {
  const {
    dateReception,
    depotId,
    frsId,
    documentReference,
    note,
    status = "DRAFT",
    lines = [],
    advanceIds,
  } = data;

  // 1. Validate operating hours
  await timeRangeUtility.validateSystemHours(
    new Date(),
    "bon de réception creation",
  );

  // 2. Validate fournisseur
  const fournisseur = await validateFournisseurAccess(frsId, user);

  // 3. Validate depot
  const depot = await validateDepotAccess(depotId, user);

  // 4. Fournisseur and depot must belong to the same société
  if (fournisseur.societeId !== depot.societeId) {
    throw new ApiError(
      "Fournisseur and depot must belong to the same société",
      400,
    );
  }

  // 5. documentReference is required and unique per société
  const reference = (documentReference || "").trim();
  if (!reference) {
    throw new ApiError("documentReference is required", 400);
  }

  const duplicate = await prisma.bonReception.findFirst({
    where: {
      documentReference: reference,
      document: { societeId: fournisseur.societeId },
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new ApiError(
      `A bon de réception with reference "${reference}" already exists for this société`,
      409,
    );
  }

  // 6. Validate lines
  await validateLines(lines);
  const { stockManaged, nonStockManaged } =
    await categorizeByStockManagement(lines);

  const documentNumber = await generateDocumentNumber(fournisseur.societeId);

  // Populated inside the transaction; surfaced in the response summary.
  let totalAdvanceApplied = 0;
  let advancesAppliedCount = 0;

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const linesWithFinancials = [];
        const priceUpdates = [];

        for (let i = 0; i < lines.length; i++) {
          const { financials, priceUpdate } = await buildLineFinancials(
            tx,
            lines[i],
            i + 1,
          );
          linesWithFinancials.push(financials);
          if (priceUpdate) priceUpdates.push(priceUpdate);
        }

        const totals = linesWithFinancials.reduce(
          (acc, l) => ({
            totalHT: acc.totalHT + l.totalHT,
            totalTVA: acc.totalTVA + l.totalTVA,
            totalTTC: acc.totalTTC + l.totalTTC,
          }),
          { totalHT: 0, totalTVA: 0, totalTTC: 0 },
        );

        const totalHT = parseFloat(totals.totalHT.toFixed(2));
        const totalTVA = parseFloat(totals.totalTVA.toFixed(2));
        const totalTTC = parseFloat(totals.totalTTC.toFixed(2));

        // ── Advance handling (optional) ─────────────────────────────────
        // advanceIds is an optional array of supplier-advance IDs
        // (ReglementFournisseur records). Each advance is validated and
        // applied sequentially until amountDue is covered. Applying an
        // advance reduces what we still owe the supplier (amountPaid).
        // Partial use: only the needed portion of an advance is consumed;
        // the leftover is spun off into a fresh reusable advance.
        const amountDue = totalTTC;
        const advancesToApply = [];

        if (Array.isArray(advanceIds) && advanceIds.length > 0) {
          let remaining = amountDue;

          for (const aId of advanceIds) {
            if (remaining <= 0.001) break;

            const advance = await tx.reglementFournisseur.findUnique({
              where: { id: Number(aId) },
              select: {
                id: true,
                societeId: true,
                fournisseurId: true,
                montantRegle: true,
                montantBR: true,
                modeReglement: true,
                date: true,
                banqueId: true,
                refDocument: true,
              },
            });

            if (!advance) throw new ApiError(`Advance ${aId} not found`, 404);
            if (advance.societeId !== fournisseur.societeId)
              throw new ApiError(
                `Advance ${aId} does not belong to this société`,
                403,
              );
            if (advance.fournisseurId !== frsId)
              throw new ApiError(
                `Advance ${aId} does not belong to this fournisseur`,
                400,
              );

            const balance = Number(advance.montantRegle);
            if (balance <= 0.001)
              throw new ApiError(
                `Advance ${aId} has no remaining balance`,
                400,
              );

            const applied = parseFloat(Math.min(balance, remaining).toFixed(2));

            advancesToApply.push({
              id: advance.id,
              amountApplied: applied,
              newBalance: parseFloat((balance - applied).toFixed(2)),
              modeReglement: advance.modeReglement,
              date: advance.date,
              banqueId: advance.banqueId,
              refDocument: advance.refDocument,
              societeId: advance.societeId,
              fournisseurId: advance.fournisseurId,
            });

            remaining = parseFloat((remaining - applied).toFixed(2));
          }

          totalAdvanceApplied = parseFloat(
            advancesToApply
              .reduce((sum, a) => sum + a.amountApplied, 0)
              .toFixed(2),
          );
          advancesAppliedCount = advancesToApply.length;
        }

        // Create FournisseurDocument header
        const fournisseurDocument = await tx.fournisseurDocument.create({
          data: {
            societeId: fournisseur.societeId,
            fournisseurId: frsId,
            documentNumber,
            status,
            totalHT,
            totalTVA,
            totalTTC,
            discount: 0,
            amountPaid: totalAdvanceApplied,
            amountDue,
            notes: note || null,
            createdBy: user.id,
          },
        });

        // Create BonReception extension
        const bonReception = await tx.bonReception.create({
          data: {
            id: fournisseurDocument.id,
            documentDate: new Date(),
            dateReception: dateReception ? new Date(dateReception) : null,
            depotId,
            documentReference: reference,
          },
        });

        // Create document lines
        await tx.fournisseurDocumentLine.createMany({
          data: linesWithFinancials.map((line) => ({
            ...line,
            documentId: fournisseurDocument.id,
          })),
        });

        // Apply article price updates — immediate, regardless of status
        for (const pu of priceUpdates) {
          await tx.article.update({
            where: { id: pu.articleId },
            data: pu.data,
          });
        }

        // ── Apply advances to the newly-created bon de réception ────────
        // Purely financial — applied for both DRAFT and COMPLETED, never
        // touches stock. The source advance is never deleted (preserves FK
        // integrity + audit trail); a partial remainder is spun off into a
        // fresh reusable advance.
        for (const adv of advancesToApply) {
          await tx.reglementFournisseur.update({
            where: { id: adv.id },
            data: {
              montantBR: amountDue,
              solde: 0,
              documentNumbers: [documentNumber],
              avanceId: adv.id,
              avanceConsumed: adv.amountApplied,
            },
          });

          if (adv.newBalance > 0) {
            // Partial use — carry the leftover balance into a new advance.
            await tx.reglementFournisseur.create({
              data: {
                societeId: adv.societeId,
                fournisseurId: adv.fournisseurId,
                date: new Date(),
                modeReglement: adv.modeReglement,
                montantRegle: adv.newBalance,
                solde: 0,
              },
            });
          }

          // Link the bon de réception to the consumed advance.
          await tx.bonReceptionAdvance.create({
            data: {
              bonReceptionId: bonReception.id,
              advanceId: adv.id,
              amountApplied: adv.amountApplied,
            },
          });
        }

        // INBOUND stock movement (COMPLETED only) — every line gets a
        // StockTransaction; StockByDepot is only updated for managed products.
        if (status === "COMPLETED") {
          await stockManagementService.batchStockOperationsWithTx(
            tx,
            linesWithFinancials.map((line) => ({
              depotId,
              articleId: line.articleId,
              variantId: line.variantId,
              quantityChange: parseFloat(line.quantity), // positive — stock INCREASES
              transactionType: "INBOUND",
              referenceId: documentNumber,
              reason: `Reception from ${fournisseur.name}: ${documentNumber}`,
              userId: user.id,
              bonReceptionId: bonReception.id,
              unitCost: parseFloat(line.unitPrice),
            })),
          );
        }

        return await tx.bonReception.findUnique({
          where: { id: bonReception.id },
          include: FULL_BR_INCLUDE,
        });
      },
      { timeout: 30000 },
    );

    return {
      ...result,
      summary: {
        totalLines: result.document.lines.length,
        stockManagedLines: stockManaged.length,
        nonStockManagedLines: nonStockManaged.length,
        totalQuantity: result.document.lines.reduce(
          (sum, l) => sum + parseFloat(l.quantity),
          0,
        ),
        totalHT: parseFloat(result.document.totalHT),
        totalTVA: parseFloat(result.document.totalTVA),
        totalTTC: parseFloat(result.document.totalTTC),
        stockMovementApplied: status === "COMPLETED",
        advancesApplied: advancesAppliedCount,
        totalAdvanceApplied,
        amountPaid: parseFloat(result.document.amountPaid),
        amountDue: parseFloat(result.document.amountDue),
      },
    };
  } catch (error) {
    if (error.code === "P2002")
      throw new ApiError("Duplicate document number", 409);
    if (error.code === "P2003")
      throw new ApiError(
        "Invalid reference: Fournisseur, Depot, or Product not found",
        400,
      );
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      `Failed to create bon de réception: ${error.message}`,
      500,
    );
  }
};

/* ============================================================
   VALIDATE BON RECEPTION — Status Transition

   DRAFT → COMPLETED:
     Apply INBOUND stock movements (every line, audit trail for
     non-managed products too).

   COMPLETED → DRAFT:
     Reverse INBOUND movements (ADJUSTMENT audit trail + delete
     original INBOUND records).
============================================================ */
export const validate = async (id, targetStatus, user) => {
  await timeRangeUtility.validateSystemHours(
    new Date(),
    "bon de réception validation",
  );

  const br = await prisma.bonReception.findUnique({
    where: { id },
    include: {
      document: {
        include: {
          lines: true,
          fournisseur: { select: { id: true, name: true, societeId: true } },
        },
      },
      stockTransactions: { where: { transactionType: "INBOUND" } },
    },
  });

  if (!br) throw new ApiError("Bon de réception not found", 404);

  if (
    !user.isSuperAdmin &&
    br.document.fournisseur.societeId !== user.societeId
  ) {
    throw new ApiError("Access denied", 403);
  }

  const currentStatus = br.document.status;
  const documentNumber = br.document.documentNumber;
  const fournisseurName = br.document.fournisseur.name;
  const depotId = br.depotId;

  if (currentStatus === targetStatus) {
    throw new ApiError(`Bon de réception is already ${targetStatus}`, 400);
  }

  const ALLOWED_TRANSITIONS = {
    DRAFT: "COMPLETED",
    COMPLETED: "DRAFT",
  };

  if (ALLOWED_TRANSITIONS[currentStatus] !== targetStatus) {
    throw new ApiError(
      `Cannot transition from ${currentStatus} to ${targetStatus}. ` +
        `Allowed transitions: DRAFT → COMPLETED, COMPLETED → DRAFT.`,
      400,
    );
  }

  // ════════════════════════════════════════════════════════════════
  // TRANSITION: DRAFT → COMPLETED
  // ════════════════════════════════════════════════════════════════
  if (targetStatus === "COMPLETED") {
    const lines = br.document.lines;

    if (!lines || lines.length === 0) {
      throw new ApiError(
        "Cannot complete a bon de réception with no lines",
        400,
      );
    }

    if (!depotId) {
      throw new ApiError(
        "Cannot complete a bon de réception without a depot",
        400,
      );
    }

    const { stockManaged, nonStockManaged } =
      await categorizeByStockManagement(lines);

    try {
      let adjustmentsCleared = 0;

      const result = await prisma.$transaction(
        async (tx) => {
          // Clean up stale ADJUSTMENT records from a previous COMPLETED→DRAFT
          // reversal so re-validation cycles never accumulate duplicate
          // stock-transaction history for this bon de réception.
          const deletedAdjustments = await tx.stockTransaction.deleteMany({
            where: { bonReceptionId: id, transactionType: "ADJUSTMENT" },
          });
          adjustmentsCleared = deletedAdjustments.count;

          await stockManagementService.batchStockOperationsWithTx(
            tx,
            lines.map((line) => ({
              depotId,
              articleId: line.articleId || null,
              variantId: line.variantId || null,
              quantityChange: parseFloat(line.quantity), // positive — stock INCREASES
              transactionType: "INBOUND",
              referenceId: documentNumber,
              reason: `Reception from ${fournisseurName}: ${documentNumber}`,
              userId: user.id,
              bonReceptionId: id,
              unitCost: parseFloat(line.unitPrice),
            })),
          );

          await tx.fournisseurDocument.update({
            where: { id },
            data: { status: "COMPLETED" },
          });

          return await tx.bonReception.findUnique({
            where: { id },
            include: FULL_BR_INCLUDE,
          });
        },
        { timeout: 30000 },
      );

      return {
        ...result,
        transition: {
          from: "DRAFT",
          to: "COMPLETED",
          stockManagedLines: stockManaged.length,
          nonStockManagedLines: nonStockManaged.length,
          inboundApplied: true,
          adjustmentsCleared,
          documentNumber,
        },
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        `Failed to validate bon de réception: ${error.message}`,
        500,
      );
    }
  }

  // ════════════════════════════════════════════════════════════════
  // TRANSITION: COMPLETED → DRAFT
  // ════════════════════════════════════════════════════════════════
  if (targetStatus === "DRAFT") {
    const inboundTransactions = br.stockTransactions; // pre-filtered INBOUND

    try {
      const result = await prisma.$transaction(
        async (tx) => {
          // a. Reverse the physical stock each INBOUND added — decrease
          //    StockByDepot.quantityAvailable WITHOUT creating any new stock
          //    transaction record. Only stock-managed products had their stock
          //    incremented on COMPLETED, so only those are reversed here.
          for (const t of inboundTransactions) {
            const isManaged =
              await stockManagementService.isProductStockManaged(
                t.articleId || null,
                t.variantId || null,
              );
            if (!isManaged) continue;

            const stock = await tx.stockByDepot.findFirst({
              where: {
                depotId: t.depotId,
                articleId: t.articleId || null,
                variantId: t.variantId || null,
              },
              select: { id: true },
            });
            if (!stock) continue;

            await tx.stockByDepot.update({
              where: { id: stock.id },
              data: {
                quantityAvailable: {
                  increment: -Math.abs(parseFloat(t.quantityChange)), // remove what INBOUND added
                },
              },
            });
          }

          // b. Delete original INBOUND records so re-validation starts clean
          await tx.stockTransaction.deleteMany({
            where: { bonReceptionId: id, transactionType: "INBOUND" },
          });

          // c. Revert status
          await tx.fournisseurDocument.update({
            where: { id },
            data: { status: "DRAFT" },
          });

          return await tx.bonReception.findUnique({
            where: { id },
            include: FULL_BR_INCLUDE,
          });
        },
        { timeout: 30000 },
      );

      return {
        ...result,
        transition: {
          from: "COMPLETED",
          to: "DRAFT",
          transactionsReversed: inboundTransactions.length,
          stockReverted: inboundTransactions.length > 0,
          documentNumber,
        },
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        `Failed to revert bon de réception: ${error.message}`,
        500,
      );
    }
  }
};

/* ============================================================
   UPDATE BON RECEPTION

   Always updatable (DRAFT and COMPLETED): dateReception, frsId, note.
   Only updatable in DRAFT: depotId, lines.

   Mode 1 — no lines in body: updates metadata only.
   Mode 2 — lines provided: diff-based line management
             (add / update / delete) + totals recalculation
             (DRAFT only).
============================================================ */
export const update = async (id, data, user) => {
  const { dateReception, frsId, note, depotId, lines } = data;

  const existing = await prisma.bonReception.findUnique({
    where: { id },
    include: {
      document: {
        include: {
          lines: { orderBy: { lineNumber: "asc" } },
        },
      },
    },
  });

  if (!existing) throw new ApiError("Bon de réception not found", 404);

  if (!user.isSuperAdmin && existing.document.societeId !== user.societeId) {
    throw new ApiError("Access denied", 403);
  }

  await timeRangeUtility.validateSystemHours(
    new Date(),
    "bon de réception update",
  );

  const normalizedLines = Array.isArray(lines) ? lines : null;
  const depotIdChanging = depotId !== undefined && depotId !== existing.depotId;

  if (
    (normalizedLines !== null || depotIdChanging) &&
    existing.document.status !== "DRAFT"
  ) {
    throw new ApiError(
      `Cannot update lines or depot of a ${existing.document.status} bon de réception. ` +
        `Revert it to DRAFT first via PUT /bon-receptions/${id}/validate.`,
      400,
    );
  }

  // Validate fournisseur if changing
  if (frsId && frsId !== existing.document.fournisseurId) {
    const fournisseur = await validateFournisseurAccess(frsId, user);
    if (fournisseur.societeId !== existing.document.societeId) {
      throw new ApiError("Fournisseur must belong to the same société", 400);
    }
  }

  // Validate depot if changing
  if (depotIdChanging) {
    const depot = await validateDepotAccess(depotId, user);
    if (depot.societeId !== existing.document.societeId) {
      throw new ApiError("Depot must belong to the same société", 400);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // MODE 1: metadata only
  // ══════════════════════════════════════════════════════════════
  if (normalizedLines === null) {
    try {
      return await prisma.$transaction(async (tx) => {
        await tx.fournisseurDocument.update({
          where: { id },
          data: {
            ...(frsId && { fournisseurId: frsId }),
            ...(note !== undefined && { notes: note }),
          },
        });

        await tx.bonReception.update({
          where: { id },
          data: {
            ...(dateReception !== undefined && {
              dateReception: dateReception ? new Date(dateReception) : null,
            }),
            ...(depotIdChanging && { depotId }),
          },
        });

        const result = await tx.bonReception.findUnique({
          where: { id },
          include: FULL_BR_INCLUDE,
        });

        return {
          ...result,
          summary: { updateMode: "simple", linesUpdated: false },
        };
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        `Failed to update bon de réception: ${error.message}`,
        500,
      );
    }
  }

  // ══════════════════════════════════════════════════════════════
  // MODE 2: diff-based line management (DRAFT only)
  // ══════════════════════════════════════════════════════════════
  await validateLines(normalizedLines);

  const existingLines = existing.document.lines;
  const existingLineIds = new Set(existingLines.map((l) => l.id));
  const incomingLineIds = new Set(
    normalizedLines.filter((l) => l.id).map((l) => l.id),
  );

  for (const line of normalizedLines) {
    if (line.id && !existingLineIds.has(line.id)) {
      throw new ApiError(
        `Line id ${line.id} does not belong to this bon de réception`,
        400,
      );
    }
  }

  const linesToCreate = normalizedLines.filter((l) => !l.id);
  const linesToUpdate = normalizedLines.filter((l) => l.id);
  const linesToDelete = existingLines.filter((l) => !incomingLineIds.has(l.id));

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // Preserve lineNumber for updated lines (avoids transient collisions
        // with the @@unique([documentId, lineNumber]) constraint when lines
        // are reordered); new lines get fresh numbers beyond the current max.
        const existingLineNumbers = new Map(
          existingLines.map((l) => [l.id, l.lineNumber]),
        );
        let nextLineNumber =
          existingLines.reduce((max, l) => Math.max(max, l.lineNumber), 0) + 1;

        const processedLines = [];
        const priceUpdates = [];

        for (const line of linesToUpdate) {
          const { financials, priceUpdate } = await buildLineFinancials(
            tx,
            line,
            existingLineNumbers.get(line.id),
          );
          processedLines.push({ id: line.id, ...financials });
          if (priceUpdate) priceUpdates.push(priceUpdate);
        }

        for (const line of linesToCreate) {
          const { financials, priceUpdate } = await buildLineFinancials(
            tx,
            line,
            nextLineNumber++,
          );
          processedLines.push({ id: undefined, ...financials });
          if (priceUpdate) priceUpdates.push(priceUpdate);
        }

        if (linesToDelete.length > 0) {
          await tx.fournisseurDocumentLine.deleteMany({
            where: {
              id: { in: linesToDelete.map((l) => l.id) },
              documentId: id,
            },
          });
        }

        for (const line of processedLines.filter((l) => l.id)) {
          await tx.fournisseurDocumentLine.update({
            where: { id: line.id, documentId: id },
            data: {
              lineNumber: line.lineNumber,
              description: line.description,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              discount: line.discount,
              totalHT: line.totalHT,
              tvaRate: line.tvaRate,
              totalTVA: line.totalTVA,
              totalTTC: line.totalTTC,
            },
          });
        }

        const newLines = processedLines.filter((l) => !l.id);
        if (newLines.length > 0) {
          await tx.fournisseurDocumentLine.createMany({
            data: newLines.map((l) => ({
              ...l,
              id: undefined,
              documentId: id,
            })),
          });
        }

        // Apply article price updates — immediate
        for (const pu of priceUpdates) {
          await tx.article.update({
            where: { id: pu.articleId },
            data: pu.data,
          });
        }

        const totals = processedLines.reduce(
          (acc, l) => ({
            totalHT: acc.totalHT + l.totalHT,
            totalTVA: acc.totalTVA + l.totalTVA,
            totalTTC: acc.totalTTC + l.totalTTC,
          }),
          { totalHT: 0, totalTVA: 0, totalTTC: 0 },
        );

        const totalHT = parseFloat(totals.totalHT.toFixed(2));
        const totalTVA = parseFloat(totals.totalTVA.toFixed(2));
        const totalTTC = parseFloat(totals.totalTTC.toFixed(2));

        await tx.fournisseurDocument.update({
          where: { id },
          data: {
            ...(frsId && { fournisseurId: frsId }),
            ...(note !== undefined && { notes: note }),
            totalHT,
            totalTVA,
            totalTTC,
            amountDue: totalTTC,
          },
        });

        await tx.bonReception.update({
          where: { id },
          data: {
            ...(dateReception !== undefined && {
              dateReception: dateReception ? new Date(dateReception) : null,
            }),
            ...(depotIdChanging && { depotId }),
          },
        });

        return await tx.bonReception.findUnique({
          where: { id },
          include: FULL_BR_INCLUDE,
        });
      },
      { timeout: 30000 },
    );

    return {
      ...result,
      summary: {
        updateMode: "full",
        totalLines: result.document.lines.length,
        linesCreated: linesToCreate.length,
        linesUpdated: linesToUpdate.length,
        linesDeleted: linesToDelete.length,
        totalHT: parseFloat(result.document.totalHT),
        totalTVA: parseFloat(result.document.totalTVA),
        totalTTC: parseFloat(result.document.totalTTC),
      },
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      `Failed to update bon de réception: ${error.message}`,
      500,
    );
  }
};

/* ============================================================
   DELETE BON RECEPTION

   If COMPLETED: reverse INBOUND stock transactions before
   deletion. Catalog price updates (prixAchat/prixVente*) applied
   during create/update are NOT reversed — they are treated as
   permanent catalog changes, consistent with how BonRetourClient
   deletion never reverses catalog-level side effects.
============================================================ */
export const remove = async (id, user) => {
  await timeRangeUtility.validateSystemHours(
    new Date(),
    "delete bon de réception",
  );

  const br = await prisma.bonReception.findUnique({
    where: { id },
    include: {
      document: { select: { societeId: true, status: true } },
      stockTransactions: true,
    },
  });

  if (!br) throw new ApiError("Bon de réception not found", 404);

  if (!user.isSuperAdmin && br.document.societeId !== user.societeId) {
    throw new ApiError("Access denied", 403);
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        if (br.document.status === "COMPLETED") {
          const inboundTransactions = br.stockTransactions.filter(
            (t) => t.transactionType === "INBOUND",
          );

          for (const t of inboundTransactions) {
            const where = t.articleId
              ? { depotId: t.depotId, articleId: t.articleId }
              : { depotId: t.depotId, variantId: t.variantId };

            const stock = await tx.stockByDepot.findFirst({ where });
            if (stock) {
              await tx.stockByDepot.update({
                where: { id: stock.id },
                data: {
                  quantityAvailable:
                    parseFloat(stock.quantityAvailable) -
                    Math.abs(parseFloat(t.quantityChange)),
                },
              });
            }
          }
        }

        await tx.stockTransaction.deleteMany({ where: { bonReceptionId: id } });
        await tx.fournisseurDocumentLine.deleteMany({
          where: { documentId: id },
        });
        await tx.bonReception.delete({ where: { id } });
        await tx.fournisseurDocument.delete({ where: { id } });
      },
      { timeout: 30000 },
    );

    return { message: "Bon de réception deleted successfully" };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      `Failed to delete bon de réception: ${error.message}`,
      500,
    );
  }
};

/* ============================================================
   GENERATE BON RECEPTION PDF
============================================================ */

const BR_PDF_CONFIG = {
  title: "BON DE RECEPTION",
  clientLabel: "FOURNISSEUR",
  getSubLine: (br) => {
    let line = `N°: ${br.document.documentNumber}  |  Réf: ${br.documentReference}  |  Date: ${formatDate(br.documentDate)}`;
    if (br.dateReception)
      line += `  |  Date réception: ${formatDate(br.dateReception)}`;
    return line;
  },
  getInfoBar: (br) =>
    br.depot ? `Dépôt: ${br.depot.name} (${br.depot.code})` : "",
  signatureLeft: "Responsable réception",
  signatureRight: "Signature du fournisseur",
};

export const generateBonReceptionPDF = async (id, user) => {
  const br = await getById(id, user);

  // pdfGenerator's drawHeader reads data.document.client — alias the
  // fournisseur into that shape without touching the shared util.
  // It also reads line.remise for the discount column — alias from
  // FournisseurDocumentLine.discount.
  const data = {
    ...br,
    document: {
      ...br.document,
      client: br.document.fournisseur,
      lines: br.document.lines.map((l) => ({ ...l, remise: l.discount })),
    },
  };

  return generateDocumentPDF(data, BR_PDF_CONFIG);
};
