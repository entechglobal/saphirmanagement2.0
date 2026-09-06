import { body, param } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";

// Pricing strategy — at least one of the three groups must be provided.
// Cross-field validation (strategy completeness) is enforced in the service.
export const createValidator = [
  body("barcode")
    .notEmpty().withMessage("barcode is required")
    .isLength({ max: 50 }).withMessage("barcode cannot exceed 50 characters"),

  body("name")
    .notEmpty().withMessage("name is required")
    .isLength({ max: 255 }).withMessage("name cannot exceed 255 characters"),

  // Strategy 1: Cost-based
  body("coutRevient")
    .optional()
    .isFloat({ min: 0 }).withMessage("coutRevient must be >= 0")
    .toFloat(),

  body("tauxMarge")
    .optional()
    .isFloat({ min: 0 }).withMessage("tauxMarge must be >= 0")
    .toFloat(),

  // Strategy 2: Discount-based
  body("montantVenteArticles")
    .optional()
    .isFloat({ min: 0 }).withMessage("montantVenteArticles must be >= 0")
    .toFloat(),

  body("remise")
    .optional()
    .isFloat({ min: 0 }).withMessage("remise must be >= 0")
    .toFloat(),

  // Strategy 3: Manual
  body("prixVentePack")
    .optional()
    .isFloat({ min: 0.01 }).withMessage("prixVentePack must be > 0")
    .toFloat(),

  body("commission")
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage("commission must be >= 0")
    .toFloat(),

  body("components")
    .isArray({ min: 1 }).withMessage("components must be a non-empty array"),

  body("components.*.articleId")
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage("components[].articleId must be a positive integer")
    .toInt(),

  body("components.*.variantId")
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage("components[].variantId must be a positive integer")
    .toInt(),

  body("components.*.quantity")
    .notEmpty().withMessage("components[].quantity is required")
    .isFloat({ min: 0.001 }).withMessage("components[].quantity must be > 0")
    .toFloat(),

  body("components.*.priceField")
    .notEmpty().withMessage("components[].priceField is required")
    .isIn(["prixVente1", "prixVente2", "prixVente3"])
    .withMessage("components[].priceField must be prixVente1, prixVente2, or prixVente3"),

  validatorMiddleware,
];

export const updateValidator = [
  param("id")
    .isInt({ min: 1 }).withMessage("id must be a positive integer")
    .toInt(),

  body("barcode")
    .optional()
    .isLength({ max: 50 }).withMessage("barcode cannot exceed 50 characters"),

  body("name")
    .optional()
    .isLength({ max: 255 }).withMessage("name cannot exceed 255 characters"),

  body("coutRevient")
    .optional()
    .isFloat({ min: 0 }).withMessage("coutRevient must be >= 0")
    .toFloat(),

  body("tauxMarge")
    .optional()
    .isFloat({ min: 0 }).withMessage("tauxMarge must be >= 0")
    .toFloat(),

  body("montantVenteArticles")
    .optional()
    .isFloat({ min: 0 }).withMessage("montantVenteArticles must be >= 0")
    .toFloat(),

  body("remise")
    .optional()
    .isFloat({ min: 0 }).withMessage("remise must be >= 0")
    .toFloat(),

  body("prixVentePack")
    .optional()
    .isFloat({ min: 0.01 }).withMessage("prixVentePack must be > 0")
    .toFloat(),

  body("commission")
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage("commission must be >= 0")
    .toFloat(),

  body("active")
    .optional()
    .isBoolean().withMessage("active must be a boolean"),

  body("components")
    .optional()
    .isArray({ min: 1 }).withMessage("components must be a non-empty array"),

  body("components.*.articleId")
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage("components[].articleId must be a positive integer")
    .toInt(),

  body("components.*.variantId")
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage("components[].variantId must be a positive integer")
    .toInt(),

  body("components.*.quantity")
    .optional()
    .isFloat({ min: 0.001 }).withMessage("components[].quantity must be > 0")
    .toFloat(),

  validatorMiddleware,
];

export const idValidator = [
  param("id")
    .isInt({ min: 1 }).withMessage("id must be a positive integer")
    .toInt(),
  validatorMiddleware,
];
