import { check, param } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";
import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";

/* =========================
   CREATE UNIT VALIDATOR
========================= */
export const createUnitValidator = [
  // Name validation
  check("name")
    .notEmpty()
    .withMessage("Unit name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Unit name must be between 2 and 50 characters")
    .trim()
    .custom(async (name) => {
      const existingUnit = await prisma.unit.findUnique({
        where: { name },
      });

      if (existingUnit) {
        throw new ApiError("Unit name already exists", 409);
      }

      return true;
    }),

  // Symbol validation
  check("symbol")
    .notEmpty()
    .withMessage("Unit symbol is required")
    .isLength({ min: 1, max: 10 })
    .withMessage("Unit symbol must be between 1 and 10 characters")
    .trim(),

  // Allows Fractional validation
  check("allowsFractional")
    .optional()
    .isBoolean()
    .withMessage("allowsFractional must be a boolean (true/false)")
    .toBoolean(),

  validatorMiddleware,
];

/* =========================
   UPDATE UNIT VALIDATOR
========================= */
export const updateUnitValidator = [
  // ID validation
  param("id").isInt({ min: 1 }).withMessage("ID must be a positive integer"),

  // Name validation (optional in update)
  check("name")
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage("Unit name must be between 2 and 50 characters")
    .trim()
    .custom(async (name, { req }) => {
      const existingUnit = await prisma.unit.findUnique({
        where: { name },
      });

      // Check if name exists and belongs to different unit
      if (existingUnit && existingUnit.id !== parseInt(req.params.id)) {
        throw new ApiError("Unit name already exists", 409);
      }

      return true;
    }),

  // Symbol validation (optional in update)
  check("symbol")
    .optional()
    .isLength({ min: 1, max: 10 })
    .withMessage("Unit symbol must be between 1 and 10 characters")
    .trim(),

  // Allows Fractional validation (optional in update)
  check("allowsFractional")
    .optional()
    .isBoolean()
    .withMessage("allowsFractional must be a boolean (true/false)")
    .toBoolean(),

  validatorMiddleware,
];

/* =========================
   GET UNIT VALIDATOR
========================= */
export const getUnitValidator = [
  param("id").isInt({ min: 1 }).withMessage("ID must be a positive integer"),

  validatorMiddleware,
];

/* =========================
   DELETE UNIT VALIDATOR
========================= */
export const deleteUnitValidator = [
  param("id").isInt({ min: 1 }).withMessage("ID must be a positive integer"),

  validatorMiddleware,
];
