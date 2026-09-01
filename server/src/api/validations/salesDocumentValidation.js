import { body, param, query } from "express-validator";

const idValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("id must be a positive integer")
    .toInt(),
];

const getNextNumberValidator = [
  query("societeId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("societeId must be a positive integer")
    .toInt(),
];

const getAllValidator = [
  query("clientId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("clientId must be a positive integer")
    .toInt(),
  query("status")
    .optional()
    .isIn(["DRAFT", "CONFIRMED", "PARTIAL", "COMPLETED", "CANCELLED", "PAID"])
    .withMessage("Invalid status"),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("startDate must be a valid ISO 8601 date"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("endDate must be a valid ISO 8601 date"),
  query("keyword").optional().isString().trim(),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
];

const getProductsValidator = [
  query("priceField")
    .optional()
    .isIn(["prixVente1", "prixVente2", "prixVente3"])
    .withMessage("priceField must be prixVente1, prixVente2 or prixVente3"),
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

export const createSalesDocumentValidation = ({
  hidePrices = false,
  requireClient = true,
} = {}) => {
  const clientIdRule = requireClient
    ? body("clientId")
        .notEmpty()
        .withMessage("clientId is required")
        .isInt({ min: 1 })
        .withMessage("clientId must be a positive integer")
        .toInt()
    : body("clientId")
        .optional({ nullable: true })
        .isInt({ min: 1 })
        .withMessage("clientId must be a positive integer")
        .toInt();

  const createValidator = [
    clientIdRule,
    body("clientName").optional({ nullable: true }).isString().trim(),
    body("societeId").optional().isInt({ min: 1 }).toInt(),
    body("documentDate").optional().isISO8601(),
    body("notes").optional({ nullable: true }).isString(),
    body("internalNotes").optional({ nullable: true }).isString(),
    body("status")
      .optional()
      .isIn(["DRAFT", "CONFIRMED", "COMPLETED"])
      .withMessage("Invalid status"),
    body("paymentMethod")
      .optional({ nullable: true })
      .isIn(["ESPECES", "CHEQUE", "VIREMENT", "CARTE", "TRAITE", "EFFET"]),
    body("dateLivraisonPrevue").optional({ nullable: true }).isISO8601(),
    body("dateConfirmation").optional({ nullable: true }).isISO8601(),
    body("conditionsPaiement").optional({ nullable: true }).isString(),
    body("devisId").optional({ nullable: true }).isInt({ min: 1 }).toInt(),
    body("validUntil").optional({ nullable: true }).isISO8601(),
    body("conditions").optional({ nullable: true }).isString(),
    body("remiseGlobale").optional({ nullable: true }).isFloat({ min: 0 }),
    body("dateEcheance").optional({ nullable: true }).isISO8601(),
    body("penalitesRetard").optional({ nullable: true }).isFloat({ min: 0 }),
    body("bonLivraisonId")
      .optional({ nullable: true })
      .isInt({ min: 1 })
      .toInt(),
    lineValidator(hidePrices),
  ];

  const updateValidator = [
    ...idValidator,
    body("clientId").optional({ nullable: true }).isInt({ min: 1 }).toInt(),
    body("clientName").optional({ nullable: true }).isString().trim(),
    body("documentDate").optional().isISO8601(),
    body("notes").optional({ nullable: true }).isString(),
    body("internalNotes").optional({ nullable: true }).isString(),
    body("status")
      .optional()
      .isIn(["DRAFT", "CONFIRMED", "COMPLETED", "CANCELLED"]),
    body("paymentMethod")
      .optional({ nullable: true })
      .isIn(["ESPECES", "CHEQUE", "VIREMENT", "CARTE", "TRAITE", "EFFET"]),
    body("dateLivraisonPrevue").optional({ nullable: true }).isISO8601(),
    body("dateConfirmation").optional({ nullable: true }).isISO8601(),
    body("conditionsPaiement").optional({ nullable: true }).isString(),
    body("devisId").optional({ nullable: true }).isInt({ min: 1 }).toInt(),
    body("validUntil").optional({ nullable: true }).isISO8601(),
    body("conditions").optional({ nullable: true }).isString(),
    body("remiseGlobale").optional({ nullable: true }).isFloat({ min: 0 }),
    body("dateEcheance").optional({ nullable: true }).isISO8601(),
    body("penalitesRetard").optional({ nullable: true }).isFloat({ min: 0 }),
    body("bonLivraisonId")
      .optional({ nullable: true })
      .isInt({ min: 1 })
      .toInt(),
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

export default createSalesDocumentValidation;
