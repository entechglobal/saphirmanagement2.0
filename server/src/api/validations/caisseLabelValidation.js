import { body, param } from "express-validator";

export const createLabelValidator = [
  body("name")
    .notEmpty()
    .withMessage("Le nom est requis")
    .trim()
    .isLength({ max: 100 })
    .withMessage("Le nom ne peut pas dépasser 100 caractères"),
  body("active")
    .optional()
    .isBoolean()
    .withMessage("active doit être un booléen"),
];

export const updateLabelValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("ID invalide"),
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Le nom ne peut pas être vide")
    .isLength({ max: 100 })
    .withMessage("Le nom ne peut pas dépasser 100 caractères"),
  body("active")
    .optional()
    .isBoolean()
    .withMessage("active doit être un booléen"),
];

export const idValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("ID invalide"),
];
