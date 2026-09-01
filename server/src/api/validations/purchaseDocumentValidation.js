import { body, param, query } from "express-validator";

const idValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("id must be a positive integer")
    .toInt(),
];

const getNextNumberValidator = [
  query("societeId").optional().isInt({ min: 1 }).toInt(),
];

const getAllValidator = [
  query("frsId").optional().isInt({ min: 1 }).toInt(),
  query("fournisseurId").optional().isInt({ min: 1 }).toInt(),
  query("status")
    .optional()
    .isIn(["DRAFT", "CONFIRMED", "PARTIAL", "COMPLETED", "CANCELLED", "PAID"]),
  query("startDate").optional().isISO8601(),
  query("endDate").optional().isISO8601(),
  query("keyword").optional().isString().trim(),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
];

const getProductsValidator = [
  query("search").optional().isString().trim(),
  query("categoryId").optional().isInt({ min: 1 }).toInt(),
  query("familyId").optional().isInt({ min: 1 }).toInt(),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
];

const lineValidator = (hidePrices) =>
  body("lines")
    .isArray({ min: 1 })
    .withMessage("lines must be a non-empty array")
    .custom((lines) => {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const hasArticle = !!line.articleId;
        const hasVariant = !!line.variantId;
        if (hasArticle === hasVariant) {
          throw new Error(
            `Line ${i + 1}: provide either articleId or variantId`,
          );
        }
        if (!line.quantity || Number(line.quantity) <= 0) {
          throw new Error(`Line ${i + 1}: quantity must be > 0`);
        }
        if (
          !hidePrices &&
          (line.unitPrice === undefined || Number(line.unitPrice) < 0)
        ) {
          throw new Error(`Line ${i + 1}: unitPrice is required`);
        }
      }
      return true;
    });

export const createPurchaseDocumentValidation = ({
  hidePrices = true,
  requireFournisseur = true,
} = {}) => {
  const frsIdRule = requireFournisseur
    ? body("frsId")
        .notEmpty()
        .withMessage("frsId is required")
        .isInt({ min: 1 })
        .toInt()
    : body("frsId").optional({ nullable: true }).isInt({ min: 1 }).toInt();

  const createValidator = [
    frsIdRule,
    body("fournisseurId").optional({ nullable: true }).isInt({ min: 1 }).toInt(),
    body("societeId").optional().isInt({ min: 1 }).toInt(),
    body("documentDate").optional().isISO8601(),
    body("notes").optional({ nullable: true }).isString(),
    body("internalNotes").optional({ nullable: true }).isString(),
    body("status").optional().isIn(["DRAFT", "CONFIRMED", "COMPLETED"]),
    body("dateLivraisonPrevue").optional({ nullable: true }).isISO8601(),
    body("conditionsPaiement").optional({ nullable: true }).isString(),
    lineValidator(hidePrices),
  ];

  const updateValidator = [
    ...idValidator,
    body("frsId").optional({ nullable: true }).isInt({ min: 1 }).toInt(),
    body("fournisseurId").optional({ nullable: true }).isInt({ min: 1 }).toInt(),
    body("documentDate").optional().isISO8601(),
    body("notes").optional({ nullable: true }).isString(),
    body("internalNotes").optional({ nullable: true }).isString(),
    body("status")
      .optional()
      .isIn(["DRAFT", "CONFIRMED", "COMPLETED", "CANCELLED"]),
    body("dateLivraisonPrevue").optional({ nullable: true }).isISO8601(),
    body("conditionsPaiement").optional({ nullable: true }).isString(),
    body("lines")
      .optional()
      .isArray({ min: 1 })
      .withMessage("lines must be a non-empty array when provided"),
  ];

  return {
    idValidator,
    getNextNumberValidator,
    getAllValidator,
    getProductsValidator,
    createValidator,
    updateValidator,
  };
};

export default createPurchaseDocumentValidation;
