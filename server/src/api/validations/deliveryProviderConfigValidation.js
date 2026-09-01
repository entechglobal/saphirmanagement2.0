import { body, param, query } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";

const VALID_PROVIDERS = ["AMEEX", "AMANA", "GHAZALA", "PLICOLI"];

export const createValidator = [
  body("provider")
    .notEmpty()
    .withMessage("provider is required")
    .toUpperCase()
    .isIn(VALID_PROVIDERS)
    .withMessage(`provider must be one of: ${VALID_PROVIDERS.join(", ")}`),

  body("name")
    .notEmpty()
    .withMessage("name is required")
    .isString()
    .isLength({ max: 100 }),

  body("apiId")
    .notEmpty()
    .withMessage("apiId is required")
    .isString()
    .isLength({ max: 255 }),

  body("apiKey")
    .notEmpty()
    .withMessage("apiKey is required")
    .isString()
    .isLength({ max: 255 }),

  body("active").optional().isBoolean().toBoolean(),
  body("societeId").optional().isInt({ min: 1 }).toInt(),

  validatorMiddleware,
];

export const updateValidator = [
  param("id").isInt({ min: 1 }).toInt(),
  body("name").optional().isString().isLength({ max: 100 }),
  body("apiId").optional().isString().isLength({ max: 255 }),
  body("apiKey").optional().isString().isLength({ max: 255 }),
  body("active").optional().isBoolean().toBoolean(),
  validatorMiddleware,
];

export const idValidator = [
  param("id").isInt({ min: 1 }).toInt(),
  validatorMiddleware,
];

export const getAllValidator = [
  query("provider").optional().isString().isLength({ max: 50 }),
  query("active").optional().isBoolean().toBoolean(),
  query("societeId").optional().isInt({ min: 1 }).toInt(),
  validatorMiddleware,
];
