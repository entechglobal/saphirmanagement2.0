import { body, param, query } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";
import ApiError from "../utils/apiError.js";

/* ============================================================
   CREATE STOCK TRANSFER VALIDATOR
============================================================ */
export const createTransferValidator = [
  body("sourceDepotId")
    .notEmpty()
    .withMessage("sourceDepotId is required")
    .isInt({ min: 1 })
    .withMessage("sourceDepotId must be a positive integer")
    .toInt(),

  body("destinationDepotId")
    .notEmpty()
    .withMessage("destinationDepotId is required")
    .isInt({ min: 1 })
    .withMessage("destinationDepotId must be a positive integer")
    .toInt()
    .custom((value, { req }) => {
      if (value === req.body.sourceDepotId) {
        throw new ApiError(
          "Source and destination depots cannot be the same",
          400,
        );
      }
      return true;
    }),

  body("status")
    .optional()
    .isIn(["PENDING", "COMPLETED"])
    .withMessage('Status must be either "PENDING" or "COMPLETED"'),

  body("transferDate")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("transferDate must be a valid ISO 8601 date")
    .custom((date) => {
      const inputDate = new Date(date);
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      if (inputDate > today) {
        throw new ApiError("transferDate cannot be in the future", 400);
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
    .withMessage("At least one transfer line is required"),

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

  body("lines.*.quantityReceived")
    .notEmpty()
    .withMessage("quantityReceived is required for each line")
    .isFloat({ min: 0.001 })
    .withMessage("quantityReceived must be greater than 0")
    .toFloat(),

  validatorMiddleware,
];

/* ============================================================
   TRANSFER ID VALIDATOR
============================================================ */
export const transferIdValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("Transfer ID must be a positive integer")
    .toInt(),

  validatorMiddleware,
];

/* ============================================================
   DEPOT ID PARAM VALIDATOR
============================================================ */
export const depotIdParamValidator = [
  param("depotId")
    .isInt({ min: 1 })
    .withMessage("depotId must be a positive integer")
    .toInt(),

  validatorMiddleware,
];

/* ============================================================
   QUERY VALIDATORS
============================================================ */
export const getTransfersQueryValidator = [
  query("societeId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("societeId must be a positive integer")
    .toInt(),

  query("sourceDepotId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("sourceDepotId must be a positive integer")
    .toInt(),

  query("destinationDepotId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("destinationDepotId must be a positive integer")
    .toInt(),

  query("status")
    .optional()
    .isIn(["PENDING", "COMPLETED"])
    .withMessage('Status must be either "PENDING" or "COMPLETED"'),

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
   APPEND TRANSFER LINES VALIDATOR
============================================================ */
export const appendTransferLinesValidator = [
  // Lines validation
  body("lines")
    .notEmpty()
    .withMessage("lines array is required")
    .isArray({ min: 1 })
    .withMessage("At least one transfer line is required"),

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

  body("lines.*.quantityReceived")
    .notEmpty()
    .withMessage("quantityReceived is required for each line")
    .isFloat({ min: 0.001 })
    .withMessage("quantityReceived must be greater than 0")
    .toFloat(),

  validatorMiddleware,
];
