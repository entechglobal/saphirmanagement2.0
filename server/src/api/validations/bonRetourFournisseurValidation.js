import { body, param, query } from "express-validator";

export const getNextNumberValidator = [
  query("societeId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("societeId must be a positive integer")
    .toInt(),
];

export const getAllValidator = [
  query("frsId").optional().isInt({ min: 1 }).toInt(),
  query("fournisseurId").optional().isInt({ min: 1 }).toInt(),
  query("depotId").optional().isInt({ min: 1 }).toInt(),
  query("status")
    .optional()
    .isIn(["DRAFT", "COMPLETED", "CANCELLED"])
    .withMessage("Invalid status"),
  query("startDate").optional().isISO8601(),
  query("endDate")
    .optional()
    .isISO8601()
    .custom((endDate, { req }) => {
      if (req.query.startDate && endDate) {
        if (new Date(endDate) < new Date(req.query.startDate)) {
          throw new Error("endDate cannot be before startDate");
        }
      }
      return true;
    }),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
];

export const getProductsValidator = [
  query("depotId")
    .notEmpty()
    .withMessage("depotId is required")
    .isInt({ min: 1 })
    .toInt(),
  query("priceField")
    .optional()
    .isIn(["prixAchat", "prixVente1", "prixVente2", "prixVente3"]),
  query("search").optional().isString().trim(),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
];

export const createValidator = [
  body("frsId")
    .notEmpty()
    .withMessage("frsId is required")
    .isInt({ min: 1 })
    .toInt(),
  body("depotId")
    .notEmpty()
    .withMessage("depotId is required")
    .isInt({ min: 1 })
    .toInt(),
  body("bonReceptionId").optional({ nullable: true }).isInt({ min: 1 }).toInt(),
  body("documentDate").optional().isISO8601(),
  body("status").optional().isIn(["DRAFT", "COMPLETED"]),
  body("motifRetour").optional({ nullable: true }).isString().isLength({ max: 500 }),
  body("notes").optional({ nullable: true }).isString().isLength({ max: 1000 }),
  body("lines").isArray({ min: 1 }).withMessage("lines must be a non-empty array"),
  body("lines.*.articleId").optional({ nullable: true }).isInt({ min: 1 }).toInt(),
  body("lines.*.variantId").optional({ nullable: true }).isInt({ min: 1 }).toInt(),
  body("lines.*.quantity")
    .notEmpty()
    .isFloat({ min: 0.001 })
    .toFloat(),
  body("lines.*.unitPrice")
    .notEmpty()
    .isFloat({ min: 0 })
    .toFloat(),
  body("lines.*.remise").optional().isFloat({ min: 0, max: 1 }).toFloat(),
  body("lines.*.discount").optional().isFloat({ min: 0, max: 1 }).toFloat(),
];

export const idValidator = [
  param("id").isInt({ min: 1 }).withMessage("id must be a positive integer").toInt(),
];

export const validateStatusValidator = [
  ...idValidator,
  body("targetStatus")
    .notEmpty()
    .isIn(["COMPLETED", "DRAFT"])
    .withMessage("targetStatus must be COMPLETED or DRAFT"),
];

export const updateValidator = [
  ...idValidator,
  body("frsId").optional().isInt({ min: 1 }).toInt(),
  body("depotId").optional().isInt({ min: 1 }).toInt(),
  body("bonReceptionId").optional({ nullable: true }).isInt({ min: 1 }).toInt(),
  body("documentDate").optional().isISO8601(),
  body("motifRetour").optional({ nullable: true }).isString().isLength({ max: 500 }),
  body("notes").optional({ nullable: true }).isString().isLength({ max: 1000 }),
  body("lines").optional().isArray({ min: 1 }),
  body("lines.*.articleId").optional({ nullable: true }).isInt({ min: 1 }).toInt(),
  body("lines.*.variantId").optional({ nullable: true }).isInt({ min: 1 }).toInt(),
  body("lines.*.quantity").optional().isFloat({ min: 0.001 }).toFloat(),
  body("lines.*.unitPrice").optional().isFloat({ min: 0 }).toFloat(),
];
