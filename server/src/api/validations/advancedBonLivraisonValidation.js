import { body, param, query } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";

const VALID_MODES = [
  "ESPECE",
  "CARTE_BANCAIRE",
  "CHEQUE",
  "EFFET",
  "CARTE_FIDELITE",
  "BON_ACHAT",
  "REMISE",
  "VIREMENT",
];

const VALID_STATUSES = [
  "EN_COURS",
  "CONFIRME",
  "PREPARE",
  "COLLECTE",
  "EN_ROUTE",
  "LIVRE",
  "ANNULE",
  "REPORTE",
  "PAYE",
];

export const createValidator = [
  body("clientName")
    .notEmpty()
    .withMessage("clientName is required")
    .isString()
    .withMessage("clientName must be a string")
    .isLength({ min: 1, max: 255 })
    .withMessage("clientName must be 1-255 chars")
    .trim(),

  body("depotId")
    .notEmpty()
    .withMessage("depotId is required")
    .isInt({ min: 1 })
    .withMessage("depotId must be a positive integer")
    .toInt(),

  body("deliveryId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("deliveryId must be a positive integer")
    .toInt(),

  body("commandeId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("commandeId must be a positive integer")
    .toInt(),

  body("documentDate")
    .optional()
    .isISO8601()
    .withMessage("documentDate must be a valid ISO 8601 date"),

  body("dateLivraison")
    .optional()
    .isISO8601()
    .withMessage("dateLivraison must be a valid ISO 8601 date"),

  body("heureLivraison")
    .optional()
    .isLength({ max: 10 })
    .withMessage("heureLivraison cannot exceed 10 characters"),

  // Advanced fields
  body("agenceId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("agenceId must be a positive integer")
    .toInt(),

  body("clientId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("clientId must be a positive integer")
    .toInt(),

  body("saveAsClient")
    .optional()
    .isBoolean()
    .withMessage("saveAsClient must be a boolean")
    .toBoolean(),

  body("updateClientLocation")
    .optional()
    .isBoolean()
    .withMessage("updateClientLocation must be a boolean")
    .toBoolean(),

  body("telephone")
    .optional()
    .isLength({ max: 20 })
    .withMessage("telephone cannot exceed 20 characters"),

  body("whatsapp")
    .optional()
    .isLength({ max: 20 })
    .withMessage("whatsapp cannot exceed 20 characters"),

  body("ville")
    .optional()
    .custom((value) => {
      if (value == null || value === "") return true;
      if (typeof value === "string") return value.length <= 100;
      if (typeof value === "object" && value.name != null) {
        return String(value.name).length <= 100;
      }
      return false;
    })
    .withMessage("ville cannot exceed 100 characters"),

  body("localisation").optional().isString(),

  body("withFacture")
    .optional()
    .isBoolean()
    .withMessage("withFacture must be a boolean")
    .toBoolean(),

  body("raisonSocial").optional().isLength({ max: 255 }),

  body("ice").optional().isLength({ max: 15 }),

  body("siegeSocial").optional().isLength({ max: 255 }),

  body("nombreDeColis")
    .optional()
    .isInt({ min: 0 })
    .withMessage("nombreDeColis must be >= 0")
    .toInt(),

  body("observation").optional().isString(),

  body("modeReglement")
    .optional()
    .isIn(VALID_MODES)
    .withMessage(`modeReglement must be one of: ${VALID_MODES.join(", ")}`),

  body("modeReglementAvance")
    .optional()
    .isIn(VALID_MODES)
    .withMessage(`modeReglementAvance must be one of: ${VALID_MODES.join(", ")}`),

  body("banqueId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("banqueId must be a positive integer")
    .toInt(),

  body("montantPaid")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("montantPaid must be >= 0")
    .toFloat(),

  body("commercialId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("commercialId must be a positive integer")
    .toInt(),

  body("preparateurId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("preparateurId must be a positive integer")
    .toInt(),

  body("livreurId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("livreurId must be a positive integer")
    .toInt(),

  body("commandStatus")
    .optional()
    .isIn(["EN_COURS", "CONFIRME"])
    .withMessage("commandStatus must be EN_COURS or CONFIRME"),

  body("providerConfigId")
    .optional()
    .isInt({ min: 1 }).withMessage("providerConfigId must be a positive integer")
    .toInt(),

  // Article lines (optional if packLines provided)
  body("lines").optional().isArray().withMessage("lines must be an array"),

  body("lines.*.articleId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .toInt(),

  body("lines.*.variantId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .toInt(),

  body("lines.*.quantity").optional().isFloat({ min: 0.001 }).toFloat(),

  body("lines.*.unitPrice").optional().isFloat({ min: 0.01 }).toFloat(),

  body("lines.*.remise").optional().isFloat({ min: 0 }).toFloat(),

  body("lines.*.description").optional().isString().isLength({ max: 255 }),

  body("lines.*.priceField")
    .optional()
    .isIn(["prixVente1", "prixVente2", "prixVente3"]),

  // Pack lines
  body("packLines")
    .optional()
    .isArray()
    .withMessage("packLines must be an array"),

  body("packLines.*.id")
    .optional()
    .isInt({ min: 1 })
    .withMessage("packLines[].id must be a positive integer")
    .toInt(),

  body("packLines.*.quantity").optional().isFloat({ min: 0.001 }).toFloat(),

  body("packLines.*.prixVente").optional().isFloat({ min: 0.01 }).toFloat(),

  validatorMiddleware,
];

export const updateValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("id must be a positive integer")
    .toInt(),

  // Override required fields to optional
  body("clientName")
    .optional()
    .isString()
    .isLength({ min: 1, max: 255 })
    .trim(),

  body("depotId").optional().isInt({ min: 1 }).toInt(),

  // Reuse the rest
  ...createValidator.filter(
    (v) =>
      v !== validatorMiddleware &&
      !v.builder?.fields?.includes("clientName") &&
      !v.builder?.fields?.includes("depotId"),
  ),

  validatorMiddleware,
];

export const transitionStatusValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("id must be a positive integer")
    .toInt(),

  body("targetStatus")
    .notEmpty()
    .withMessage("targetStatus is required")
    .isIn(VALID_STATUSES)
    .withMessage(`targetStatus must be one of: ${VALID_STATUSES.join(", ")}`),

  body("payments")
    .optional()
    .isArray({ min: 1 })
    .withMessage("payments must be a non-empty array"),
  body("payments.*.amount")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("each payment amount must be > 0")
    .toFloat(),
  body("payments.*.modeReglement")
    .optional()
    .isIn(VALID_MODES)
    .withMessage(`modeReglement must be one of: ${VALID_MODES.join(", ")}`),
  body("payments.*.banqueId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("banqueId must be a positive integer")
    .toInt(),

  validatorMiddleware,
];

export const reportValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("id must be a positive integer")
    .toInt(),
  body("reason")
    .notEmpty()
    .withMessage("reason is required")
    .isString()
    .isLength({ min: 1, max: 500 })
    .withMessage("reason must be 1-500 characters")
    .trim(),
  body("nextDeliveryDate")
    .notEmpty()
    .withMessage("nextDeliveryDate is required")
    .isISO8601()
    .withMessage("nextDeliveryDate must be a valid ISO 8601 date"),
  validatorMiddleware,
];

export const idValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("id must be a positive integer")
    .toInt(),
  validatorMiddleware,
];

export const pickerValidator = [
  query("products").optional().isBoolean().toBoolean(),
  query("pack").optional().isBoolean().toBoolean(),
  query("depotId").optional().isInt({ min: 1 }).toInt(),
  query("search").optional().isString().isLength({ max: 255 }),
  query("priceField")
    .optional()
    .isIn(["prixVente1", "prixVente2", "prixVente3"]),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  validatorMiddleware,
];

export const preparateursValidator = [
  query("search").optional().isString().isLength({ max: 255 }),
  query("active").optional().isBoolean().toBoolean(),
  query("societeId").optional().isInt({ min: 1 }).toInt(),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  validatorMiddleware,
];

export const blsByStatusValidator = [
  query("status")
    .notEmpty()
    .withMessage("status is required")
    .isIn(["CONFIRME", "PREPARE", "COLLECTE", "EN_ROUTE", "LIVRE", "PAYE"])
    .withMessage(
      "status must be one of: CONFIRME, PREPARE, COLLECTE, EN_ROUTE, LIVRE, PAYE",
    ),
  query("livreurId").optional().isInt({ min: 1 }).toInt(),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  validatorMiddleware,
];

export const planningValidator = [
  query("livreurId").optional().isInt({ min: 1 }).toInt(),
  query("startDate")
    .notEmpty()
    .withMessage("startDate is required")
    .isISO8601()
    .withMessage("startDate must be a valid ISO 8601 date"),
  query("endDate")
    .notEmpty()
    .withMessage("endDate is required")
    .isISO8601()
    .withMessage("endDate must be a valid ISO 8601 date"),
  validatorMiddleware,
];

export const livreursValidator = [
  query("type")
    .notEmpty()
    .withMessage("type is required")
    .isIn(["intern", "extern"])
    .withMessage("type must be 'intern' or 'extern'"),
  query("search").optional().isString().isLength({ max: 255 }),
  query("active").optional().isBoolean().toBoolean(),
  query("societeId").optional().isInt({ min: 1 }).toInt(),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  validatorMiddleware,
];

export const getAllValidator = [
  query("search").optional().isString().isLength({ max: 255 }).trim(),
  query("livreurId").optional().isInt({ min: 1 }).toInt(),
  query("commercialId").optional().isInt({ min: 1 }).toInt(),
  query("preparateurId").optional().isInt({ min: 1 }).toInt(),
  query("agenceId").optional().isInt({ min: 1 }).toInt(),
  query("commandStatus").optional().isIn(VALID_STATUSES),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  validatorMiddleware,
];
