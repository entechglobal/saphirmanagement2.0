import { body, param, query } from "express-validator";

/* ============================================================
   BON LIVRAISON VALIDATION RULES
============================================================ */

/* ──────────────────────────────────────────────────────────
   GET NEXT DOCUMENT NUMBER
   GET /api/bon-livraisons/next-number
────────────────────────────────────────────────────────── */
export const getNextNumberValidator = [
  query("societeId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("societeId must be a positive integer")
    .toInt(),
];

/* ──────────────────────────────────────────────────────────
   GET ALL BON LIVRAISONS
   GET /api/bon-livraisons
────────────────────────────────────────────────────────── */
export const getAllValidator = [
  query("clientId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("clientId must be a positive integer")
    .toInt(),

  query("depotId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("depotId must be a positive integer")
    .toInt(),

  query("status")
    .optional()
    .isIn(["DRAFT", "CONFIRMED", "PARTIAL", "COMPLETED", "CANCELLED"])
    .withMessage(
      "status must be DRAFT, CONFIRMED, PARTIAL, COMPLETED or CANCELLED",
    ),

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
   GET PRODUCTS FOR BON LIVRAISON
   GET /api/bon-livraisons/products
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

  query("search")
    .optional()
    .isString()
    .withMessage("search must be a string")
    .isLength({ min: 1 })
    .withMessage("search cannot be empty"),

  query("categoryId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("categoryId must be a positive integer")
    .toInt(),

  query("familyId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("familyId must be a positive integer")
    .toInt(),
];

/* ──────────────────────────────────────────────────────────
   CREATE BON LIVRAISON
   POST /api/bon-livraisons
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

  body("deliveryId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("deliveryId must be a positive integer")
    .toInt(),

  body("commandeId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("commandeId must be a positive integer")
    .toInt(),

  body("documentDate")
    .optional()
    .isISO8601()
    .withMessage("documentDate must be a valid ISO 8601 date"),

  body("dateLivraison")
    .optional()
    .isISO8601()
    .withMessage("dateLivraison must be a valid ISO 8601 date"),

  body("status")
    .optional()
    .isIn(["DRAFT", "CONFIRMED", "COMPLETED"])
    .withMessage("status must be DRAFT, CONFIRMED or COMPLETED"),

  body("notes")
    .optional()
    .isString()
    .withMessage("notes must be a string")
    .isLength({ max: 1000 })
    .withMessage("notes cannot exceed 1000 characters"),

  body("internalNotes")
    .optional()
    .isString()
    .withMessage("internalNotes must be a string")
    .isLength({ max: 1000 })
    .withMessage("internalNotes cannot exceed 1000 characters"),

  body("lines")
    .optional()
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

  body("lines.*.priceField")
    .notEmpty()
    .withMessage("lines[].priceField is required")
    .isIn(["prixVente1", "prixVente2", "prixVente3"])
    .withMessage("lines[].priceField must be prixVente1, prixVente2 or prixVente3"),

  body("lines.*.discount")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("lines[].discount must be between 0 and 100")
    .toFloat(),

  body("lines.*.description")
    .optional()
    .isString()
    .withMessage("lines[].description must be a string")
    .isLength({ max: 255 })
    .withMessage("lines[].description cannot exceed 255 characters"),
];

/* ──────────────────────────────────────────────────────────
   GET / UPDATE / DELETE BY ID
────────────────────────────────────────────────────────── */
export const idValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("id must be a positive integer")
    .toInt(),
];

/* ─────────────────────────────────────────────────────────────
   VALIDATE STATUS TRANSITION
   PUT /api/bon-livraisons/:id/validate
───────────────────────────────────────────────────────────── */
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

export const updateValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("id must be a positive integer")
    .toInt(),

  body("documentDate")
    .optional()
    .isISO8601()
    .withMessage("documentDate must be a valid ISO 8601 date"),

  body("dateLivraison")
    .optional()
    .isISO8601()
    .withMessage("dateLivraison must be a valid ISO 8601 date"),

  body("notes")
    .optional()
    .isString()
    .withMessage("notes must be a string")
    .isLength({ max: 1000 })
    .withMessage("notes cannot exceed 1000 characters"),

  body("internalNotes")
    .optional()
    .isString()
    .withMessage("internalNotes must be a string")
    .isLength({ max: 1000 })
    .withMessage("internalNotes cannot exceed 1000 characters"),
];
