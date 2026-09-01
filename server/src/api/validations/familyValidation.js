import { check, body, param } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";
import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";

export const createFamilyValidator = [
  // Name validation
  check("name")
    .notEmpty()
    .withMessage("Family name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Family name must be between 2 and 100 characters"),

  // Category ID validation + existence check
  check("categoryId")
    .notEmpty()
    .withMessage("Category ID is required")
    .isInt({ min: 1 })
    .withMessage("Category ID must be a positive integer")
    .custom(async (categoryId) => {
      const category = await prisma.category.findUnique({
        where: { id: parseInt(categoryId) },
      });

      if (!category) {
        throw new ApiError("Category not found", 404);
      }

      return true;
    }),

  // ManageInStock validation
  check("manageInStock")
    .optional()
    .isBoolean()
    .withMessage("manageInStock must be a boolean (true/false)")
    .toBoolean(),

  // TVA validation
  check("TVA")
    .notEmpty()
    .withMessage("TVA is required")
    .isDecimal({ decimal_digits: "0,2" })
    .withMessage("TVA must be a decimal number with up to 2 decimal places")
    .custom((value) => {
      const num = parseFloat(value);
      if (num < 0 || num > 100) {
        throw new ApiError("TVA must be between 0 and 100", 404);
      }
      return true;
    }),

  // Visible validation
  check("visible")
    .optional()
    .isBoolean()
    .withMessage("Visible must be a boolean (true/false)")
    .toBoolean(),

  // Remise validation
  check("remise")
    .optional()
    .isDecimal({ decimal_digits: "0,2" })
    .withMessage("Remise must be a decimal number with up to 2 decimal places")
    .custom((value) => {
      if (value) {
        const num = parseFloat(value);
        if (num < 0 || num > 100) {
          throw new ApiError("Remise must be between 0 and 100", 404);
        }
      }
      return true;
    }),

  validatorMiddleware,
];

export const updateFamilyValidator = [
  // ID validation
  param("id").isInt({ min: 1 }).withMessage("ID must be a positive integer"),

  // Name validation (optional in update)
  check("name")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Family name must be between 2 and 100 characters"),

  // Category ID validation + existence check (optional in update)
  check("categoryId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Category ID must be a positive integer")
    .custom(async (categoryId) => {
      const category = await prisma.category.findUnique({
        where: { id: parseInt(categoryId) },
      });

      if (!category) {
        throw new ApiError("Category not found", 404);
      }

      return true;
    }),

  // ManageInStock validation
  check("manageInStock")
    .optional()
    .isBoolean()
    .withMessage("manageInStock must be a boolean (true/false)")
    .toBoolean(),

  // TVA validation
  check("TVA")
    .optional()
    .isDecimal({ decimal_digits: "0,2" })
    .withMessage("TVA must be a decimal number with up to 2 decimal places")
    .custom((value) => {
      const num = parseFloat(value);
      if (num < 0 || num > 100) {
        throw new ApiError("TVA must be between 0 and 100");
      }
      return true;
    }),

  // Visible validation
  check("visible")
    .optional()
    .isBoolean()
    .withMessage("Visible must be a boolean (true/false)")
    .toBoolean(),

  // Remise validation
  check("remise")
    .optional()
    .isDecimal({ decimal_digits: "0,2" })
    .withMessage("Remise must be a decimal number with up to 2 decimal places")
    .custom((value) => {
      if (value) {
        const num = parseFloat(value);
        if (num < 0 || num > 100) {
          throw new ApiError("Remise must be between 0 and 100");
        }
      }
      return true;
    }),

  validatorMiddleware,
];

export const getFamilyValidator = [
  param("id").isInt({ min: 1 }).withMessage("ID must be a positive integer"),

  validatorMiddleware,
];

export const deleteFamilyValidator = [
  param("id").isInt({ min: 1 }).withMessage("ID must be a positive integer"),

  validatorMiddleware,
];

export const getFamiliesByCategoryValidator = [
  param("categoryId")
    .isInt({ min: 1 })
    .withMessage("Category ID must be a positive integer")
    .custom(async (categoryId) => {
      const category = await prisma.category.findUnique({
        where: { id: parseInt(categoryId) },
      });

      if (!category) {
        throw new ApiError("Category not found", 404);
      }

      return true;
    }),

  validatorMiddleware,
];
