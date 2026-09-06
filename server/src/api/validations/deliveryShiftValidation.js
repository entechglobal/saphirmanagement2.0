import { body, param, query } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";

export const idValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("id must be a positive integer")
    .toInt(),
  validatorMiddleware,
];

export const listValidator = [
  query("status")
    .optional()
    .isIn(["OPEN", "CLOSED", "open", "closed"])
    .withMessage("status must be OPEN or CLOSED"),
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
  validatorMiddleware,
];

export const remitValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("id must be a positive integer")
    .toInt(),
  body("destinationCaisseId")
    .notEmpty()
    .withMessage("destinationCaisseId is required")
    .isInt({ min: 1 })
    .withMessage("destinationCaisseId must be a positive integer")
    .toInt(),
  body("amount")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("amount must be greater than 0")
    .toFloat(),
  body("note")
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage("note cannot exceed 1000 characters"),
  validatorMiddleware,
];
