import { check, body } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";
import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";

// ============================================
// CREATE SOCIÉTÉ VALIDATOR
// ============================================
export const createSocieteValidator = [
  // Raison Sociale (required)
  check("raisonSocial")
    .notEmpty()
    .withMessage("Raison sociale is required")
    .isLength({ min: 2, max: 255 })
    .withMessage("Raison sociale must be between 2 and 255 characters")
    .trim(),

  // Address (optional)
  check("address")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Address cannot exceed 300 characters")
    .trim(),

  // Tel (optional)
  check("phone")
    .optional()
    .matches(/^0[5-7][0-9]{8}$/)
    .withMessage(
      "Tel must be a valid Moroccan phone number (10 digits starting with 05, 06, or 07)",
    ),

  // Email (optional)
  check("email")
    .optional()
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),

  // Site Web (optional)
  check("siteWeb").optional(),

  // ICE (optional but unique if provided)
  check("ice")
    .optional()
    .matches(/^\d{15}$/)
    .withMessage("ICE must be exactly 15 digits")
    .custom(async (ice) => {
      if (ice) {
        const existing = await prisma.societe.findUnique({
          where: { ice },
        });

        if (existing) {
          throw new ApiError(`ICE ${ice} already exists`, 409);
        }
      }
      return true;
    }),

  // RC (optional)
  check("rc")
    .optional()
    .isLength({ max: 20 })
    .withMessage("RC cannot exceed 20 characters")
    .trim(),

  // TP (optional)
  check("tp")
    .optional()
    .isLength({ max: 20 })
    .withMessage("TP cannot exceed 20 characters")
    .trim(),

  // IF (optional)
  check("if")
    .optional()
    .isLength({ max: 20 })
    .withMessage("IF cannot exceed 20 characters")
    .trim(),

  // Fixed Structure (optional)
  check("fixedStructure")
    .optional()
    .custom((value) => {
      if (value) {
        const parssedValue = JSON.parse(value);
        if (!parssedValue.tag || !parssedValue.message) {
          throw new Error("fixedStructure must contain tag and message");
        }

        if (
          typeof parssedValue.tag !== "string" ||
          typeof parssedValue.message !== "string"
        ) {
          throw new Error("fixedStructure tag and message must be strings");
        }

        if (parssedValue.tag.length > 50) {
          throw new Error("fixedStructure tag cannot exceed 50 characters");
        }

        if (parssedValue.message.length > 200) {
          throw new Error(
            "fixedStructure message cannot exceed 200 characters",
          );
        }
      }
      return true;
    }),

  validatorMiddleware,
];

// ============================================
// UPDATE SOCIÉTÉ VALIDATOR
// ============================================
export const updateSocieteValidator = [
  // Raison Sociale (optional in update)
  check("raisonSocial")
    .optional()
    .isLength({ min: 2, max: 255 })
    .withMessage("Raison sociale must be between 2 and 255 characters")
    .trim(),

  // Address (optional)
  check("address")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Address cannot exceed 500 characters")
    .trim(),

  // Phone (optional)
  check("phone")
    .optional()
    .matches(/^0[5-7][0-9]{8}$/)
    .withMessage("Phone must be a valid Moroccan phone number"),

  // Email (optional)
  check("email")
    .optional()
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),

  // Site Web (optional)
  check("siteWeb").optional(),

  // ICE (optional but unique if changed)
  check("ice")
    .optional()
    .matches(/^\d{15}$/)
    .withMessage("ICE must be exactly 15 digits")
    .custom(async (ice, { req }) => {
      if (ice) {
        const societeId = parseInt(req.params.id);

        const existing = await prisma.societe.findFirst({
          where: {
            ice,
            NOT: { id: societeId },
          },
        });

        if (existing) {
          throw new ApiError(`ICE ${ice} already exists`, 409);
        }
      }
      return true;
    }),

  // RC (optional)
  check("rc")
    .optional()
    .isLength({ max: 20 })
    .withMessage("RC cannot exceed 20 characters")
    .trim(),

  // TP (optional)
  check("tp")
    .optional()
    .isLength({ max: 20 })
    .withMessage("TP cannot exceed 20 characters")
    .trim(),

  // IF (optional)
  check("if")
    .optional()
    .isLength({ max: 20 })
    .withMessage("IF cannot exceed 20 characters")
    .trim(),

  // Active (optional)
  check("active")
    .optional()
    .isBoolean()
    .withMessage("Active must be a boolean value"),

  // Fixed Structure (optional)
  check("fixedStructure")
    .optional()
    .custom((value) => {
      if (value) {
        const parsedValue = JSON.parse(value);
        if (!parsedValue.tag || !parsedValue.message) {
          throw new Error("fixedStructure must contain tag and message");
        }

        if (
          typeof parsedValue.tag !== "string" ||
          typeof parsedValue.message !== "string"
        ) {
          throw new Error("fixedStructure tag and message must be strings");
        }

        if (parsedValue.tag.length > 50) {
          throw new Error("fixedStructure tag cannot exceed 50 characters");
        }

        if (parsedValue.message.length > 200) {
          throw new Error(
            "fixedStructure message cannot exceed 200 characters",
          );
        }
      }
      return true;
    }),

  validatorMiddleware,
];

// ============================================
// SOCIÉTÉ ID PARAM VALIDATOR
// ============================================
export const societeIdValidator = [
  check("id")
    .isInt({ min: 1 })
    .withMessage("Invalid société ID")
    .custom(async (id) => {
      const societe = await prisma.societe.findUnique({
        where: { id: parseInt(id) },
      });

      if (!societe) {
        throw new ApiError("Société not found", 404);
      }

      return true;
    }),

  validatorMiddleware,
];

// ============================================
// ICE VALIDATOR (Standalone)
// ============================================
export const iceValidator = [
  check("ice")
    .notEmpty()
    .withMessage("ICE is required")
    .matches(/^\d{15}$/)
    .withMessage("ICE must be exactly 15 digits"),

  validatorMiddleware,
];
