import { check, param } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";

export const createBanqueValidator = [
  check("name")
    .notEmpty().withMessage("name is required")
    .isLength({ max: 255 }).withMessage("name must not exceed 255 characters")
    .trim(),

  check("RIB")
    .optional()
    .isLength({ max: 50 }).withMessage("RIB must not exceed 50 characters"),

  check("ville")
    .optional()
    .isLength({ max: 100 }).withMessage("ville must not exceed 100 characters"),

  validatorMiddleware,
];

export const updateBanqueValidator = [
  param("id").isInt({ min: 1 }).withMessage("Invalid banque ID"),

  check("name")
    .optional()
    .isLength({ max: 255 }).withMessage("name must not exceed 255 characters")
    .trim(),

  check("RIB")
    .optional()
    .isLength({ max: 50 }).withMessage("RIB must not exceed 50 characters"),

  check("ville")
    .optional()
    .isLength({ max: 100 }).withMessage("ville must not exceed 100 characters"),

  validatorMiddleware,
];

export const getBanqueValidator = [
  param("id").isInt({ min: 1 }).withMessage("Invalid banque ID"),
  validatorMiddleware,
];
