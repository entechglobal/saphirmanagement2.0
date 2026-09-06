import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";

const PACK_INCLUDE = {
  components: {
    select: {
      id: true,
      quantity: true,
      priceField: true,
      article: {
        select: {
          id: true,
          barcode: true,
          name: true,
          prixAchat: true,
          prixVente1: true,
          prixVente2: true,
          prixVente3: true,
          gereEnStock: true,
          // unitePrincipale: { select: { id: true, name: true, symbol: true } },
          // family: { select: { id: true, name: true, TVA: true } },
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
              prixAchat: true,
              prixVente1: true,
              prixVente2: true,
              prixVente3: true,
              gereEnStock: true,
              // family: { select: { id: true, name: true, TVA: true } },
            },
          },
        },
      },
    },
    orderBy: { id: "asc" },
  },
};

export const getAll = async (query, societeId, user) => {
  const { search, active, page = 1, limit = 5 } = query;

  const where = {
    ...(user.isSuperAdmin ? {} : { societeId }),
    ...(active !== undefined && { active: active === "true" }),
    ...(search && {
      OR: [{ name: { contains: search } }, { barcode: { contains: search } }],
    }),
  };

  const [total, packs] = await Promise.all([
    prisma.pack.count({ where }),
    prisma.pack.findMany({
      where,
      // include: PACK_INCLUDE,
      orderBy: { name: "asc" },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    }),
  ]);

  return {
    data: packs,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
};

export const getById = async (id, societeId, user) => {
  const where = user.isSuperAdmin ? { id } : { id, societeId };
  const pack = await prisma.pack.findFirst({
    where,
    include: PACK_INCLUDE,
  });
  if (!pack) throw new ApiError("Pack not found", 404);
  return pack;
};

export const create = async (data, societeId, user) => {
  const {
    barcode,
    name,
    components,
    prixVentePack,
    coutRevient,
    tauxMarge,
    montantVenteArticles,
    remise = 0,
    commission = 0,
  } = data;

  if (user.isSuperAdmin && !societeId) {
    throw new ApiError("societeId is required", 400);
  }

  // ── Component validation ────────────────────────────────────────
  if (!Array.isArray(components) || components.length === 0) {
    throw new ApiError("At least one component is required", 400);
  }

  const VALID_PRICE_FIELDS = ["prixVente1", "prixVente2", "prixVente3"];

  for (let i = 0; i < components.length; i++) {
    const c = components[i];
    if (!c.articleId && !c.variantId) {
      throw new ApiError(
        `Component ${i + 1}: either articleId or variantId is required`,
        400,
      );
    }
    if (c.articleId && c.variantId) {
      throw new ApiError(
        `Component ${i + 1}: provide either articleId OR variantId, not both`,
        400,
      );
    }
    if (!c.priceField || !VALID_PRICE_FIELDS.includes(c.priceField)) {
      throw new ApiError(
        `Component ${i + 1}: priceField must be prixVente1, prixVente2, or prixVente3`,
        400,
      );
    }
    if (!c.quantity || parseFloat(c.quantity) <= 0) {
      throw new ApiError(`Component ${i + 1}: quantity must be > 0`, 400);
    }
  }

  // ── Barcode uniqueness ──────────────────────────────────────────
  const existing = await prisma.pack.findUnique({ where: { barcode } });
  if (existing) throw new ApiError("Barcode already exists", 409);

  // ── Resolve component articles and compute server-side totals ───
  // coutRevient and montantVenteArticles MUST be recomputed from the
  // component prices — client-provided values are compared and rejected
  // on mismatch to prevent tampered input.
  let serverCoutRevient = 0;
  let serverMontantVente = 0;

  for (let i = 0; i < components.length; i++) {
    const c = components[i];
    const qty = parseFloat(c.quantity);

    let article;
    if (c.articleId) {
      article = await prisma.article.findUnique({
        where: { id: c.articleId },
        select: {
          id: true,
          prixAchat: true,
          prixVente1: true,
          prixVente2: true,
          prixVente3: true,
        },
      });
      if (!article)
        throw new ApiError(
          `Component ${i + 1}: article ${c.articleId} not found`,
          404,
        );
    } else {
      const variant = await prisma.articleVariant.findUnique({
        where: { id: c.variantId },
        select: {
          article: {
            select: {
              id: true,
              prixAchat: true,
              prixVente1: true,
              prixVente2: true,
              prixVente3: true,
            },
          },
        },
      });
      if (!variant)
        throw new ApiError(
          `Component ${i + 1}: variant ${c.variantId} not found`,
          404,
        );
      article = variant.article;
    }

    serverCoutRevient += parseFloat(article.prixAchat || 0) * qty;
    serverMontantVente += parseFloat(article[c.priceField] || 0) * qty;
  }

  serverCoutRevient = parseFloat(serverCoutRevient.toFixed(2));
  serverMontantVente = parseFloat(serverMontantVente.toFixed(2));
  const TOLERANCE = 0.01;

  // Reject if client-provided values don't match server computation
  if (coutRevient !== undefined) {
    const clientCout = parseFloat(parseFloat(coutRevient).toFixed(2));
    if (Math.abs(clientCout - serverCoutRevient) > TOLERANCE) {
      throw new ApiError(
        `coutRevient mismatch: provided ${clientCout}, computed ${serverCoutRevient}`,
        400,
      );
    }
  }
  if (montantVenteArticles !== undefined) {
    const clientMontant = parseFloat(
      parseFloat(montantVenteArticles).toFixed(2),
    );
    if (Math.abs(clientMontant - serverMontantVente) > TOLERANCE) {
      throw new ApiError(
        `montantVenteArticles mismatch: provided ${clientMontant}, computed ${serverMontantVente}`,
        400,
      );
    }
  }

  // ── Pricing strategy detection ──────────────────────────────────
  // strategy 1 (cost-based)     → store coutRevient, zero montantVenteArticles
  // strategy 2 (discount-based) → store montantVenteArticles, zero coutRevient
  // strategy 3 (manual)         → both zero; prixVentePack taken as-is
  let computedPrixVentePack;
  let finalTauxMarge = 0;
  let finalRemise = 0;
  let strategy; // "cost" | "discount" | "manual"

  if (tauxMarge !== undefined) {
    strategy = "cost";
    const marge = parseFloat(tauxMarge);
    if (marge < 0) throw new ApiError("tauxMarge must be >= 0", 400);
    computedPrixVentePack = parseFloat(
      (serverCoutRevient + serverCoutRevient * (marge / 100)).toFixed(2),
    );
    finalTauxMarge = marge;
  } else if (montantVenteArticles !== undefined || remise) {
    strategy = "discount";
    const disc = parseFloat(remise || 0);
    if (disc < 0) throw new ApiError("remise must be >= 0", 400);
    if (disc > serverMontantVente)
      throw new ApiError("remise cannot exceed montantVenteArticles", 400);
    computedPrixVentePack = parseFloat(
      (serverMontantVente - (serverMontantVente * disc) / 100).toFixed(2),
    );
    if (computedPrixVentePack < serverCoutRevient) {
      throw new ApiError(
        "Pack price is less than the total purchase price of its components.",
        400,
      );
    }
    finalRemise = disc;
  } else if (prixVentePack !== undefined) {
    strategy = "manual";
    const prix = parseFloat(prixVentePack);
    if (prix < serverCoutRevient) {
      throw new ApiError(
        "Pack price is less than the total purchase price of its components.",
        400,
      );
    }
    computedPrixVentePack = prix;
  } else {
    throw new ApiError(
      "Provide one pricing strategy: tauxMarge (cost-based), remise (discount-based), or prixVentePack (manual).",
      400,
    );
  }

  return prisma.pack.create({
    data: {
      societeId,
      barcode,
      name,
      purchasePrice: serverCoutRevient,
      coutRevient: strategy === "cost" ? serverCoutRevient : 0,
      tauxMarge: finalTauxMarge,
      montantVenteArticles: strategy === "discount" ? serverMontantVente : 0,
      remise: finalRemise,
      prixVentePack: computedPrixVentePack,
      commission: parseFloat(commission) || 0,
      components: {
        create: components.map((c) => ({
          articleId: c.articleId || null,
          variantId: c.variantId || null,
          quantity: parseFloat(c.quantity),
          priceField: c.priceField,
        })),
      },
    },
    include: PACK_INCLUDE,
  });
};

export const update = async (id, data, societeId, user) => {
  const where = user.isSuperAdmin ? { id } : { id, societeId };
  const pack = await prisma.pack.findFirst({
    where,
    include: {
      components: {
        include: { article: true, variant: { include: { article: true } } },
      },
    },
  });
  if (!pack) throw new ApiError("Pack not found", 404);

  const {
    barcode,
    name,
    active,
    components,
    prixVentePack,
    coutRevient,
    tauxMarge,
    montantVenteArticles,
    remise,
    commission,
  } = data;

  // ── Barcode uniqueness ──────────────────────────────────────────
  if (barcode && barcode !== pack.barcode) {
    const existing = await prisma.pack.findUnique({ where: { barcode } });
    if (existing) throw new ApiError("Barcode already exists", 409);
  }

  const VALID_PRICE_FIELDS = ["prixVente1", "prixVente2", "prixVente3"];
  const componentsUpdated = Array.isArray(components);

  // ── Component validation (when provided) ────────────────────────
  if (componentsUpdated) {
    if (components.length === 0)
      throw new ApiError("At least one component is required", 400);

    for (let i = 0; i < components.length; i++) {
      const c = components[i];
      if (!c.articleId && !c.variantId)
        throw new ApiError(
          `Component ${i + 1}: either articleId or variantId is required`,
          400,
        );
      if (c.articleId && c.variantId)
        throw new ApiError(
          `Component ${i + 1}: provide either articleId OR variantId, not both`,
          400,
        );
      if (!c.priceField || !VALID_PRICE_FIELDS.includes(c.priceField))
        throw new ApiError(
          `Component ${i + 1}: priceField must be prixVente1, prixVente2, or prixVente3`,
          400,
        );
      if (!c.quantity || parseFloat(c.quantity) <= 0)
        throw new ApiError(`Component ${i + 1}: quantity must be > 0`, 400);
    }
  }

  // ── Recompute totals ────────────────────────────────────────────
  // If components changed → recompute from new components via DB lookup.
  // If components unchanged → use the stored validated totals.
  let serverCoutRevient;
  let serverMontantVente;

  if (componentsUpdated) {
    let sumCout = 0;
    let sumVente = 0;

    // Build a lookup of stored components by articleId/variantId so we can
    // fall back to the stored priceField when the caller doesn't supply one.
    const storedByKey = {};
    for (const sc of pack.components) {
      const key = sc.articleId ? `a_${sc.articleId}` : `v_${sc.variantId}`;
      storedByKey[key] = sc;
    }

    for (let i = 0; i < components.length; i++) {
      const c = components[i];
      const qty = parseFloat(c.quantity);
      const key = c.articleId ? `a_${c.articleId}` : `v_${c.variantId}`;

      // priceField: use the one from the body; fall back to stored; default to prixVente1
      const effectivePriceField =
        c.priceField || storedByKey[key]?.priceField || "prixVente1";

      if (!VALID_PRICE_FIELDS.includes(effectivePriceField)) {
        throw new ApiError(
          `Component ${i + 1}: priceField must be prixVente1, prixVente2, or prixVente3`,
          400,
        );
      }

      // Attach resolved priceField back for createMany step below
      c._resolvedPriceField = effectivePriceField;

      let article;
      if (c.articleId) {
        article = await prisma.article.findUnique({
          where: { id: c.articleId },
          select: {
            id: true,
            prixAchat: true,
            prixVente1: true,
            prixVente2: true,
            prixVente3: true,
          },
        });
        if (!article)
          throw new ApiError(
            `Component ${i + 1}: article ${c.articleId} not found`,
            404,
          );
      } else {
        const variant = await prisma.articleVariant.findUnique({
          where: { id: c.variantId },
          select: {
            article: {
              select: {
                id: true,
                prixAchat: true,
                prixVente1: true,
                prixVente2: true,
                prixVente3: true,
              },
            },
          },
        });
        if (!variant)
          throw new ApiError(
            `Component ${i + 1}: variant ${c.variantId} not found`,
            404,
          );
        article = variant.article;
      }

      sumCout += parseFloat(article.prixAchat || 0) * qty;
      sumVente += parseFloat(article[effectivePriceField] || 0) * qty;
    }

    serverCoutRevient = parseFloat(sumCout.toFixed(2));
    serverMontantVente = parseFloat(sumVente.toFixed(2));
  } else {
    serverCoutRevient = parseFloat(pack.coutRevient);
    serverMontantVente = parseFloat(pack.montantVenteArticles);
  }

  // ── Validate client-provided totals if sent ─────────────────────
  const TOLERANCE = 0.01;
  if (coutRevient !== undefined) {
    const clientCout = parseFloat(parseFloat(coutRevient).toFixed(2));
    if (Math.abs(clientCout - serverCoutRevient) > TOLERANCE)
      throw new ApiError(
        `coutRevient mismatch: provided ${clientCout}, computed ${serverCoutRevient}`,
        400,
      );
  }
  if (montantVenteArticles !== undefined) {
    const clientMontant = parseFloat(
      parseFloat(montantVenteArticles).toFixed(2),
    );
    if (Math.abs(clientMontant - serverMontantVente) > TOLERANCE)
      throw new ApiError(
        `montantVenteArticles mismatch: provided ${clientMontant}, computed ${serverMontantVente}`,
        400,
      );
  }

  // ── Pricing strategy ─────────────────────────────────────────────
  // Detect from body first; fall back to existing pack strategy.
  let finalPrixVentePack;
  let finalTauxMarge;
  let finalRemise;

  let updateStrategy; // "cost" | "discount" | "manual"

  if (tauxMarge !== undefined) {
    updateStrategy = "cost";
    const marge = parseFloat(tauxMarge);
    if (marge < 0) throw new ApiError("tauxMarge must be >= 0", 400);
    finalPrixVentePack = parseFloat(
      (serverCoutRevient + serverCoutRevient * (marge / 100)).toFixed(2),
    );
    finalTauxMarge = marge;
    finalRemise = 0;
  } else if (remise !== undefined || montantVenteArticles !== undefined) {
    updateStrategy = "discount";
    const disc = parseFloat(remise ?? pack.remise ?? 0);
    if (disc < 0) throw new ApiError("remise must be >= 0", 400);
    if (disc > serverMontantVente)
      throw new ApiError("remise cannot exceed montantVenteArticles", 400);
    finalPrixVentePack = parseFloat(
      (serverMontantVente - (serverMontantVente * disc) / 100).toFixed(2),
    );
    if (finalPrixVentePack < serverCoutRevient) {
      throw new ApiError(
        "Pack price is less than the total purchase price of its components.",
        400,
      );
    }
    finalRemise = disc;
    finalTauxMarge = 0;
  } else if (prixVentePack !== undefined) {
    updateStrategy = "manual";
    const prix = parseFloat(prixVentePack);
    if (prix <= 0) throw new ApiError("prixVentePack must be > 0", 400);
    if (prix < serverCoutRevient) {
      throw new ApiError(
        "Pack price is less than the total purchase price of its components.",
        400,
      );
    }
    finalPrixVentePack = prix;
    finalTauxMarge = 0;
    finalRemise = 0;
  } else {
    // Reapply existing strategy with updated totals
    const storedTauxMarge = parseFloat(pack.tauxMarge);
    const storedRemise = parseFloat(pack.remise);

    if (storedTauxMarge > 0) {
      updateStrategy = "cost";
      finalPrixVentePack = parseFloat(
        (
          serverCoutRevient +
          serverCoutRevient * (storedTauxMarge / 100)
        ).toFixed(2),
      );
      finalTauxMarge = storedTauxMarge;
      finalRemise = 0;
    } else if (storedRemise > 0) {
      updateStrategy = "discount";
      finalPrixVentePack = parseFloat(
        (serverMontantVente - storedRemise).toFixed(2),
      );
      if (finalPrixVentePack < serverCoutRevient) {
        throw new ApiError(
          "Pack price is less than the total purchase price of its components.",
          400,
        );
      }
      finalTauxMarge = 0;
      finalRemise = storedRemise;
    } else {
      updateStrategy = "manual";
      finalPrixVentePack = parseFloat(pack.prixVentePack);
      if (finalPrixVentePack < serverCoutRevient) {
        throw new ApiError(
          "Pack price is less than the total purchase price of its components.",
          400,
        );
      }
      finalTauxMarge = 0;
      finalRemise = 0;
    }
  }

  // ── Persist ──────────────────────────────────────────────────────
  return prisma.$transaction(async (tx) => {
    await tx.pack.update({
      where: { id },
      data: {
        ...(barcode && { barcode }),
        ...(name && { name }),
        ...(active !== undefined && { active }),
        ...(commission !== undefined && {
          commission: parseFloat(commission) || 0,
        }),
        purchasePrice: serverCoutRevient,
        coutRevient: updateStrategy === "cost" ? serverCoutRevient : 0,
        tauxMarge: finalTauxMarge,
        montantVenteArticles:
          updateStrategy === "discount" ? serverMontantVente : 0,
        remise: finalRemise,
        prixVentePack: finalPrixVentePack,
      },
    });

    if (componentsUpdated) {
      await tx.packComponent.deleteMany({ where: { packId: id } });
      await tx.packComponent.createMany({
        data: components.map((c) => ({
          packId: id,
          articleId: c.articleId || null,
          variantId: c.variantId || null,
          quantity: parseFloat(c.quantity),
          priceField: c._resolvedPriceField,
        })),
      });
    }

    return tx.pack.findUnique({ where: { id }, include: PACK_INCLUDE });
  });
};

export const remove = async (id, societeId, user) => {
  const where = user.isSuperAdmin ? { id } : { id, societeId };
  const pack = await prisma.pack.findFirst({
    where,
    include: { _count: { select: { packLines: true } } },
  });
  if (!pack) throw new ApiError("Pack not found", 404);

  if (pack._count.packLines > 0) {
    throw new ApiError(
      "Cannot delete pack used in bon livraisons. Deactivate it instead.",
      400,
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.packComponent.deleteMany({ where: { packId: id } });
    await tx.pack.delete({ where: { id } });
  });

  return { message: "Pack deleted successfully" };
};

/* ============================================================
   CHECK PACK STOCK AVAILABILITY

   Accepts an array of packIds and a depotId.
   For each pack, verifies that every stock-managed component
   has sufficient quantityAvailable in the depot.

   Returns:
   {
     depotId, depotName,
     allAvailable: boolean,    // true only if every pack is fully available
     results: [
       {
         available, message, packId, packName,
         items: [{ type, id, name, required, available, shortage, isAvailable, stockManaged }]
       }
     ]
   }
============================================================ */

// Private helper — checks a single pack against a resolved depot.
// allowNegativeStock: when true, all stock-managed items are marked
// available regardless of quantity (mirrors stockValidationService behaviour).
const _checkOnePack = async (pack, depot, allowNegativeStock = false) => {
  const depotId = depot.id;

  const items = await Promise.all(
    pack.components.map(async (comp) => {
      const required = parseFloat(comp.quantity);
      const isVariant = !!comp.variantId;
      const productName = isVariant
        ? (comp.variant?.name ?? comp.variant?.article?.name ?? "—")
        : (comp.article?.name ?? "—");
      const gereEnStock = isVariant
        ? (comp.variant?.article?.gereEnStock ?? true)
        : (comp.article?.gereEnStock ?? true);

      // Non-stock-managed items are always available.
      if (!gereEnStock) {
        return {
          type: isVariant ? "variant" : "article",
          id: isVariant ? comp.variantId : comp.articleId,
          name: productName,
          required,
          available: null,
          shortage: 0,
          isAvailable: true,
          stockManaged: false,
        };
      }

      // When negative stock is allowed, skip quantity checks entirely.
      if (allowNegativeStock) {
        return {
          type: isVariant ? "variant" : "article",
          id: isVariant ? comp.variantId : comp.articleId,
          name: productName,
          required,
          available: null,
          shortage: 0,
          isAvailable: true,
          stockManaged: true,
          negativeStockAllowed: true,
        };
      }

      const stock = await prisma.stockByDepot.findUnique({
        where: isVariant
          ? { depotId_variantId: { depotId, variantId: comp.variantId } }
          : { depotId_articleId: { depotId, articleId: comp.articleId } },
        select: { quantityAvailable: true },
      });

      const qty = parseFloat(stock?.quantityAvailable ?? 0);
      const shortage = Math.max(0, parseFloat((required - qty).toFixed(3)));

      return {
        type: isVariant ? "variant" : "article",
        id: isVariant ? comp.variantId : comp.articleId,
        name: productName,
        required,
        available: qty,
        shortage,
        isAvailable: shortage === 0,
        stockManaged: true,
      };
    }),
  );

  const available = items.every((item) => item.isAvailable);

  const shortages = items.filter((item) => !item.isAvailable);

  const message = available
    ? `Pack "${pack.name}" disponible dans "${depot.name}".`
    : `Pack "${pack.name}" indisponible dans "${depot.name}" : ${shortages
        .map((item) => `${item.name} (-${item.shortage})`)
        .join(", ")}.`;

  return { available, message, packId: pack.id, packName: pack.name, items };
};

export const checkPackStockAvailability = async (
  packIds,
  depotId,
  societeId,
  user,
) => {
  if (!Array.isArray(packIds) || packIds.length === 0) {
    throw new ApiError("packIds must be a non-empty array", 400);
  }

  const [depot, systemSettings] = await Promise.all([
    prisma.depot.findFirst({
      where: user.isSuperAdmin ? { id: depotId } : { id: depotId, societeId },
      select: { id: true, name: true, active: true },
    }),
    prisma.systemSettings.findFirst({
      select: { allowNegativeStock: true },
    }),
  ]);
  if (!depot) throw new ApiError("Depot not found or access denied", 404);
  const allowNegativeStock = systemSettings?.allowNegativeStock ?? false;

  const componentSelect = {
    select: {
      id: true,
      quantity: true,
      articleId: true,
      variantId: true,
      article: { select: { id: true, name: true, gereEnStock: true } },
      variant: {
        select: {
          id: true,
          name: true,
          article: { select: { id: true, name: true, gereEnStock: true } },
        },
      },
    },
  };

  const packs = await prisma.pack.findMany({
    where: user.isSuperAdmin
      ? { id: { in: packIds } }
      : { id: { in: packIds }, societeId },
    select: { id: true, name: true, components: componentSelect },
  });

  // Report missing pack ids explicitly
  const foundIds = new Set(packs.map((p) => p.id));

  const missing = packIds.filter((pid) => !foundIds.has(pid));
  if (missing.length > 0) {
    throw new ApiError(
      `Packs not found or access denied: ${missing.join(", ")}`,
      404,
    );
  }

  // Preserve the original packIds order
  const packMap = new Map(packs.map((p) => [p.id, p]));
  const results = await Promise.all(
    packIds.map((pid) =>
      _checkOnePack(packMap.get(pid), depot, allowNegativeStock),
    ),
  );

  return {
    depotId: depot.id,
    depotName: depot.name,
    allAvailable: results.every((r) => r.available),
    results,
  };
};

/* ============================================================
   PRODUCT PICKER

   Returns a flat list of article/variant items with the
   requested selling price, for use in BL creation forms.

   Each item shape:
   { type, id, barcode, name, prixAchat, prixVente,
     articleId, variantId }

   Rules:
   - Articles with variants → one entry per variant (type=variant)
   - Articles without variants → one entry for the article (type=article)
   - Search matches name OR barcode on both article and variant level
   - priceField selects which prixVente* column to expose as prixVente
============================================================ */
export const getProductsPicker = async (query, user) => {
  const { search, priceField = "prixVente1", page = 1, limit = 50 } = query;

  const VALID_PRICE_FIELDS = ["prixVente1", "prixVente2", "prixVente3"];
  if (!VALID_PRICE_FIELDS.includes(priceField)) {
    throw new ApiError(
      "priceField must be prixVente1, prixVente2, or prixVente3",
      400,
    );
  }

  const parsedPage = parseInt(page);
  const parsedLimit = parseInt(limit);

  const where = {
    visible: true,
    ...(search && {
      OR: [
        { name: { contains: search } },
        { barcode: { contains: search } },
        { variants: { some: { name: { contains: search } } } },
        { variants: { some: { barcode: { contains: search } } } },
      ],
    }),
  };

  // No skip/take here — pagination is applied on the expanded flat list
  // so item count per page is consistent regardless of variant counts.
  const articles = await prisma.article.findMany({
    where,
    select: {
      id: true,
      barcode: true,
      name: true,
      prixAchat: true,
      prixVente1: true,
      prixVente2: true,
      prixVente3: true,
      variants: {
        select: { id: true, barcode: true, name: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const searchLower = search ? search.toLowerCase() : null;
  const allItems = [];

  for (const article of articles) {
    const prixAchat = parseFloat(article.prixAchat || 0);
    const prixVente = parseFloat(article[priceField] || 0);

    if (article.variants.length === 0) {
      allItems.push({
        type: "article",
        id: article.id,
        barcode: article.barcode ?? null,
        name: article.name,
        prixAchat,
        prixVente,
        articleId: article.id,
        variantId: null,
      });
    } else {
      for (const variant of article.variants) {
        if (searchLower) {
          const matches =
            variant.name?.toLowerCase().includes(searchLower) ||
            variant.barcode?.toLowerCase().includes(searchLower) ||
            article.name.toLowerCase().includes(searchLower) ||
            article.barcode?.toLowerCase().includes(searchLower);
          if (!matches) continue;
        }

        allItems.push({
          type: "variant",
          id: variant.id,
          barcode: variant.barcode ?? null,
          name: variant.name ? `${variant.name}` : article.name,
          prixAchat,
          prixVente,
          articleId: article.id,
          variantId: variant.id,
        });
      }
    }
  }

  const total = allItems.length;
  const data = allItems.slice(
    (parsedPage - 1) * parsedLimit,
    parsedPage * parsedLimit,
  );

  return {
    priceField,
    data,
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit),
    },
  };
};
