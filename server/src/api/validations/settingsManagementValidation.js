import { check, query } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";

/* ============================================================
   SETTINGS MANAGEMENT VALIDATORS
============================================================ */

/* ============================================================
   UPDATE ALLOW NEGATIVE STOCK VALIDATOR
============================================================ */

/**
 * Validates the body for PUT /settings/allow-negative-stock
 */
export const updateAllowNegativeStockValidator = [
  check("allowNegativeStock")
    .notEmpty()
    .withMessage("allowNegativeStock is required")
    .isBoolean()
    .withMessage("allowNegativeStock must be a boolean (true/false)")
    .toBoolean(),

  check("reason")
    .optional()
    .isString()
    .withMessage("reason must be a string")
    .isLength({ min: 1, max: 500 })
    .withMessage("reason must be between 1 and 500 characters")
    .trim(),

  check("forceUpdate")
    .optional()
    .isBoolean()
    .withMessage("forceUpdate must be a boolean (true/false)")
    .toBoolean(),

  validatorMiddleware,
];

/* ============================================================
   UPDATE SYSTEM HOUR RANGE VALIDATOR
============================================================ */

/**
 * Validates the body for PUT /settings/hour-range
 */
export const updateSystemHourRangeValidator = [
  check("systemStartHour")
    .optional({ nullable: true })
    .isInt({ min: 0, max: 23 })
    .withMessage("systemStartHour must be an integer between 0 and 23")
    .toInt(),

  check("systemEndHour")
    .optional({ nullable: true })
    .isInt({ min: 0, max: 23 })
    .withMessage("systemEndHour must be an integer between 0 and 23")
    .toInt()
    .custom((endHour, { req }) => {
      const startHour = req.body.systemStartHour;

      // Both must be provided or both must be null
      const startIsSet = startHour !== undefined && startHour !== null;
      const endIsSet = endHour !== undefined && endHour !== null;

      if (startIsSet !== endIsSet) {
        throw new Error(
          "Both systemStartHour and systemEndHour must be provided together, or both set to null",
        );
      }

      return true;
    }),

  check("reason")
    .optional()
    .isString()
    .withMessage("reason must be a string")
    .isLength({ min: 1, max: 500 })
    .withMessage("reason must be between 1 and 500 characters")
    .trim(),

  check("forceUpdate")
    .optional()
    .isBoolean()
    .withMessage("forceUpdate must be a boolean (true/false)")
    .toBoolean(),

  validatorMiddleware,
];

/* ============================================================
   UPDATE MULTIPLE SETTINGS VALIDATOR
============================================================ */

/**
 * Validates the body for PUT /settings/bulk
 */
export const updateMultipleSettingsValidator = [
  check("allowNegativeStock")
    .optional()
    .isBoolean()
    .withMessage("allowNegativeStock must be a boolean (true/false)")
    .toBoolean(),

  check("systemStartHour")
    .optional({ nullable: true })
    .isInt({ min: 0, max: 23 })
    .withMessage("systemStartHour must be an integer between 0 and 23")
    .toInt(),

  check("systemEndHour")
    .optional({ nullable: true })
    .isInt({ min: 0, max: 23 })
    .withMessage("systemEndHour must be an integer between 0 and 23")
    .toInt()
    .custom((endHour, { req }) => {
      const startHour = req.body.systemStartHour;

      const startIsSet = startHour !== undefined && startHour !== null;
      const endIsSet = endHour !== undefined && endHour !== null;

      if (startIsSet !== endIsSet) {
        throw new Error(
          "Both systemStartHour and systemEndHour must be provided together, or both set to null",
        );
      }

      return true;
    }),

  check("reason")
    .optional()
    .isString()
    .withMessage("reason must be a string")
    .isLength({ min: 1, max: 500 })
    .withMessage("reason must be between 1 and 500 characters")
    .trim(),

  check("forceUpdate")
    .optional()
    .isBoolean()
    .withMessage("forceUpdate must be a boolean (true/false)")
    .toBoolean(),

  // At least one setting must be provided
  check().custom((_, { req }) => {
    const { allowNegativeStock, systemStartHour, systemEndHour } = req.body;

    if (
      allowNegativeStock === undefined &&
      systemStartHour === undefined &&
      systemEndHour === undefined
    ) {
      throw new Error(
        "At least one setting (allowNegativeStock, systemStartHour, or systemEndHour) must be provided",
      );
    }

    return true;
  }),

  validatorMiddleware,
];

/* ============================================================
   GET SETTINGS CHANGE HISTORY VALIDATOR
============================================================ */

/**
 * Validates query params for GET /settings/history
 */
export const getSettingsChangeHistoryValidator = [
  query("limit")
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage("limit must be an integer between 1 and 200")
    .toInt(),

  query("settingName")
    .optional()
    .isString()
    .withMessage("settingName must be a string")
    .isIn(["allowNegativeStock", "systemStartHour", "systemEndHour"])
    .withMessage(
      "settingName must be one of: allowNegativeStock, systemStartHour, systemEndHour",
    )
    .trim(),

  validatorMiddleware,
];
