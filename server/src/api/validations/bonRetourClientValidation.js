import { body, param, query } from "express-validator";

/* ============================================================
   BON RETOUR CLIENT VALIDATION RULES
============================================================ */

/* ──────────────────────────────────────────────────────────
   GET NEXT DOCUMENT NUMBER
   GET /api/bon-retour-clients/next-number
────────────────────────────────────────────────────────── */
export const getNextNumberValidator = [
  query("societeId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("societeId must be a positive integer")
    .toInt(),
];

/* ──────────────────────────────────────────────────────────
   GET ALL BON RETOUR CLIENTS
   GET /api/bon-retour-clients
────────────────────────────────────────────────────────── */
export const getAllValidator = [
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("startDate must be a valid ISO 8601 date"),

  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("endDate must be a valid ISO 8601 date")
    .custom((endDate, { req }) => {
      if (req.query.startDate && endDate) {
        if (new Date(endDate) < new Date(req.query.startDate)) {
          throw new Error("endDate cannot be before startDate");
        }
      }
      return true;
    }),
];

/* ──────────────────────────────────────────────────────────
   GET PRODUCTS
   GET /api/bon-retour-clients/products
────────────────────────────────────────────────────────── */
export const getProductsValidator = [
  query("depotId")
    .notEmpty()
    .withMessage("depotId is required")
    .isInt({ min: 1 })
    .withMessage("depotId must be a positive integer")
    .toInt(),

  query("priceField")
    .optional()
    .isIn(["prixVente1", "prixVente2", "prixVente3"])
    .withMessage("priceField must be prixVente1, prixVente2 or prixVente3"),
];

/* ──────────────────────────────────────────────────────────
   CREATE BON RETOUR CLIENT
   POST /api/bon-retour-clients
────────────────────────────────────────────────────────── */
export const createValidator = [
  body("clientId")
    .notEmpty()
    .withMessage("clientId is required")
    .isInt({ min: 1 })
    .withMessage("clientId must be a positive integer")
    .toInt(),

  body("depotId")
    .notEmpty()
    .withMessage("depotId is required")
    .isInt({ min: 1 })
    .withMessage("depotId must be a positive integer")
    .toInt(),

  body("bonLivraisonId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("bonLivraisonId must be a positive integer")
    .toInt(),

  body("documentDate")
    .optional()
    .isISO8601()
    .withMessage("documentDate must be a valid ISO 8601 date"),

  body("dateRetour")
    .optional()
    .isISO8601()
    .withMessage("dateRetour must be a valid ISO 8601 date"),

  body("status")
    .optional()
    .isIn(["DRAFT", "COMPLETED"])
    .withMessage("status must be DRAFT or COMPLETED"),

  body("notes")
    .optional()
    .isString()
    .withMessage("notes must be a string")
    .isLength({ max: 1000 })
    .withMessage("notes cannot exceed 1000 characters"),

  body("lines")
    .isArray({ min: 1 })
    .withMessage("lines must be a non-empty array"),

  body("lines.*.articleId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("lines[].articleId must be a positive integer")
    .toInt(),

  body("lines.*.variantId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("lines[].variantId must be a positive integer")
    .toInt(),

  body("lines.*.quantity")
    .notEmpty()
    .withMessage("lines[].quantity is required")
    .isFloat({ min: 0.001 })
    .withMessage("lines[].quantity must be greater than 0")
    .toFloat(),

  body("lines.*.unitPrice")
    .notEmpty()
    .withMessage("lines[].unitPrice (TTC) is required")
    .isFloat({ min: 0.01 })
    .withMessage("lines[].unitPrice must be greater than 0")
    .toFloat(),

  body("lines.*.remise")
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage("lines[].remise must be a decimal between 0 and 1")
    .toFloat(),

  body("lines.*.priceField")
    .notEmpty()
    .withMessage("lines[].priceField is required")
    .isIn(["prixVente1", "prixVente2", "prixVente3"])
    .withMessage(
      "lines[].priceField must be prixVente1, prixVente2, or prixVente3",
    ),
];

/* ──────────────────────────────────────────────────────────
   GET / DELETE BY ID
────────────────────────────────────────────────────────── */
export const idValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("id must be a positive integer")
    .toInt(),
];

/* ──────────────────────────────────────────────────────────
   VALIDATE STATUS TRANSITION
   PUT /api/bon-retour-clients/:id/validate
────────────────────────────────────────────────────────── */
export const validateStatusValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("id must be a positive integer")
    .toInt(),

  body("targetStatus")
    .notEmpty()
    .withMessage("targetStatus is required")
    .isIn(["COMPLETED", "DRAFT"])
    .withMessage("targetStatus must be COMPLETED or DRAFT"),
];

/* ──────────────────────────────────────────────────────────
   UPDATE BON RETOUR CLIENT
   PUT /api/bon-retour-clients/:id
────────────────────────────────────────────────────────── */
export const updateValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("id must be a positive integer")
    .toInt(),

  body("clientId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("clientId must be a positive integer")
    .toInt(),

  body("depotId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("depotId must be a positive integer")
    .toInt(),

  body("bonLivraisonId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("bonLivraisonId must be a positive integer")
    .toInt(),

  body("documentDate")
    .optional()
    .isISO8601()
    .withMessage("documentDate must be a valid ISO 8601 date"),

  body("dateRetour")
    .optional()
    .isISO8601()
    .withMessage("dateRetour must be a valid ISO 8601 date"),

  body("notes")
    .optional()
    .isString()
    .withMessage("notes must be a string")
    .isLength({ max: 1000 })
    .withMessage("notes cannot exceed 1000 characters"),

  // Lines are optional in update (Mode 1 vs Mode 2)
  body("lines")
    .optional()
    .isArray({ min: 1 })
    .withMessage("lines must be a non-empty array when provided"),

  body("lines.*.id")
    .optional()
    .isInt({ min: 1 })
    .withMessage("lines[].id must be a positive integer")
    .toInt(),

  body("lines.*.articleId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("lines[].articleId must be a positive integer")
    .toInt(),

  body("lines.*.variantId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("lines[].variantId must be a positive integer")
    .toInt(),

  body("lines.*.quantity")
    .optional()
    .isFloat({ min: 0.001 })
    .withMessage("lines[].quantity must be greater than 0")
    .toFloat(),

  body("lines.*.unitPrice")
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage("lines[].unitPrice must be greater than 0")
    .toFloat(),

  body("lines.*.remise")
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage("lines[].remise must be a decimal between 0 and 1")
    .toFloat(),

  body("lines.*.priceField")
    .optional()
    .isIn(["prixVente1", "prixVente2", "prixVente3"])
    .withMessage(
      "lines[].priceField must be prixVente1, prixVente2, or prixVente3",
    ),
];
