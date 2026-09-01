import { body, param, query } from "express-validator";

export const createCaisseValidator = [
  body("userId")
    .notEmpty()
    .withMessage("L'utilisateur est requis")
    .isInt({ min: 1 })
    .withMessage("userId doit être un entier positif"),
  body("initialBalance")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Le solde initial doit être un nombre positif ou zéro"),
];

export const createMyCaisseValidator = [
  body("initialBalance")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Le solde initial doit être un nombre positif ou zéro"),
];

export const updateCaisseValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("ID caisse invalide"),
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Le nom ne peut pas être vide")
    .isLength({ max: 255 })
    .withMessage("Le nom ne peut pas dépasser 255 caractères"),
  body("active")
    .optional()
    .isBoolean()
    .withMessage("active doit être un booléen"),
];

export const createChargeValidator = [
  body("labelId")
    .notEmpty()
    .withMessage("Le libellé est requis")
    .isInt({ min: 1 })
    .withMessage("labelId doit être un entier positif"),
  body("amount")
    .notEmpty()
    .withMessage("Le montant est requis")
    .isFloat({ min: 0.01 })
    .withMessage("Le montant doit être supérieur à 0"),
  body("note")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("La note ne peut pas dépasser 500 caractères"),
];

export const createRetraitValidator = [
  body("sourceCaisseId")
    .notEmpty()
    .withMessage("La caisse source est requise")
    .isInt({ min: 1 })
    .withMessage("ID caisse source invalide"),
  body("amount")
    .notEmpty()
    .withMessage("Le montant est requis")
    .isFloat({ min: 0.01 })
    .withMessage("Le montant doit être supérieur à 0"),
  body("note")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("La note ne peut pas dépasser 500 caractères"),
];

export const createDepotValidator = [
  body("destinationCaisseId")
    .notEmpty()
    .withMessage("La caisse destination est requise")
    .isInt({ min: 1 })
    .withMessage("ID caisse destination invalide"),
  body("amount")
    .notEmpty()
    .withMessage("Le montant est requis")
    .isFloat({ min: 0.01 })
    .withMessage("Le montant doit être supérieur à 0"),
  body("note")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("La note ne peut pas dépasser 500 caractères"),
];

export const createTransferValidator = [
  body("sourceCaisseId")
    .notEmpty()
    .withMessage("La caisse source est requise")
    .isInt({ min: 1 })
    .withMessage("ID caisse source invalide"),
  body("destinationCaisseId")
    .notEmpty()
    .withMessage("La caisse destination est requise")
    .isInt({ min: 1 })
    .withMessage("ID caisse destination invalide"),
  body("amount")
    .notEmpty()
    .withMessage("Le montant est requis")
    .isFloat({ min: 0.01 })
    .withMessage("Le montant doit être supérieur à 0"),
  body("note")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("La note ne peut pas dépasser 500 caractères"),
];

export const createBankWalletValidator = [
  body("societeId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("societeId doit être un entier positif"),
  body("banqueId")
    .notEmpty()
    .withMessage("La banque est requise")
    .isInt({ min: 1 })
    .withMessage("banqueId doit être un entier positif"),
  body("name")
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage("Le nom ne peut pas dépasser 255 caractères"),
  body("initialBalance")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Le solde initial doit être un nombre positif ou zéro"),
];

export const createCoffreWalletValidator = [
  body("societeId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("societeId doit être un entier positif"),
  body("name")
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage("Le nom ne peut pas dépasser 255 caractères"),
  body("initialBalance")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Le solde initial doit être un nombre positif ou zéro"),
];

export const getTransactionsValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("ID caisse invalide"),
  query("direction")
    .optional()
    .isIn(["in", "out", "transfer"])
    .withMessage('direction doit être "in", "out" ou "transfer"'),
  query("dateFrom")
    .optional()
    .isISO8601()
    .withMessage("dateFrom doit être une date ISO valide"),
  query("dateTo")
    .optional()
    .isISO8601()
    .withMessage("dateTo doit être une date ISO valide"),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page doit être un entier positif"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit doit être entre 1 et 100"),
];

export const getAllTransactionsValidator = [
  query("direction")
    .optional()
    .isIn(["in", "out", "transfer"])
    .withMessage('direction doit être "in", "out" ou "transfer"'),
  query("dateFrom")
    .optional()
    .isISO8601()
    .withMessage("dateFrom doit être une date ISO valide"),
  query("dateTo")
    .optional()
    .isISO8601()
    .withMessage("dateTo doit être une date ISO valide"),
  query("userId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("userId doit être un entier positif"),
  query("roleId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("roleId doit être un entier positif"),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page doit être un entier positif"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit doit être entre 1 et 100"),
];

export const idValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("ID invalide"),
];
