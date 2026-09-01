import { body, param } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";
import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";

/* ============================================================
   CREATE STOCK VALIDATOR
============================================================ */
export const createStockValidator = [
  // depotId: optional for regular users (defaults to PRINCIPAL depot), required for super admin
  body("depotId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("depotId must be a positive integer")
    .toInt(),

  // articleId: optional but mutually exclusive with variantId
  body("articleId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("articleId must be a positive integer")
    .toInt()
    .custom(async (articleId, { req }) => {
      if (articleId && req.body.variantId) {
        throw new ApiError(
          "Provide either articleId OR variantId, not both.",
          400,
        );
      }
      if (articleId) {
        const article = await prisma.article.findUnique({
          where: { id: articleId },
        });
        if (!article) throw new ApiError("Article not found", 404);
      }
      return true;
    }),

  // variantId: optional but mutually exclusive with articleId
  body("variantId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("variantId must be a positive integer")
    .toInt()
    .custom(async (variantId, { req }) => {
      if (variantId && req.body.articleId) {
        throw new ApiError(
          "Provide either articleId OR variantId, not both.",
          400,
        );
      }
      if (variantId) {
        const variant = await prisma.articleVariant.findUnique({
          where: { id: variantId },
        });
        if (!variant) throw new ApiError("Variant not found", 404);
      }
      return true;
    }),

  // At least one product reference required
  body().custom((_, { req }) => {
    if (!req.body.articleId && !req.body.variantId) {
      throw new ApiError("Either articleId or variantId is required.", 400);
    }
    return true;
  }),

  body("quantityAvailable")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("quantityAvailable must be >= 0")
    .toFloat(),

  body("quantityReserved")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("quantityReserved must be >= 0")
    .toFloat(),

  body("quantityInTransit")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("quantityInTransit must be >= 0")
    .toFloat(),

  body("alertThreshold")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("alertThreshold must be >= 0")
    .toFloat(),

  body("location")
    .optional({ nullable: true })
    .isLength({ max: 50 })
    .withMessage("location must be 50 characters or fewer")
    .trim(),

  body("lastInventoryDate")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("lastInventoryDate must be a valid ISO 8601 date"),

  validatorMiddleware,
];

/* ============================================================
   UPDATE STOCK VALIDATOR
   articleId / variantId / depotId are immutable — reject if sent.
============================================================ */
export const updateStockValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("ID must be a positive integer")
    .toInt(),

  // Immutable fields — hard reject if caller tries to change them
  body("articleId")
    .not()
    .exists()
    .withMessage(
      "articleId cannot be updated. Delete and recreate if you need to change it.",
    ),

  body("variantId")
    .not()
    .exists()
    .withMessage(
      "variantId cannot be updated. Delete and recreate if you need to change it.",
    ),

  body("depotId")
    .not()
    .exists()
    .withMessage(
      "depotId cannot be updated. Delete and recreate if you need to change it.",
    ),

  body("quantityAvailable")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("quantityAvailable must be >= 0")
    .toFloat(),

  body("quantityReserved")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("quantityReserved must be >= 0")
    .toFloat(),

  body("quantityInTransit")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("quantityInTransit must be >= 0")
    .toFloat(),

  body("alertThreshold")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("alertThreshold must be >= 0")
    .toFloat(),

  body("location")
    .optional({ nullable: true })
    .isLength({ max: 50 })
    .withMessage("location must be 50 characters or fewer")
    .trim(),

  body("lastInventoryDate")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("lastInventoryDate must be a valid ISO 8601 date"),

  validatorMiddleware,
];

/* ============================================================
   BULK CREATE VALIDATOR
============================================================ */
export const createBulkStockValidator = [
  body("entries")
    .notEmpty()
    .withMessage("entries array is required")
    .isArray({ min: 1, max: 100 })
    .withMessage("entries must be an array of 1–100 items"),

  body("entries.*.depotId")
    .notEmpty()
    .withMessage("Each entry must have a depotId")
    .isInt({ min: 1 })
    .withMessage("depotId must be a positive integer")
    .toInt(),

  body("entries.*.articleId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("articleId must be a positive integer")
    .toInt(),

  body("entries.*.variantId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("variantId must be a positive integer")
    .toInt(),

  body("entries.*.quantityAvailable")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("quantityAvailable must be >= 0")
    .toFloat(),

  validatorMiddleware,
];

/* ============================================================
   STOCK ID PARAM VALIDATOR
============================================================ */
export const stockIdValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("ID must be a positive integer")
    .toInt(),

  validatorMiddleware,
];

/* ============================================================
   DEPOT ID PARAM VALIDATOR
   Only validates the param is a positive integer.
   depotFilter middleware (on the route) handles the DB lookup,
   active check, and société ownership — no DB call here to avoid
   double-fetching.
============================================================ */
export const depotIdParamValidator = [
  param("depotId")
    .isInt({ min: 1 })
    .withMessage("depotId must be a positive integer")
    .toInt(),

  validatorMiddleware,
];

/* ============================================================
   ARTICLE ID PARAM VALIDATOR
   Validates the param is a positive integer and that the article
   exists. (Articles are global — no société check needed.)
============================================================ */

export const articleIdParamValidator = [
  param("articleId")
    .isInt({ min: 1 })
    .withMessage("articleId must be a positive integer")
    .toInt()
    .custom(async (articleId) => {
      const article = await prisma.article.findUnique({
        where: { id: articleId },
      });
      if (!article) throw new ApiError("Article not found", 404);
      return true;
    }),

  validatorMiddleware,
];

/* ============================================================
   VARIANT ID PARAM VALIDATOR
   Validates the param is a positive integer and that the variant
   exists. Includes the parent article in the error message so the
   caller knows which article the variant belongs to.
============================================================ */
export const variantIdParamValidator = [
  param("variantId")
    .isInt({ min: 1 })
    .withMessage("variantId must be a positive integer")
    .toInt()
    .custom(async (variantId) => {
      const variant = await prisma.articleVariant.findUnique({
        where: { id: variantId },
        select: { id: true },
      });
      if (!variant) throw new ApiError("Variant not found", 404);
      return true;
    }),

  validatorMiddleware,
];
