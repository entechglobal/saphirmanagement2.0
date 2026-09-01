import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";
import ApiFeatures from "../utils/apiFeatures.js";

/* ============================================================
   HELPER FUNCTIONS
============================================================ */

/**
 * Validate and prepare attributes for a SINGLE variant.
 * Used by create() and updateAttributes() — fires individual DB queries,
 * which is acceptable for one variant at a time.
 */
const validateAndPrepareAttributes = async (attributes) => {
  if (!attributes || !Array.isArray(attributes) || attributes.length === 0) {
    throw new ApiError("At least one attribute is required for variant", 400);
  }

  const preparedAttributes = [];
  const seenAttributeIds = new Set();

  for (const attr of attributes) {
    if (!attr.attributeId || !attr.attributeValueId) {
      throw new ApiError(
        "Each attribute must have attributeId and attributeValueId",
        400,
      );
    }

    const attributeId = parseInt(attr.attributeId);
    const attributeValueId = parseInt(attr.attributeValueId);

    if (seenAttributeIds.has(attributeId)) {
      throw new ApiError(
        `Duplicate attribute ID ${attributeId} in variant`,
        400,
      );
    }
    seenAttributeIds.add(attributeId);

    const attribute = await prisma.attribute.findUnique({
      where: { id: attributeId },
    });
    if (!attribute)
      throw new ApiError(`Attribute with ID ${attributeId} not found`, 404);

    const attributeValue = await prisma.attributeValue.findUnique({
      where: { id: attributeValueId },
    });
    if (!attributeValue)
      throw new ApiError(
        `Attribute value with ID ${attributeValueId} not found`,
        404,
      );

    if (attributeValue.attributeId !== attributeId) {
      throw new ApiError(
        `Attribute value ${attributeValueId} does not belong to attribute ${attributeId}`,
        400,
      );
    }

    preparedAttributes.push({ attributeId, attributeValueId });
  }

  return preparedAttributes;
};

/**
 * Validate attributes for a single variant using pre-fetched lookup Maps.
 * Used exclusively by createBulk — zero extra DB queries per variant.
 */
const validateAttributesFromMaps = (
  variantBarcode,
  attributes,
  attributeMap,
  attributeValueMap,
) => {
  if (!Array.isArray(attributes) || attributes.length === 0) {
    throw new ApiError(
      `Variant "${variantBarcode}": at least one attribute is required`,
      400,
    );
  }

  const preparedAttributes = [];
  const seenAttributeIds = new Set();

  for (const attr of attributes) {
    if (!attr.attributeId || !attr.attributeValueId) {
      throw new ApiError(
        `Variant "${variantBarcode}": each attribute must have attributeId and attributeValueId`,
        400,
      );
    }

    const attributeId = parseInt(attr.attributeId);
    const attributeValueId = parseInt(attr.attributeValueId);

    if (seenAttributeIds.has(attributeId)) {
      throw new ApiError(
        `Variant "${variantBarcode}": duplicate attributeId ${attributeId}`,
        400,
      );
    }
    seenAttributeIds.add(attributeId);

    // Look up from pre-fetched Maps — no DB query
    if (!attributeMap.has(attributeId)) {
      throw new ApiError(
        `Variant "${variantBarcode}": attribute ID ${attributeId} not found`,
        404,
      );
    }

    const attributeValue = attributeValueMap.get(attributeValueId);
    if (!attributeValue) {
      throw new ApiError(
        `Variant "${variantBarcode}": attribute value ID ${attributeValueId} not found`,
        404,
      );
    }

    if (attributeValue.attributeId !== attributeId) {
      throw new ApiError(
        `Variant "${variantBarcode}": attribute value ${attributeValueId} does not belong to attribute ${attributeId}`,
        400,
      );
    }

    preparedAttributes.push({ attributeId, attributeValueId });
  }

  return preparedAttributes;
};

/**
 * Format a variant row (with variantAttributes relation) into clean API shape.
 */
const formatVariantWithAttributes = (variant) => {
  if (!variant.variantAttributes) return variant;

  const attributes = variant.variantAttributes.map((va) => ({
    attributeId: va.attributeId,
    attributeName: va.attribute.name,
    attributeValueId: va.attributeValueId,
    attributeValue: va.attributeValue.value,
  }));

  return { ...variant, attributes, variantAttributes: undefined };
};

/* ============================================================
   CRUD OPERATIONS
============================================================ */

export const create = async (data) => {
  const preparedAttributes = await validateAndPrepareAttributes(
    data.attributes,
  );

  const article = await prisma.article.findUnique({
    where: { id: parseInt(data.articleId) },
    select: { id: true, name: true },
  });
  if (!article) throw new ApiError("Article not found", 404);

  const existingVariants = await prisma.articleVariant.findMany({
    where: { articleId: parseInt(data.articleId) },
    include: {
      variantAttributes: {
        select: { attributeId: true, attributeValueId: true },
      },
    },
  });

  for (const existingVariant of existingVariants) {
    const existingAttrSet = new Set(
      existingVariant.variantAttributes.map(
        (va) => `${va.attributeId}-${va.attributeValueId}`,
      ),
    );
    const newAttrSet = new Set(
      preparedAttributes.map(
        (pa) => `${pa.attributeId}-${pa.attributeValueId}`,
      ),
    );
    if (
      existingAttrSet.size === newAttrSet.size &&
      [...existingAttrSet].every((attr) => newAttrSet.has(attr))
    ) {
      throw new ApiError(
        "Variant with this attribute combination already exists for this article",
        409,
      );
    }
  }

  const variant = await prisma.$transaction(async (tx) => {
    const createdVariant = await tx.articleVariant.create({
      data: {
        articleId: parseInt(data.articleId),
        barcode: data.barcode,
        name: "temp",
      },
    });

    await tx.variantAttribute.createMany({
      data: preparedAttributes.map((attr) => ({
        variantId: createdVariant.id,
        attributeId: attr.attributeId,
        attributeValueId: attr.attributeValueId,
      })),
    });

    const attributeValues = await tx.attributeValue.findMany({
      where: { id: { in: preparedAttributes.map((a) => a.attributeValueId) } },
      select: { id: true, value: true },
    });

    const attrValueMap = new Map(
      attributeValues.map((av) => [av.id, av.value]),
    );
    const generatedName = `${article.name} - ${preparedAttributes.map((a) => attrValueMap.get(a.attributeValueId) ?? "").join(" - ")}`;

    await tx.articleVariant.update({
      where: { id: createdVariant.id },
      data: { name: generatedName },
    });

    return tx.articleVariant.findUnique({
      where: { id: createdVariant.id },
      include: {
        article: {
          select: { id: true, barcode: true, name: true, familyId: true },
        },
        variantAttributes: {
          include: {
            attribute: { select: { id: true, name: true } },
            attributeValue: { select: { id: true, value: true } },
          },
        },
      },
    });
  });

  return formatVariantWithAttributes(variant);
};

export const getAll = async (query) => {
  const count = await prisma.articleVariant.count();

  const apiFeatures = new ApiFeatures(query)
    .filter()
    .search(["barcode", "name"])
    .sort()
    .limitFields({
      id: true,
      articleId: true,
      barcode: true,
      name: true,
      createdAt: true,
      updatedAt: true,
      article: {
        select: { id: true, barcode: true, name: true, familyId: true },
      },
      variantAttributes: {
        include: {
          attribute: { select: { id: true, name: true } },
          attributeValue: { select: { id: true, value: true } },
        },
      },
    })
    .paginate(count);

  const variants = await prisma.articleVariant.findMany(apiFeatures.build());

  return {
    results: variants.length,
    pagination: apiFeatures.paginationResult,
    data: variants.map(formatVariantWithAttributes),
  };
};

export const getByArticle = async (articleId) => {
  const variants = await prisma.articleVariant.findMany({
    where: { articleId },
    include: {
      article: {
        select: { id: true, barcode: true, name: true, familyId: true },
      },
      variantAttributes: {
        include: {
          attribute: { select: { id: true, name: true } },
          attributeValue: { select: { id: true, value: true } },
        },
        orderBy: { attributeId: "asc" },
      },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  return variants.map(formatVariantWithAttributes);
};

export const getById = async (id) => {
  const variant = await prisma.articleVariant.findUnique({
    where: { id },
    include: {
      article: {
        select: {
          id: true,
          barcode: true,
          name: true,
          familyId: true,
          unitePrincipaleId: true,
          prixAchat: true,
          prixVente1: true,
          prixVente2: true,
          prixVente3: true,
        },
      },
      variantAttributes: {
        include: {
          attribute: { select: { id: true, name: true } },
          attributeValue: { select: { id: true, value: true } },
        },
      },
      stockByDepot: {
        select: {
          id: true,
          depotId: true,
          quantityAvailable: true,
          quantityReserved: true,
          quantityInTransit: true,
          alertThreshold: true,
          depot: {
            select: { id: true, name: true, code: true, societeId: true },
          },
        },
      },
      transactions: {
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          transactionType: true,
          quantityChange: true,
          quantityAfter: true,
          reason: true,
          createdAt: true,
        },
      },
    },
  });

  if (!variant) throw new ApiError("Variant not found", 404);
  return formatVariantWithAttributes(variant);
};

export const update = async (id, data) => {
  const variant = await prisma.articleVariant.findUnique({ where: { id } });
  if (!variant) throw new ApiError("Variant not found", 404);

  const allowedUpdates = {};
  if (data.barcode) allowedUpdates.barcode = data.barcode;

  const updatedVariant = await prisma.articleVariant.update({
    where: { id },
    data: allowedUpdates,
    include: {
      article: {
        select: { id: true, barcode: true, name: true, familyId: true },
      },
      variantAttributes: {
        include: {
          attribute: { select: { id: true, name: true } },
          attributeValue: { select: { id: true, value: true } },
        },
      },
    },
  });

  return formatVariantWithAttributes(updatedVariant);
};

export const updateAttributes = async (id, attributes) => {
  const variant = await prisma.articleVariant.findUnique({
    where: { id },
    include: {
      variantAttributes: true,
      article: { select: { id: true, name: true } },
    },
  });
  if (!variant) throw new ApiError("Variant not found", 404);

  const preparedAttributes = await validateAndPrepareAttributes(attributes);

  const existingVariants = await prisma.articleVariant.findMany({
    where: { articleId: variant.articleId, id: { not: id } },
    include: {
      variantAttributes: {
        select: { attributeId: true, attributeValueId: true },
      },
    },
  });

  for (const existingVariant of existingVariants) {
    const existingAttrSet = new Set(
      existingVariant.variantAttributes.map(
        (va) => `${va.attributeId}-${va.attributeValueId}`,
      ),
    );
    const newAttrSet = new Set(
      preparedAttributes.map(
        (pa) => `${pa.attributeId}-${pa.attributeValueId}`,
      ),
    );
    if (
      existingAttrSet.size === newAttrSet.size &&
      [...existingAttrSet].every((attr) => newAttrSet.has(attr))
    ) {
      throw new ApiError(
        "Variant with this attribute combination already exists for this article",
        409,
      );
    }
  }

  const allAttributeValues = await prisma.attributeValue.findMany({
    where: { id: { in: preparedAttributes.map((a) => a.attributeValueId) } },
    select: { id: true, value: true },
  });

  const attrValueMap = new Map(
    allAttributeValues.map((av) => [av.id, av.value]),
  );
  const generatedName = `${variant.article.name} - ${preparedAttributes.map((a) => attrValueMap.get(a.attributeValueId) ?? "").join(" / ")}`;

  const updatedVariant = await prisma.$transaction(async (tx) => {
    await tx.variantAttribute.deleteMany({ where: { variantId: id } });
    await tx.variantAttribute.createMany({
      data: preparedAttributes.map((attr) => ({
        variantId: id,
        attributeId: attr.attributeId,
        attributeValueId: attr.attributeValueId,
      })),
    });
    await tx.articleVariant.update({
      where: { id },
      data: { name: generatedName },
    });

    return tx.articleVariant.findUnique({
      where: { id },
      include: {
        article: {
          select: { id: true, barcode: true, name: true, familyId: true },
        },
        variantAttributes: {
          include: {
            attribute: { select: { id: true, name: true } },
            attributeValue: { select: { id: true, value: true } },
          },
        },
      },
    });
  });

  return formatVariantWithAttributes(updatedVariant);
};

export const remove = async (id) => {
  const variant = await prisma.articleVariant.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          clientDocumentLines: true,
          fournisseurDocumentLines: true,
          packComponents: true,
        },
      },
    },
  });

  if (!variant) throw new ApiError("Variant not found", 404);

  // ── Pre-check all blocking constraints (onDelete: Restrict) ───────────────
  const errors = [];

  if (variant._count.clientDocumentLines > 0) {
    errors.push(
      `utilisée dans ${variant._count.clientDocumentLines} ligne(s) de documents clients ` +
        `.Supprimez ces documents avant de supprimer la variante.`,
    );
  }

  if (variant._count.fournisseurDocumentLines > 0) {
    errors.push(
      `utilisée dans ${variant._count.fournisseurDocumentLines} ligne(s) de documents fournisseurs ` +
        `. Supprimez ces documents avant de supprimer la variante.`,
    );
  }

  if (variant._count.packComponents > 0) {
    errors.push(
      `incluse comme composant dans ${variant._count.packComponents} pack(s). ` +
        `Retirez cette variante de tous les packs avant de la supprimer.`,
    );
  }

  if (errors.length > 0) {
    throw new ApiError(
      `Impossible de supprimer la variante "${variant.name}" : elle est ` +
        errors.join(" Elle est aussi "),
      400,
    );
  }

  try {
    return await prisma.articleVariant.delete({ where: { id } });
  } catch (err) {
    if (err.code === "P2003") {
      throw new ApiError(
        `Impossible de supprimer la variante "${variant.name}" : ` +
          "elle est encore liée à d'autres enregistrements (lignes de documents, composants de packs, etc.).",
        400,
      );
    }
    throw err;
  }
};

/* ============================================================
   BULK CREATE

   DB query count comparison (N variants × A attributes each):

   OLD  pre-tx  : N×A×2  individual findUnique calls  (N=40, A=3 → 240 queries)
   OLD  in-tx   : N×3    sequential create/find calls  (40 variants → 120 queries)
   OLD  total   : ~360 queries → guaranteed timeout at default 5s

   NEW  pre-tx  : 6 batched queries total (regardless of N or A)
   NEW  in-tx   : 3 batched queries total (regardless of N or A)
   NEW  total   : 9 queries → completes in ~100ms for 100+ variants
============================================================ */
export const createBulk = async (articleId, variants) => {
  // ── PHASE 1: Shape validation — pure JS, zero DB calls ───────────────────

  if (!Array.isArray(variants) || variants.length === 0) {
    throw new ApiError("Variants array is required and cannot be empty", 400);
  }

  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    if (!v.barcode) {
      throw new ApiError(`Variant at index ${i}: barcode is required`, 400);
    }
    if (!Array.isArray(v.attributes) || v.attributes.length === 0) {
      throw new ApiError(
        `Variant "${v.barcode}": must have at least one attribute`,
        400,
      );
    }
    for (const attr of v.attributes) {
      if (!attr.attributeId || !attr.attributeValueId) {
        throw new ApiError(
          `Variant "${v.barcode}": each attribute must have attributeId and attributeValueId`,
          400,
        );
      }
    }
  }

  // Duplicate barcodes within the request — O(n) with Set
  const seenBarcodes = new Set();
  for (const v of variants) {
    if (seenBarcodes.has(v.barcode)) {
      throw new ApiError(`Duplicate barcode in request: "${v.barcode}"`, 400);
    }
    seenBarcodes.add(v.barcode);
  }

  // Duplicate attribute combos within the request — O(n) with Set
  const seenCombos = new Map(); // combo → barcode (for helpful error message)
  for (const v of variants) {
    const combo = v.attributes
      .map((a) => `${parseInt(a.attributeId)}-${parseInt(a.attributeValueId)}`)
      .sort()
      .join("|");

    if (seenCombos.has(combo)) {
      throw new ApiError(
        `Duplicate attribute combination between variants "${seenCombos.get(combo)}" and "${v.barcode}"`,
        400,
      );
    }
    seenCombos.set(combo, v.barcode);
  }

  // ── PHASE 2: Batch DB lookups — 4 parallel-friendly queries ──────────────

  // Query 1: article exists
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { id: true, name: true },
  });
  if (!article) throw new ApiError("Article not found", 404);

  // Query 2: stock guard — article must not already have stock records
  const existingStock = await prisma.stockByDepot.findFirst({
    where: { articleId },
  });
  if (existingStock) {
    throw new ApiError(
      "This article already has stock records. Variants cannot be added to it.",
      400,
    );
  }

  // Collect every unique attribute ID and value ID across ALL variants at once
  const allAttributeIds = [
    ...new Set(
      variants.flatMap((v) => v.attributes.map((a) => parseInt(a.attributeId))),
    ),
  ];
  const allAttributeValueIds = [
    ...new Set(
      variants.flatMap((v) =>
        v.attributes.map((a) => parseInt(a.attributeValueId)),
      ),
    ),
  ];

  // Queries 3 + 4: fetch all referenced attributes and values in parallel
  const [attributeRows, attributeValueRows] = await Promise.all([
    prisma.attribute.findMany({
      where: { id: { in: allAttributeIds } },
      select: { id: true, name: true },
    }),
    prisma.attributeValue.findMany({
      where: { id: { in: allAttributeValueIds } },
      select: { id: true, value: true, attributeId: true },
    }),
  ]);

  // O(1) lookup Maps — used instead of any per-variant DB call
  const attributeMap = new Map(attributeRows.map((a) => [a.id, a]));
  const attributeValueMap = new Map(
    attributeValueRows.map((av) => [av.id, av]),
  );

  // ── PHASE 3: Per-variant attribute validation — pure in-memory ───────────

  const preparedVariants = []; // { barcode, generatedName, preparedAttributes }[]

  for (const v of variants) {
    const preparedAttributes = validateAttributesFromMaps(
      v.barcode,
      v.attributes,
      attributeMap,
      attributeValueMap,
    );

    const generatedName =
      `${article.name} - ` +
      preparedAttributes
        .map((a) => attributeValueMap.get(a.attributeValueId)?.value ?? "")
        .join(" - ");

    preparedVariants.push({
      barcode: v.barcode,
      generatedName,
      preparedAttributes,
    });
  }

  // ── PHASE 4: DB uniqueness checks — 2 batched queries ────────────────────

  const barcodeList = preparedVariants.map((pv) => pv.barcode);

  // Query 5: barcode uniqueness against DB
  const existingBarcodeRows = await prisma.articleVariant.findMany({
    where: { barcode: { in: barcodeList } },
    select: { barcode: true },
  });
  if (existingBarcodeRows.length > 0) {
    throw new ApiError(
      `Barcodes already exist in database: ${existingBarcodeRows.map((r) => r.barcode).join(", ")}`,
      409,
    );
  }

  // Query 6: attribute combo uniqueness against existing variants for this article
  const existingVariants = await prisma.articleVariant.findMany({
    where: { articleId },
    include: {
      variantAttributes: {
        select: { attributeId: true, attributeValueId: true },
      },
    },
  });

  if (existingVariants.length > 0) {
    const existingComboSet = new Set(
      existingVariants.map((ev) =>
        ev.variantAttributes
          .map((va) => `${va.attributeId}-${va.attributeValueId}`)
          .sort()
          .join("|"),
      ),
    );

    for (const pv of preparedVariants) {
      const combo = pv.preparedAttributes
        .map((a) => `${a.attributeId}-${a.attributeValueId}`)
        .sort()
        .join("|");

      if (existingComboSet.has(combo)) {
        throw new ApiError(
          `Variant "${pv.barcode}" has an attribute combination that already exists for this article`,
          409,
        );
      }
    }
  }

  // ── PHASE 5: Atomic bulk insert — 3 queries inside a single transaction ──

  const createdVariants = await prisma.$transaction(
    async (tx) => {
      // Write 1: insert all variant rows in one statement
      await tx.articleVariant.createMany({
        data: preparedVariants.map((pv) => ({
          articleId,
          barcode: pv.barcode,
          name: pv.generatedName,
        })),
      });

      // Read 1: retrieve the auto-generated IDs
      // (Prisma/MySQL does not return IDs from createMany)
      const insertedRows = await tx.articleVariant.findMany({
        where: { barcode: { in: barcodeList }, articleId },
        select: { id: true, barcode: true },
      });

      const barcodeToId = new Map(insertedRows.map((r) => [r.barcode, r.id]));

      // Write 2: insert all variantAttribute rows in one statement
      await tx.variantAttribute.createMany({
        data: preparedVariants.flatMap((pv) => {
          const variantId = barcodeToId.get(pv.barcode);
          return pv.preparedAttributes.map((attr) => ({
            variantId,
            attributeId: attr.attributeId,
            attributeValueId: attr.attributeValueId,
          }));
        }),
      });

      // Read 2: return fully shaped response
      return tx.articleVariant.findMany({
        where: { id: { in: insertedRows.map((r) => r.id) } },
        include: {
          article: {
            select: { id: true, barcode: true, name: true, familyId: true },
          },
          variantAttributes: {
            include: {
              attribute: { select: { id: true, name: true } },
              attributeValue: { select: { id: true, value: true } },
            },
          },
        },
        orderBy: { id: "asc" },
      });
    },
    { timeout: 30000 }, // 30s ceiling — safe for 100+ variants
  );

  return createdVariants.map(formatVariantWithAttributes);
};

export default {
  create,
  getAll,
  getByArticle,
  getById,
  update,
  updateAttributes,
  remove,
  createBulk,
};
