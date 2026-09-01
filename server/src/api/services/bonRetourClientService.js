import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";
import timeRangeUtility from "../utils/timeRangeUtility.js";
import productVisibilityUtility from "../utils/productVisibilityUtility.js";
import stockManagementService from "./domain/stockManagementService.js";
import { generateDocumentPDF, formatDate } from "../utils/pdfGenerator.js";

/* ============================================================
   HELPER: Generate Document Number (private)
   Format: BRC-{YEAR}-{6-digit-sequence}
   Sequence is per-société per-year, resets every January.
============================================================ */
const generateDocumentNumber = async (societeId) => {
  const year = new Date().getFullYear();
  const prefix = `BRC-${year}`;

  const lastDoc = await prisma.clientDocument.findFirst({
    where: {
      societeId,
      documentNumber: { startsWith: prefix },
      bonRetourClient: { isNot: null },
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
  const prefix = `BRC-${year}`;

  const lastDoc = await prisma.clientDocument.findFirst({
    where: {
      societeId,
      documentNumber: { startsWith: prefix },
      bonRetourClient: { isNot: null },
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
   GET PRODUCTS FOR BON RETOUR CLIENT
   Identical behaviour to getProductsForBonLivraison —
   same product catalog, same stock levels, same price tiers.
============================================================ */
export const getProductsForBonRetourClient = async (query, user) => {
  const {
    depotId,
    priceField = "prixVente3",
    search,
    categoryId,
    familyId,
    page = 1,
    limit = 50,
  } = query;

  if (!depotId) throw new ApiError("depotId is required", 400);

  if (!["prixVente1", "prixVente2", "prixVente3"].includes(priceField)) {
    throw new ApiError(
      "priceField must be prixVente1, prixVente2 or prixVente3",
      400,
    );
  }

  const articleWhere = {
    visible: true,
    ...(familyId && { familyId: parseInt(familyId) }),
    ...(categoryId && { family: { categoryId: parseInt(categoryId) } }),
  };

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
      family: {
        select: {
          id: true,
          name: true,
          TVA: true,
          remise: true,
          category: { select: { id: true, name: true } },
        },
      },
      unitePrincipale: { select: { id: true, name: true, symbol: true } },
      stockByDepot: {
        where: { depotId: parseInt(depotId) },
        select: {
          quantityAvailable: true,
          quantityReserved: true,
          quantityInTransit: true,
        },
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
            where: { depotId: parseInt(depotId) },
            select: {
              quantityAvailable: true,
              quantityReserved: true,
              quantityInTransit: true,
            },
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
    const tvaRate = parseFloat(article.family.TVA || 0) * 100;
    const familyRemise = parseFloat(article.family.remise || 0) * 100;
    const articleRemise = parseFloat(article.remise || 0) * 100;

    if (article.variants.length === 0) {
      const stock = article.stockByDepot[0] || {
        quantityAvailable: 0,
        quantityReserved: 0,
        quantityInTransit: 0,
      };

      products.push({
        type: "article",
        id: article.id,
        articleId: article.id,
        variantId: null,
        barcode: article.barcode,
        name: article.name,
        family: article.family,
        unit: article.unitePrincipale,
        gereEnStock: article.gereEnStock,
        tvaRate,
        familyRemise,
        articleRemise,
        prixAchat: parseFloat(article.prixAchat),
        unitPrice: parseFloat(article[priceField]),
        stock: {
          quantityAvailable: parseFloat(stock.quantityAvailable),
          quantityReserved: parseFloat(stock.quantityReserved),
          quantityInTransit: parseFloat(stock.quantityInTransit),
        },
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

        const stock = variant.stockByDepot[0] || {
          quantityAvailable: 0,
          quantityReserved: 0,
          quantityInTransit: 0,
        };

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
          family: article.family,
          unit: article.unitePrincipale,
          gereEnStock: article.gereEnStock,
          tvaRate,
          familyRemise,
          articleRemise,
          prixAchat: parseFloat(article.prixAchat),
          unitPrice: parseFloat(article[priceField]),
          stock: {
            quantityAvailable: parseFloat(stock.quantityAvailable),
            quantityReserved: parseFloat(stock.quantityReserved),
            quantityInTransit: parseFloat(stock.quantityInTransit),
          },
        });
      }
    }
  }

  const total = await prisma.article.count({ where: articleWhere });

  return {
    products,
    priceField,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
};

/* ============================================================
   HELPER: Validate Client Access
============================================================ */
const validateClientAccess = async (clientId, user) => {
  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      ...(user.isSuperAdmin ? {} : { societeId: user.societeId }),
    },
    select: { id: true, name: true, societeId: true, active: true },
  });

  if (!client) throw new ApiError("Client not found or access denied", 404);
  if (!client.active)
    throw new ApiError("Cannot create return for inactive client", 400);

  return client;
};

/* ============================================================
   HELPER: Validate Depot Access
============================================================ */
const validateDepotAccess = async (depotId, user) => {
  if (!depotId)
    throw new ApiError("Depot is required for BonRetourClient", 400);

  const depot = await prisma.depot.findFirst({
    where: {
      id: depotId,
      ...(user.isSuperAdmin ? {} : { societeId: user.societeId }),
    },
    select: { id: true, code: true, name: true, societeId: true, active: true },
  });

  if (!depot) throw new ApiError("Depot not found or access denied", 404);
  if (!depot.active)
    throw new ApiError("Cannot receive return at inactive depot", 400);

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

    if (!line.unitPrice || parseFloat(line.unitPrice) <= 0) {
      throw new ApiError(
        `Line ${index + 1}: Unit price (TTC) must be greater than 0`,
        400,
      );
    }

    if (
      line.priceField !== undefined &&
      !["prixVente1", "prixVente2", "prixVente3"].includes(line.priceField)
    ) {
      throw new ApiError(
        `Line ${index + 1}: priceField must be prixVente1, prixVente2, or prixVente3`,
        400,
      );
    }
  });

  await productVisibilityUtility.validateBatchProductVisibility(
    lines.map((line) => ({
      articleId: line.articleId,
      variantId: line.variantId,
    })),
    "bon retour client",
  );
};

/* ============================================================
   HELPER: Resolve article for a line (with family for TVA)
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
   HELPER: Validate pack lines input structure
============================================================ */
const validatePackLinesInput = (packLines) => {
  const seen = new Set();
  packLines.forEach((line, i) => {
    if (!line.packId)
      throw new ApiError(`Pack line ${i + 1}: packId is required`, 400);
    if (seen.has(line.packId))
      throw new ApiError(
        `Pack line ${i + 1}: Duplicate packId ${line.packId}`,
        400,
      );
    seen.add(line.packId);
    if (!line.quantity || parseFloat(line.quantity) <= 0)
      throw new ApiError(
        `Pack line ${i + 1}: quantity must be greater than 0`,
        400,
      );
    if (line.prixVente === undefined || parseFloat(line.prixVente) < 0)
      throw new ApiError(`Pack line ${i + 1}: prixVente must be >= 0`, 400);
  });
};

/* ============================================================
   HELPER: Fetch packs and validate return prices
   No stock availability check — returns INCREASE stock.
============================================================ */
const fetchPackLinesData = async (packLines, user) => {
  const enriched = [];

  for (let i = 0; i < packLines.length; i++) {
    const { packId, quantity, prixVente } = packLines[i];

    const pack = await prisma.pack.findFirst({
      where: {
        id: packId,
        active: true,
        ...(user.isSuperAdmin ? {} : { societeId: user.societeId }),
      },
      include: {
        components: {
          include: {
            article: {
              select: {
                id: true,
                name: true,
                barcode: true,
                gereEnStock: true,
              },
            },
            variant: {
              select: { id: true, name: true, barcode: true },
            },
          },
        },
      },
    });

    if (!pack)
      throw new ApiError(
        `Pack line ${i + 1}: Pack ${packId} not found or inactive`,
        404,
      );

    const purchasePrice = parseFloat(pack.purchasePrice);
    if (parseFloat(prixVente) < purchasePrice) {
      throw new ApiError(
        `Pack line ${i + 1}: prixVente ${parseFloat(prixVente).toFixed(2)} cannot be below purchase price ${purchasePrice.toFixed(2)}`,
        400,
      );
    }

    enriched.push({
      packId,
      quantity: parseFloat(quantity),
      prixVente: parseFloat(prixVente),
      pack,
    });
  }

  return enriched;
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
   HELPER: Full Prisma include block (reused across read ops)
============================================================ */
const FULL_BRC_INCLUDE = {
  document: {
    include: {
      client: {
        select: { id: true, name: true, type: true, phone: true, email: true },
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
  bonLivraison: {
    select: {
      id: true,
      document: {
        select: { documentNumber: true, totalTTC: true, amountPaid: true },
      },
    },
  },
  avoirs: {
    select: {
      id: true,
      document: { select: { documentNumber: true, totalTTC: true } },
    },
  },
  stockTransactions: {
    include: {
      article: { select: { id: true, name: true } },
      variant: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  },
  packLines: {
    include: {
      pack: {
        select: {
          id: true,
          name: true,
          barcode: true,
          prixVentePack: true,
          purchasePrice: true,
          components: {
            include: {
              article: {
                select: {
                  id: true,
                  name: true,
                  barcode: true,
                  gereEnStock: true,
                },
              },
              variant: { select: { id: true, name: true, barcode: true } },
            },
          },
        },
      },
    },
    orderBy: { id: "asc" },
  },
};

/* ============================================================
   HELPER: Apply financial reconciliation (COMPLETED)
   Distributes BRC.totalTTC across outstanding BonLivraison
   documents for the client, starting with the target BL (if
   given) then cascading to the next unpaid ones by date ASC.
============================================================ */
const applyFinancialReconciliation = async (
  tx,
  clientId,
  societeId,
  bonLivraisonId,
  totalToApply,
) => {
  let remaining = parseFloat(totalToApply);

  // 1. Target BL first (if a specific one was provided)
  if (bonLivraisonId && remaining > 0) {
    const bl = await tx.clientDocument.findUnique({
      where: { id: bonLivraisonId },
      select: { id: true, totalTTC: true, amountPaid: true },
    });

    if (bl) {
      const outstanding = parseFloat(bl.totalTTC) - parseFloat(bl.amountPaid);
      const apply = Math.min(remaining, Math.max(outstanding, 0));
      if (apply > 0) {
        await tx.clientDocument.update({
          where: { id: bonLivraisonId },
          data: { amountPaid: { increment: apply } },
        });
        remaining -= apply;
      }
    }
  }

  // 2. Cascade to other unpaid BLs for the same client (oldest first)
  if (remaining > 0) {
    const otherBls = await tx.clientDocument.findMany({
      where: {
        clientId,
        societeId,
        bonLivraison: { isNot: null },
        ...(bonLivraisonId ? { id: { not: bonLivraisonId } } : {}),
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, totalTTC: true, amountPaid: true },
    });

    for (const bl of otherBls) {
      if (remaining <= 0) break;
      const outstanding = parseFloat(bl.totalTTC) - parseFloat(bl.amountPaid);
      if (outstanding <= 0) continue;
      const apply = Math.min(remaining, outstanding);
      await tx.clientDocument.update({
        where: { id: bl.id },
        data: { amountPaid: { increment: apply } },
      });
      remaining -= apply;
    }
  }
};

/* ============================================================
   HELPER: Reverse financial reconciliation (COMPLETED → DRAFT)
   Mirrors applyFinancialReconciliation in subtract mode.
============================================================ */
const reverseFinancialReconciliation = async (
  tx,
  clientId,
  societeId,
  bonLivraisonId,
  totalToReverse,
) => {
  let remaining = parseFloat(totalToReverse);

  // 1. Subtract from target BL first
  if (bonLivraisonId && remaining > 0) {
    const bl = await tx.clientDocument.findUnique({
      where: { id: bonLivraisonId },
      select: { id: true, amountPaid: true },
    });

    if (bl) {
      const removable = Math.min(remaining, parseFloat(bl.amountPaid));
      if (removable > 0) {
        await tx.clientDocument.update({
          where: { id: bonLivraisonId },
          data: { amountPaid: { decrement: removable } },
        });
        remaining -= removable;
      }
    }
  }

  // 2. Cascade removal from other BLs (oldest first — same order as apply)
  if (remaining > 0) {
    const otherBls = await tx.clientDocument.findMany({
      where: {
        clientId,
        societeId,
        bonLivraison: { isNot: null },
        ...(bonLivraisonId ? { id: { not: bonLivraisonId } } : {}),
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, amountPaid: true },
    });

    for (const bl of otherBls) {
      if (remaining <= 0) break;
      const removable = Math.min(remaining, parseFloat(bl.amountPaid));
      if (removable <= 0) continue;
      await tx.clientDocument.update({
        where: { id: bl.id },
        data: { amountPaid: { decrement: removable } },
      });
      remaining -= removable;
    }
  }
};

/* ============================================================
   GET ALL BON RETOUR CLIENTS
============================================================ */
export const getAll = async (query, user) => {
  const {
    clientId,
    depotId,
    status,
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = query;

  // ── Build documentDate filter ───────────────────────────────────────
  const documentDateFilter = {};
  if (startDate) documentDateFilter.gte = new Date(startDate);
  if (endDate) documentDateFilter.lte = new Date(endDate);

  const where = {
    document: {
      ...(user.isSuperAdmin ? {} : { societeId: user.societeId }),
      ...(clientId && { clientId: parseInt(clientId) }),
      ...(status && { status }),
    },
    ...(depotId && { depotId: parseInt(depotId) }),
    ...(Object.keys(documentDateFilter).length > 0 && {
      documentDate: documentDateFilter,
    }),
  };

  // 1. Fetch all without pagination
  const all = await prisma.bonRetourClient.findMany({
    where,
    include: {
      document: {
        include: {
          client: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
        },
      },
      depot: { select: { id: true, code: true, name: true } },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  // 2. Filter by system hours on documentDate before pagination
  const filtered = await timeRangeUtility.filterBySystemHours(
    all,
    "documentDate",
  );

  // 3. Paginate manually
  const parsedPage = parseInt(page);
  const parsedLimit = parseInt(limit);
  const total = filtered.length;
  const bonRetourClients = filtered.slice(
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

  // Shape the list response to match spec fields
  const data = bonRetourClients.map((brc) => ({
    id: brc.id,
    documentNumber: brc.document.documentNumber,
    status: brc.document.status,
    dateRetour: fmt(brc.dateRetour),
    documentDate: fmtDateTime(brc.documentDate),
    depotId: brc.depotId,
    depot: brc.depot,
    clientName: brc.document.client.name,
    clientId: brc.document.client.id,
    createdBy: brc.document.user
      ? { id: brc.document.user.id, name: brc.document.user.name }
      : null,
    totalHT: parseFloat(brc.document.totalHT),
    totalTVA: parseFloat(brc.document.totalTVA),
    totalTTC: parseFloat(brc.document.totalTTC),
    motifRetour: brc.motifRetour,
    bonLivraisonId: brc.bonLivraisonId,
    createdAt: fmtDateTime(brc.createdAt),
  }));

  return {
    bonRetourClients: data,
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit),
    },
  };
};

/* ============================================================
   GET BON RETOUR CLIENT BY ID
============================================================ */
export const getById = async (id, user) => {
  const brc = await prisma.bonRetourClient.findUnique({
    where: { id },
    include: FULL_BRC_INCLUDE,
  });

  if (!brc) throw new ApiError("Bon retour client not found", 404);

  if (!user.isSuperAdmin && brc.document.societe.id !== user.societeId) {
    throw new ApiError("Access denied", 403);
  }

  return brc;
};

/* ============================================================
   CREATE BON RETOUR CLIENT

   Financial reconciliation (only when status = COMPLETED):
     - If bonLivraisonId given → credit the target BL first, then
       cascade any remainder to other unpaid BLs for the client.
     - If no bonLivraisonId → cascade across unpaid BLs (oldest first).

   Stock (only when status = COMPLETED):
     - RETURN_IN transactions for stock-managed lines → stock INCREASES.
============================================================ */
export const create = async (data, user) => {
  const {
    clientId,
    depotId,
    bonLivraisonId,
    documentDate,
    dateRetour,
    motifRetour,
    notes,
    internalNotes,
    lines = [],
    packLines: rawPackLines = [],
    status = "DRAFT",
  } = data;

  // 1. Validate operating hours
  await timeRangeUtility.validateSystemHours(
    new Date(),
    "bon retour client creation",
  );

  // 2. Validate client
  const client = await validateClientAccess(clientId, user);

  // 3. Validate depot
  const depot = await validateDepotAccess(depotId, user);

  // 4. Client and depot must belong to the same société
  if (client.societeId !== depot.societeId) {
    throw new ApiError("Client and depot must belong to the same société", 400);
  }

  // 5. Validate bonLivraisonId if provided
  if (bonLivraisonId) {
    const bl = await prisma.bonLivraison.findFirst({
      where: {
        id: bonLivraisonId,
        document: {
          clientId,
          ...(user.isSuperAdmin ? {} : { societeId: user.societeId }),
        },
      },
      select: { id: true },
    });
    if (!bl) {
      throw new ApiError(
        "BonLivraison not found or does not belong to this client",
        404,
      );
    }
  }

  // 6. At least one line type required
  if (lines.length === 0 && rawPackLines.length === 0) {
    throw new ApiError("At least one line or pack line is required", 400);
  }

  // 7. Validate article lines if provided
  let stockManaged = [];
  let nonStockManaged = [];

  if (lines.length > 0) {
    await validateLines(lines);

    lines.forEach((line, index) => {
      if (!line.priceField) {
        throw new ApiError(
          `Line ${index + 1}: priceField is required (prixVente1, prixVente2, or prixVente3)`,
          400,
        );
      }
    });

    ({ stockManaged, nonStockManaged } =
      await categorizeByStockManagement(lines));
  }

  // 8. Validate and fetch pack lines if provided
  let packsData = [];
  if (rawPackLines.length > 0) {
    validatePackLinesInput(rawPackLines);
    packsData = await fetchPackLinesData(rawPackLines, user);
  }

  const documentNumber = await generateDocumentNumber(client.societeId);

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const linesWithFinancials = [];

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const article = await resolveLineArticle(
            tx,
            line.articleId,
            line.variantId,
          );
          if (!article) {
            throw new ApiError(`Line ${i + 1}: Product not found`, 404);
          }

          const tvaRate = parseFloat(article.family.TVA || 0);
          const familyRemise = parseFloat(article.family.remise || 0);
          const prixAchatTTC = parseFloat(article.prixAchat);
          const referencePriceTTC = parseFloat(article[line.priceField]);
          const unitPriceTTC = parseFloat(line.unitPrice);
          const lineRemise = parseFloat(line.remise || 0);

          if (lineRemise > familyRemise) {
            throw new ApiError(
              `Line ${i + 1}: remise ${(lineRemise * 100).toFixed(2)}% exceeds family maximum ${(familyRemise * 100).toFixed(2)}%`,
              400,
            );
          }

          if (unitPriceTTC < prixAchatTTC) {
            throw new ApiError(
              `Line ${i + 1}: Unit price ${unitPriceTTC.toFixed(2)} (TTC) cannot be below purchase price ${prixAchatTTC.toFixed(2)} (TTC)`,
              400,
            );
          }

          const minPriceTTC = referencePriceTTC * (1 - familyRemise);
          if (unitPriceTTC < minPriceTTC) {
            throw new ApiError(
              `Line ${i + 1}: Unit price ${unitPriceTTC.toFixed(2)} (TTC) is below minimum ${minPriceTTC.toFixed(2)} (TTC)`,
              400,
            );
          }

          const quantity = parseFloat(line.quantity);
          const totalBeforeDiscount = quantity * unitPriceTTC;
          const discountAmount = totalBeforeDiscount * lineRemise;
          const totalTTC = totalBeforeDiscount - discountAmount;
          const totalHT = totalTTC / (1 + tvaRate);
          const totalTVA = totalTTC - totalHT;

          linesWithFinancials.push({
            documentId: null,
            articleId: line.articleId || null,
            variantId: line.variantId || null,
            lineNumber: i + 1,
            description: line.description || article.name,
            quantity,
            unitPrice: unitPriceTTC,
            remise: lineRemise,
            totalHT: parseFloat(totalHT.toFixed(2)),
            tvaRate,
            totalTVA: parseFloat(totalTVA.toFixed(2)),
            totalTTC: parseFloat(totalTTC.toFixed(2)),
            priceField: line.priceField,
          });
        }

        // Article totals
        const articleTotals = linesWithFinancials.reduce(
          (acc, l) => ({
            totalHT: acc.totalHT + l.totalHT,
            totalTVA: acc.totalTVA + l.totalTVA,
            totalTTC: acc.totalTTC + l.totalTTC,
          }),
          { totalHT: 0, totalTVA: 0, totalTTC: 0 },
        );

        // Pack totals — treated as 0% TVA (HT = TTC)
        const packTotalTTC = packsData.reduce(
          (sum, pd) => sum + pd.quantity * pd.prixVente,
          0,
        );

        const totalHT = parseFloat(
          (articleTotals.totalHT + packTotalTTC).toFixed(2),
        );
        const totalTVA = parseFloat(articleTotals.totalTVA.toFixed(2));
        const totalTTC = parseFloat(
          (articleTotals.totalTTC + packTotalTTC).toFixed(2),
        );

        // Create ClientDocument header
        const clientDocument = await tx.clientDocument.create({
          data: {
            societeId: client.societeId,
            clientId,
            documentNumber,
            status,
            totalHT,
            totalTVA,
            totalTTC,
            discount: 0,
            amountPaid: 0,
            amountDue: totalTTC,
            notes,
            createdBy: user.id,
          },
        });

        // Create BonRetourClient extension
        const bonRetourClient = await tx.bonRetourClient.create({
          data: {
            id: clientDocument.id,
            documentDate: documentDate ? new Date(documentDate) : new Date(),
            dateRetour: dateRetour ? new Date(dateRetour) : null,
            depotId,
            bonLivraisonId: bonLivraisonId || null,
            motifRetour: motifRetour || null,
          },
        });

        // Create article lines
        if (linesWithFinancials.length > 0) {
          await tx.clientDocumentLine.createMany({
            data: linesWithFinancials.map((line) => ({
              ...line,
              documentId: clientDocument.id,
            })),
          });
        }

        // Create pack lines
        if (packsData.length > 0) {
          await tx.bonRetourClientPackLine.createMany({
            data: packsData.map((pd) => ({
              bonRetourClientId: bonRetourClient.id,
              packId: pd.packId,
              quantity: pd.quantity,
              prixVente: pd.prixVente,
            })),
          });
        }

        // Stock movement (RETURN_IN) + financial reconciliation on COMPLETED
        if (status === "COMPLETED") {
          // Article lines RETURN_IN
          if (stockManaged.length > 0) {
            await stockManagementService.batchStockOperationsWithTx(
              tx,
              stockManaged.map((line) => ({
                depotId,
                articleId: line.articleId || null,
                variantId: line.variantId || null,
                quantityChange: parseFloat(line.quantity), // positive — stock INCREASES
                transactionType: "RETURN_IN",
                referenceId: documentNumber,
                reason: `Return from ${client.name}: ${documentNumber}`,
                userId: user.id,
                bonRetourClientId: bonRetourClient.id,
              })),
            );
          }

          // Pack component RETURN_IN — stock increases for each component
          if (packsData.length > 0) {
            const packOps = [];
            for (const pd of packsData) {
              for (const comp of pd.pack.components) {
                const gereEnStock = comp.articleId
                  ? comp.article?.gereEnStock
                  : comp.variant?.article?.gereEnStock;
                if (!gereEnStock) continue;

                packOps.push({
                  depotId,
                  articleId: comp.articleId || null,
                  variantId: comp.variantId || null,
                  quantityChange: pd.quantity * parseFloat(comp.quantity), // positive
                  transactionType: "RETURN_IN",
                  referenceId: documentNumber,
                  reason: `Pack return from ${client.name}: ${documentNumber}`,
                  userId: user.id,
                  bonRetourClientId: bonRetourClient.id,
                });
              }
            }
            if (packOps.length > 0) {
              await stockManagementService.batchStockOperationsWithTx(
                tx,
                packOps,
              );
            }
          }

          await applyFinancialReconciliation(
            tx,
            clientId,
            client.societeId,
            bonLivraisonId || null,
            totalTTC,
          );
        }

        return await tx.bonRetourClient.findUnique({
          where: { id: bonRetourClient.id },
          include: FULL_BRC_INCLUDE,
        });
      },
      { timeout: 30000 },
    );

    return {
      ...result,
      summary: {
        totalLines: result.document.lines.length,
        totalPackLines: result.packLines.length,
        stockManagedLines: stockManaged.length,
        nonStockManagedLines: nonStockManaged.length,
        totalQuantity:
          result.document.lines.reduce(
            (sum, l) => sum + parseFloat(l.quantity),
            0,
          ) +
          result.packLines.reduce(
            (sum, pl) => sum + parseFloat(pl.quantity),
            0,
          ),
        totalHT: parseFloat(result.document.totalHT),
        totalTVA: parseFloat(result.document.totalTVA),
        totalTTC: parseFloat(result.document.totalTTC),
        stockMovementApplied:
          status === "COMPLETED" &&
          (stockManaged.length > 0 || packsData.length > 0),
        financialReconciliationApplied: status === "COMPLETED",
      },
    };
  } catch (error) {
    if (error.code === "P2002")
      throw new ApiError("Duplicate document number", 409);
    if (error.code === "P2003")
      throw new ApiError(
        "Invalid reference: Client, Depot, or Product not found",
        400,
      );
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      `Failed to create bon retour client: ${error.message}`,
      500,
    );
  }
};

/* ============================================================
   VALIDATE BON RETOUR CLIENT — Status Transition

   DRAFT → COMPLETED:
     Apply RETURN_IN stock movements + financial reconciliation.

   COMPLETED → DRAFT:
     Reverse RETURN_IN movements (create RETURN_OUT audit trail
     + delete original RETURN_IN records).
     Reverse financial reconciliation.
============================================================ */
export const validate = async (id, targetStatus, user) => {
  await timeRangeUtility.validateSystemHours(
    new Date(),
    "bon retour client validation",
  );

  const brc = await prisma.bonRetourClient.findUnique({
    where: { id },
    include: {
      document: {
        include: {
          lines: true,
          client: { select: { id: true, name: true, societeId: true } },
        },
      },
      packLines: {
        include: {
          pack: {
            include: {
              components: {
                include: {
                  article: { select: { id: true, gereEnStock: true } },
                  variant: {
                    include: {
                      article: { select: { id: true, gereEnStock: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      stockTransactions: {
        where: { transactionType: "RETURN_IN" },
      },
    },
  });

  if (!brc) throw new ApiError("Bon retour client not found", 404);

  if (!user.isSuperAdmin && brc.document.client.societeId !== user.societeId) {
    throw new ApiError("Access denied", 403);
  }

  const currentStatus = brc.document.status;
  const documentNumber = brc.document.documentNumber;
  const clientName = brc.document.client.name;
  const clientId = brc.document.client.id;
  const societeId = brc.document.client.societeId;
  const depotId = brc.depotId;
  const totalTTC = parseFloat(brc.document.totalTTC);

  if (currentStatus === targetStatus) {
    throw new ApiError(`Bon retour client is already ${targetStatus}`, 400);
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
    const lines = brc.document.lines;

    if ((!lines || lines.length === 0) && brc.packLines.length === 0) {
      throw new ApiError(
        "Cannot complete a bon retour client with no lines",
        400,
      );
    }

    const { stockManaged, nonStockManaged } =
      await categorizeByStockManagement(lines);

    try {
      const result = await prisma.$transaction(
        async (tx) => {
          // RETURN_IN for stock-managed article lines
          if (stockManaged.length > 0) {
            await stockManagementService.batchStockOperationsWithTx(
              tx,
              stockManaged.map((line) => ({
                depotId,
                articleId: line.articleId || null,
                variantId: line.variantId || null,
                quantityChange: parseFloat(line.quantity), // positive — stock INCREASES
                transactionType: "RETURN_IN",
                referenceId: documentNumber,
                reason: `Return from ${clientName}: ${documentNumber}`,
                userId: user.id,
                bonRetourClientId: id,
              })),
            );
          }

          // RETURN_IN for pack component lines
          if (brc.packLines.length > 0) {
            const packOps = [];
            for (const pl of brc.packLines) {
              for (const comp of pl.pack.components) {
                const gereEnStock = comp.articleId
                  ? comp.article?.gereEnStock
                  : comp.variant?.article?.gereEnStock;
                if (!gereEnStock) continue;

                packOps.push({
                  depotId,
                  articleId: comp.articleId || null,
                  variantId: comp.variantId || null,
                  quantityChange:
                    parseFloat(pl.quantity) * parseFloat(comp.quantity), // positive
                  transactionType: "RETURN_IN",
                  referenceId: documentNumber,
                  reason: `Pack return from ${clientName}: ${documentNumber}`,
                  userId: user.id,
                  bonRetourClientId: id,
                });
              }
            }
            if (packOps.length > 0) {
              await stockManagementService.batchStockOperationsWithTx(
                tx,
                packOps,
              );
            }
          }

          // Apply financial reconciliation
          await applyFinancialReconciliation(
            tx,
            clientId,
            societeId,
            brc.bonLivraisonId,
            totalTTC,
          );

          await tx.clientDocument.update({
            where: { id },
            data: { status: "COMPLETED" },
          });

          return await tx.bonRetourClient.findUnique({
            where: { id },
            include: FULL_BRC_INCLUDE,
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
          packLinesProcessed: brc.packLines.length,
          returnInApplied: stockManaged.length > 0 || brc.packLines.length > 0,
          financialReconciliationApplied: true,
          documentNumber,
        },
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        `Failed to validate bon retour client: ${error.message}`,
        500,
      );
    }
  }

  // ════════════════════════════════════════════════════════════════
  // TRANSITION: COMPLETED → DRAFT
  // ════════════════════════════════════════════════════════════════
  if (targetStatus === "DRAFT") {
    const returnInTransactions = brc.stockTransactions; // pre-filtered RETURN_IN

    try {
      const result = await prisma.$transaction(
        async (tx) => {
          // a. Reverse the physical stock each RETURN_IN added — decrease
          //    StockByDepot.quantityAvailable WITHOUT creating any new stock
          //    transaction record. Only stock-managed products had their stock
          //    incremented on COMPLETED, so only those are reversed here.
          //    Iterating the RETURN_IN transactions covers both article/variant
          //    lines and exploded pack components (each has its own row).
          for (const t of returnInTransactions) {
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
                  increment: -Math.abs(parseFloat(t.quantityChange)), // remove what RETURN_IN added
                },
              },
            });
          }

          // b. Delete original RETURN_IN records so re-validation starts clean
          await tx.stockTransaction.deleteMany({
            where: { bonRetourClientId: id, transactionType: "RETURN_IN" },
          });

          // c. Reverse financial reconciliation
          await reverseFinancialReconciliation(
            tx,
            clientId,
            societeId,
            brc.bonLivraisonId,
            totalTTC,
          );

          // d. Revert status
          await tx.clientDocument.update({
            where: { id },
            data: { status: "DRAFT" },
          });

          return await tx.bonRetourClient.findUnique({
            where: { id },
            include: FULL_BRC_INCLUDE,
          });
        },
        { timeout: 30000 },
      );

      return {
        ...result,
        transition: {
          from: "COMPLETED",
          to: "DRAFT",
          transactionsReversed: returnInTransactions.length,
          stockReverted: returnInTransactions.length > 0,
          financialReconciliationReverted: true,
          documentNumber,
        },
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        `Failed to revert bon retour client: ${error.message}`,
        500,
      );
    }
  }
};

/* ============================================================
   UPDATE BON RETOUR CLIENT (DRAFT only)

   Mode 1 — no lines in body: updates metadata only.
   Mode 2 — lines provided: diff-based line management
             (add / update / delete) + financial recalculation.
   No stock or financial changes here — call /validate after.
============================================================ */
export const update = async (id, data, user) => {
  const {
    clientId,
    depotId,
    bonLivraisonId,
    documentDate,
    dateRetour,
    notes,
    lines,
    packLines: rawPackLines,
  } = data;

  const existingBRC = await prisma.bonRetourClient.findUnique({
    where: { id },
    include: {
      document: {
        include: {
          lines: { orderBy: { lineNumber: "asc" } },
          client: { select: { id: true, societeId: true } },
        },
      },
      packLines: true,
    },
  });

  if (!existingBRC) throw new ApiError("Bon retour client not found", 404);

  if (
    !user.isSuperAdmin &&
    existingBRC.document.client.societeId !== user.societeId
  ) {
    throw new ApiError("Access denied", 403);
  }

  if (existingBRC.document.status !== "DRAFT") {
    throw new ApiError(
      `Cannot update a ${existingBRC.document.status} bon retour client. ` +
        `Revert it to DRAFT first via PUT /bon-retour-clients/${id}/validate.`,
      400,
    );
  }

  await timeRangeUtility.validateSystemHours(
    new Date(),
    "bon retour client update",
  );

  // Validate client / depot if changing
  let client = existingBRC.document.client;
  let depot = { id: existingBRC.depotId, societeId: client.societeId };

  if (clientId && clientId !== existingBRC.document.clientId) {
    client = await validateClientAccess(clientId, user);
  }
  if (depotId && depotId !== existingBRC.depotId) {
    depot = await validateDepotAccess(depotId, user);
  }
  if (client.societeId !== depot.societeId) {
    throw new ApiError("Client and depot must belong to the same société", 400);
  }

  // Validate new bonLivraisonId if changing
  if (bonLivraisonId !== undefined && bonLivraisonId !== null) {
    const bl = await prisma.bonLivraison.findFirst({
      where: {
        id: bonLivraisonId,
        document: {
          clientId: clientId || existingBRC.document.client.id,
          ...(user.isSuperAdmin ? {} : { societeId: user.societeId }),
        },
      },
      select: { id: true },
    });
    if (!bl) {
      throw new ApiError(
        "BonLivraison not found or does not belong to this client",
        404,
      );
    }
  }

  const normalizedLines = Array.isArray(lines) ? lines : null;
  const normalizedPackLines = Array.isArray(rawPackLines) ? rawPackLines : null;
  const shouldUpdateLines =
    normalizedLines !== null || normalizedPackLines !== null;

  // ══════════════════════════════════════════════════════════════
  // MODE 1: metadata only
  // ══════════════════════════════════════════════════════════════
  if (!shouldUpdateLines) {
    try {
      return await prisma.$transaction(async (tx) => {
        await tx.clientDocument.update({
          where: { id },
          data: {
            ...(clientId && { clientId }),
            ...(notes !== undefined && { notes }),
          },
        });

        await tx.bonRetourClient.update({
          where: { id },
          data: {
            ...(documentDate && { documentDate: new Date(documentDate) }),
            ...(dateRetour !== undefined && {
              dateRetour: dateRetour ? new Date(dateRetour) : null,
            }),
            ...(depotId && { depotId }),
            ...(bonLivraisonId !== undefined && { bonLivraisonId }),
          },
        });

        const result = await tx.bonRetourClient.findUnique({
          where: { id },
          include: FULL_BRC_INCLUDE,
        });

        return {
          ...result,
          summary: { updateMode: "simple", linesUpdated: false },
        };
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        `Failed to update bon retour client: ${error.message}`,
        500,
      );
    }
  }

  // ══════════════════════════════════════════════════════════════
  // MODE 2: diff-based line management
  // ══════════════════════════════════════════════════════════════

  // Validate article lines diff
  let linesToCreate = [];
  let linesToUpdate = [];
  let linesToDelete = [];
  const existingLines = existingBRC.document.lines;
  const existingLineMap = new Map(existingLines.map((l) => [l.id, l]));

  if (normalizedLines !== null) {
    if (
      normalizedLines.length === 0 &&
      (normalizedPackLines === null || normalizedPackLines.length === 0) &&
      existingBRC.packLines.length === 0
    ) {
      throw new ApiError("At least one line or pack line is required", 400);
    }

    if (normalizedLines.length > 0) {
      await validateLines(normalizedLines);
    }

    const existingLineIds = new Set(existingLines.map((l) => l.id));
    const incomingLineIds = new Set(
      normalizedLines.filter((l) => l.id).map((l) => l.id),
    );

    linesToCreate = normalizedLines.filter((l) => !l.id);
    linesToUpdate = normalizedLines.filter(
      (l) => l.id && existingLineIds.has(l.id),
    );
    linesToDelete = existingLines.filter((l) => !incomingLineIds.has(l.id));

    linesToCreate.forEach((line, index) => {
      if (!line.priceField) {
        throw new ApiError(
          `New line ${index + 1}: priceField is required (prixVente1, prixVente2, or prixVente3)`,
          400,
        );
      }
    });
  }

  // Validate pack lines diff
  let packLinesToCreate = [];
  let packLinesToUpdate = [];
  let packLinesToDelete = [];
  let newPacksData = [];

  if (normalizedPackLines !== null) {
    if (normalizedPackLines.length > 0) {
      validatePackLinesInput(normalizedPackLines);
    }

    const existingPackMap = new Map(
      existingBRC.packLines.map((pl) => [pl.packId, pl]),
    );
    const incomingPackIds = new Set(normalizedPackLines.map((pl) => pl.packId));

    packLinesToCreate = normalizedPackLines.filter(
      (pl) => !existingPackMap.has(pl.packId),
    );
    packLinesToUpdate = normalizedPackLines.filter((pl) =>
      existingPackMap.has(pl.packId),
    );
    packLinesToDelete = existingBRC.packLines.filter(
      (pl) => !incomingPackIds.has(pl.packId),
    );

    const allSurvivingPackLines = normalizedPackLines; // create + update
    if (allSurvivingPackLines.length > 0) {
      newPacksData = await fetchPackLinesData(allSurvivingPackLines, user);
    }
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // ── Article lines ────────────────────────────────────────
        const processedLines = [];
        let lineNumber = 1;

        if (normalizedLines !== null) {
          for (const line of [...linesToUpdate, ...linesToCreate]) {
            const article = await resolveLineArticle(
              tx,
              line.articleId,
              line.variantId,
            );
            if (!article) throw new ApiError(`Line: Product not found`, 404);

            const resolvedPriceField =
              line.priceField || existingLineMap.get(line.id)?.priceField;

            const tvaRate = parseFloat(article.family.TVA || 0);
            const familyRemise = parseFloat(article.family.remise || 0);
            const prixAchatTTC = parseFloat(article.prixAchat);
            const referencePriceTTC = parseFloat(article[resolvedPriceField]);
            const unitPriceTTC = parseFloat(line.unitPrice);
            const lineRemise = parseFloat(line.remise || 0);

            if (lineRemise > familyRemise)
              throw new ApiError(
                `remise ${(lineRemise * 100).toFixed(2)}% exceeds family maximum ${(familyRemise * 100).toFixed(2)}%`,
                400,
              );
            if (unitPriceTTC < prixAchatTTC)
              throw new ApiError(
                `Unit price ${unitPriceTTC.toFixed(2)} below purchase price ${prixAchatTTC.toFixed(2)}`,
                400,
              );
            const minPrice = referencePriceTTC * (1 - familyRemise);
            if (unitPriceTTC < minPrice)
              throw new ApiError(
                `Unit price ${unitPriceTTC.toFixed(2)} below minimum ${minPrice.toFixed(2)}`,
                400,
              );

            const quantity = parseFloat(line.quantity);
            const totalTTC = quantity * unitPriceTTC * (1 - lineRemise);
            const totalHT = totalTTC / (1 + tvaRate);
            const totalTVA = totalTTC - totalHT;

            processedLines.push({
              id: line.id || undefined,
              articleId: line.articleId || null,
              variantId: line.variantId || null,
              lineNumber: lineNumber++,
              description: line.description || article.name,
              quantity,
              unitPrice: unitPriceTTC,
              remise: lineRemise,
              totalHT: parseFloat(totalHT.toFixed(2)),
              tvaRate,
              totalTVA: parseFloat(totalTVA.toFixed(2)),
              totalTTC: parseFloat(totalTTC.toFixed(2)),
              priceField: resolvedPriceField,
            });
          }

          if (linesToDelete.length > 0) {
            await tx.clientDocumentLine.deleteMany({
              where: {
                id: { in: linesToDelete.map((l) => l.id) },
                documentId: id,
              },
            });
          }

          for (const line of processedLines.filter((l) => l.id)) {
            await tx.clientDocumentLine.update({
              where: { id: line.id, documentId: id },
              data: {
                lineNumber: line.lineNumber,
                description: line.description,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                remise: line.remise,
                totalHT: line.totalHT,
                tvaRate: line.tvaRate,
                totalTVA: line.totalTVA,
                totalTTC: line.totalTTC,
                priceField: line.priceField,
              },
            });
          }

          const newLines = processedLines.filter((l) => !l.id);
          if (newLines.length > 0) {
            await tx.clientDocumentLine.createMany({
              data: newLines.map((l) => ({
                documentId: id,
                ...l,
                id: undefined,
              })),
            });
          }
        }

        // ── Pack lines ───────────────────────────────────────────
        if (normalizedPackLines !== null) {
          if (packLinesToDelete.length > 0) {
            await tx.bonRetourClientPackLine.deleteMany({
              where: {
                bonRetourClientId: id,
                packId: { in: packLinesToDelete.map((pl) => pl.packId) },
              },
            });
          }

          for (const pd of newPacksData.filter((pd) =>
            packLinesToUpdate.some((u) => u.packId === pd.packId),
          )) {
            await tx.bonRetourClientPackLine.update({
              where: {
                bonRetourClientId_packId: {
                  bonRetourClientId: id,
                  packId: pd.packId,
                },
              },
              data: { quantity: pd.quantity, prixVente: pd.prixVente },
            });
          }

          const toCreate = newPacksData.filter((pd) =>
            packLinesToCreate.some((c) => c.packId === pd.packId),
          );
          if (toCreate.length > 0) {
            await tx.bonRetourClientPackLine.createMany({
              data: toCreate.map((pd) => ({
                bonRetourClientId: id,
                packId: pd.packId,
                quantity: pd.quantity,
                prixVente: pd.prixVente,
              })),
            });
          }
        }

        // ── Totals ───────────────────────────────────────────────
        const articleTotals =
          normalizedLines !== null
            ? processedLines.reduce(
                (acc, l) => ({
                  totalHT: acc.totalHT + l.totalHT,
                  totalTVA: acc.totalTVA + l.totalTVA,
                  totalTTC: acc.totalTTC + l.totalTTC,
                }),
                { totalHT: 0, totalTVA: 0, totalTTC: 0 },
              )
            : {
                totalHT: parseFloat(existingBRC.document.totalHT),
                totalTVA: parseFloat(existingBRC.document.totalTVA),
                totalTTC: parseFloat(existingBRC.document.totalTTC),
              };

        // Subtract existing pack contribution from stored totals when lines
        // not provided but pack lines are being replaced
        const existingPackTotal = existingBRC.packLines.reduce(
          (s, pl) => s + parseFloat(pl.quantity) * parseFloat(pl.prixVente),
          0,
        );

        const newPackTotal =
          normalizedPackLines !== null
            ? newPacksData.reduce((s, pd) => s + pd.quantity * pd.prixVente, 0)
            : existingPackTotal;

        // When only packLines are changed, article totals in DB still include
        // the OLD pack contribution — strip it out first.
        const baseArticleHT =
          normalizedLines !== null
            ? articleTotals.totalHT
            : parseFloat(existingBRC.document.totalHT) - existingPackTotal;
        const baseArticleTVA =
          normalizedLines !== null
            ? articleTotals.totalTVA
            : parseFloat(existingBRC.document.totalTVA);
        const baseArticleTTC =
          normalizedLines !== null
            ? articleTotals.totalTTC
            : parseFloat(existingBRC.document.totalTTC) - existingPackTotal;

        const finalTotalHT = parseFloat(
          (baseArticleHT + newPackTotal).toFixed(2),
        );
        const finalTotalTVA = parseFloat(baseArticleTVA.toFixed(2));
        const finalTotalTTC = parseFloat(
          (baseArticleTTC + newPackTotal).toFixed(2),
        );

        await tx.clientDocument.update({
          where: { id },
          data: {
            ...(clientId && { clientId }),
            ...(notes !== undefined && { notes }),
            totalHT: finalTotalHT,
            totalTVA: finalTotalTVA,
            totalTTC: finalTotalTTC,
            amountDue: finalTotalTTC,
          },
        });

        await tx.bonRetourClient.update({
          where: { id },
          data: {
            ...(documentDate && { documentDate: new Date(documentDate) }),
            ...(dateRetour !== undefined && {
              dateRetour: dateRetour ? new Date(dateRetour) : null,
            }),
            ...(depotId && { depotId }),
            ...(bonLivraisonId !== undefined && { bonLivraisonId }),
          },
        });

        return await tx.bonRetourClient.findUnique({
          where: { id },
          include: FULL_BRC_INCLUDE,
        });
      },
      { timeout: 30000 },
    );

    return {
      ...result,
      summary: {
        updateMode: "full",
        totalLines: result.document.lines.length,
        totalPackLines: result.packLines.length,
        linesCreated: linesToCreate.length,
        linesUpdated: linesToUpdate.length,
        linesDeleted: linesToDelete.length,
        packLinesCreated: packLinesToCreate.length,
        packLinesUpdated: packLinesToUpdate.length,
        packLinesDeleted: packLinesToDelete.length,
        totalHT: parseFloat(result.document.totalHT),
        totalTVA: parseFloat(result.document.totalTVA),
        totalTTC: parseFloat(result.document.totalTTC),
      },
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      `Failed to update bon retour client: ${error.message}`,
      500,
    );
  }
};

/* ============================================================
   DELETE BON RETOUR CLIENT

   If COMPLETED: reverse RETURN_IN stock transactions and
   financial reconciliation before deletion.
============================================================ */
export const remove = async (id, user) => {
  await timeRangeUtility.validateSystemHours(
    new Date(),
    "delete bon retour client",
  );

  const brc = await prisma.bonRetourClient.findUnique({
    where: { id },
    include: {
      document: {
        select: {
          societeId: true,
          clientId: true,
          status: true,
          totalTTC: true,
        },
      },
      stockTransactions: true,
    },
  });

  if (!brc) throw new ApiError("Bon retour client not found", 404);

  if (!user.isSuperAdmin && brc.document.societeId !== user.societeId) {
    throw new ApiError("Access denied", 403);
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        if (brc.document.status === "COMPLETED") {
          // Reverse all RETURN_IN stock levels — covers both article and pack
          // component transactions recorded against this BRC.
          const returnInTransactions = brc.stockTransactions.filter(
            (t) => t.transactionType === "RETURN_IN",
          );

          for (const t of returnInTransactions) {
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

          // Reverse financial reconciliation
          await reverseFinancialReconciliation(
            tx,
            brc.document.clientId,
            brc.document.societeId,
            brc.bonLivraisonId,
            parseFloat(brc.document.totalTTC),
          );
        }

        // Delete ALL stock transactions linked to this BRC — no orphans remain.
        await tx.stockTransaction.deleteMany({
          where: { bonRetourClientId: id },
        });
        await tx.clientDocumentLine.deleteMany({ where: { documentId: id } });
        await tx.bonRetourClient.delete({ where: { id } });
        await tx.clientDocument.delete({ where: { id } });
      },
      { timeout: 30000 },
    );

    return { message: "Bon retour client deleted successfully" };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      `Failed to delete bon retour client: ${error.message}`,
      500,
    );
  }
};

/* ============================================================
   GENERATE BON RETOUR CLIENT PDF
============================================================ */

const BRC_PDF_CONFIG = {
  title: "BON DE RETOUR CLIENT",
  clientLabel: "CLIENT",
  getSubLine: (brc) => {
    let line = `N°: ${brc.document.documentNumber}  |  Date: ${formatDate(brc.documentDate)}`;
    if (brc.dateRetour)
      line += `  |  Date retour: ${formatDate(brc.dateRetour)}`;
    return line;
  },
  getInfoBar: (brc) => {
    let text = `Dépôt: ${brc.depot.name} (${brc.depot.code})`;
    if (brc.bonLivraison)
      text += `  |  BL d'origine: ${brc.bonLivraison.document.documentNumber}`;
    if (brc.motifRetour) text += `  |  Motif: ${brc.motifRetour}`;
    return text;
  },
  signatureLeft: "Responsable retour",
  signatureRight: "Signature du client",
};

export const generateBonRetourClientPDF = async (id, user) => {
  const brc = await getById(id, user);
  return generateDocumentPDF(brc, BRC_PDF_CONFIG);
};
