import { check, body } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";
import prisma from "../../loaders/prisma.js";
import bcrypt from "bcryptjs";
import ApiError from "../utils/apiError.js";

// ============================================
// SIGNUP VALIDATOR
// ============================================
export const signupValidator = [
  // Name validation
  check("name")
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters")
    .trim(),

  // Email validation
  check("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail()
    .custom(async (email) => {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new ApiError("Email already exists", 409);
      }

      return true;
    }),

  // Password validation
  check("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
  // .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  // .withMessage(
  //   "Password must contain at least one uppercase letter, one lowercase letter, and one number",
  // )

  validatorMiddleware,
];

// ============================================
// LOGIN VALIDATOR
// ============================================
export const loginValidator = [
  // Email validation
  check("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),

  // Password validation
  check("password").notEmpty().withMessage("Password is required"),

  validatorMiddleware,
];

// ============================================
// CHANGE PASSWORD VALIDATOR
// ============================================
export const changePasswordValidator = [
  // Old password validation
  check("oldPassword").notEmpty().withMessage("Old password is required"),

  // New password validation
  check("newPassword")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters")
    // .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    // .withMessage(
    //   "New password must contain at least one uppercase letter, one lowercase letter, and one number",
    // )
    .custom((value, { req }) => {
      if (value === req.body.oldPassword) {
        throw new Error("New password must be different from old password");
      }
      return true;
    }),
  // Confirm password validation
  check("confirmPassword")
    .notEmpty()
    .withMessage("Please confirm your new password")
    .custom((value, { req }) => {
      // Note: compare with unhashed version from body
      if (value !== req.body.newPassword) {
        throw new Error("Password confirmation does not match");
      }
      return true;
    }),

  validatorMiddleware,
];

// ============================================
// CREATE USER VALIDATOR (Admin Action)
// ============================================
export const createUserValidator = [
  // Name validation
  check("name")
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters")
    .trim(),

  // Email validation
  check("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail()
    .custom(async (email) => {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new ApiError("Email already exists", 409);
      }

      return true;
    }),

  // Password validation
  check("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
  // .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  // .withMessage(
  //   "Password must contain at least one uppercase letter, one lowercase letter, and one number",
  // )

  // Société ID validation
  check("societeId")
    .notEmpty()
    .withMessage("SocieteId is required")
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
          "You can only create users for your own société",
          403,
        );
      }

      return true;
    }),

  // Role ID validation
  check("roleId")
    .notEmpty()
    .withMessage("RoleId is required")
    .isInt({ min: 1 })
    .withMessage("RoleId must be a positive integer")
    .custom(async (roleId) => {
      // Verify role exists
      const role = await prisma.role.findUnique({
        where: { id: parseInt(roleId) },
      });

      if (!role) {
        throw new ApiError("Role not found", 404);
      }

      return true;
    }),

  validatorMiddleware,
];

// ============================================
// FORGOT PASSWORD VALIDATOR (Optional - for future)
// ============================================
export const forgotPasswordValidator = [
  check("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail()
    .custom(async (email) => {
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new ApiError("No account found with this email", 404);
      }

      return true;
    }),

  validatorMiddleware,
];

// ============================================
// RESET PASSWORD VALIDATOR (Optional - for future)
// ============================================
export const resetPasswordValidator = [
  check("token").notEmpty().withMessage("Reset token is required"),

  check("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number",
    )
    .custom((value, { req }) => {
      req.body.password = bcrypt.hashSync(value, 10);
      return true;
    }),

  check("confirmPassword")
    .notEmpty()
    .withMessage("Please confirm your password")
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Password confirmation does not match");
      }
      return true;
    }),

  validatorMiddleware,
];
