import { check, body } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";
import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";

// ============================================
// CREATE DÉPÔT VALIDATOR
// ============================================
export const createDepotValidator = [
  // Société ID (required for super admin, auto-set for regular admin)
  check("societeId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("SocieteId must be a positive integer")
    .custom(async (societeId, { req }) => {
      // Verify société exists
      const societe = await prisma.societe.findUnique({
        where: { id: parseInt(societeId) },
      });

      if (!societe) {
        throw new ApiError("Société not found", 404);
      }

      // If user is not super admin, verify they're creating for their own société
      if (
        req.user &&
        !req.user.isSuperAdmin &&
        req.user.societeId !== parseInt(societeId)
      ) {
        throw new ApiError(
          "You can only create dépôts for your own société",
          403,
        );
      }

      return true;
    }),

  // Code (optional - auto-generated if not provided)
  check("code")
    .optional()
    .isLength({ min: 3, max: 20 })
    .withMessage("Code must be between 3 and 20 characters")
    .custom(async (code, { req }) => {
      if (code) {
        const societeId =
          req.body.societeId || req.user.societeId || req.societeId;

        const existing = await prisma.depot.findFirst({
          where: {
            societeId: parseInt(societeId),
            code,
          },
        });

        if (existing) {
          throw new ApiError(
            `Depot code ${code} already exists in this société`,
            409,
          );
        }
      }
      return true;
    }),

  // Name (required)
  check("name")
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters")
    .trim(),

  // Type (required)
  check("type")
    .notEmpty()
    .withMessage("Type is required")
    .isIn(["PRINCIPAL", "SECONDARY", "OUTLET", "TRANSIT"])
    .withMessage("Type must be PRINCIPAL, SECONDARY, OUTLET, or TRANSIT")
    .custom(async (type, { req }) => {
      // Check if trying to create another PRINCIPAL depot
      if (type === "PRINCIPAL") {
        const societeId =
          req.body.societeId || req.user.societeId || req.societeId;
        if (!societeId) {
          throw new ApiError("societeId is required", 409);
        }
        const existingPrincipal = await prisma.depot.findFirst({
          where: {
            societeId: parseInt(societeId),
            type: "PRINCIPAL",
          },
        });

        if (existingPrincipal) {
          throw new ApiError(
            "A PRINCIPAL depot already exists for this société. Use SECONDARY type instead.",
            409,
          );
        }
      }
      return true;
    }),

  // Address (optional)
  check("address")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Address cannot exceed 500 characters")
    .trim(),

  // City (optional)
  check("city")
    .optional()
    .isLength({ max: 100 })
    .withMessage("City cannot exceed 100 characters")
    .trim(),

  // Region (optional)
  check("region")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Region cannot exceed 100 characters")
    .trim(),

  // Phone (optional)
  check("phone")
    .optional()
    .matches(/^0[5-7][0-9]{8}$/)
    .withMessage(
      "Phone must be a valid Moroccan phone number (10 digits starting with 05, 06, or 07)",
    ),

  // Email (optional)
  check("email")
    .optional()
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),

  // Manager Name (optional)
  check("manager")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Manager name cannot exceed 100 characters")
    .trim(),

  // Capacity (optional)
  check("capacity")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Capacity must be a positive number"),

  validatorMiddleware,
];

// ============================================
// UPDATE DÉPÔT VALIDATOR
// ============================================
export const updateDepotValidator = [
  // Code (optional)
  check("code")
    .optional()
    .isLength({ min: 3, max: 20 })
    .withMessage("Code must be between 3 and 20 characters")
    // .matches(/^[A-Z0-9-]+$/)
    // .withMessage(
    //   "Code must contain only uppercase letters, numbers, and hyphens",
    // )
    .custom(async (code, { req }) => {
      if (code) {
        const depotId = parseInt(req.params.id);

        // Get depot to find its société
        const depot = await prisma.depot.findUnique({
          where: { id: depotId },
        });

        if (!depot) {
          throw new ApiError("Dépôt not found", 404);
        }

        // Check code uniqueness
        const existing = await prisma.depot.findFirst({
          where: {
            societeId: depot.societeId,
            code,
            NOT: { id: depotId },
          },
        });

        if (existing) {
          throw new ApiError(
            `Depot code ${code} already exists in this société`,
            409,
          );
        }
      }
      return true;
    }),

  // Name (optional in update)
  check("name")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters")
    .trim(),

  // Type (optional)
  check("type")
    .optional()
    .isIn(["PRINCIPAL", "SECONDARY", "OUTLET", "TRANSIT"])
    .withMessage("Type must be PRINCIPAL, SECONDARY, OUTLET, or TRANSIT")
    .custom(async (type, { req }) => {
      // Check if changing to PRINCIPAL and another exists
      if (type === "PRINCIPAL") {
        const depotId = parseInt(req.params.id);

        const depot = await prisma.depot.findUnique({
          where: { id: depotId },
        });

        if (!depot) {
          throw new ApiError("Dépôt not found", 404);
        }

        // Only check if changing FROM non-PRINCIPAL TO PRINCIPAL
        if (depot.type !== "PRINCIPAL") {
          const existingPrincipal = await prisma.depot.findFirst({
            where: {
              societeId: depot.societeId,
              type: "PRINCIPAL",
              NOT: { id: depotId },
            },
          });

          if (existingPrincipal) {
            throw new ApiError(
              "A PRINCIPAL depot already exists for this société",
              409,
            );
          }
        }
      }
      return true;
    }),

  // Address (optional)
  check("address")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Address cannot exceed 500 characters")
    .trim(),

  // City (optional)
  check("city")
    .optional()
    .isLength({ max: 100 })
    .withMessage("City cannot exceed 100 characters")
    .trim(),

  // Region (optional)
  check("region")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Region cannot exceed 100 characters")
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

  // Manager Name (optional)
  check("manager")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Manager name cannot exceed 100 characters")
    .trim(),

  // Capacity (optional)
  check("capacity")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Capacity must be a positive number"),

  // Active (optional)
  check("active")
    .optional()
    .isBoolean()
    .withMessage("Active must be a boolean value"),

  validatorMiddleware,
];

// ============================================
// TOGGLE ACTIVE VALIDATOR
// ============================================
export const toggleActiveValidator = [
  check("active")
    .notEmpty()
    .withMessage("Active status is required")
    .isBoolean()
    .withMessage("Active must be a boolean value"),

  validatorMiddleware,
];

// ============================================
// DÉPÔT ID PARAM VALIDATOR
// ============================================
export const depotIdValidator = [
  check("id")
    .isInt({ min: 1 })
    .withMessage("Invalid dépôt ID")
    .custom(async (id) => {
      const depot = await prisma.depot.findUnique({
        where: { id: parseInt(id) },
      });

      if (!depot) {
        throw new ApiError("Dépôt not found", 404);
      }

      return true;
    }),

  validatorMiddleware,
];
