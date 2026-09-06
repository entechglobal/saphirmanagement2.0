import { body, param, query } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";
import ApiError from "../utils/apiError.js";

/* ============================================================
   CREATE USER VALIDATOR
============================================================ */
export const createUserValidator = [
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail()
    .trim(),

  body("name")
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 255 })
    .withMessage("Name must be between 2 and 255 characters")
    .trim(),

  body("password").notEmpty().withMessage("Password is required"),
  body("roleId")
    .notEmpty()
    .withMessage("roleId is required")
    .isInt({ min: 1 })
    .withMessage("roleId must be a positive integer")
    .toInt(),

  body("societeId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("societeId must be a positive integer")
    .toInt(),

  body("isSuperAdmin")
    .optional()
    .isBoolean()
    .withMessage("isSuperAdmin must be a boolean")
    .toBoolean(),

  body("active")
    .optional()
    .isBoolean()
    .withMessage("active must be a boolean")
    .toBoolean(),

  body("canBePreparateur")
    .optional()
    .isBoolean()
    .withMessage("canBePreparateur must be a boolean")
    .toBoolean(),

  body("canBeLivreur")
    .optional()
    .isBoolean()
    .withMessage("canBeLivreur must be a boolean")
    .toBoolean(),

  body("extraPermissionIds")
    .optional()
    .isArray()
    .withMessage("extraPermissionIds must be an array"),

  body("extraPermissionIds.*")
    .isInt({ min: 1 })
    .withMessage("Each permission ID must be a positive integer")
    .toInt(),

  body("removedPermissionIds")
    .optional()
    .isArray()
    .withMessage("removedPermissionIds must be an array"),

  body("removedPermissionIds.*")
    .isInt({ min: 1 })
    .withMessage("Each permission ID must be a positive integer")
    .toInt(),

  // Custom validation for conflicting permission IDs
  body().custom((_, { req }) => {
    const { extraPermissionIds = [], removedPermissionIds = [] } = req.body;

    const extraSet = new Set(extraPermissionIds);
    const removedSet = new Set(removedPermissionIds);

    for (const id of extraSet) {
      if (removedSet.has(id)) {
        throw new ApiError(
          `Permission ID ${id} cannot be both added and removed`,
          400,
        );
      }
    }

    return true;
  }),

  validatorMiddleware,
];

/* ============================================================
   UPDATE USER VALIDATOR
============================================================ */
export const updateUserValidator = [
  body("email")
    .optional()
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail()
    .trim(),

  body("name")
    .optional()
    .isLength({ min: 2, max: 255 })
    .withMessage("Name must be between 2 and 255 characters")
    .trim(),

  body("roleId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("roleId must be a positive integer")
    .toInt(),

  body("societeId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("societeId must be a positive integer")
    .toInt(),

  body("isSuperAdmin")
    .optional()
    .isBoolean()
    .withMessage("isSuperAdmin must be a boolean")
    .toBoolean(),

  body("profile")
    .optional({ nullable: true })
    .isLength({ max: 1000 })
    .withMessage("Profile must be 1000 characters or fewer")
    .trim(),

  body("active")
    .optional()
    .isBoolean()
    .withMessage("active must be a boolean")
    .toBoolean(),

  body("canBePreparateur")
    .optional()
    .isBoolean()
    .withMessage("canBePreparateur must be a boolean")
    .toBoolean(),

  body("canBeLivreur")
    .optional()
    .isBoolean()
    .withMessage("canBeLivreur must be a boolean")
    .toBoolean(),

  body("extraPermissionIds")
    .optional()
    .isArray()
    .withMessage("extraPermissionIds must be an array"),

  body("extraPermissionIds.*")
    .isInt({ min: 1 })
    .withMessage("Each permission ID must be a positive integer")
    .toInt(),

  body("removedPermissionIds")
    .optional()
    .isArray()
    .withMessage("removedPermissionIds must be an array"),

  body("removedPermissionIds.*")
    .isInt({ min: 1 })
    .withMessage("Each permission ID must be a positive integer")
    .toInt(),

  // Custom validation for conflicting permission IDs
  body().custom((_, { req }) => {
    const { extraPermissionIds = [], removedPermissionIds = [] } = req.body;

    if (extraPermissionIds.length === 0 && removedPermissionIds.length === 0) {
      return true; // No permissions being updated
    }

    const extraSet = new Set(extraPermissionIds);
    const removedSet = new Set(removedPermissionIds);

    for (const id of extraSet) {
      if (removedSet.has(id)) {
        throw new ApiError(
          `Permission ID ${id} cannot be both added and removed`,
          400,
        );
      }
    }

    return true;
  }),

  validatorMiddleware,
];

/* ============================================================
   UPDATE PASSWORD VALIDATOR
============================================================ */
export const updatePasswordValidator = [
  body("currentPassword")
    .optional() // Only required when user is changing their own password
    .isLength({ min: 1 })
    .withMessage(
      "Current password is required when changing your own password",
    ),

  body("newPassword").notEmpty().withMessage("New password is required"),
  body("confirmPassword")
    .notEmpty()
    .withMessage("Confirm password is required")
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new ApiError("Passwords do not match", 400);
      }
      return true;
    }),

  validatorMiddleware,
];

/* ============================================================
   USER ID VALIDATOR
============================================================ */
export const userIdValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("User ID must be a positive integer")
    .toInt(),

  validatorMiddleware,
];

/* ============================================================
   SOCIÉTÉ ID PARAM VALIDATOR
============================================================ */
export const societeIdParamValidator = [
  param("societeId")
    .isInt({ min: 1 })
    .withMessage("societeId must be a positive integer")
    .toInt(),

  validatorMiddleware,
];

/* ============================================================
   QUERY VALIDATORS
============================================================ */
export const getUsersQueryValidator = [
  query("societeId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("societeId must be a positive integer")
    .toInt(),

  query("roleId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("roleId must be a positive integer")
    .toInt(),

  query("active")
    .optional()
    .isIn(["true", "false"])
    .withMessage("active must be true or false"),

  query("isSuperAdmin")
    .optional()
    .isIn(["true", "false"])
    .withMessage("isSuperAdmin must be true or false"),

  query("search")
    .optional({ values: "falsy" })
    .isLength({ min: 1, max: 100 })
    .withMessage("search must be between 1 and 100 characters")
    .trim(),

  validatorMiddleware,
];
