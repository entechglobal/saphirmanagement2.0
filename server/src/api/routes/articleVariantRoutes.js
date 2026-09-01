import { Router } from "express";
import * as ArticleVariantController from "../controllers/articleVariantController.js";
import { auth } from "../middlewares/authMiddleware.js";
import { hasPermission } from "../middlewares/rbacMiddleware.js";
import {
  createVariantValidator,
  updateVariantValidator,
  getVariantValidator,
  deleteVariantValidator,
  getVariantsByArticleValidator,
  createBulkVariantsValidator,
  updateVariantAttributesValidator,
} from "../validations/articleVariantValidation.js";

const router = Router();

// ============================================
// ALL ROUTES REQUIRE AUTHENTICATION
// ============================================
router.use(auth); // ⭐ Authenticate all requests

// ============================================
// SPECIAL ROUTES (Must be before /:id)
// ============================================

/**
 * Get Variants by Article
 *
 * GET /api/article-variants/article/:articleId
 * Access: Authenticated
 */
router.get(
  "/article/:articleId",
  getVariantsByArticleValidator,
  ArticleVariantController.getVariantsByArticle,
);

/**
 * Create Multiple Variants (Bulk)
 * Creates multiple variants for a single article
 *
 * POST /api/article-variants/bulk/:articleId
 * Body: { variants: [{ barcode, name, attributes, ... }] }
 * Access: Authenticated + Permission
 */
router.post(
  "/bulk/:articleId",
  hasPermission("create_variants"),
  createBulkVariantsValidator,
  ArticleVariantController.createBulkVariants,
);

// ============================================
// VARIANT CRUD ROUTES
// ============================================

/**
 * Get All Variants
 * Note: Variants are GLOBAL resources shared across all sociétés
 *
 * GET /api/article-variants?page=1&limit=10&search=&articleId=
 * Query Params:
 * - page: Page number
 * - limit: Items per page
 * - search: Search in barcode, name
 * - articleId: Filter by article
 * - sort: Sort field
 *
 * Access: Authenticated
 */
router.get("/", ArticleVariantController.getAllVariants);

/**
 * Get Variant by ID
 *
 * GET /api/article-variants/:id
 * Access: Authenticated
 */
router.get(
  "/:id",
  getVariantValidator,
  ArticleVariantController.getVariantById,
);

/**
 * Create New Variant
 * Note: Creates GLOBAL variant available to all sociétés
 *
 * POST /api/article-variants
 * Body: { articleId, barcode, name, attributes: [{ attributeId, attributeValueId }] }
 * Access: Authenticated + Permission
 */
router.post(
  "/",
  hasPermission("create_variants"),
  createVariantValidator,
  ArticleVariantController.createVariant,
);

/**
 * Update Variant (Basic Info)
 * Updates barcode, name, and stock fields only
 * Use PATCH /:id/attributes to update attributes
 *
 * PUT /api/article-variants/:id
 * Body: { barcode?, name?, stockDisponible?, stockAlerte? }
 * Access: Authenticated + Permission
 */
router.put(
  "/:id",
  hasPermission("update_variants"),
  updateVariantValidator,
  ArticleVariantController.updateVariant,
);

/**
 * Delete Variant
 * Note: Deletes GLOBAL variant
 *
 * DELETE /api/article-variants/:id
 * Access: Authenticated + Permission
 */
router.delete(
  "/:id",
  hasPermission("delete_variants"),
  deleteVariantValidator,
  ArticleVariantController.deleteVariant,
);

// ============================================
// ATTRIBUTE OPERATIONS
// ============================================

/**
 * Update Variant Attributes
 * Replaces all attributes for a variant
 *
 * PATCH /api/article-variants/:id/attributes
 * Body: { attributes: [{ attributeId, attributeValueId }] }
 * Access: Authenticated + Permission
 */
router.patch(
  "/:id/attributes",
  hasPermission("update_variants"),
  updateVariantAttributesValidator,
  ArticleVariantController.updateVariantAttributes,
);

export default router;
