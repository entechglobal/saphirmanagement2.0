import { check, body, param } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";
import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";

// ============================================
// CREATE CLIENT VALIDATOR (UPDATED with société scope)
// ============================================
export const createClientValidator = [
  // Name validation (required)
  check("name")
    .notEmpty()
    .withMessage("Client name is required")
    .isLength({ min: 2, max: 255 })
    .withMessage("Client name must be between 2 and 255 characters")
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
      const existingClient = await prisma.client.findFirst({
        where: {
          phone,
          societeId: req.societeId, // ⭐ Scope to société
        },
      });

      if (existingClient) {
        throw new ApiError("Phone number already exists in your société", 409);
      }

      const existingClientWithPhone = await prisma.client.findFirst({
        where: {
          phone,
        },
      });
      if (existingClientWithPhone) {
        throw new ApiError("Phone number already exists ", 409);
      }

      return true;
    }),

  // Type validation (optional, default: PARTICULIER)
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

  check("city")
    .optional()
    .isLength({ max: 100 })
    .withMessage("City name is too long (max 100 characters)")
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
      if (ice) {
        // ⭐ Check uniqueness within société only
        const existingClient = await prisma.client.findFirst({
          where: {
            ice,
            societeId: req.societeId, // ⭐ Scope to société
          },
        });

        if (existingClient) {
          throw new ApiError("ICE number already exists in your société", 409);
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

  // Credit Limit validation (optional, must be positive)
  check("creditLimit")
    .optional()
    .isFloat({ min: 0, max: 10000000 })
    .withMessage("Credit limit must be between 0 and 10,000,000 MAD")
    .toFloat(),

  // Payment Deadline validation (optional, 0-365 days)
  check("paymentDeadline")
    .optional()
    .isInt({ min: 0, max: 365 })
    .withMessage("Payment deadline must be between 0 and 365 days")
    .toInt(),

  // Discount validation (optional, 0-100%)
  check("discount")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Discount must be between 0 and 100%")
    .toFloat(),

  // Active validation (optional, boolean)
  check("active")
    .optional()
    .isBoolean()
    .withMessage("Active must be a boolean (true/false)")
    .toBoolean(),

  validatorMiddleware,
];

// ============================================
// UPDATE CLIENT VALIDATOR (UPDATED with société scope)
// ============================================
export const updateClientValidator = [
  // ID validation
  param("id")
    .isInt({ min: 1 })
    .withMessage("ID must be a positive integer")
    .toInt(),

  // Name validation (optional in update)
  check("name")
    .optional()
    .isLength({ min: 2, max: 255 })
    .withMessage("Client name must be between 2 and 255 characters")
    .trim(),

  // Phone validation (optional in update, unique per société if changed)
  check("phone")
    .optional()
    .matches(/^(?:\+212\s?[5-7](\s?\d{2}){4}|0[5-7](\s?\d{2}){4})$/)
    .withMessage(
      "Invalid Moroccan phone format. Use format: 0612345678 or +212612345678",
    )
    .custom(async (phone, { req }) => {
      const clientId = parseInt(req.params.id);

      // ⭐ Check uniqueness within société only
      const existingClient = await prisma.client.findFirst({
        where: {
          phone,
          societeId: req.societeId, // ⭐ Scope to société
          NOT: { id: clientId }, // Exclude current client
        },
      });

      if (existingClient) {
        throw new ApiError("Phone number already exists in your société", 409);
      }

      const existingClientWithPhone = await prisma.client.findFirst({
        where: {
          phone,
          NOT: { id: clientId }, // Exclude current fournisseur
        },
      });
      if (existingClientWithPhone) {
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

  check("city")
    .optional()
    .isLength({ max: 100 })
    .withMessage("City name is too long (max 100 characters)")
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
      if (ice) {
        const clientId = parseInt(req.params.id);

        // ⭐ Check uniqueness within société only
        const existingClient = await prisma.client.findFirst({
          where: {
            ice,
            societeId: req.societeId, // ⭐ Scope to société
            NOT: { id: clientId }, // Exclude current client
          },
        });

        if (existingClient) {
          throw new ApiError("ICE number already exists in your société", 409);
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

  // Credit Limit validation (optional)
  check("creditLimit")
    .optional()
    .isFloat({ min: 0, max: 10000000 })
    .withMessage("Credit limit must be between 0 and 10,000,000 MAD")
    .toFloat(),

  // Payment Deadline validation (optional)
  check("paymentDeadline")
    .optional()
    .isInt({ min: 0, max: 365 })
    .withMessage("Payment deadline must be between 0 and 365 days")
    .toInt(),

  // Discount validation (optional)
  check("discount")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Discount must be between 0 and 100%")
    .toFloat(),

  // Active validation (optional)
  check("active")
    .optional()
    .isBoolean()
    .withMessage("Active must be a boolean (true/false)")
    .toBoolean(),

  validatorMiddleware,
];

// ============================================
// GET CLIENT BY ID VALIDATOR
// ============================================
export const getClientValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("ID must be a positive integer")
    .toInt(),

  validatorMiddleware,
];

// ============================================
// DELETE CLIENT VALIDATOR
// ============================================
export const deleteClientValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("ID must be a positive integer")
    .toInt(),

  validatorMiddleware,
];

// ============================================
// CHECK CREDIT LIMIT VALIDATOR
// ============================================
export const checkCreditLimitValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("ID must be a positive integer")
    .toInt(),

  body("amount")
    .notEmpty()
    .withMessage("Amount is required")
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be greater than 0")
    .toFloat(),

  validatorMiddleware,
];
