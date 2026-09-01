import { check, param, body } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";
import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";

export const getAttributeValidator = [
  param("id").isInt({ min: 1 }).withMessage("ID must be a positive integer"),
  validatorMiddleware,
];
export const deleteAttributeValidator = [
  param("id").isInt({ min: 1 }).withMessage("ID must be a positive integer"),
  validatorMiddleware,
];
export const createAttributeValueValidator = [
  param("attributeId")
    .isInt({ min: 1 })
    .withMessage("Attribute ID must be a positive integer")
    .custom(async (attributeId) => {
      const attribute = await prisma.attribute.findUnique({
        where: { id: parseInt(attributeId) },
      });

      if (!attribute) {
        throw new ApiError("Attribute not found", 404);
      }

      return true;
    }),

  check("value")
    .notEmpty()
    .withMessage("Attribute value is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("Attribute value must be between 1 and 100 characters")
    .trim(),

  validatorMiddleware,
];
export const createAttributeWithValuesValidator = [
  check("name")
    .notEmpty()
    .withMessage("Attribute name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Attribute name must be between 2 and 100 characters")
    .custom(async (name) => {
      const normalizedName = name.toLowerCase().trim();
      const existingAttribute = await prisma.attribute.findUnique({
        where: { name: normalizedName },
      });

      if (existingAttribute) {
        throw new ApiError(`Attribute "${normalizedName}" already exists`, 409);
      }

      return true;
    }),

  check("values")
    .optional()
    .isArray({ min: 1 })
    .withMessage("Values must be a non-empty array if provided"),

  check("values.*")
    .if(check("values").exists())
    .notEmpty()
    .withMessage("Each value must not be empty")
    .isLength({ min: 1, max: 100 })
    .withMessage("Each value must be between 1 and 100 characters")
    .trim(),

  validatorMiddleware,
];

export const updateAttributeWithValuesValidator = [
  param("id").isInt({ min: 1 }).withMessage("ID must be a positive integer"),

  check("name")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Attribute name must be between 2 and 100 characters"),
  check("addValues")
    .optional()
    .isArray({ min: 1 })
    .withMessage("addValues must be a non-empty array if provided"),

  check("addValues.*")
    .if(check("addValues").exists())
    .notEmpty()
    .withMessage("Each value in addValues must not be empty")
    .isLength({ min: 1, max: 100 })
    .withMessage("Each value must be between 1 and 100 characters")
    .trim(),

  check("removeValueIds")
    .optional()
    .isArray({ min: 1 })
    .withMessage("removeValueIds must be a non-empty array if provided"),

  check("removeValueIds.*")
    .if(check("removeValueIds").exists())
    .isInt({ min: 1 })
    .withMessage("Each ID in removeValueIds must be a positive integer"),

  validatorMiddleware,
];
