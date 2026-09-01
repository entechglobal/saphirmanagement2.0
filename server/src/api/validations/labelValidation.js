import { body } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";
import {
  LABEL_TYPES,
  PRICE_FIELDS,
  LABEL_SIZES,
  QUANTITY_MODES,
} from "../services/labelService.js";

const itemsValidator = [
  body("items")
    .isArray({ min: 1 })
    .withMessage("items must be a non-empty array"),

  body("items.*.articleId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("articleId must be a positive integer")
    .toInt(),

  body("items.*.variantId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("variantId must be a positive integer")
    .toInt(),
];

export const stockQuantitiesValidator = [
  ...itemsValidator,

  body("depotIds")
    .isArray({ min: 1 })
    .withMessage("depotIds must be a non-empty array"),

  body("depotIds.*")
    .isInt({ min: 1 })
    .withMessage("Each depotId must be a positive integer")
    .toInt(),

  validatorMiddleware,
];

export const generateValidator = [
  ...itemsValidator,

  body("labelType")
    .notEmpty()
    .withMessage("labelType is required")
    .isIn(LABEL_TYPES)
    .withMessage(`labelType must be one of: ${LABEL_TYPES.join(", ")}`),

  body("priceField")
    .optional()
    .isIn(PRICE_FIELDS)
    .withMessage(`priceField must be one of: ${PRICE_FIELDS.join(", ")}`),

  body("size")
    .optional()
    .isIn(LABEL_SIZES)
    .withMessage(`size must be one of: ${LABEL_SIZES.join(", ")}`),

  body("quantityMode")
    .notEmpty()
    .withMessage("quantityMode is required")
    .isIn(QUANTITY_MODES)
    .withMessage(`quantityMode must be one of: ${QUANTITY_MODES.join(", ")}`),

  body("quantity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("quantity must be a positive integer >= 1")
    .toInt(),

  body("depotIds")
    .optional()
    .isArray()
    .withMessage("depotIds must be an array"),

  body("depotIds.*")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Each depotId must be a positive integer")
    .toInt(),

  body("parametreConfig.prefix")
    .optional()
    .isString()
    .withMessage("parametreConfig.prefix must be a string"),

  body("parametreConfig.suffix")
    .optional()
    .isString()
    .withMessage("parametreConfig.suffix must be a string"),

  validatorMiddleware,
];

export const generatePacksValidator = [
  body("packs")
    .isArray({ min: 1 })
    .withMessage("packs must be a non-empty array"),

  body("packs.*")
    .isInt({ min: 1 })
    .withMessage("Each pack id must be a positive integer")
    .toInt(),

  body("labelType")
    .notEmpty()
    .withMessage("labelType is required")
    .isIn(LABEL_TYPES)
    .withMessage(`labelType must be one of: ${LABEL_TYPES.join(", ")}`),

  body("size")
    .optional()
    .isIn(LABEL_SIZES)
    .withMessage(`size must be one of: ${LABEL_SIZES.join(", ")}`),

  body("quantity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("quantity must be a positive integer >= 1")
    .toInt(),

  body("parametreConfig.prefix")
    .optional()
    .isString()
    .withMessage("parametreConfig.prefix must be a string"),

  body("parametreConfig.suffix")
    .optional()
    .isString()
    .withMessage("parametreConfig.suffix must be a string"),

  validatorMiddleware,
];
