import { Router } from "express";
import * as ArticleController from "../controllers/articleController.js";
import { auth } from "../middlewares/authMiddleware.js";
import { hasPermission } from "../middlewares/rbacMiddleware.js";
import {
  uploadArticleImage,
  resizeArticleImage,
} from "../services/articleService.js";
import {
  createArticleValidator,
  updateArticleValidator,
  getArticleValidator,
  deleteArticleValidator,
  getArticlesByFamilyValidator,
  getProductsValidator,
} from "../validations/articleValidation.js";
import uploadFile from "../utils/uploadFiles.js";

const router = Router();

// ============================================
// ALL ROUTES REQUIRE AUTHENTICATION
// ============================================
router.use(auth); // ⭐ Authenticate all requests

// ============================================
// SPECIAL ROUTES (Must be BEFORE /:id)
// ============================================

/**
 * Export Articles to CSV
 * Note: Articles are GLOBAL resources
 *
 * GET /api/articles/export/csv
 * Access: Authenticated
 */
router.get("/export/csv", ArticleController.exportArticlesCSV);

/**
 * Export Articles to Excel
 * Note: Articles are GLOBAL resources
 *
 * GET /api/articles/export/excel
 * Access: Authenticated
 */
router.get("/export/excel", ArticleController.exportArticlesExcel);

/**
 * Import Articles from CSV
 * Note: Articles are GLOBAL - available to all sociétés
 *
 * POST /api/articles/import/csv
 * Body: FormData with file
 * Access: Authenticated + Permission
 */
router.post(
  "/import/csv",
  hasPermission("import_articles"),
  uploadFile,
  ArticleController.importArticlesCSV,
);

/**
 * Import Articles from Excel
 * Note: Articles are GLOBAL - available to all sociétés
 *
 * POST /api/articles/import/excel
 * Body: FormData with file
 * Access: Authenticated + Permission
 */
router.post(
  "/import/excel",
  hasPermission("import_articles"),
  uploadFile,
  ArticleController.importArticlesExcel,
);

/**
 * Get Articles by Family
 *
 * GET /api/articles/family/:familyId
 * Access: Authenticated
 */
router.get(
  "/family/:familyId",
  getArticlesByFamilyValidator,
  ArticleController.getArticlesByFamily,
);

/**
 * ⭐ CRITICAL: Must be BEFORE /:id
 *
 * Get Unified Products List
 * Returns a flat list of:
 * - Articles WITHOUT variants
 * - Article Variants (for articles WITH variants)
 *
 * Each item includes stock from StockByDepot for the specified depot
 *
 * GET /api/articles/unified?depotId=1&familyId=5
 *
 * Query Params:
 * - depotId (required): Filter by depot and get stock quantities
 * - familyId (optional): Filter by product family
 * - search (optional): Search in barcode or name
 * - page (optional): Page number (default: 1)
 * - limit (optional): Items per page (default: 50)
 *
 * Access: Authenticated users
 */
router.get(
  "/unified",
  getProductsValidator,
  ArticleController.getUnifiedProducts,
);

// ============================================
// ARTICLE CRUD ROUTES
// ============================================

/**
 * Get All Articles
 * Note: Articles are GLOBAL resources shared across all sociétés
 *
 * GET /api/articles?page=1&limit=10&search=&familyId=&visible=true
 * Query Params:
 * - page: Page number
 * - limit: Items per page
 * - search: Search in barcode, name
 * - familyId: Filter by family
 * - visible: true/false
 * - sort: Sort field
 *
 * Access: Authenticated
 */
router.get("/", ArticleController.getAllArticles);

/**
 * Get Article by ID
 *
 * GET /api/articles/:id
 * Access: Authenticated
 */
router.get("/:id", getArticleValidator, ArticleController.getArticleById);

/**
 * Create New Article
 * Note: Creates GLOBAL article available to all sociétés
 * Pricing can be customized per société via SocietePricing
 *
 * POST /api/articles
 * Body: { barcode, name, familyId, unitePrincipaleId, ... }
 * Access: Authenticated + Permission
 */
router.post(
  "/",
  hasPermission("create_articles"),
  uploadArticleImage,
  createArticleValidator,
  resizeArticleImage,
  ArticleController.createArticle,
);

/**
 * Update Article
 * Note: Updates GLOBAL article (affects all sociétés)
 *
 * PUT /api/articles/:id
 * Body: { name, prixAchat, ... }
 * Access: Authenticated + Permission
 */
router.put(
  "/:id",
  hasPermission("update_articles"),
  uploadArticleImage,
  updateArticleValidator,
  resizeArticleImage,
  ArticleController.updateArticle,
);

/**
 * Delete Article
 * Note: Deletes GLOBAL article
 * Cannot delete if article has active documents or stock
 *
 * DELETE /api/articles/:id
 * Access: Authenticated + Permission
 */
router.delete(
  "/:id",
  hasPermission("delete_articles"),
  deleteArticleValidator,
  ArticleController.deleteArticle,
);

export default router;
