import { check, param, body } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";
import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";

// ============================================
// CREATE VARIANT VALIDATOR
// ============================================
export const createVariantValidator = [
  // Article ID validation (required)
  check("articleId")
    .notEmpty()
    .withMessage("Article ID is required")
    .isInt({ min: 1 })
    .withMessage("Article ID must be a positive integer")
    .custom(async (articleId) => {
      const article = await prisma.article.findUnique({
        where: { id: parseInt(articleId) },
      });

      if (!article) {
        throw new ApiError("Article not found", 404);
      }

      return true;
    }),

  // Barcode validation (required, globally unique)
  check("barcode")
    .notEmpty()
    .withMessage("Variant barcode is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Variant barcode must be between 2 and 50 characters")
    .trim()
    .custom(async (barcode) => {
      const existingVariant = await prisma.articleVariant.findUnique({
        where: { barcode },
      });

      if (existingVariant) {
        throw new ApiError("Variant barcode already exists", 409);
      }

      return true;
    }),
  // Attributes validation (required, non-empty array)
  check("attributes")
    .notEmpty()
    .withMessage("Attributes are required")
    .isArray({ min: 1 })
    .withMessage("Attributes must be a non-empty array"),

  check("attributes.*.attributeId")
    .notEmpty()
    .withMessage("Each attribute must have attributeId")
    .isInt({ min: 1 })
    .withMessage("Attribute ID must be a positive integer"),

  check("attributes.*.attributeValueId")
    .notEmpty()
    .withMessage("Each attribute must have attributeValueId")
    .isInt({ min: 1 })
    .withMessage("Attribute Value ID must be a positive integer"),

  validatorMiddleware,
];

// ============================================
// UPDATE VARIANT VALIDATOR
// ============================================
export const updateVariantValidator = [
  // ID validation
  param("id")
    .isInt({ min: 1 })
    .withMessage("ID must be a positive integer")
    .toInt(),

  // Barcode validation (optional in update, globally unique if changed)
  check("barcode")
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage("Variant barcode must be between 2 and 50 characters")
    .trim()
    .custom(async (barcode, { req }) => {
      const existingVariant = await prisma.articleVariant.findUnique({
        where: { barcode },
      });

      // Check if barcode exists and belongs to different variant
      if (existingVariant && existingVariant.id !== parseInt(req.params.id)) {
        throw new ApiError("Variant barcode already exists", 409);
      }

      return true;
    }),

  // Note: Attributes cannot be updated via this endpoint
  // Use PATCH /:id/attributes instead

  validatorMiddleware,
];

// ============================================
// GET VARIANT BY ID VALIDATOR
// ============================================
export const getVariantValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("ID must be a positive integer")
    .toInt(),

  validatorMiddleware,
];

// ============================================
// DELETE VARIANT VALIDATOR
// ============================================
export const deleteVariantValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("ID must be a positive integer")
    .toInt(),

  validatorMiddleware,
];

// ============================================
// GET VARIANTS BY ARTICLE VALIDATOR
// ============================================
export const getVariantsByArticleValidator = [
  param("articleId")
    .isInt({ min: 1 })
    .withMessage("Article ID must be a positive integer")
    .toInt()
    .custom(async (articleId) => {
      const article = await prisma.article.findUnique({
        where: { id: parseInt(articleId) },
      });

      if (!article) {
        throw new ApiError("Article not found", 404);
      }

      return true;
    }),

  validatorMiddleware,
];

// ============================================
// CREATE BULK VARIANTS VALIDATOR
// ============================================
export const createBulkVariantsValidator = [
  param("articleId")
    .isInt({ min: 1 })
    .withMessage("Article ID must be a positive integer")
    .toInt()
    .custom(async (articleId) => {
      const article = await prisma.article.findUnique({
        where: { id: parseInt(articleId) },
      });

      if (!article) {
        throw new ApiError("Article not found", 404);
      }

      return true;
    }),

  body("variants")
    .isArray({ min: 1 })
    .withMessage("Variants must be a non-empty array"),

  body("variants.*.barcode")
    .notEmpty()
    .withMessage("Each variant must have a barcode")
    .isLength({ min: 2, max: 50 })
    .withMessage("Barcode must be between 2 and 50 characters"),

  body("variants.*.attributes")
    .notEmpty()
    .withMessage("Each variant must have attributes")
    .isArray({ min: 1 })
    .withMessage("Attributes must be a non-empty array"),

  body("variants.*.attributes.*.attributeId")
    .notEmpty()
    .withMessage("Each attribute must have attributeId")
    .isInt({ min: 1 })
    .withMessage("Attribute ID must be a positive integer"),

  body("variants.*.attributes.*.attributeValueId")
    .notEmpty()
    .withMessage("Each attribute must have attributeValueId")
    .isInt({ min: 1 })
    .withMessage("Attribute Value ID must be a positive integer"),

  validatorMiddleware,
];

// ============================================
// UPDATE VARIANT ATTRIBUTES VALIDATOR
// ============================================
export const updateVariantAttributesValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("ID must be a positive integer")
    .toInt(),

  check("attributes")
    .notEmpty()
    .withMessage("Attributes are required")
    .isArray({ min: 1 })
    .withMessage("Attributes must be a non-empty array"),

  check("attributes.*.attributeId")
    .notEmpty()
    .withMessage("Each attribute must have attributeId")
    .isInt({ min: 1 })
    .withMessage("Attribute ID must be a positive integer"),

  check("attributes.*.attributeValueId")
    .notEmpty()
    .withMessage("Each attribute must have attributeValueId")
    .isInt({ min: 1 })
    .withMessage("Attribute Value ID must be a positive integer"),

  validatorMiddleware,
];
