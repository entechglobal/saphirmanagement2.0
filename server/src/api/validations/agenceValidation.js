import { body, param, query } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";

export const createValidator = [
  body("name")
    .notEmpty()
    .withMessage("name is required")
    .isLength({ max: 255 })
    .withMessage("name cannot exceed 255 characters"),

  body("localisation")
    .optional()
    .isString()
    .withMessage("localisation must be a string"),

  body("responsable")
    .optional()
    .isLength({ max: 255 })
    .withMessage("responsable cannot exceed 255 characters"),

  body("active").optional().isBoolean().withMessage("active must be a boolean"),

  validatorMiddleware,
];

export const updateValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("id must be a positive integer")
    .toInt(),

  body("name")
    .optional()
    .isLength({ max: 255 })
    .withMessage("name cannot exceed 255 characters"),

  body("localisation")
    .optional()
    .isString()
    .withMessage("localisation must be a string"),

  body("responsable")
    .optional()
    .isLength({ max: 255 })
    .withMessage("responsable cannot exceed 255 characters"),

  body("active").optional().isBoolean().withMessage("active must be a boolean"),

  validatorMiddleware,
];

export const idValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("id must be a positive integer")
    .toInt(),
  validatorMiddleware,
];
