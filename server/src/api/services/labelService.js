import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";

/* ============================================================
   CONSTANTS
============================================================ */
export const LABEL_TYPES = ["avecPrix", "sansPrix", "parametre", "intitule"];
export const PRICE_FIELDS = ["prixVente1", "prixVente2", "prixVente3"];
export const LABEL_SIZES = ["50x25", "30x15"];
export const QUANTITY_MODES = ["personnalise", "quantityDisponible"];

/* ============================================================
   HELPERS
============================================================ */

const buildVariantDesignation = (articleName, variantAttributes = []) => {
  if (!variantAttributes.length) return articleName;
  const attrs = variantAttributes
    .map((va) => va.attributeValue.value)
    .join(" - ");
  return `${articleName} - ${attrs}`;
};

const resolveArticleData = async (articleId) => {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: {
      id: true,
      name: true,
      barcode: true,
      prixAchat: true,
      prixVente1: true,
      prixVente2: true,
      prixVente3: true,
    },
  });
  if (!article) throw new ApiError(`Article ${articleId} not found`, 404);

  return {
    type: "article",
    itemId: articleId,
    designation: article.name,
    barcode: article.barcode,
    prixAchat: parseFloat(article.prixAchat || 0),
    prixVente1: parseFloat(article.prixVente1 || 0),
    prixVente2: parseFloat(article.prixVente2 || 0),
    prixVente3: parseFloat(article.prixVente3 || 0),
  };
};

const resolveVariantData = async (variantId) => {
  const variant = await prisma.articleVariant.findUnique({
    where: { id: variantId },
    include: {
      article: {
        select: {
          name: true,
          prixAchat: true,
          prixVente1: true,
          prixVente2: true,
          prixVente3: true,
        },
      },
      variantAttributes: {
        include: {
          attributeValue: { select: { value: true } },
        },
      },
    },
  });
  if (!variant) throw new ApiError(`Variant ${variantId} not found`, 404);

  return {
    type: "variant",
    itemId: variantId,
    designation: buildVariantDesignation(
      variant.article.name,
      variant.variantAttributes,
    ),
    barcode: variant.barcode,
    prixAchat: parseFloat(variant.article.prixAchat || 0),
    prixVente1: parseFloat(variant.article.prixVente1 || 0),
    prixVente2: parseFloat(variant.article.prixVente2 || 0),
    prixVente3: parseFloat(variant.article.prixVente3 || 0),
  };
};

// Format: {prefix}{prixAchatInt}00{prixVenteInt}00{suffix}
// Example: prixAchat=10, prixVente=20, prefix="9999", suffix="9999"
//          → "9999100020009999"
const buildParametreCode = (
  prixAchat,
  prixVente,
  prefix = "9999",
  suffix = "9999",
) => {
  const achat = Math.round(prixAchat);
  const vente = Math.round(prixVente);
  return `${prefix}${achat}00${vente}00${suffix}`;
};

const buildLabel = (
  itemData,
  labelType,
  priceField,
  size,
  quantity,
  parametreConfig,
) => {
  const { prefix = "9999", suffix = "9999" } = parametreConfig ?? {};
  const selectedPrice = itemData[priceField] ?? 0;

  const base = {
    labelType,
    size,
    quantity,
    itemType: itemData.type,
    itemId: itemData.itemId,
    designation: itemData.designation,
    barcode: itemData.barcode,
  };

  switch (labelType) {
    case "avecPrix":
      return {
        ...base,
        price: selectedPrice,
        priceLabel: `${selectedPrice.toFixed(2)} MAD`,
      };
    case "sansPrix":
      return { ...base };
    case "parametre":
      return {
        ...base,
        parametreCode: buildParametreCode(
          itemData.prixAchat,
          selectedPrice,
          prefix,
          suffix,
        ),
      };
    case "intitule":
      return {
        ...base,
        price: selectedPrice,
        priceLabel: `${selectedPrice.toFixed(2)} MAD`,
      };
    default:
      return base;
  }
};

/* ============================================================
   GET STOCK QUANTITIES
   Preview helper: returns per-depot quantities for the selected
   items so the frontend can show a summary before confirming.
============================================================ */
export const getStockQuantities = async (data, user) => {
  const { items, depotIds } = data;

  if (!Array.isArray(depotIds) || depotIds.length === 0) {
    throw new ApiError("At least one depotId is required", 400);
  }

  const depots = await prisma.depot.findMany({
    where: {
      id: { in: depotIds },
      ...(user.isSuperAdmin ? {} : { societeId: user.societeId }),
    },
    select: { id: true, name: true, code: true },
  });

  if (depots.length !== depotIds.length) {
    const foundIds = new Set(depots.map((d) => d.id));
    const missing = depotIds.filter((id) => !foundIds.has(id));
    throw new ApiError(
      `Depots not found or access denied: ${missing.join(", ")}`,
      404,
    );
  }

  const result = [];

  for (const item of items) {
    const { articleId, variantId } = item;
    const itemData = articleId
      ? await resolveArticleData(articleId)
      : await resolveVariantData(variantId);

    const stockEntries = await prisma.stockByDepot.findMany({
      where: {
        ...(articleId ? { articleId } : { variantId }),
        depotId: { in: depotIds },
      },
      select: {
        depotId: true,
        quantityAvailable: true,
      },
    });

    const stockByDepot = new Map(
      stockEntries.map((s) => [s.depotId, parseFloat(s.quantityAvailable)]),
    );

    const depotBreakdown = depots.map((depot) => ({
      depotId: depot.id,
      depotName: depot.name,
      depotCode: depot.code,
      quantity: Math.max(0, Math.floor(stockByDepot.get(depot.id) ?? 0)),
    }));

    const totalQuantity = depotBreakdown.reduce(
      (sum, d) => sum + d.quantity,
      0,
    );

    result.push({
      type: itemData.type,
      itemId: itemData.itemId,
      designation: itemData.designation,
      barcode: itemData.barcode,
      depotBreakdown,
      totalQuantity,
    });
  }

  return result;
};

/* ============================================================
   GENERATE LABELS
   Resolves all item data, computes quantities, and returns the
   structured label payload ready for frontend rendering/printing.
============================================================ */
export const generate = async (data, user) => {
  const {
    items,
    labelType,
    priceField = "prixVente1",
    size = "50x25",
    quantityMode,
    quantity: globalQuantity = 1,
    depotIds = [],
    parametreConfig,
  } = data;

  const labels = [];

  for (const item of items) {
    const { articleId, variantId } = item;

    const itemData = articleId
      ? await resolveArticleData(articleId)
      : await resolveVariantData(variantId);

    let quantity;

    if (quantityMode === "personnalise") {
      // Single global quantity applied equally to every selected item
      quantity = Math.max(1, parseInt(globalQuantity));
    } else {
      // quantityDisponible: sum stock across selected depots
      const stockEntries = await prisma.stockByDepot.findMany({
        where: {
          ...(articleId ? { articleId } : { variantId }),
          depotId: { in: depotIds },
          ...(user.isSuperAdmin
            ? {}
            : { depot: { societeId: user.societeId } }),
        },
        select: { quantityAvailable: true },
      });

      quantity = stockEntries.reduce(
        (sum, s) =>
          sum + Math.max(0, Math.floor(parseFloat(s.quantityAvailable))),
        0,
      );
    }

    if (quantity > 0) {
      labels.push(
        buildLabel(
          itemData,
          labelType,
          priceField,
          size,
          quantity,
          parametreConfig,
        ),
      );
    }
  }

  const totalLabels = labels.reduce((sum, l) => sum + l.quantity, 0);

  return {
    labels,
    totalLabels,
    labelType,
    priceField,
    size,
    quantityMode,
    summary: {
      itemCount: labels.length,
      totalLabels,
    },
  };
};

/* ============================================================
   GET PRODUCTS FOR LABEL PICKER

   Flat list of articles (without variants) + variants (from
   articles that have variants). No depot required.

   Returned fields per item: type, id, articleId, variantId,
   barcode, name, prixAchat.

   Supports: search (name, barcode, variant barcode/name),
             familyId, categoryId, page, limit.
============================================================ */
export const getProductsPicker = async (query) => {
  const {
    search,
    familyId,
    categoryId,
    priceField = "prixVente1",
    page = 1,
    limit = 50,
  } = query;

  if (!PRICE_FIELDS.includes(priceField)) {
    throw new ApiError(
      `priceField must be one of: ${PRICE_FIELDS.join(", ")}`,
      400,
    );
  }

  const parsedPage = parseInt(page);
  const parsedLimit = parseInt(limit);

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

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where: articleWhere,
      select: {
        id: true,
        barcode: true,
        name: true,
        prixAchat: true,
        prixVente1: true,
        prixVente2: true,
        prixVente3: true,
        variants: {
          select: {
            id: true,
            barcode: true,
            name: true,
            variantAttributes: {
              include: {
                attributeValue: { select: { value: true } },
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
      skip: (parsedPage - 1) * parsedLimit,
      take: parsedLimit,
    }),
    prisma.article.count({ where: articleWhere }),
  ]);

  const products = [];
  const searchLower = search ? search.toLowerCase() : null;

  for (const article of articles) {
    const prixAchat = parseFloat(article.prixAchat || 0);
    const prixVente = parseFloat(article[priceField] || 0);

    if (article.variants.length === 0) {
      products.push({
        type: "article",
        id: article.id,
        articleId: article.id,
        variantId: null,
        barcode: article.barcode,
        name: article.name,
        prixAchat,
        prixVente,
      });
    } else {
      for (const variant of article.variants) {
        if (searchLower) {
          const matches =
            variant.barcode?.toLowerCase().includes(searchLower) ||
            variant.name?.toLowerCase().includes(searchLower) ||
            article.name.toLowerCase().includes(searchLower) ||
            article.barcode?.toLowerCase().includes(searchLower);
          if (!matches) continue;
        }

        const attrs = variant.variantAttributes
          .map((va) => va.attributeValue.value)
          .join(", ");

        products.push({
          type: "variant",
          id: variant.id,
          articleId: article.id,
          variantId: variant.id,
          barcode: variant.barcode,
          name: attrs ? `${article.name} (${attrs})` : article.name,
          prixAchat,
          prixVente,
        });
      }
    }
  }

  return {
    priceField,
    products,
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit),
    },
  };
};

/* ============================================================
   GENERATE LABELS FOR PACKS

   Same label types as generate(), but targeted at packs.
   No quantityMode — a single global quantity is applied to
   every selected pack.

   Price mappings:
     prixAchat  → pack.purchasePrice
     prixVente  → pack.prixVentePack
============================================================ */
export const generateForPacks = async (data, user) => {
  const {
    packs: packIds,
    labelType,
    size = "50x25",
    quantity: globalQuantity = 1,
    parametreConfig,
  } = data;

  if (!Array.isArray(packIds) || packIds.length === 0) {
    throw new ApiError("At least one pack is required", 400);
  }
  if (!LABEL_TYPES.includes(labelType)) {
    throw new ApiError(
      `labelType must be one of: ${LABEL_TYPES.join(", ")}`,
      400,
    );
  }
  if (!LABEL_SIZES.includes(size)) {
    throw new ApiError(`size must be one of: ${LABEL_SIZES.join(", ")}`, 400);
  }

  const quantity = Math.max(1, parseInt(globalQuantity));

  const packs = await prisma.pack.findMany({
    where: {
      id: { in: packIds },
      ...(user.isSuperAdmin ? {} : { societeId: user.societeId }),
    },
    select: {
      id: true,
      name: true,
      barcode: true,
      purchasePrice: true,
      prixVentePack: true,
    },
  });

  if (packs.length !== packIds.length) {
    const foundIds = new Set(packs.map((p) => p.id));
    const missing = packIds.filter((id) => !foundIds.has(id));
    throw new ApiError(
      `Packs not found or access denied: ${missing.join(", ")}`,
      404,
    );
  }

  const labels = [];

  for (const pack of packs) {
    const prixAchat = parseFloat(pack.purchasePrice || 0);
    const prixVente = parseFloat(pack.prixVentePack || 0);

    // Map pack prices to the itemData shape expected by buildLabel.
    // Packs have a single selling price (prixVentePack), so all three
    // prixVente* slots carry the same value.
    const itemData = {
      type: "pack",
      itemId: pack.id,
      designation: pack.name,
      barcode: pack.barcode,
      prixAchat,
      prixVente1: prixVente,
      prixVente2: prixVente,
      prixVente3: prixVente,
    };

    labels.push(
      buildLabel(itemData, labelType, "prixVente1", size, quantity, parametreConfig),
    );
  }

  const totalLabels = labels.reduce((sum, l) => sum + l.quantity, 0);

  return {
    labels,
    totalLabels,
    labelType,
    size,
    summary: {
      itemCount: labels.length,
      totalLabels,
    },
  };
};
