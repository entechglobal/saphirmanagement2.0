import prisma from "../../loaders/prisma.js";
import ApiError from "./apiError.js";

/* ============================================================
   PRODUCT VISIBILITY UTILITY
   Centralized visibility rules for articles and variants
============================================================ */

/* ============================================================
   VISIBILITY FILTER BUILDERS
============================================================ */

/**
 * Build visibility filter for Article queries
 *
 * @param {boolean} includeInvisible - Whether to include invisible articles (default: false)
 * @returns {Object} Prisma where clause for article visibility
 */
export const buildArticleVisibilityFilter = (includeInvisible = false) => {
  if (includeInvisible) {
    return {}; // No filter
  }

  return {
    visible: true,
  };
};

/**
 * Build visibility filter for ArticleVariant queries
 * Variant is visible only if its parent Article is visible
 *
 * @param {boolean} includeInvisible - Whether to include invisible variants (default: false)
 * @returns {Object} Prisma where clause for variant visibility
 */
export const buildVariantVisibilityFilter = (includeInvisible = false) => {
  if (includeInvisible) {
    return {}; // No filter
  }

  return {
    article: {
      visible: true, // Parent article must be visible
    },
  };
};

/**
 * Build combined filter for queries that include both articles and variants
 *
 * @param {boolean} includeInvisible - Whether to include invisible products (default: false)
 * @returns {Object} Combined visibility filter
 */
export const buildProductVisibilityFilter = (includeInvisible = false) => {
  if (includeInvisible) {
    return {};
  }

  return {
    OR: [
      // For articles
      {
        articleId: { not: null },
        article: { visible: true },
      },
      // For variants
      {
        variantId: { not: null },
        variant: {
          article: { visible: true },
        },
      },
    ],
  };
};

/* ============================================================
   VISIBILITY VALIDATION
============================================================ */

/**
 * Check if an article is visible
 *
 * @param {number} articleId - Article ID
 * @returns {Promise<boolean>} True if visible, false otherwise
 * @throws {ApiError} If article not found
 */
export const isArticleVisible = async (articleId) => {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { visible: true },
  });

  if (!article) {
    throw new ApiError("Article not found", 404);
  }

  return article.visible;
};

/**
 * Check if a variant is visible (based on parent article)
 *
 * @param {number} variantId - Variant ID
 * @returns {Promise<boolean>} True if visible, false otherwise
 * @throws {ApiError} If variant not found
 */
export const isVariantVisible = async (variantId) => {
  const variant = await prisma.articleVariant.findUnique({
    where: { id: variantId },
    include: {
      article: {
        select: { visible: true },
      },
    },
  });

  if (!variant) {
    throw new ApiError("Variant not found", 404);
  }

  return variant.article.visible;
};

/**
 * Validate that a product (article or variant) is visible
 * Used in operations like transfers, sales, purchases
 *
 * @param {number} articleId - Article ID (optional)
 * @param {number} variantId - Variant ID (optional)
 * @param {string} operation - Operation name for error message
 * @throws {ApiError} If product is not visible
 */
export const validateProductVisibility = async (
  articleId,
  variantId,
  operation = "operation",
) => {
  let isVisible = false;
  let productName = "Product";

  if (articleId) {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: { visible: true, name: true },
    });

    if (!article) {
      throw new ApiError("Article not found", 404);
    }

    isVisible = article.visible;
    productName = article.name;
  } else if (variantId) {
    const variant = await prisma.articleVariant.findUnique({
      where: { id: variantId },
      include: {
        article: {
          select: { visible: true, name: true },
        },
        variantAttributes: {
          include: {
            attributeValue: { select: { value: true } },
          },
        },
      },
    });

    if (!variant) {
      throw new ApiError("Variant not found", 404);
    }

    isVisible = variant.article.visible;

    const attrs = variant.variantAttributes
      .map((va) => va.attributeValue.value)
      .join(" - ");
    productName = attrs
      ? `${variant.article.name} (${attrs})`
      : variant.article.name;
  }

  if (!isVisible) {
    throw new ApiError(
      `Cannot perform ${operation} on invisible product: ${productName}`,
      400,
    );
  }

  return true;
};

/**
 * Validate visibility for multiple products (batch validation)
 *
 * @param {Array} items - Array of { articleId, variantId }
 * @param {string} operation - Operation name
 * @throws {ApiError} If any product is not visible
 */
export const validateBatchProductVisibility = async (
  items,
  operation = "operation",
) => {
  const validationPromises = items.map((item) =>
    validateProductVisibility(item.articleId, item.variantId, operation),
  );

  await Promise.all(validationPromises);

  return true;
};

/* ============================================================
   QUERY HELPERS
============================================================ */

/**
 * Get visible articles
 *
 * @param {Object} filters - Additional filters
 * @returns {Promise<Array>} Visible articles
 */
export const getVisibleArticles = async (filters = {}) => {
  return await prisma.article.findMany({
    where: {
      ...filters,
      ...buildArticleVisibilityFilter(),
    },
  });
};

/**
 * Get visible variants
 *
 * @param {Object} filters - Additional filters
 * @returns {Promise<Array>} Visible variants
 */
export const getVisibleVariants = async (filters = {}) => {
  return await prisma.articleVariant.findMany({
    where: {
      ...filters,
      ...buildVariantVisibilityFilter(),
    },
  });
};

/* ============================================================
   USAGE EXAMPLES
============================================================ */

/*
// Example 1: Query Articles for Dropdown
const articles = await prisma.article.findMany({
  where: {
    familyId: 2,
    ...buildArticleVisibilityFilter(), // Only visible articles
  },
});

// Example 2: Query Variants for Stock Transfer
const variants = await prisma.articleVariant.findMany({
  where: {
    articleId: 5,
    ...buildVariantVisibilityFilter(), // Only variants of visible articles
  },
});

// Example 3: Validate Before Transfer
await validateProductVisibility(
  articleId,
  variantId,
  "stock transfer"
);

// Example 4: Validate Batch (Document Lines)
await validateBatchProductVisibility(
  documentLines.map(line => ({
    articleId: line.articleId,
    variantId: line.variantId,
  })),
  "sales document"
);

// Example 5: Stock Transactions with Visibility Filter
const transactions = await prisma.stockTransaction.findMany({
  where: {
    depotId: 1,
    ...buildProductVisibilityFilter(), // Only transactions for visible products
  },
});
*/

export default {
  buildArticleVisibilityFilter,
  buildVariantVisibilityFilter,
  buildProductVisibilityFilter,
  isArticleVisible,
  isVariantVisible,
  validateProductVisibility,
  validateBatchProductVisibility,
  getVisibleArticles,
  getVisibleVariants,
};
