import { query } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";
import ApiError from "../utils/apiError.js";

/* ============================================================
   GET STOCK MOVEMENTS VALIDATOR
============================================================ */
export const getStockMovementsValidator = [
  query("societeId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("societeId must be a positive integer")
    .toInt(),

  query("depotId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("depotId must be a positive integer")
    .toInt(),

  query("familyId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("familyId must be a positive integer")
    .toInt(),

  query("articleId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("articleId must be a positive integer")
    .toInt(),

  query("variantId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("variantId must be a positive integer")
    .toInt(),

  query("documentType")
    .optional()
    .isIn([
      "BON_LIVRAISON", // Outbound delivery
      "BON_RETOUR_CLIENT", // Client return
      "BON_RECEPTION", // Inbound reception
      "BON_RETOUR_FOURNISSEUR", // Supplier return
      "INVENTORY", // Physical inventory adjustment
      "TRANSFER", // Inter-depot transfer
      "ADJUSTMENT", // Manual adjustment / damaged goods
    ])
    .withMessage(
      "documentType must be one of: BON_LIVRAISON, BON_RETOUR_CLIENT, BON_RECEPTION, BON_RETOUR_FOURNISSEUR, INVENTORY, TRANSFER, ADJUSTMENT",
    ),

  query("movement")
    .optional()
    .isIn(["ENTREE", "SORTIE"])
    .withMessage('movement must be either "ENTREE" or "SORTIE"'),

  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("startDate must be a valid ISO 8601 date"),

  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("endDate must be a valid ISO 8601 date")
    .custom((endDate, { req }) => {
      if (req.query.startDate && endDate) {
        const start = new Date(req.query.startDate);
        const end = new Date(endDate);
        if (end < start) {
          throw new ApiError("endDate cannot be before startDate", 400);
        }
      }
      return true;
    }),

  query("clientId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("clientId must be a positive integer")
    .toInt(),

  query("fournisseurId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("fournisseurId must be a positive integer")
    .toInt(),

  validatorMiddleware,
];
