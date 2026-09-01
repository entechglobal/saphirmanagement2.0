import prisma from "../../../loaders/prisma.js";

import ApiError from "../../utils/apiError.js";

/* ============================================================
   STOCK VALIDATION SERVICE
   Centralized stock business rules enforcement
============================================================ */

/**
 * Get system settings
 * Cached to avoid repeated database calls
 */
let settingsCache = null;
let settingsCacheTime = 0;
const CACHE_TTL = 10000; // 1 minute

const getSystemSettings = async () => {
  const now = Date.now();

  if (settingsCache && now - settingsCacheTime < CACHE_TTL) {
    return settingsCache;
  }

  const settings = await prisma.systemSettings.findFirst({
    select: {
      allowNegativeStock: true,
      systemStartHour: true,
      systemEndHour: true,
    },
  });
  if (!settings) {
    throw new ApiError("System settings not configured", 500);
  }

  settingsCache = settings;
  settingsCacheTime = now;

  return settings;
};

/**
 * Clear settings cache (call when settings are updated)
 */
export const clearSettingsCache = () => {
  settingsCache = null;
  settingsCacheTime = 0;
};

/* ============================================================
   STOCK AVAILABILITY CHECK
============================================================ */

/**
 * Get current available stock for a product in a depot
 *
 * @param {number} depotId - Depot ID
 * @param {number} articleId - Article ID (optional if variantId provided)
 * @param {number} variantId - Variant ID (optional if articleId provided)
 * @returns {Promise<number>} Available quantity
 */
const getCurrentStock = async (depotId, articleId, variantId) => {
  const stock = await prisma.stockByDepot.findFirst({
    where: {
      depotId,
      articleId: articleId || null,
      variantId: variantId || null,
    },
    select: {
      quantityAvailable: true,
      quantityReserved: true,
      quantityInTransit: true,
    },
  });

  if (!stock) {
    return 0; // No stock record = 0 available
  }

  // Available stock for operations
  return parseFloat(stock.quantityAvailable);
};

/* ============================================================
   NEGATIVE STOCK VALIDATION
============================================================ */

/**
 * Validate if a stock operation is allowed
 *
 * @param {number} depotId - Depot ID
 * @param {number} articleId - Article ID (optional)
 * @param {number} variantId - Variant ID (optional)
 * @param {number} requestedQuantity - Quantity to decrease (positive number)
 * @param {string} operation - Operation type for error messages
 * @throws {ApiError} If operation would cause negative stock and it's not allowed
 */
export const validateStockAvailability = async (
  depotId,
  articleId,
  variantId,
  requestedQuantity,
  operation = "operation",
) => {
  // Get system settings
  const settings = await getSystemSettings();

  // If negative stock is allowed, no validation needed
  if (settings.allowNegativeStock) {
    return true;
  }

  // Get current available stock
  const currentStock = await getCurrentStock(depotId, articleId, variantId);

  // Check if operation would cause negative stock
  const stockAfterOperation = currentStock - requestedQuantity;

  if (stockAfterOperation < 0) {
    // Get product name for error message
    let productName = "Product";

    if (articleId) {
      const article = await prisma.article.findUnique({
        where: { id: articleId },
        select: { name: true },
      });
      productName = article?.name || "Product";
    } else if (variantId) {
      const variant = await prisma.articleVariant.findUnique({
        where: { id: variantId },
        include: {
          article: { select: { name: true } },
          variantAttributes: {
            include: {
              attributeValue: { select: { value: true } },
            },
          },
        },
      });

      if (variant) {
        const attrs = variant.variantAttributes
          .map((va) => va.attributeValue.value)
          .join(" - ");
        productName = attrs
          ? `${variant.article.name} (${attrs})`
          : variant.article.name;
      }
    }

    throw new ApiError(
      `Insufficient stock for ${operation}. ${productName}: Available ${currentStock}, Requested ${requestedQuantity}`,
      400,
    );
  }

  return true;
};

/**
 * Validate stock for multiple items (batch validation)
 *
 * @param {Array} items - Array of { depotId, articleId, variantId, quantity }
 * @param {string} operation - Operation type
 * @throws {ApiError} If any item would cause negative stock
 */
export const validateBatchStockAvailability = async (
  items,
  operation = "operation",
) => {
  const settings = await getSystemSettings();

  // If negative stock allowed, skip validation
  if (settings.allowNegativeStock) {
    return true;
  }

  // Validate each item
  const validationPromises = items.map((item) =>
    validateStockAvailability(
      item.depotId,
      item.articleId,
      item.variantId,
      item.quantity,
      operation,
    ),
  );

  await Promise.all(validationPromises);

  return true;
};

/* ============================================================
   DRAFT RESERVATION HELPERS
   Used by BonLivraison to prevent over-committing stock
   across concurrent DRAFT documents.
============================================================ */

/**
 * Sum quantities already soft-reserved in DRAFT BonLivraison documents
 * for a given product / depot combination.
 *
 * @param {number}  depotId                - Depot to check
 * @param {number|null} articleId          - Article ID (mutex with variantId)
 * @param {number|null} variantId          - Variant ID (mutex with articleId)
 * @param {number|null} excludeBonLivraisonId - Exclude this BL's own lines
 *                                            (used when updating or validating
 *                                             an existing DRAFT so it isn't
 *                                             counted against itself)
 * @returns {Promise<number>}
 */
const getDraftReservedQuantity = async (
  depotId,
  articleId,
  variantId,
  excludeBonLivraisonId = null,
) => {
  const result = await prisma.clientDocumentLine.aggregate({
    _sum: { quantity: true },
    where: {
      articleId: articleId || null,
      variantId: variantId || null,
      document: {
        status: "DRAFT",
        bonLivraison: {
          depotId,
          ...(excludeBonLivraisonId && { id: { not: excludeBonLivraisonId } }),
        },
      },
    },
  });

  return parseFloat(result._sum.quantity ?? 0);
};

/**
 * Validate that a requested quantity does not exceed:
 *   quantityAvailable  −  quantities already in other DRAFT BonLivraisons
 *
 * This prevents two DRAFT documents from collectively over-committing stock
 * even when neither would fail the plain quantityAvailable check alone.
 *
 * @param {number}      depotId
 * @param {number|null} articleId
 * @param {number|null} variantId
 * @param {number}      requestedQuantity
 * @param {string}      operation
 * @param {number|null} excludeBonLivraisonId - Pass the current BL's id when
 *                                              updating or validating an existing
 *                                              DRAFT so its own lines are not
 *                                              counted twice.
 * @throws {ApiError}
 */
export const validateStockAvailabilityForBonLivraison = async (
  depotId,
  articleId,
  variantId,
  requestedQuantity,
  operation = "operation",
  excludeBonLivraisonId = null,
) => {
  const settings = await getSystemSettings();
  if (settings.allowNegativeStock) return true;

  const currentStock = await getCurrentStock(depotId, articleId, variantId);
  const draftReserved = await getDraftReservedQuantity(
    depotId,
    articleId,
    variantId,
    excludeBonLivraisonId,
  );

  const effectiveAvailable = currentStock - draftReserved;

  if (effectiveAvailable - requestedQuantity < 0) {
    let productName = "Product";

    if (articleId) {
      const article = await prisma.article.findUnique({
        where: { id: articleId },
        select: { name: true },
      });
      productName = article?.name || "Product";
    } else if (variantId) {
      const variant = await prisma.articleVariant.findUnique({
        where: { id: variantId },
        include: {
          article: { select: { name: true } },
          variantAttributes: {
            include: { attributeValue: { select: { value: true } } },
          },
        },
      });
      if (variant) {
        const attrs = variant.variantAttributes
          .map((va) => va.attributeValue.value)
          .join(" - ");
        productName = attrs
          ? `${variant.article.name} (${attrs})`
          : variant.article.name;
      }
    }

    throw new ApiError(
      `Insufficient stock for ${operation}. ${productName}: ` +
        `Available ${currentStock}, Draft-reserved ${draftReserved}, ` +
        `Effective available ${effectiveAvailable}, Requested ${requestedQuantity}`,
      400,
    );
  }

  return true;
};

/**
 * Batch version of validateStockAvailabilityForBonLivraison.
 *
 * @param {Array}       items                 - { depotId, articleId, variantId, quantity }[]
 * @param {string}      operation
 * @param {number|null} excludeBonLivraisonId
 */
export const validateBatchStockAvailabilityForBonLivraison = async (
  items,
  operation = "operation",
  excludeBonLivraisonId = null,
) => {
  const settings = await getSystemSettings();
  if (settings.allowNegativeStock) return true;

  await Promise.all(
    items.map((item) =>
      validateStockAvailabilityForBonLivraison(
        item.depotId,
        item.articleId,
        item.variantId,
        item.quantity,
        operation,
        excludeBonLivraisonId,
      ),
    ),
  );

  return true;
};

/* ============================================================
   STOCK OPERATION WRAPPER
============================================================ */

/**
 * Execute a stock operation with validation
 *
 * @param {number} depotId - Depot ID
 * @param {number} articleId - Article ID
 * @param {number} variantId - Variant ID
 * @param {number} quantityChange - Quantity change (negative for decrease)
 * @param {string} operation - Operation description
 * @param {Function} callback - Async function to execute if validation passes
 * @returns {Promise<any>} Result of callback
 */
export const executeStockOperation = async (
  depotId,
  articleId,
  variantId,
  quantityChange,
  operation,
  callback,
) => {
  // Only validate if decreasing stock
  if (quantityChange < 0) {
    await validateStockAvailability(
      depotId,
      articleId,
      variantId,
      Math.abs(quantityChange),
      operation,
    );
  }

  // Execute the operation
  return await callback();
};

/* ============================================================
   USAGE EXAMPLES
============================================================ */

/*
// Example 1: Stock Transfer
await validateStockAvailability(
  sourceDepotId,
  articleId,
  variantId,
  transferQuantity,
  "stock transfer"
);

// Example 2: Sales Document
await validateBatchStockAvailability(
  documentLines.map(line => ({
    depotId: document.depotId,
    articleId: line.articleId,
    variantId: line.variantId,
    quantity: line.quantityReceived,
  })),
  "sales document"
);

// Example 3: With Operation Wrapper
await executeStockOperation(
  depotId,
  articleId,
  variantId,
  -10, // Decrease by 10
  "inventory adjustment",
  async () => {
    // Your stock update logic here
    return await prisma.stockByDepot.update({...});
  }
);
*/

export default {
  validateStockAvailability,
  validateBatchStockAvailability,
  validateStockAvailabilityForBonLivraison,
  validateBatchStockAvailabilityForBonLivraison,
  executeStockOperation,
  getSystemSettings,
  clearSettingsCache,
};
