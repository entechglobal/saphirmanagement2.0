import { check, body, param } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";
import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";

// ============================================
// CREATE FOURNISSEUR VALIDATOR (UPDATED with société scope)
// ============================================
export const createFournisseurValidator = [
  // Name validation (required)
  check("name")
    .notEmpty()
    .withMessage("Fournisseur name is required")
    .isLength({ min: 2, max: 255 })
    .withMessage("Fournisseur name must be between 2 and 255 characters")
    .trim(),

  // Phone validation (required, unique per société)
  check("phone")
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^(?:\+212\s?[5-7](\s?\d{2}){4}|0[5-7](\s?\d{2}){4})$/)
    .withMessage(
      "Invalid Moroccan phone format. Use format: 0612345678 or +212612345678",
    )
    .custom(async (phone, { req }) => {
      // ⭐ Check uniqueness within société only
      if (!req.societeId) {
        throw new ApiError("societeId is required", 404);
      }
      // ⭐ Check phone uniqueness

      const existingFournisseur = await prisma.fournisseur.findFirst({
        where: {
          phone,
          societeId: req.societeId, // ⭐ Scope to société
        },
      });

      if (existingFournisseur) {
        throw new ApiError("Phone number already exists in your société", 409);
      }

      const existingFournisseurWithPhone = await prisma.fournisseur.findFirst({
        where: {
          phone,
        },
      });
      if (existingFournisseurWithPhone) {
        throw new ApiError("Phone number already exists ", 409);
      }

      return true;
    }),

  // Type validation (optional, default: SOCIETE)
  check("type")
    .optional()
    .isIn(["PARTICULIER", "SOCIETE"])
    .withMessage("Type must be either PARTICULIER or SOCIETE"),

  // Address validation (optional)
  check("address")
    .optional()
    .isLength({ max: 1000 })
    .withMessage("Address is too long (max 1000 characters)")
    .trim(),

  // Region validation (optional)
  check("region")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Region name is too long (max 100 characters)")
    .trim(),

  // Email validation (optional)
  check("email")
    .optional()
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),

  // Website validation (optional)
  check("website").optional(),

  // ICE validation (optional — skipped when empty / not a company)
  check("ice")
    .optional({ values: "falsy" })
    .isLength({ min: 15, max: 15 })
    .withMessage("ICE must be exactly 15 characters")
    .matches(/^\d{15}$/)
    .withMessage("ICE must contain only digits")
    .custom(async (ice, { req }) => {
      if (!req.societeId) {
        throw new ApiError("societeId is required", 404);
      }
      if (ice) {
        // ⭐ Check uniqueness within société only
        const existingFournisseur = await prisma.fournisseur.findFirst({
          where: {
            ice,
            societeId: req.societeId, // ⭐ Scope to société
          },
        });

        if (existingFournisseur) {
          throw new ApiError("ICE number already exists in your société", 409);
        }

        const existingFournisseurWithIce = await prisma.fournisseur.findFirst({
          where: {
            ice,
          },
        });
        if (existingFournisseurWithIce) {
          throw new ApiError("ICE number already exists ", 409);
        }
      }

      return true;
    }),

  // IF validation (optional)
  check("if")
    .optional({ values: "falsy" })
    .isLength({ max: 20 })
    .withMessage("IF is too long (max 20 characters)")
    .trim(),

  // RC validation (optional)
  check("rc")
    .optional({ values: "falsy" })
    .isLength({ max: 20 })
    .withMessage("RC is too long (max 20 characters)")
    .trim(),

  // TP validation (optional)
  check("tp")
    .optional({ values: "falsy" })
    .isLength({ max: 20 })
    .withMessage("TP is too long (max 20 characters)")
    .trim(),

  // Payment Deadline validation (optional, 0-365 days)
  check("paymentDeadline")
    .optional()
    .isInt({ min: 0, max: 365 })
    .withMessage("Payment deadline must be between 0 and 365 days")
    .toInt(),

  // Bank Account validation (optional)
  check("bankAccount")
    .optional()
    .isLength({ max: 50 })
    .withMessage("Bank account is too long (max 50 characters)")
    .trim(),

  // Bank Name validation (optional)
  check("bankName")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Bank name is too long (max 100 characters)")
    .trim(),

  // Active validation (optional, boolean)
  check("active")
    .optional()
    .isBoolean()
    .withMessage("Active must be a boolean (true/false)")
    .toBoolean(),

  validatorMiddleware,
];

// ============================================
// UPDATE FOURNISSEUR VALIDATOR (UPDATED with société scope)
// ============================================
export const updateFournisseurValidator = [
  // ID validation
  param("id")
    .isInt({ min: 1 })
    .withMessage("ID must be a positive integer")
    .toInt(),

  // Name validation (optional in update)
  check("name")
    .optional()
    .isLength({ min: 2, max: 255 })
    .withMessage("Fournisseur name must be between 2 and 255 characters")
    .trim(),

  // Phone validation (optional in update, unique per société if changed)
  check("phone")
    .optional()
    .matches(/^(?:\+212\s?[5-7](\s?\d{2}){4}|0[5-7](\s?\d{2}){4})$/)
    .withMessage(
      "Invalid Moroccan phone format. Use format: 0612345678 or +212612345678",
    )
    .custom(async (phone, { req }) => {
      if (!req.societeId) {
        throw new ApiError("societeId is required", 404);
      }

      const fournisseurId = parseInt(req.params.id);

      // ⭐ Check uniqueness within société only
      const existingFournisseur = await prisma.fournisseur.findFirst({
        where: {
          phone,
          societeId: req.societeId, // ⭐ Scope to société
          NOT: { id: fournisseurId }, // Exclude current fournisseur
        },
      });

      if (existingFournisseur) {
        throw new ApiError("Phone number already exists in your société", 409);
      }

      // ⭐ Check phone uniqueness
      const existingFournisseurWithPhone = await prisma.fournisseur.findFirst({
        where: {
          phone,
          NOT: { id: fournisseurId }, // Exclude current fournisseur
        },
      });
      if (existingFournisseurWithPhone) {
        throw new ApiError("Phone number already exists ", 409);
      }

      return true;
    }),

  // Type validation (optional)
  check("type")
    .optional()
    .isIn(["PARTICULIER", "SOCIETE"])
    .withMessage("Type must be either PARTICULIER or SOCIETE"),

  // Address validation (optional)
  check("address")
    .optional()
    .isLength({ max: 1000 })
    .withMessage("Address is too long (max 1000 characters)")
    .trim(),

  // Region validation (optional)
  check("region")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Region name is too long (max 100 characters)")
    .trim(),

  // Email validation (optional)
  check("email")
    .optional()
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),

  // Website validation (optional)
  check("website").optional(),

  // ICE validation (optional — skipped when empty / not a company)
  check("ice")
    .optional({ values: "falsy" })
    .isLength({ min: 15, max: 15 })
    .withMessage("ICE must be exactly 15 characters")
    .matches(/^\d{15}$/)
    .withMessage("ICE must contain only digits")
    .custom(async (ice, { req }) => {
      if (!req.societeId) {
        throw new ApiError("societeId is required", 404);
      }

      if (ice) {
        const fournisseurId = parseInt(req.params.id);

        // ⭐ Check uniqueness within société only
        const existingFournisseur = await prisma.fournisseur.findFirst({
          where: {
            ice,
            societeId: req.societeId, // ⭐ Scope to société
            NOT: { id: fournisseurId }, // Exclude current fournisseur
          },
        });

        if (existingFournisseur) {
          throw new ApiError("ICE number already exists in your société", 409);
        }

        // ⭐ Check ICE uniqueness
        const existingFournisseurWithIce = await prisma.fournisseur.findFirst({
          where: {
            ice,
            NOT: { id: fournisseurId }, // Exclude current fournisseur
          },
        });
        if (existingFournisseurWithIce) {
          throw new ApiError("ICE number already exists ", 409);
        }
      }

      return true;
    }),

  // IF validation (optional)
  check("if")
    .optional({ values: "falsy" })
    .isLength({ max: 20 })
    .withMessage("IF is too long (max 20 characters)")
    .trim(),

  // RC validation (optional)
  check("rc")
    .optional({ values: "falsy" })
    .isLength({ max: 20 })
    .withMessage("RC is too long (max 20 characters)")
    .trim(),

  // TP validation (optional)
  check("tp")
    .optional({ values: "falsy" })
    .isLength({ max: 20 })
    .withMessage("TP is too long (max 20 characters)")
    .trim(),

  // Payment Deadline validation (optional)
  check("paymentDeadline")
    .optional()
    .isInt({ min: 0, max: 365 })
    .withMessage("Payment deadline must be between 0 and 365 days")
    .toInt(),

  // Bank Account validation (optional)
  check("bankAccount")
    .optional()
    .isLength({ max: 50 })
    .withMessage("Bank account is too long (max 50 characters)")
    .trim(),

  // Bank Name validation (optional)
  check("bankName")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Bank name is too long (max 100 characters)")
    .trim(),

  // Active validation (optional)
  check("active")
    .optional()
    .isBoolean()
    .withMessage("Active must be a boolean (true/false)")
    .toBoolean(),

  validatorMiddleware,
];

// ============================================
// GET FOURNISSEUR BY ID VALIDATOR
// ============================================
export const getFournisseurValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("ID must be a positive integer")
    .toInt(),

  validatorMiddleware,
];

// ============================================
// DELETE FOURNISSEUR VALIDATOR
// ============================================
export const deleteFournisseurValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("ID must be a positive integer")
    .toInt(),

  validatorMiddleware,
];
