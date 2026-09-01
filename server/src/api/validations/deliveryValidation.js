import { check, param } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";

export const createDeliveryValidator = [
  check("name")
    .notEmpty().withMessage("Name is required")
    .isLength({ min: 2, max: 255 }).withMessage("Name must be between 2 and 255 characters")
    .trim(),

  check("type")
    .optional()
    .isIn(["INTERN", "EXTERN"]).withMessage("Type must be INTERN or EXTERN"),

  check("entityType")
    .optional()
    .isIn(["PARTICULIER", "SOCIETE"]).withMessage("entityType must be PARTICULIER or SOCIETE"),

  check("tel")
    .optional()
    .matches(/^(?:\+212\s?[5-7](\s?\d{2}){4}|0[5-7](\s?\d{2}){4})$/)
    .withMessage("Invalid Moroccan phone format. Use: 0612345678 or +212612345678"),

  check("address")
    .optional()
    .isLength({ max: 1000 }).withMessage("Address must not exceed 1000 characters"),

  check("active")
    .optional()
    .isBoolean().withMessage("Active must be a boolean"),

  validatorMiddleware,
];

export const updateDeliveryValidator = [
  param("id")
    .isInt({ min: 1 }).withMessage("Invalid delivery ID"),

  check("name")
    .optional()
    .isLength({ min: 2, max: 255 }).withMessage("Name must be between 2 and 255 characters")
    .trim(),

  check("type")
    .optional()
    .isIn(["INTERN", "EXTERN"]).withMessage("Type must be INTERN or EXTERN"),

  check("entityType")
    .optional()
    .isIn(["PARTICULIER", "SOCIETE"]).withMessage("entityType must be PARTICULIER or SOCIETE"),

  check("tel")
    .optional()
    .matches(/^(?:\+212\s?[5-7](\s?\d{2}){4}|0[5-7](\s?\d{2}){4})$/)
    .withMessage("Invalid Moroccan phone format"),

  check("address")
    .optional()
    .isLength({ max: 1000 }).withMessage("Address must not exceed 1000 characters"),

  check("active")
    .optional()
    .isBoolean().withMessage("Active must be a boolean"),

  validatorMiddleware,
];

export const getDeliveryValidator = [
  param("id").isInt({ min: 1 }).withMessage("Invalid delivery ID"),
  validatorMiddleware,
];

export const deleteDeliveryValidator = [
  param("id").isInt({ min: 1 }).withMessage("Invalid delivery ID"),
  validatorMiddleware,
];
