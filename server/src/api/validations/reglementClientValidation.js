import { check, param } from "express-validator";
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

export const createReglementValidator = [
  check("date")
    .notEmpty()
    .withMessage("date is required")
    .isISO8601()
    .withMessage("date must be a valid ISO date"),

  check("clientId")
    .notEmpty()
    .withMessage("clientId is required")
    .isInt({ min: 1 })
    .withMessage("clientId must be a positive integer"),

  check("modeReglement")
    .notEmpty()
    .withMessage("modeReglement is required")
    .isIn(VALID_MODES)
    .withMessage(`modeReglement must be one of: ${VALID_MODES.join(", ")}`),

  check("montantRegle")
    .notEmpty()
    .withMessage("montantRegle is required")
    .isFloat({ min: 0.01 })
    .withMessage("montantRegle must be a positive number"),

  check("solde")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("solde must be >= 0"),

  check("documentNumbers")
    .optional()
    .isArray()
    .withMessage("documentNumbers must be an array")
    .custom((arr) =>
      arr.every((v) => typeof v === "string" && v.trim().length > 0),
    )
    .withMessage("Each documentNumber must be a non-empty string"),

  check("banqueId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("banqueId must be a positive integer"),

  check("advanceIds")
    .optional()
    .isArray()
    .withMessage("advanceIds must be an array"),
  check("advanceIds.*")
    .isInt({ min: 1 })
    .withMessage("Each advanceId must be a positive integer"),

  check("refDocument")
    .optional()
    .isLength({ max: 255 })
    .withMessage("refDocument must not exceed 255 characters"),

  check("dateEcheance")
    .optional()
    .isISO8601()
    .withMessage("dateEcheance must be a valid ISO date"),

  validatorMiddleware,
];

export const getReglementValidator = [
  param("id").isInt({ min: 1 }).withMessage("Invalid reglement ID"),
  validatorMiddleware,
];

export const deleteReglementValidator = [
  param("id").isInt({ min: 1 }).withMessage("Invalid reglement ID"),
  validatorMiddleware,
];

export const getUnpaidBLsValidator = [
  param("clientId").isInt({ min: 1 }).withMessage("Invalid client ID"),
  validatorMiddleware,
];
