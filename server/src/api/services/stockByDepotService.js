import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";
import ApiFeatures from "../utils/apiFeatures.js";
import { buildImageUrl } from "../utils/buildImageUrl.js";

/* ============================================================
   INTERNAL HELPERS
============================================================ */

/**
 * Resolve the target depot for a REGULAR user on CREATE.
 *
 * - depotId provided → validate it belongs to user's société
 * - depotId omitted  → fall back to the société's PRINCIPAL depot
 *
 * NOTE: Only called by create(). All other write paths either:
 *   a) use req.depot already injected by depotFilter middleware, or
 *   b) look up the existing stock record which already carries depotId.
 */
const resolveDepotForUser = async (depotId, user) => {
  if (depotId) {
    const depot = await prisma.depot.findUnique({
      where: { id: depotId },
      select: { id: true, societeId: true, active: true, name: true },
    });

    if (!depot) throw new ApiError("Depot not found", 404);
    if (!depot.active)
      throw new ApiError(`Depot "${depot.name}" is inactive`, 400);
    if (depot.societeId !== user.societeId) {
      throw new ApiError(
        "Access denied. This depot belongs to another société.",
        403,
      );
    }

    return depot;
  }

  // No depotId → default to the PRINCIPAL depot of the user's société
  const principalDepot = await prisma.depot.findFirst({
    where: { societeId: user.societeId, type: "PRINCIPAL", active: true },
    select: { id: true, societeId: true, active: true, name: true },
  });

  if (!principalDepot) {
    throw new ApiError(
      "No active PRINCIPAL depot found for your société. Please specify a depotId.",
      400,
    );
  }

  return principalDepot;
};

/**
 * Resolve depot for SUPER ADMIN on CREATE.
 * depotId is required — super admin must always be explicit.
 */
const resolveDepotForAdmin = async (depotId) => {
  if (!depotId) {
    throw new ApiError("depotId is required for Super Admin.", 400);
  }

  const depot = await prisma.depot.findUnique({
    where: { id: depotId },
    select: { id: true, societeId: true, active: true, name: true },
  });

  if (!depot) throw new ApiError("Depot not found", 404);
  if (!depot.active)
    throw new ApiError(`Depot "${depot.name}" is inactive`, 400);

  return depot;
};

/**
 * Merge a new OR condition into an existing where clause safely.
 *
 * If `where.OR` already exists (set by a previous filter), wraps both
 * in an AND so neither condition is silently overwritten.
 *
 * Examples:
 *   - First call  (no existing OR) → where.OR = newConditions
 *   - Second call (OR already set) → where.OR = [{ AND: [{ OR: existing }, { OR: new }] }]
 */
const mergeOrConditions = (where, newConditions) => {
  where.OR = where.OR
    ? [{ AND: [{ OR: where.OR }, { OR: newConditions }] }]
    : newConditions;
};

/**
 * Build the Prisma `where` clause for listing stock.
 *
 * Super Admin:
 *   - Sees all depots by default
 *   - ?depotId=X    → restrict to one depot
 *   - ?societeId=X  → restrict to one société
 *
 * Regular User:
 *   - Always scoped to own société's depots
 *   - depotId arg (pre-validated by depotFilter) restricts to one depot
 *
 * Filters:
 *   - ?articleId=X    → article rows with that id OR variant rows whose
 *                        parent article has that id
 *   - ?variantId=X    → restrict to one variant row (exact match)
 *   - ?familyId=X     → article rows in that family OR variant rows whose
 *                        parent article is in that family
 *   - ?outOfStock=true → quantityAvailable <= 0
 *   - ?lowStock=true   → alertThreshold > 0 && available <= threshold (JS post-filter)
 *
 * Query params consumed here are deleted to prevent ApiFeatures double-processing.
 */
const buildStockWhere = (query, user, depotId = null) => {
  const where = {};

  // ── Depot / Société scoping ──────────────────────────────────────────────
  if (user.isSuperAdmin) {
    if (depotId) {
      where.depotId = depotId;
    } else if (query.depotId) {
      where.depotId = parseInt(query.depotId);
      delete query.depotId;
    }
    if (query.societeId) {
      where.depot = { societeId: parseInt(query.societeId) };
      delete query.societeId;
    }
  } else {
    delete query.societeId;
    // Regular user: always scoped — prevent any override attempts
    if (query.depotId) {
      where.depotId = parseInt(query.depotId);
      delete query.depotId;
    }
    where.depot = depotId
      ? undefined // depotId filter set below
      : { societeId: user.societeId };

    if (depotId) where.depotId = depotId;
  }

  // ── articleId filter ─────────────────────────────────────────────────────
  // Matches both row types:
  //   - Article rows  → articleId column directly
  //   - Variant rows  → variant.articleId (parent article)
  if (query.articleId) {
    const articleId = parseInt(query.articleId);
    mergeOrConditions(where, [{ articleId }, { variant: { articleId } }]);
    delete query.articleId;
  }

  // ── variantId filter ─────────────────────────────────────────────────────
  // Exact match on the variant row — no OR needed here.
  if (query.variantId) {
    where.variantId = parseInt(query.variantId);
    delete query.variantId;
  }

  // ── familyId filter ──────────────────────────────────────────────────────
  // Matches both row types:
  //   - Article rows  → article.familyId
  //   - Variant rows  → variant → article → familyId
  if (query.familyId) {
    const familyId = parseInt(query.familyId);
    mergeOrConditions(where, [
      { article: { familyId } },
      { variant: { article: { familyId } } },
    ]);
    delete query.familyId;
  }

  // ── Stock level filters ──────────────────────────────────────────────────
  if (query.outOfStock === "true") {
    where.quantityAvailable = { lte: 0 };
    delete query.outOfStock;
  }

  // lowStock requires comparing two columns — handled in JS after the query
  const filterLowStock = query.lowStock === "true";
  delete query.lowStock;

  return { where, filterLowStock };
};

/** Standard Prisma includes reused across queries */
const STOCK_INCLUDES = {
  depot: {
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      societe: { select: { id: true, raisonSocial: true, logo: true } },
    },
  },
  article: {
    select: {
      id: true,
      barcode: true,
      name: true,
      unitePrincipale: { select: { id: true, name: true, symbol: true } },
    },
  },
  variant: {
    select: {
      id: true,
      barcode: true,
      name: true,
      variantAttributes: {
        include: {
          attribute: { select: { id: true, name: true } },
          attributeValue: { select: { id: true, value: true } },
        },
      },
    },
  },
};

/** Attach computed status flags to a raw stock record */
const withFlags = (s) => ({
  ...s,
  isLowStock:
    parseFloat(s.alertThreshold) > 0 &&
    parseFloat(s.quantityAvailable) <= parseFloat(s.alertThreshold),
  isOutOfStock: parseFloat(s.quantityAvailable) <= 0,
  totalQuantity:
    parseFloat(s.quantityAvailable) -
    parseFloat(s.quantityReserved) -
    parseFloat(s.quantityInTransit),
});

/** Parse and validate numeric fields in stock payloads */
const parseStockFields = (data) => {
  const result = { ...data };
  const floatFields = [
    "quantityAvailable",
    "quantityReserved",
    "quantityInTransit",
    "alertThreshold",
  ];

  for (const field of floatFields) {
    if (result[field] !== undefined) {
      result[field] = parseFloat(result[field]);
      if (isNaN(result[field]))
        throw new ApiError(`Invalid value for field "${field}"`, 400);
      if (result[field] < 0)
        throw new ApiError(`Field "${field}" cannot be negative`, 400);
    }
  }

  if (result.lastInventoryDate) {
    result.lastInventoryDate = new Date(result.lastInventoryDate);
  }

  return result;
};

/**
 * Build a human-readable display name for a variant row.
 * Format: "Article Name - Attr1: Val1 - Attr2: Val2"
 */
const buildVariantDisplayName = (articleName, variantAttributes = []) => {
  if (!variantAttributes.length) return articleName;
  const attrs = variantAttributes
    .map((va) => `${va.attributeValue.value}`)
    .join(" - ");
  return `${articleName} - ${attrs}`;
};

/* ============================================================
   GET ALL STOCK — UNIFIED PRODUCT LIST

   Business Rules:
     1. Article WITH variants  → return ONLY its variant rows (skip parent)
     2. Article WITHOUT variants → return the article row itself
     3. Stock quantities come from StockByDepot
     4. Variant display name = "Article Name - Attr: Val - ..."

   Why pagination is applied after JS filtering:
     DB-level pagination (skip/take) runs before we drop article rows that
     have variants. This would produce short pages. We fetch all matching
     rows first, apply the unified filter, then paginate the result set so
     every page contains exactly `take` items.

   Supported query params:
     depotId, societeId, articleId, variantId, familyId,
     outOfStock, lowStock, sort, page, limit
============================================================ */
export const getAll = async (query, user) => {
  const { where, filterLowStock } = buildStockWhere(query, user);

  // ── Fetch all matching rows (no skip/take yet — see note above) ──────────
  const rawStocks = await prisma.stockByDepot.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      depot: {
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          societe: {
            select: {
              id: true,
              raisonSocial: true,
              logo: true,
            },
          },
        },
      },
      article: {
        select: {
          id: true,
          barcode: true,
          name: true,
          familyId: true,
          // _count lets us know if this article has variants without a 2nd query
          _count: { select: { variants: true } },
          unitePrincipale: {
            select: { id: true, name: true, symbol: true },
          },
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
              barcode: true,
              name: true,
              familyId: true,
              unitePrincipale: {
                select: { id: true, name: true, symbol: true },
              },
            },
          },
          variantAttributes: {
            include: {
              attribute: { select: { id: true, name: true } },
              attributeValue: { select: { id: true, value: true } },
            },
          },
        },
      },
    },
  });

  // ── Apply unified product rules ──────────────────────────────────────────
  let stocks = rawStocks
    .filter((stock) => {
      // Variant rows are always kept (Rule 1 & 2)
      if (stock.variantId !== null) return true;
      // Article rows are kept only when the article has NO variants (Rule 2)
      return (stock.article?._count?.variants ?? 0) === 0;
    })
    .map((stock) => {
      const isVariantRow = stock.variantId !== null;

      // Resolve the "effective" article (direct or through variant parent)
      const effectiveArticle = isVariantRow
        ? stock.variant?.article
        : stock.article;

      // Build display name
      const displayName = isVariantRow
        ? buildVariantDisplayName(
            effectiveArticle?.name ?? "",
            stock.variant?.variantAttributes ?? [],
          )
        : (stock.article?.name ?? "");

      // Resolve barcode
      const barcode = isVariantRow
        ? (stock.variant?.barcode ?? null)
        : (stock.article?.barcode ?? null);

      // Strip internal _count helper before returning
      const { _count, ...articleWithoutCount } = stock.article ?? {};

      return {
        // ── Stock fields ───────────────────────────────────────────────
        id: stock.id,
        depotId: stock.depotId,
        articleId: stock.articleId,
        variantId: stock.variantId,
        quantityAvailable: stock.quantityAvailable,
        quantityReserved: stock.quantityReserved,
        quantityInTransit: stock.quantityInTransit,
        alertThreshold: stock.alertThreshold,
        location: stock.location,
        lastInventoryDate: stock.lastInventoryDate,
        createdAt: stock.createdAt,
        updatedAt: stock.updatedAt,

        // ── Depot (with transformed logo) ─────────────────────────────
        depot: stock.depot
          ? {
              ...stock.depot,
              societe: stock.depot.societe
                ? {
                    ...stock.depot.societe,
                    logo: stock.depot.societe.logo
                      ? buildImageUrl("societes", stock.depot.societe.logo)
                      : null,
                  }
                : null,
            }
          : null,

        // ── Unified product fields ─────────────────────────────────────
        productType: isVariantRow ? "variant" : "article",
        displayName,
        barcode,
        unitePrincipale: effectiveArticle?.unitePrincipale ?? null,
        familyId: effectiveArticle?.familyId ?? null,

        // ── Raw relations (kept for flexibility on the client side) ────
        article: stock.article ? articleWithoutCount : null,
        variant: stock.variant ?? null,
      };
    });

  // ── Low stock filter (column comparison → must be done in JS) ────────────
  if (filterLowStock) {
    stocks = stocks.filter(
      (s) =>
        parseFloat(s.alertThreshold) > 0 &&
        parseFloat(s.quantityAvailable) <= parseFloat(s.alertThreshold),
    );
  }

  // ── Paginate the unified, filtered list ──────────────────────────────────
  const count = stocks.length;
  const apiFeatures = new ApiFeatures(query).sort().paginate(count);
  const { skip, take } = apiFeatures.build();

  const paginated = stocks.slice(skip, skip + take);

  return {
    results: paginated.length,
    pagination: apiFeatures.paginationResult,
    data: paginated.map(withFlags),
  };
};

/* ============================================================
   GET STOCK BY ID
   Super Admin : any record
   Regular User: only own société's records
============================================================ */
export const getById = async (id, user) => {
  const stock = await prisma.stockByDepot.findUnique({
    where: { id },
    include: {
      depot: {
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          societeId: true, // needed for auth check below
          societe: { select: { id: true, raisonSocial: true } },
        },
      },
      article: STOCK_INCLUDES.article,
      variant: STOCK_INCLUDES.variant,
    },
  });

  if (!stock) throw new ApiError("Stock record not found", 404);

  if (!user.isSuperAdmin && stock.depot.societeId !== user.societeId) {
    throw new ApiError(
      "Access denied. This stock record belongs to another société.",
      403,
    );
  }

  return withFlags(stock);
};

/* ============================================================
   GET STOCK BY DEPOT
   depotFilter middleware runs before this and has already:
     ✅ validated depot exists
     ✅ checked it is active
     ✅ verified user has access (société ownership)
     ✅ injected req.depot

   Controller passes req.depot directly — no DB re-fetch needed.
============================================================ */
export const getByDepot = async (depot, user, query = {}) => {
  const { where, filterLowStock } = buildStockWhere(query, user, depot.id);

  const count = await prisma.stockByDepot.count({ where });

  const apiFeatures = new ApiFeatures(query).sort().paginate(count);
  const { orderBy, skip, take } = apiFeatures.build();

  let stocks = await prisma.stockByDepot.findMany({
    where,
    orderBy: orderBy || { updatedAt: "desc" },
    skip,
    take,
    include: {
      article: {
        select: {
          id: true,
          barcode: true,
          name: true,
          image: true,
          unitePrincipale: { select: { id: true, name: true, symbol: true } },
        },
      },
      variant: STOCK_INCLUDES.variant,
    },
  });

  if (filterLowStock) {
    stocks = stocks.filter(
      (s) =>
        parseFloat(s.alertThreshold) > 0 &&
        parseFloat(s.quantityAvailable) <= parseFloat(s.alertThreshold),
    );
  }

  return {
    depot: { id: depot.id, name: depot.name, code: depot.code },
    results: stocks.length,
    pagination: apiFeatures.paginationResult,
    data: stocks.map((s) => ({
      ...s,
      isLowStock:
        parseFloat(s.alertThreshold) > 0 &&
        parseFloat(s.quantityAvailable) <= parseFloat(s.alertThreshold),
      isOutOfStock: parseFloat(s.quantityAvailable) <= 0,
    })),
  };
};

/* ============================================================
   GET STOCK BY ARTICLE (across all accessible depots)
   Super Admin : all depots globally
   Regular User: only own société's depots
============================================================ */
export const getByArticle = async (articleId, user) => {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { id: true, barcode: true, name: true },
  });

  if (!article) throw new ApiError("Article not found", 404);

  const depotWhere = user.isSuperAdmin ? {} : { societeId: user.societeId };

  let stocks = await prisma.stockByDepot.findMany({
    where: { articleId, depot: depotWhere },
    include: {
      depot: {
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          societe: {
            select: {
              id: true,
              raisonSocial: true,
              logo: true,
            },
          },
        },
      },
    },
    orderBy: { depot: { name: "asc" } },
  });

  stocks = stocks.map((stock) => ({
    ...stock,
    depot: stock.depot
      ? {
          ...stock.depot,
          societe: stock.depot.societe
            ? {
                ...stock.depot.societe,
                logo: stock.depot.societe.logo
                  ? buildImageUrl("societes", stock.depot.societe.logo)
                  : null,
              }
            : null,
        }
      : null,
  }));

  return {
    article,
    summary: {
      totalAvailable: stocks.reduce(
        (s, r) => s + parseFloat(r.quantityAvailable),
        0,
      ),
      totalReserved: stocks.reduce(
        (s, r) => s + parseFloat(r.quantityReserved),
        0,
      ),
      totalInTransit: stocks.reduce(
        (s, r) => s + parseFloat(r.quantityInTransit),
        0,
      ),
      depotCount: stocks.length,
    },
    data: stocks.map(withFlags),
  };
};

/* ============================================================
   GET STOCK BY VARIANT (across all accessible depots)
   Super Admin : all depots globally
   Regular User: only own société's depots

   Mirrors getByArticle exactly — scoped to variantId instead.
   Includes the variant's full attribute list so the caller knows
   which colour / size / etc. they are looking at.
============================================================ */
export const getByVariant = async (variantId, user) => {
  const variant = await prisma.articleVariant.findUnique({
    where: { id: variantId },
    select: {
      id: true,
      barcode: true,
      name: true,
      article: {
        select: { id: true, barcode: true, name: true },
      },
      variantAttributes: {
        include: {
          attribute: { select: { id: true, name: true } },
          attributeValue: { select: { id: true, value: true } },
        },
      },
    },
  });

  if (!variant) throw new ApiError("Variant not found", 404);

  const depotWhere = user.isSuperAdmin ? {} : { societeId: user.societeId };

  let stocks = await prisma.stockByDepot.findMany({
    where: { variantId, depot: depotWhere },
    include: {
      depot: {
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          societe: {
            select: {
              id: true,
              raisonSocial: true,
              logo: true,
            },
          },
        },
      },
    },
    orderBy: { depot: { name: "asc" } },
  });

  stocks = stocks.map((stock) => ({
    ...stock,
    depot: stock.depot
      ? {
          ...stock.depot,
          societe: stock.depot.societe
            ? {
                ...stock.depot.societe,
                logo: stock.depot.societe.logo
                  ? buildImageUrl("societes", stock.depot.societe.logo)
                  : null,
              }
            : null,
        }
      : null,
  }));

  return {
    variant,
    summary: {
      totalAvailable: stocks.reduce(
        (s, r) => s + parseFloat(r.quantityAvailable),
        0,
      ),
      totalReserved: stocks.reduce(
        (s, r) => s + parseFloat(r.quantityReserved),
        0,
      ),
      totalInTransit: stocks.reduce(
        (s, r) => s + parseFloat(r.quantityInTransit),
        0,
      ),
      depotCount: stocks.length,
    },
    data: stocks.map(withFlags),
  };
};

/* ============================================================
   HELPER: Resolve or create the initial inventory for a depot.
   One initial inventory per depot — created on the first stock entry,
   reused (appended) for all subsequent entries in the same depot.

   Number format: INIT-INV-{YEAR}-{XXXX}  (mirrors generateInventoryNumber)
   The sequence is per-société, per-year, counting only INIT-INV-* rows.
============================================================ */
const resolveOrCreateInitialInventory = async (
  tx,
  depotId,
  societeId,
  userId,
) => {
  // Return the existing initial inventory for this depot if already created
  const existing = await tx.inventory.findFirst({
    where: {
      depotId,
      societeId,
      inventoryNumber: { startsWith: "INIT-INV-" },
    },
    select: { id: true, inventoryNumber: true },
  });

  if (existing) return existing;

  // Generate the next INIT-INV-{YEAR}-{XXXX} number for this société
  const year = new Date().getFullYear();
  const prefix = `INIT-INV-${year}`;

  const last = await tx.inventory.findFirst({
    where: { societeId, inventoryNumber: { startsWith: prefix } },
    orderBy: { inventoryNumber: "desc" },
    select: { inventoryNumber: true },
  });

  const nextSeq = last
    ? parseInt(last.inventoryNumber.split("-").at(-1)) + 1
    : 1;

  const inventoryNumber = `${prefix}-${String(nextSeq).padStart(4, "0")}`;

  return tx.inventory.create({
    data: {
      societeId,
      depotId,
      inventoryNumber,
      inventoryDate: new Date(),
      notes: "Initial stock inventory — auto-generated",
      createdBy: userId,
      validatedBy: userId,
      validatedAt: new Date(),
    },
    select: { id: true, inventoryNumber: true },
  });
};

/* ============================================================
   HELPER: Fetch prixAchat for an article or a variant's parent article.
============================================================ */
const fetchPrixAchat = async (tx, articleId, variantId) => {
  if (articleId) {
    const article = await tx.article.findUnique({
      where: { id: articleId },
      select: { prixAchat: true },
    });
    return article ? parseFloat(article.prixAchat) : 0;
  }
  if (variantId) {
    const variant = await tx.articleVariant.findUnique({
      where: { id: variantId },
      include: { article: { select: { prixAchat: true } } },
    });
    return variant?.article ? parseFloat(variant.article.prixAchat) : 0;
  }
  return 0;
};

/* ============================================================
   CREATE STOCK ENTRY
   Super Admin : depotId REQUIRED — can target any depot
   Regular User: depotId optional — defaults to PRINCIPAL depot of own société

   Side-effects (atomic in same transaction):
   • Appends a line to the depot's initial inventory (creates it if absent)
   • Increments the inventory gap by prixAchat × quantityAvailable
   • Writes an INBOUND StockTransaction linked to that inventory
============================================================ */
export const create = async (data, user) => {
  const { articleId, variantId, depotId, ...stockData } = data;

  const depot = user.isSuperAdmin
    ? await resolveDepotForAdmin(depotId)
    : await resolveDepotForUser(depotId, user);

  // Unique: (depotId + articleId) or (depotId + variantId)
  const existing = await prisma.stockByDepot.findFirst({
    where: articleId
      ? { depotId: depot.id, articleId }
      : { depotId: depot.id, variantId },
  });

  if (existing) {
    throw new ApiError(
      `A stock entry already exists for this ${articleId ? "article" : "variant"} ` +
        `in depot "${depot.name}". Use PUT /stock/${existing.id} to update it.`,
      409,
    );
  }

  const parsedData = parseStockFields(stockData);
  const quantityAvailable = parsedData.quantityAvailable ?? 0;

  return prisma.$transaction(async (tx) => {
    // 1. Create the stock entry
    const stock = await tx.stockByDepot.create({
      data: {
        depotId: depot.id,
        articleId: articleId || null,
        variantId: variantId || null,
        ...parsedData,
      },
      include: STOCK_INCLUDES,
    });

    // 2. Find or create the initial inventory for this depot
    const inventory = await resolveOrCreateInitialInventory(
      tx,
      depot.id,
      depot.societeId,
      user.id,
    );

    // 2b. Increment inventory gap: prixAchat × quantityAvailable
    //     Works for both new (gap=0 → contribution) and existing (gap+=contribution).
    const prixAchat = await fetchPrixAchat(tx, articleId, variantId);
    const gapContribution = parseFloat(
      (prixAchat * quantityAvailable).toFixed(2),
    );
    await tx.inventory.update({
      where: { id: inventory.id },
      data: { gap: { increment: gapContribution } },
    });

    // 3. Next line number (max + 1, or 1 if no lines yet)
    const agg = await tx.inventoryLine.aggregate({
      where: { inventoryId: inventory.id },
      _max: { lineNumber: true },
    });
    const lineNumber = (agg._max.lineNumber ?? 0) + 1;

    // 4. Inventory line — quantityTheoretical = 0 for initial entries
    await tx.inventoryLine.create({
      data: {
        inventoryId: inventory.id,
        articleId: articleId || null,
        variantId: variantId || null,
        lineNumber,
        quantityTheoretical: 0,
        quantityCounted: quantityAvailable,
        quantityDifference: quantityAvailable,
      },
    });

    // 5. INBOUND stock transaction linked to the initial inventory
    await tx.stockTransaction.create({
      data: {
        depotId: depot.id,
        articleId: articleId || null,
        variantId: variantId || null,
        quantityChange: quantityAvailable,
        quantityAfter: quantityAvailable,
        transactionType: "ADJUSTMENT",
        referenceId: inventory.inventoryNumber,
        reason: "Initial stock entry",
        createdBy: user.id,
        inventoryId: inventory.id,
      },
    });

    return stock;
  });
};

/* ============================================================
   CREATE BULK (Super Admin only)
   superAdminOnly middleware already enforces access before this runs.
   The guard here is a defensive safety net only.
============================================================ */
export const createBulk = async (entries, user) => {
  const results = [];
  const errors = [];

  for (let i = 0; i < entries.length; i++) {
    try {
      const stock = await create(entries[i], user);
      results.push({ index: i, success: true, data: stock });
    } catch (err) {
      errors.push({ index: i, success: false, error: err.message });
    }
  }

  return { created: results.length, failed: errors.length, results, errors };
};

/* ============================================================
   UPDATE STOCK ENTRY
   Super Admin : any record
   Regular User: only own société's records
   articleId / variantId / depotId are immutable (validator also enforces this)

   When quantityAvailable changes, the related initial inventory line
   and its INBOUND StockTransaction are updated in the same transaction.
============================================================ */
export const update = async (id, data, user) => {
  const existing = await prisma.stockByDepot.findUnique({
    where: { id },
    include: {
      depot: {
        select: { id: true, societeId: true, name: true, active: true },
      },
    },
  });

  if (!existing) throw new ApiError("Stock record not found", 404);

  if (!user.isSuperAdmin && existing.depot.societeId !== user.societeId) {
    throw new ApiError(
      "Access denied. This stock record belongs to another société.",
      403,
    );
  }

  if (!existing.depot.active) {
    throw new ApiError(`Depot "${existing.depot.name}" is inactive.`, 400);
  }

  // Strip immutable fields — validator already rejects them, this is a safety net
  const { articleId, variantId, depotId, ...updateData } = data;
  const parsedData = parseStockFields(updateData);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.stockByDepot.update({
      where: { id },
      data: parsedData,
      include: STOCK_INCLUDES,
    });

    // Sync initial inventory line and INBOUND transaction when quantity changes
    if (parsedData.quantityAvailable !== undefined) {
      const qty = parsedData.quantityAvailable;
      const productWhere = existing.articleId
        ? { articleId: existing.articleId }
        : { variantId: existing.variantId };

      const inventory = await tx.inventory.findFirst({
        where: {
          depotId: existing.depot.id,
          societeId: existing.depot.societeId,
          inventoryNumber: { startsWith: "INIT-INV-" },
        },
        select: { id: true },
      });

      if (inventory) {
        await tx.inventoryLine.updateMany({
          where: { inventoryId: inventory.id, ...productWhere },
          data: { quantityCounted: qty, quantityDifference: qty },
        });

        await tx.stockTransaction.updateMany({
          where: {
            inventoryId: inventory.id,
            transactionType: "ADJUSTMENT",
            ...productWhere,
          },
          data: { quantityChange: qty },
        });
      }
    }

    return updated;
  });
};

/* ============================================================
   DELETE STOCK ENTRY
   Safety: refuses deletion if any quantity is non-zero.

   Also removes the related initial inventory line and its INBOUND
   StockTransaction atomically — no orphaned records remain.
============================================================ */
export const remove = async (id, user) => {
  const existing = await prisma.stockByDepot.findUnique({
    where: { id },
    include: {
      depot: { select: { id: true, societeId: true, name: true } },
    },
  });

  if (!existing) throw new ApiError("Stock record not found", 404);

  if (!user.isSuperAdmin && existing.depot.societeId !== user.societeId) {
    throw new ApiError(
      "Access denied. This stock record belongs to another société.",
      403,
    );
  }

  if (
    parseFloat(existing.quantityAvailable) > 0 ||
    parseFloat(existing.quantityReserved) > 0 ||
    parseFloat(existing.quantityInTransit) > 0
  ) {
    throw new ApiError(
      "Cannot delete a stock record with non-zero quantities. Zero out the stock first.",
      400,
    );
  }

  return prisma.$transaction(async (tx) => {
    const productWhere = existing.articleId
      ? { articleId: existing.articleId }
      : { variantId: existing.variantId };

    // Find the initial inventory and clean up its line + transaction
    const inventory = await tx.inventory.findFirst({
      where: {
        depotId: existing.depotId,
        societeId: existing.depot.societeId,
        inventoryNumber: { startsWith: "INIT-INV-" },
      },
      select: { id: true },
    });

    if (inventory) {
      await tx.inventoryLine.deleteMany({
        where: { inventoryId: inventory.id, ...productWhere },
      });

      await tx.stockTransaction.deleteMany({
        where: {
          inventoryId: inventory.id,
          transactionType: "ADJUSTMENT",
          ...productWhere,
        },
      });
    }

    return tx.stockByDepot.delete({ where: { id } });
  });
};

/* ============================================================
   STATISTICS
   Super Admin : global stats | optional ?societeId filter
   Regular User: own société only

   FIX: lowStock previously used prisma.stockByDepot.fields.reorderPoint as a
   literal WHERE value — that is a Prisma metadata object and crashes at runtime.
   Now: fetch records with reorderPoint > 0 and compare columns in JS.
============================================================ */
export const getStatistics = async (user, query = {}) => {
  const depotWhere = user.isSuperAdmin
    ? query.societeId
      ? { societeId: parseInt(query.societeId) }
      : {}
    : { societeId: user.societeId };

  const stockWhere = { depot: depotWhere };

  const [totalEntries, outOfStock, aggregated, candidatesForLowStock] =
    await Promise.all([
      prisma.stockByDepot.count({ where: stockWhere }),

      prisma.stockByDepot.count({
        where: { ...stockWhere, quantityAvailable: { lte: 0 } },
      }),

      prisma.stockByDepot.aggregate({
        where: stockWhere,
        _sum: {
          quantityAvailable: true,
          quantityReserved: true,
          quantityInTransit: true,
        },
      }),

      // Fetch records with a reorderPoint set so we can compare two columns in JS
      // (Prisma WHERE cannot compare two columns from the same row without $queryRaw)
      prisma.stockByDepot.findMany({
        where: { ...stockWhere, alertThreshold: { gt: 0 } },
        select: { quantityAvailable: true, alertThreshold: true },
      }),
    ]);

  const lowStock = candidatesForLowStock.filter(
    (s) => parseFloat(s.quantityAvailable) <= parseFloat(s.alertThreshold),
  ).length;

  const topStocked = await prisma.stockByDepot.findMany({
    where: { ...stockWhere, articleId: { not: null } },
    orderBy: { quantityAvailable: "desc" },
    take: 5,
    include: {
      article: { select: { id: true, barcode: true, name: true } },
      depot: { select: { id: true, name: true } },
    },
  });

  return {
    totalEntries,
    outOfStock,
    lowStock,
    totals: {
      available: parseFloat(aggregated._sum.quantityAvailable || 0),
      reserved: parseFloat(aggregated._sum.quantityReserved || 0),
      inTransit: parseFloat(aggregated._sum.quantityInTransit || 0),
    },
    topStocked,
  };
};
