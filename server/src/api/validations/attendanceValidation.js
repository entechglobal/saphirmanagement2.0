import { body, query } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";

export const listValidator = [
  query("userId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("userId must be a positive integer")
    .toInt(),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page must be a positive integer")
    .toInt(),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit must be between 1 and 100")
    .toInt(),
  query("dateFrom")
    .optional()
    .isISO8601()
    .withMessage("dateFrom must be a valid date"),
  query("dateTo")
    .optional()
    .isISO8601()
    .withMessage("dateTo must be a valid date"),
  query("search")
    .optional()
    .isString()
    .isLength({ max: 120 })
    .withMessage("search cannot exceed 120 characters"),
  validatorMiddleware,
];

export const importValidator = [
  body("deviceIp")
    .optional()
    .isString()
    .isLength({ max: 64 })
    .withMessage("deviceIp cannot exceed 64 characters"),
  body("deviceSn")
    .optional()
    .isString()
    .isLength({ max: 64 })
    .withMessage("deviceSn cannot exceed 64 characters"),
  body("records")
    .isArray({ min: 1, max: 5000 })
    .withMessage("records must be a non-empty array (max 5000)"),
  body("records.*.deviceUserId")
    .optional()
    .isString()
    .isLength({ max: 50 }),
  body("records.*.userId")
    .optional(),
  body("records.*.punchTime")
    .optional()
    .isISO8601()
    .withMessage("punchTime must be a valid date"),
  body("records.*.recordTime")
    .optional(),
  validatorMiddleware,
];
