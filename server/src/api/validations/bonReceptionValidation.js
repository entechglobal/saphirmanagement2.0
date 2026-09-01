import { body, param, query } from "express-validator";

/* ============================================================
   BON RECEPTION VALIDATION RULES
============================================================ */

/* ──────────────────────────────────────────────────────────
   GET NEXT DOCUMENT NUMBER
   GET /api/bon-receptions/next-number
────────────────────────────────────────────────────────── */
export const getNextNumberValidator = [
  query("societeId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("societeId must be a positive integer")
    .toInt(),
];

/* ──────────────────────────────────────────────────────────
   GET ALL BON RECEPTIONS
   GET /api/bon-receptions
────────────────────────────────────────────────────────── */
export const getAllValidator = [
  query("frsId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("frsId must be a positive integer")
    .toInt(),

  query("depotId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("depotId must be a positive integer")
    .toInt(),

  query("status")
    .optional()
    .isIn(["DRAFT", "COMPLETED"])
    .withMessage("status must be DRAFT or COMPLETED"),

  query("search")
    .optional()
    .isString()
    .withMessage("search must be a string"),

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
   GET /api/bon-receptions/products
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
    .isIn(["prixAchat", "prixVente1", "prixVente2", "prixVente3"])
    .withMessage(
      "priceField must be prixAchat, prixVente1, prixVente2 or prixVente3",
    ),

  query("search").optional().isString().withMessage("search must be a string"),
];

/* ──────────────────────────────────────────────────────────
   CREATE BON RECEPTION
   POST /api/bon-receptions
────────────────────────────────────────────────────────── */
export const createValidator = [
  body("frsId")
    .notEmpty()
    .withMessage("frsId is required")
    .isInt({ min: 1 })
    .withMessage("frsId must be a positive integer")
    .toInt(),

  body("depotId")
    .notEmpty()
    .withMessage("depotId is required")
    .isInt({ min: 1 })
    .withMessage("depotId must be a positive integer")
    .toInt(),

  body("documentReference")
    .notEmpty()
    .withMessage("documentReference is required")
    .isString()
    .withMessage("documentReference must be a string")
    .isLength({ max: 100 })
    .withMessage("documentReference cannot exceed 100 characters"),

  body("dateReception")
    .notEmpty()
    .withMessage("dateReception is required")
    .isISO8601()
    .withMessage("dateReception must be a valid ISO 8601 date"),

  body("status")
    .optional()
    .isIn(["DRAFT", "COMPLETED"])
    .withMessage("status must be DRAFT or COMPLETED"),

  body("note")
    .optional()
    .isString()
    .withMessage("note must be a string")
    .isLength({ max: 1000 })
    .withMessage("note cannot exceed 1000 characters"),

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

  body("lines.*.remise")
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage("lines[].remise must be a decimal between 0 and 1")
    .toFloat(),

  body("lines.*.newPrixAchat")
    .optional({ nullable: true })
    .isFloat({ min: 0.01 })
    .withMessage("lines[].newPrixAchat must be greater than 0")
    .toFloat(),

  body("lines.*.newPrixVente1")
    .optional({ nullable: true })
    .isFloat({ min: 0.01 })
    .withMessage("lines[].newPrixVente1 must be greater than 0")
    .toFloat(),

  body("lines.*.newPrixVente2")
    .optional({ nullable: true })
    .isFloat({ min: 0.01 })
    .withMessage("lines[].newPrixVente2 must be greater than 0")
    .toFloat(),

  body("lines.*.newPrixVente3")
    .optional({ nullable: true })
    .isFloat({ min: 0.01 })
    .withMessage("lines[].newPrixVente3 must be greater than 0")
    .toFloat(),

  // Optional supplier advances (ReglementFournisseur) applied to this reception
  body("advanceIds")
    .optional()
    .isArray()
    .withMessage("advanceIds must be an array"),

  body("advanceIds.*")
    .isInt({ min: 1 })
    .withMessage("each advanceId must be a positive integer")
    .toInt(),
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
   PUT /api/bon-receptions/:id/validate
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
   UPDATE BON RECEPTION
   PUT /api/bon-receptions/:id
────────────────────────────────────────────────────────── */
export const updateValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("id must be a positive integer")
    .toInt(),

  body("frsId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("frsId must be a positive integer")
    .toInt(),

  body("depotId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("depotId must be a positive integer")
    .toInt(),

  body("dateReception")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("dateReception must be a valid ISO 8601 date"),

  body("note")
    .optional()
    .isString()
    .withMessage("note must be a string")
    .isLength({ max: 1000 })
    .withMessage("note cannot exceed 1000 characters"),

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

  body("lines.*.remise")
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage("lines[].remise must be a decimal between 0 and 1")
    .toFloat(),

  body("lines.*.newPrixAchat")
    .optional({ nullable: true })
    .isFloat({ min: 0.01 })
    .withMessage("lines[].newPrixAchat must be greater than 0")
    .toFloat(),

  body("lines.*.newPrixVente1")
    .optional({ nullable: true })
    .isFloat({ min: 0.01 })
    .withMessage("lines[].newPrixVente1 must be greater than 0")
    .toFloat(),

  body("lines.*.newPrixVente2")
    .optional({ nullable: true })
    .isFloat({ min: 0.01 })
    .withMessage("lines[].newPrixVente2 must be greater than 0")
    .toFloat(),

  body("lines.*.newPrixVente3")
    .optional({ nullable: true })
    .isFloat({ min: 0.01 })
    .withMessage("lines[].newPrixVente3 must be greater than 0")
    .toFloat(),
];
