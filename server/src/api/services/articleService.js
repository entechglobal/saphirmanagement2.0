import asyncHandler from "express-async-handler";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import {
  exportCSV,
  exportExcel,
  importCSV,
  importExcel,
} from "../utils/importExportUtils.js";

import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";
import ApiFeatures from "../utils/apiFeatures.js";
import { uploadSingleImage } from "../middlewares/uploadImageMiddleware.js";
import { buildImageUrl } from "../utils/buildImageUrl.js";
import { formatDate, parseCSVDate } from "../utils/formatDates.js";

/* =========================
   IMAGE UPLOAD & PROCESSING
========================= */

export const uploadArticleImage = uploadSingleImage("image");

export const resizeArticleImage = asyncHandler(async (req, res, next) => {
  if (req.file) {
    const filename = `article-${uuidv4()}-${Date.now()}.jpeg`;
    await sharp(req.file.buffer)
      .resize(400, 400) // ⭐ Increased from 200x200 for better quality
      .toFormat("jpeg")
      .jpeg({ quality: 90 })
      .toFile(`uploads/articles/${filename}`);

    req.body.image = filename;
  }
  next();
});

/* =========================
   CRUD OPERATIONS
========================= */

/**
 * Create a new article
 */
export const create = async (data) => {
  // Convert string values to appropriate types

  if (typeof data.visible === "string") {
    data.visible = data.visible.toLowerCase() === "true";
  }

  if (typeof data.gereEnStock === "string") {
    data.gereEnStock = data.gereEnStock.toLowerCase() === "true";
  }

  // Convert numeric fields
  data.familyId = parseInt(data.familyId);
  data.unitePrincipaleId = parseInt(data.unitePrincipaleId);

  if (data.uniteSecondaireId) {
    data.uniteSecondaireId = parseInt(data.uniteSecondaireId);
  }

  if (data.uniteComplementaireId) {
    data.uniteComplementaireId = parseInt(data.uniteComplementaireId);
  }

  // Convert decimal fields
  data.prixAchat = parseFloat(data.prixAchat);
  data.prixVente1 = parseFloat(data.prixVente1);
  data.prixVente2 = parseFloat(data.prixVente2);
  data.prixVente3 = parseFloat(data.prixVente3);

  if (data.commission !== undefined && data.commission !== null && data.commission !== "") {
    data.commission = parseFloat(data.commission);
  } else {
    data.commission = 0;
  }

  if (data.remise !== undefined && data.remise !== null) {
    data.remise = parseFloat(data.remise);
  }

  if (data.conversionSecondaire) {
    data.conversionSecondaire = parseFloat(data.conversionSecondaire);
  }

  if (data.conversionComplementaire) {
    data.conversionComplementaire = parseFloat(data.conversionComplementaire);
  }

  // Handle dateExpiration
  if (data.dateExpiration) {
    data.dateExpiration = new Date(data.dateExpiration);
  }

  // Validate article remise does not exceed family remise
  if (data.remise !== undefined && data.remise !== null) {
    const family = await prisma.family.findUnique({
      where: { id: data.familyId },
      select: { remise: true, name: true },
    });
    if (!family) {
      throw new ApiError("Family not found", 404);
    }
    const familyRemise =
      family.remise !== null ? parseFloat(family.remise) : null;
    if (familyRemise !== null && data.remise > familyRemise) {
      throw new ApiError(
        `La remise de l'article (${(data.remise * 100).toFixed(2)}%) ne peut pas dépasser ` +
          `la remise maximale de la famille "${family.name}" (${(familyRemise * 100).toFixed(2)}%).`,
        400,
      );
    }
  }

  return prisma.article.create({
    data,
    include: {
      family: {
        select: {
          id: true,
          name: true,
          categoryId: true,
        },
      },
      unitePrincipale: {
        select: {
          id: true,
          name: true,
          symbol: true,
        },
      },
      uniteSecondaire: {
        select: {
          id: true,
          name: true,
          symbol: true,
        },
      },
      uniteComplementaire: {
        select: {
          id: true,
          name: true,
          symbol: true,
        },
      },
    },
  });
};

/**
 * Get all articles with filtering, search, and pagination
 */
export const getAll = async (query) => {
  // Count only articles whose family's category is visible
  const count = await prisma.article.count();

  const apiFeatures = new ApiFeatures(query)
    .filter()
    .search(["barcode", "name"])
    .sort()
    .limitFields({
      id: true,
      barcode: true,
      name: true,
      familyId: true,
      unitePrincipaleId: true,
      uniteSecondaireId: true,
      uniteComplementaireId: true,
      prixAchat: true,
      prixVente1: true,
      prixVente2: true,
      prixVente3: true,
      commission: true,
      conversionSecondaire: true,
      conversionComplementaire: true,
      gereEnStock: true,
      visible: true,
      remise: true,
      image: true,
      dateExpiration: true,
      dureeExpiration: true,
      createdAt: true,
      updatedAt: true,
      // Add relations in select
      family: {
        select: {
          id: true,
          name: true,
          categoryId: true,
        },
      },
      unitePrincipale: {
        select: {
          id: true,
          name: true,
          symbol: true,
        },
      },
      uniteSecondaire: {
        select: {
          id: true,
          name: true,
          symbol: true,
        },
      },
      uniteComplementaire: {
        select: {
          id: true,
          name: true,
          symbol: true,
        },
      },
    })
    .paginate(count);

  const baseQuery = apiFeatures.build();

  // Get articles with family and category visibility filter
  const articles = await prisma.article.findMany({
    ...baseQuery,
    where: {
      ...baseQuery.where,
      family: {
        category: {
          visible: true,
        },
      },
    },
  });

  // Build image URLs for articles
  const articlesWithUrl = articles.map((article) => ({
    ...article,
    image: buildImageUrl("articles", article.image),
    dateExpiration: article.dateExpiration
      ? new Date(article.dateExpiration).toISOString().split("T")[0]
      : null, // ⭐ Changed from "" to null for consistency
  }));

  return {
    results: articles.length,
    pagination: apiFeatures.paginationResult,
    data: articlesWithUrl,
  };
};

/**
 * Get unified list of products (articles without variants + article variants)
 *
 * Business Rules:
 * 1. If article HAS variants → return ONLY the variants (not the parent article)
 * 2. If article has NO variants → return the article itself
 * 3. Stock comes from StockByDepot filtered by depotId
 * 4. Name for variants = "Article Name - Attributes"
 * 5. Price comes from Article (or SocietePricing if implemented)
 */
export const getUnifiedProducts = async ({
  depotId,
  user,
  familyId,
  search,
  page = 1,
  limit = 50,
}) => {
  // ============================================
  // 1. VALIDATE DEPOT
  // ============================================
  const depot = await prisma.depot.findUnique({
    where: { id: depotId },
  });

  if (!depot) {
    throw new ApiError("Depot not found", 404);
  }

  // Authorization check
  if (!user.isSuperAdmin && depot.societeId !== user.societeId) {
    throw new ApiError(
      "Access denied. This depot belongs to another société.",
      403,
    );
  }

  // ============================================
  // 2. BUILD WHERE CLAUSE
  // ============================================
  //visible: true,
  //gereEnStock: true, // Only stock-managed articles

  const whereClause = {};

  // Filter by family if provided
  if (familyId) {
    whereClause.familyId = familyId;
  }

  // Search in barcode or name
  if (search) {
    whereClause.OR = [
      { barcode: { contains: search } },
      { name: { contains: search } },
    ];
  }

  // ============================================
  // 3. FETCH ALL ARTICLES (with variant count)
  // ============================================
  const articles = await prisma.article.findMany({
    where: whereClause,
    include: {
      family: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          variants: true, // Count how many variants each article has
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  // ============================================
  // 4. SEPARATE ARTICLES BY VARIANT STATUS
  // ============================================
  const articlesWithVariants = [];
  const articlesWithoutVariants = [];

  for (const article of articles) {
    if (article._count.variants > 0) {
      articlesWithVariants.push(article);
    } else {
      articlesWithoutVariants.push(article);
    }
  }

  // ============================================
  // 5. FETCH VARIANTS FOR ARTICLES THAT HAVE THEM
  // ============================================
  let variants = [];

  if (articlesWithVariants.length > 0) {
    const articleIdsWithVariants = articlesWithVariants.map((a) => a.id);

    variants = await prisma.articleVariant.findMany({
      where: {
        articleId: { in: articleIdsWithVariants },
      },
      include: {
        article: {
          select: {
            id: true,
            name: true,
            familyId: true,
            prixAchat: true,
            family: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        variantAttributes: {
          include: {
            attribute: {
              select: {
                name: true,
              },
            },
            attributeValue: {
              select: {
                value: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Apply search filter on variants if needed
    if (search) {
      variants = variants.filter(
        (v) =>
          v.barcode.includes(search) ||
          v.name.includes(search) ||
          v.article.name.includes(search),
      );
    }
  }

  // ============================================
  // 6. FETCH STOCK FOR ALL ITEMS
  // ============================================

  // Get article IDs (articles without variants)
  const articleIds = articlesWithoutVariants.map((a) => a.id);

  // Get variant IDs
  const variantIds = variants.map((v) => v.id);

  // Fetch stock in one query
  const stockRecords = await prisma.stockByDepot.findMany({
    where: {
      depotId: depotId,
      OR: [
        { articleId: { in: articleIds } },
        { variantId: { in: variantIds } },
      ],
    },
    select: {
      articleId: true,
      variantId: true,
      quantityAvailable: true,
    },
  });

  // Create lookup maps for quick access
  const stockByArticle = new Map();
  const stockByVariant = new Map();

  for (const stock of stockRecords) {
    if (stock.articleId) {
      stockByArticle.set(stock.articleId, Number(stock.quantityAvailable));
    }
    if (stock.variantId) {
      stockByVariant.set(stock.variantId, Number(stock.quantityAvailable));
    }
  }

  // ============================================
  // 7. BUILD UNIFIED PRODUCT LIST
  // ============================================
  const products = [];

  // Add articles WITHOUT variants
  for (const article of articlesWithoutVariants) {
    products.push({
      id: article.id,
      barcode: article.barcode,
      name: article.name, // Just article name
      familyId: article.familyId,
      familyName: article.family.name,
      prixAchat: Number(article.prixAchat),
      quantityAvailable: stockByArticle.get(article.id) || 0,
      type: "article",
    });
  }

  // Add variants (for articles WITH variants)
  for (const variant of variants) {
    // Build variant attributes string for name
    const attributesStr = variant.variantAttributes
      .map((va) => va.attributeValue.value)
      .join(" - ");

    // Concatenate: "Article Name - Variant Name" or "Article Name - Attributes"
    const fullName = attributesStr
      ? `${variant.article.name} - ${attributesStr}`
      : `${variant.article.name} - ${variant.name}`;

    products.push({
      id: variant.id,
      barcode: variant.barcode,
      name: fullName, // Article name + variant attributes
      familyId: variant.article.familyId,
      familyName: variant.article.family.name,
      prixAchat: Number(variant.article.prixAchat), // From parent article
      quantityAvailable: stockByVariant.get(variant.id) || 0,
      type: "variant",
    });
  }

  // ============================================
  // 8. SORT FINAL LIST
  // ============================================
  products.sort((a, b) => a.name.localeCompare(b.name));

  // ============================================
  // 9. APPLY PAGINATION
  // ============================================
  const total = products.length;
  const totalPages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;

  const paginatedProducts = products.slice(skip, skip + limit);

  return {
    products: paginatedProducts,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

/**
 * Get articles by family ID
 */
export const getByFamily = async (familyId) => {
  // Verify family exists
  const family = await prisma.family.findUnique({
    where: { id: familyId },
  });

  if (!family) {
    throw new ApiError("Family not found", 404);
  }

  const articles = await prisma.article.findMany({
    where: { familyId },
    select: {
      id: true,
      barcode: true,
      name: true,
      familyId: true,
      unitePrincipaleId: true,
      uniteSecondaireId: true,
      uniteComplementaireId: true,
      prixAchat: true,
      prixVente1: true,
      prixVente2: true,
      prixVente3: true,
      commission: true,
      gereEnStock: true,
      visible: true,
      remise: true,
      image: true,
      conversionSecondaire: true,
      conversionComplementaire: true,
      dateExpiration: true,
      dureeExpiration: true,
      createdAt: true,
      updatedAt: true,
      family: {
        select: {
          id: true,
          name: true,
          categoryId: true,
        },
      },
      unitePrincipale: {
        select: {
          id: true,
          name: true,
          symbol: true,
        },
      },
      uniteSecondaire: {
        select: {
          id: true,
          name: true,
          symbol: true,
        },
      },
      uniteComplementaire: {
        select: {
          id: true,
          name: true,
          symbol: true,
        },
      },
    },
  });

  return articles.map((article) => ({
    ...article,
    image: buildImageUrl("articles", article.image),
    dateExpiration: article.dateExpiration
      ? new Date(article.dateExpiration).toISOString().split("T")[0]
      : null, // ⭐ Changed from "" to null for consistency
  }));
};

/**
 * Get article by ID
 */
export const getById = async (id) => {
  const article = await prisma.article.findUnique({
    where: { id },
    include: {
      family: {
        select: {
          id: true,
          name: true,
          categoryId: true,
        },
      },
      unitePrincipale: {
        select: {
          id: true,
          name: true,
          symbol: true,
        },
      },
      uniteSecondaire: {
        select: {
          id: true,
          name: true,
          symbol: true,
        },
      },
      uniteComplementaire: {
        select: {
          id: true,
          name: true,
          symbol: true,
        },
      },
      variants: {
        select: {
          id: true,
          barcode: true,
          name: true,
          variantAttributes: {
            include: {
              attribute: {
                select: {
                  id: true,
                  name: true,
                },
              },
              attributeValue: {
                select: {
                  id: true,
                  value: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!article) {
    throw new ApiError("Article not found", 404);
  }

  // ⭐ Format variants with their attributes for better readability
  const formattedVariants = article.variants.map((variant) => ({
    id: variant.id,
    barcode: variant.barcode,
    name: variant.name,
    attributes: variant.variantAttributes.map((va) => ({
      attributeId: va.attribute.id,
      attributeName: va.attribute.name,
      attributeValueId: va.attributeValue.id,
      attributeValue: va.attributeValue.value,
    })),
  }));

  return {
    ...article,
    variants: formattedVariants,
    image: buildImageUrl("articles", article.image),
    dateExpiration: article.dateExpiration
      ? new Date(article.dateExpiration).toISOString().split("T")[0]
      : null, // ⭐ Changed from "" to null for consistency
  };
};

/**
 * Update article
 */
export const update = async (id, data) => {
  const article = await prisma.article.findUnique({ where: { id } });

  if (!article) {
    throw new ApiError("Article not found", 404);
  }

  // Convert string values to appropriate types
  if (typeof data.visible === "string") {
    data.visible = data.visible.toLowerCase() === "true";
  }

  if (typeof data.gereEnStock === "string") {
    data.gereEnStock = data.gereEnStock.toLowerCase() === "true";
  }

  // Convert numeric fields
  if (data.familyId !== undefined) {
    data.familyId = parseInt(data.familyId);
  }

  if (data.unitePrincipaleId !== undefined) {
    data.unitePrincipaleId = parseInt(data.unitePrincipaleId);
  }

  if (data.uniteSecondaireId !== undefined) {
    data.uniteSecondaireId = parseInt(data.uniteSecondaireId);
  }

  if (data.uniteComplementaireId !== undefined) {
    data.uniteComplementaireId = parseInt(data.uniteComplementaireId);
  }

  if (data.conversionSecondaire !== undefined) {
    data.conversionSecondaire = parseFloat(data.conversionSecondaire);
  }

  if (data.conversionComplementaire !== undefined) {
    data.conversionComplementaire = parseFloat(data.conversionComplementaire);
  }

  // Convert decimal fields
  if (data.prixAchat !== undefined) {
    data.prixAchat = parseFloat(data.prixAchat);
  }

  if (data.prixVente1 !== undefined) {
    data.prixVente1 = parseFloat(data.prixVente1);
  }

  if (data.prixVente2 !== undefined) {
    data.prixVente2 = parseFloat(data.prixVente2);
  }

  if (data.prixVente3 !== undefined) {
    data.prixVente3 = parseFloat(data.prixVente3);
  }

  if (data.commission !== undefined && data.commission !== null && data.commission !== "") {
    data.commission = parseFloat(data.commission);
  }

  if (data.remise !== undefined && data.remise !== null) {
    data.remise = parseFloat(data.remise);
  }

  // Handle dateExpiration
  if (data.dateExpiration) {
    data.dateExpiration = new Date(data.dateExpiration);
  }

  // Validate article remise does not exceed family remise
  if (data.remise !== undefined && data.remise !== null) {
    const targetFamilyId = data.familyId ?? article.familyId;
    const family = await prisma.family.findUnique({
      where: { id: targetFamilyId },
      select: { remise: true, name: true },
    });
    if (!family) {
      throw new ApiError("Family not found", 404);
    }
    const familyRemise =
      family.remise !== null ? parseFloat(family.remise) : null;
    if (familyRemise !== null && data.remise > familyRemise) {
      throw new ApiError(
        `La remise de l'article (${(data.remise * 100).toFixed(2)}%) ne peut pas dépasser ` +
          `la remise maximale de la famille "${family.name}" (${(familyRemise * 100).toFixed(2)}%).`,
        400,
      );
    }
  }

  // Delete old image if new image is provided
  const hasImageField = Object.prototype.hasOwnProperty.call(data, "image");
  if (hasImageField && article.image) {
    const isRemoved = data.image === null || data.image === "";
    const isChanged = data.image && data.image !== article.image;

    if (isRemoved || isChanged) {
      const oldImagePath = path.join(
        process.cwd(),
        "uploads/articles",
        article.image,
      );

      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }
  }

  const updatedArticle = await prisma.article.update({
    where: { id },
    data,
    include: {
      family: {
        select: {
          id: true,
          name: true,
          categoryId: true,
        },
      },
      unitePrincipale: {
        select: {
          id: true,
          name: true,
          symbol: true,
        },
      },
      uniteSecondaire: {
        select: {
          id: true,
          name: true,
          symbol: true,
        },
      },
      uniteComplementaire: {
        select: {
          id: true,
          name: true,
          symbol: true,
        },
      },
    },
  });

  return {
    ...updatedArticle,
    image: buildImageUrl("articles", updatedArticle.image),
    dateExpiration: updatedArticle.dateExpiration
      ? new Date(updatedArticle.dateExpiration).toISOString().split("T")[0]
      : null, // ⭐ Changed from "" to null for consistency
  };
};

/**
 * Remove article
 */
export const remove = async (id) => {
  const article = await prisma.article.findUnique({
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

  if (!article) {
    throw new ApiError("Article not found", 404);
  }

  // ── Pre-check all blocking constraints (onDelete: Restrict) ───────────────
  // The DB will reject the delete if any of these exist, so we check first
  // to return precise, actionable error messages.
  const errors = [];

  if (article._count.clientDocumentLines > 0) {
    errors.push(
      `utilisé dans ${article._count.clientDocumentLines} ligne(s) de documents clients. ` +
        `Supprimez ces documents avant de supprimer l'article.`,
    );
  }

  if (article._count.fournisseurDocumentLines > 0) {
    errors.push(
      `utilisé dans ${article._count.fournisseurDocumentLines} ligne(s) de documents fournisseurs. ` +
        `Supprimez  ces documents avant de supprimer l'article.`,
    );
  }

  if (article._count.packComponents > 0) {
    errors.push(
      `inclus comme composant dans ${article._count.packComponents} pack(s). ` +
        `Retirez cet article de tous les packs avant de le supprimer.`,
    );
  }

  if (errors.length > 0) {
    throw new ApiError(
      `Impossible de supprimer l'article "${article.name}" : ` +
        errors.join(" De plus, il est "),
      400,
    );
  }

  // ── Delete image file if exists ───────────────────────────────────────────
  if (article.image) {
    const imagePath = path.join(
      process.cwd(),
      "uploads/articles",
      article.image,
    );
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  }

  try {
    return await prisma.article.delete({ where: { id } });
  } catch (err) {
    // Safety net for any FK violation not covered by the pre-checks above
    if (err.code === "P2003") {
      throw new ApiError(
        `Impossible de supprimer l'article "${article.name}" : ` +
          "il est encore lié à d'autres enregistrements (lignes de documents, composants de packs, etc.).",
        400,
      );
    }
    throw err;
  }
};

/* =========================
   CSV & EXCEL EXPORT
========================= */

/**
 * Export articles to CSV
 */
const ARTICLE_CSV_FIELDS = [
  "id",
  "barcode",
  "name",
  "familyId",
  "familyName",
  "unitePrincipaleId",
  "uniteSecondaireId",
  "uniteComplementaireId",
  "prixAchat",
  "prixVente1",
  "prixVente2",
  "prixVente3",
  "gereEnStock",
  "visible",
  "remise",
  "dateExpiration",
  "dureeExpiration",
  "createdAt",
  "updatedAt",
];

const ARTICLE_EXCEL_COLUMNS = [
  { header: "ID", key: "id", width: 10 },
  { header: "Barcode", key: "barcode", width: 20 },
  { header: "Name", key: "name", width: 30 },
  { header: "Family ID", key: "familyId", width: 12 },
  { header: "Family Name", key: "familyName", width: 25 },
  { header: "Unite Principale ID", key: "unitePrincipaleId", width: 18 },
  { header: "Unite Secondaire ID", key: "uniteSecondaireId", width: 18 },
  {
    header: "Unite Complementaire ID",
    key: "uniteComplementaireId",
    width: 20,
  },
  { header: "Prix Achat", key: "prixAchat", width: 15 },
  { header: "Prix Vente 1", key: "prixVente1", width: 15 },
  { header: "Prix Vente 2", key: "prixVente2", width: 15 },
  { header: "Prix Vente 3", key: "prixVente3", width: 15 },
  { header: "Gere En Stock", key: "gereEnStock", width: 15 },
  { header: "Visible", key: "visible", width: 10 },
  { header: "Remise", key: "remise", width: 10 },
  { header: "Date Expiration", key: "dateExpiration", width: 18 },
  { header: "Duree Expiration", key: "dureeExpiration", width: 18 },
  { header: "Created At", key: "createdAt", width: 20 },
  { header: "Updated At", key: "updatedAt", width: 20 },
];

const ARTICLE_EXCEL_NUM_FMTS = {
  id: "@",
  barcode: "@",
  prixAchat: "#,##0.00",
  prixVente1: "#,##0.00",
  prixVente2: "#,##0.00",
  prixVente3: "#,##0.00",
  remise: "0.00",
  createdAt: "yyyy-mm-dd hh:mm",
  updatedAt: "yyyy-mm-dd hh:mm",
};

const ARTICLE_INCLUDE = {
  include: {
    family: { select: { name: true } },
    unitePrincipale: { select: { name: true, symbol: true } },
    uniteSecondaire: { select: { name: true, symbol: true } },
    uniteComplementaire: { select: { name: true, symbol: true } },
  },
  orderBy: { name: "asc" },
};

const mapArticleToCSV = (a) => ({
  id: a.id,
  barcode: a.barcode,
  name: a.name,
  familyId: a.familyId,
  familyName: a.family?.name || "",
  unitePrincipaleId: a.unitePrincipaleId,
  uniteSecondaireId: a.uniteSecondaireId || "",
  uniteComplementaireId: a.uniteComplementaireId || "",
  prixAchat: Number(a.prixAchat),
  prixVente1: Number(a.prixVente1),
  prixVente2: Number(a.prixVente2),
  prixVente3: Number(a.prixVente3),
  gereEnStock: a.gereEnStock ? "vrai" : "faux",
  visible: a.visible ? "vrai" : "faux",
  remise: a.remise ? Number(a.remise) * 100 : "",
  dateExpiration: a.dateExpiration ? formatDate(a.dateExpiration) : "",
  dureeExpiration: a.dureeExpiration || "",
  createdAt: formatDate(a.createdAt),
  updatedAt: formatDate(a.updatedAt),
});

const mapArticleToExcel = (a) => ({
  ...a,
  id: a.id?.toString(),
  barcode: a.barcode?.toString(),
  familyName: a.family?.name || "",
  prixAchat: Number(a.prixAchat),
  prixVente1: Number(a.prixVente1),
  prixVente2: Number(a.prixVente2),
  prixVente3: Number(a.prixVente3),
  gereEnStock: a.gereEnStock ? "vrai" : "faux",
  visible: a.visible ? "vrai" : "faux",
  remise: a.remise ? Number(a.remise) * 100 : null,
  dateExpiration: a.dateExpiration ? formatDate(a.dateExpiration) : "",
  dureeExpiration: a.dureeExpiration || "",
  createdAt: new Date(a.createdAt),
  updatedAt: new Date(a.updatedAt),
});

export const exportArticlesCSV = async () => {
  const articles = await prisma.article.findMany(ARTICLE_INCLUDE);
  return exportCSV(articles.map(mapArticleToCSV), ARTICLE_CSV_FIELDS);
};

export const exportArticlesExcel = async () => {
  const articles = await prisma.article.findMany(ARTICLE_INCLUDE);
  return exportExcel(articles.map(mapArticleToExcel), {
    worksheetName: "Articles",
    columns: ARTICLE_EXCEL_COLUMNS,
    numFmts: ARTICLE_EXCEL_NUM_FMTS,
  });
};

const parseArticleRow = async (row, isExcel = false, rowNumber = null) => {
  const barcode = isExcel ? row.getCell(2).value : row.barcode;
  const name = isExcel ? row.getCell(3).value : row.name;
  const familyId = isExcel ? row.getCell(4).value : row.familyId;
  const unitePrincipaleId = isExcel
    ? row.getCell(6).value
    : row.unitePrincipaleId;

  if (!barcode)
    throw new ApiError(
      `Missing barcode${rowNumber ? ` at row ${rowNumber}` : ""}`,
      400,
    );
  if (!name)
    throw new ApiError(
      `Missing name${rowNumber ? ` at row ${rowNumber}` : ""}`,
      400,
    );
  if (!familyId)
    throw new ApiError(
      `Family ID is required${rowNumber ? ` at row ${rowNumber}` : ""}`,
      400,
    );
  if (!unitePrincipaleId)
    throw new ApiError(
      `Unite Principale ID is required${rowNumber ? ` at row ${rowNumber}` : ""}`,
      400,
    );

  const parsedFamilyId = parseInt(familyId);
  if (!(await prisma.family.findUnique({ where: { id: parsedFamilyId } })))
    throw new ApiError(
      `Family with ID ${parsedFamilyId} not found${rowNumber ? ` at row ${rowNumber}` : ""}`,
      404,
    );

  const parsedUnitePrincipaleId = parseInt(unitePrincipaleId);
  if (
    !(await prisma.unit.findUnique({ where: { id: parsedUnitePrincipaleId } }))
  )
    throw new ApiError(
      `Unite Principale with ID ${parsedUnitePrincipaleId} not found${rowNumber ? ` at row ${rowNumber}` : ""}`,
      404,
    );

  const rawUniteSecondaire = isExcel
    ? row.getCell(7).value
    : row.uniteSecondaireId;
  let uniteSecondaireId = rawUniteSecondaire
    ? parseInt(rawUniteSecondaire)
    : null;
  if (
    uniteSecondaireId &&
    !(await prisma.unit.findUnique({ where: { id: uniteSecondaireId } }))
  )
    throw new ApiError(
      `Unite Secondaire with ID ${uniteSecondaireId} not found${rowNumber ? ` at row ${rowNumber}` : ""}`,
      404,
    );

  const rawUniteComplementaire = isExcel
    ? row.getCell(8).value
    : row.uniteComplementaireId;
  let uniteComplementaireId = rawUniteComplementaire
    ? parseInt(rawUniteComplementaire)
    : null;
  if (
    uniteComplementaireId &&
    !(await prisma.unit.findUnique({ where: { id: uniteComplementaireId } }))
  )
    throw new ApiError(
      `Unite Complementaire with ID ${uniteComplementaireId} not found${rowNumber ? ` at row ${rowNumber}` : ""}`,
      404,
    );

  const parsePrice = (val, field) => {
    const n = parseFloat(isExcel ? val : val);
    if (isNaN(n) || n < 0)
      throw new ApiError(
        `Invalid ${field}${rowNumber ? ` at row ${rowNumber}` : ""}`,
        400,
      );
    return n;
  };
  const parseBool = (val) =>
    typeof val === "boolean"
      ? val
      : ["vrai", "true"].includes(String(val).toLowerCase());
  const parsePercent = (val) => {
    if (val == null || val === "") return null;
    const n = parseFloat(val);
    if (isNaN(n) || n < 0 || n > 100)
      throw new ApiError(
        `Remise must be 0-100${rowNumber ? ` at row ${rowNumber}` : ""}`,
        400,
      );
    return n / 100;
  };

  return {
    barcode: String(barcode).trim(),
    name: String(name).trim(),
    familyId: parsedFamilyId,
    unitePrincipaleId: parsedUnitePrincipaleId,
    uniteSecondaireId,
    uniteComplementaireId,
    prixAchat: parsePrice(
      isExcel ? row.getCell(9).value : row.prixAchat,
      "prixAchat",
    ),
    prixVente1: parsePrice(
      isExcel ? row.getCell(10).value : row.prixVente1,
      "prixVente1",
    ),
    prixVente2: parsePrice(
      isExcel ? row.getCell(11).value : row.prixVente2,
      "prixVente2",
    ),
    prixVente3: parsePrice(
      isExcel ? row.getCell(12).value : row.prixVente3,
      "prixVente3",
    ),
    gereEnStock: parseBool(isExcel ? row.getCell(13).value : row.gereEnStock),
    visible: parseBool(isExcel ? row.getCell(14).value : row.visible),
    remise: parsePercent(isExcel ? row.getCell(15).value : row.remise),
    dateExpiration: isExcel
      ? row.getCell(16).value
        ? new Date(row.getCell(16).value)
        : null
      : row.dateExpiration
        ? parseCSVDate(row.dateExpiration)
        : null,
    dureeExpiration: isExcel
      ? row.getCell(17).value
        ? String(row.getCell(17).value)
        : null
      : row.dureeExpiration || null,
    ...(isExcel
      ? {}
      : {
          createdAt: parseCSVDate(row.createdAt),
          updatedAt: parseCSVDate(row.updatedAt),
        }),
  };
};

const saveArticleUpsert = (article) =>
  prisma.article.upsert({
    where: { barcode: article.barcode },
    update: {
      name: article.name,
      familyId: article.familyId,
      unitePrincipaleId: article.unitePrincipaleId,
      uniteSecondaireId: article.uniteSecondaireId,
      uniteComplementaireId: article.uniteComplementaireId,
      prixAchat: article.prixAchat,
      prixVente1: article.prixVente1,
      prixVente2: article.prixVente2,
      prixVente3: article.prixVente3,
      gereEnStock: article.gereEnStock,
      visible: article.visible,
      remise: article.remise,
      dateExpiration: article.dateExpiration,
      dureeExpiration: article.dureeExpiration,
      updatedAt: article.updatedAt,
    },
    create: article,
  });

export const importArticlesCSV = (buffer) =>
  importCSV(buffer, (row) => parseArticleRow(row, false), saveArticleUpsert);

export const importArticlesExcel = (buffer) =>
  importExcel(
    buffer,
    "Articles",
    (row, rowNumber) =>
      row.getCell(2).value ? parseArticleRow(row, true, rowNumber) : null,
    saveArticleUpsert,
  );

// ============================================
// EXPORT FUNCTIONS
// ============================================
export default {
  uploadArticleImage,
  resizeArticleImage,
  create,
  getAll,
  getByFamily,
  getById,
  update,
  remove,
  exportArticlesCSV,
  exportArticlesExcel,
  importArticlesCSV,
  importArticlesExcel,
};
