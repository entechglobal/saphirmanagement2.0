import { body, param, query } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";
import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";

/* ============================================================
   CREATE INVENTORY VALIDATOR
============================================================ */
export const createInventoryValidator = [
  body("depotId")
    .notEmpty()
    .withMessage("depotId is required")
    .isInt({ min: 1 })
    .withMessage("depotId must be a positive integer")
    .toInt()
    .custom(async (depotId) => {
      const depot = await prisma.depot.findUnique({ where: { id: depotId } });
      if (!depot) throw new ApiError("Depot not found", 404);
      if (!depot.active) throw new ApiError("Depot is inactive", 400);
      return true;
    }),

  body("inventoryDate")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("inventoryDate must be a valid ISO 8601 date")
    .custom((date) => {
      const inputDate = new Date(date);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today

      if (inputDate > today) {
        throw new ApiError("inventoryDate cannot be in the future", 400);
      }
      return true;
    }),

  body("notes")
    .optional({ nullable: true })
    .isLength({ max: 1000 })
    .withMessage("notes must be 1000 characters or fewer")
    .trim(),

  // Lines validation
  body("lines")
    .notEmpty()
    .withMessage("lines array is required")
    .isArray({ min: 1 })
    .withMessage("At least one inventory line is required"),

  body("lines.*.articleId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("articleId must be a positive integer")
    .toInt(),

  body("lines.*.variantId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("variantId must be a positive integer")
    .toInt(),

  // Article/Variant mutex check
  body("lines").custom((lines) => {
    lines.forEach((line, index) => {
      if (!line.articleId && !line.variantId) {
        throw new ApiError(
          `Line ${index + 1}: Either articleId or variantId is required`,
          400,
        );
      }
      if (line.articleId && line.variantId) {
        throw new ApiError(
          `Line ${index + 1}: Provide either articleId OR variantId, not both`,
          400,
        );
      }
    });
    return true;
  }),

  body("lines.*.quantityCounted")
    .notEmpty()
    .withMessage("quantityCounted is required for each line")
    .isFloat({ min: 0 })
    .withMessage("quantityCounted must be >= 0")
    .toFloat(),

  validatorMiddleware,
];

/* ============================================================
   INVENTORY ID VALIDATOR
============================================================ */
export const inventoryIdValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("ID must be a positive integer")
    .toInt(),

  validatorMiddleware,
];

/* ============================================================
   DEPOT ID PARAM VALIDATOR (for by-depot endpoint)
============================================================ */
export const depotIdParamValidator = [
  param("depotId")
    .isInt({ min: 1 })
    .withMessage("depotId must be a positive integer")
    .toInt(),

  validatorMiddleware,
];

/* ============================================================
   DATE RANGE VALIDATOR (for filtering)
============================================================ */
export const dateRangeValidator = [
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
        const start = new Date(req.query.startDate);
        const end = new Date(endDate);
        if (end < start) {
          throw new ApiError("endDate cannot be before startDate", 400);
        }
      }
      return true;
    }),

  validatorMiddleware,
];

/* ============================================================
   APPEND INVENTORY LINES VALIDATOR
============================================================ */
export const appendInventoryLinesValidator = [
  // Lines validation
  body("lines")
    .notEmpty()
    .withMessage("lines array is required")
    .isArray({ min: 1 })
    .withMessage("At least one inventory line is required"),

  body("lines.*.articleId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("articleId must be a positive integer")
    .toInt(),

  body("lines.*.variantId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("variantId must be a positive integer")
    .toInt(),

  // Article/Variant mutex check
  body("lines").custom((lines) => {
    lines.forEach((line, index) => {
      if (!line.articleId && !line.variantId) {
        throw new ApiError(
          `Line ${index + 1}: Either articleId or variantId is required`,
          400,
        );
      }
      if (line.articleId && line.variantId) {
        throw new ApiError(
          `Line ${index + 1}: Provide either articleId OR variantId, not both`,
          400,
        );
      }
    });
    return true;
  }),

  body("lines.*.quantityCounted")
    .notEmpty()
    .withMessage("quantityCounted is required for each line")
    .isFloat({ min: 0 })
    .withMessage("quantityCounted must be >= 0")
    .toFloat(),

  validatorMiddleware,
];
