import { Router } from "express";

import * as SettingsController from "../controllers/settingsManagementController.js";
import { auth } from "../middlewares/authMiddleware.js";
import {
  updateAllowNegativeStockValidator,
  updateSystemHourRangeValidator,
  updateMultipleSettingsValidator,
  getSettingsChangeHistoryValidator,
} from "../validations/settingsManagementValidation.js";

const router = Router();

/* ============================================================
   ROUTES
============================================================ */

/**
 * GET /api/settings
 *
 * Get current system settings with impact analysis
 *
 * Returns:
 * - Current settings values
 * - Statistics (negative stock count, transactions count, etc.)
 * - Impact analysis for potential changes
 *
 * Permission: Super Admin only
 */
router.get("/", auth, SettingsController.getSettings);

/**
 * PUT /api/settings/allow-negative-stock
 *
 * Update allowNegativeStock setting
 *
 * Body:
 * - allowNegativeStock: boolean (required)
 * - reason: string (optional)
 * - forceUpdate: boolean (optional, default: false)
 *
 * If forceUpdate = false and change has warnings:
 * - Returns requiresConfirmation: true
 * - Returns validation warnings and impacts
 * - Frontend should display warnings and ask user to confirm
 * - Then retry with forceUpdate: true
 *
 * Features:
 * - Validates impact on existing negative stock
 * - Logs change to audit trail
 * - Clears settings cache
 * - Returns warnings if disabling with existing negative stock
 *
 * Permission: Super Admin only
 */
router.put(
  "/allow-negative-stock",
  auth,
  updateAllowNegativeStockValidator,
  SettingsController.updateAllowNegativeStock,
);

/**
 * PUT /api/settings/hour-range
 *
 * Update system hour range boundaries (operating hours)
 *
 * Body:
 * - systemStartHour: number 0-23 or null (optional)
 * - systemEndHour: number 0-23 or null (optional)
 * - reason: string (optional)
 * - forceUpdate: boolean (optional, default: false)
 *
 * Examples:
 * - 12h to 12h = 24/7 operation (24 hours)
 * - 8h to 18h = Business hours (10 hours)
 * - 22h to 6h = Night shift (8 hours, crosses midnight)
 * - null to null = No restrictions (24/7)
 *
 * If forceUpdate = false and change has warnings:
 * - Returns requiresConfirmation: true
 * - Returns validation warnings and impacts
 * - Frontend should display warnings and ask user to confirm
 * - Then retry with forceUpdate: true
 *
 * Features:
 * - Validates hour range logic
 * - Checks impact on existing transactions outside hours
 * - Logs changes to audit trail
 * - Clears hour settings cache
 * - Returns warnings if hours would filter existing data
 *
 * Permission: Super Admin only
 */
router.put(
  "/hour-range",
  auth,
  updateSystemHourRangeValidator,
  SettingsController.updateSystemHourRange,
);

/**
 * PUT /api/settings/bulk
 *
 * Update multiple settings at once
 *
 * Body:
 * - allowNegativeStock: boolean (optional)
 * - systemStartHour: number 0-23 or null (optional)
 * - systemEndHour: number 0-23 or null (optional)
 * - reason: string (optional)
 * - forceUpdate: boolean (optional, default: false)
 *
 * Features:
 * - Update multiple settings in one request
 * - Validates all changes before applying
 * - Returns combined validation results
 * - At least one setting field must be provided
 *
 * Permission: Super Admin only
 */
router.put(
  "/bulk",
  auth,
  updateMultipleSettingsValidator,
  SettingsController.updateMultipleSettings,
);

/**
 * GET /api/settings/history
 *
 * Get settings change history
 *
 * Query params:
 * - limit: number (optional, default: 50, max: 200)
 * - settingName: string (optional) — one of:
 *     allowNegativeStock | systemStartHour | systemEndHour
 *
 * Returns:
 * - Array of setting changes with:
 *   • settingName
 *   • oldValue
 *   • newValue
 *   • changedAt
 *   • changedBy (user info)
 *   • reason
 *
 * Permission: Super Admin only
 */
router.get(
  "/history",
  auth,
  getSettingsChangeHistoryValidator,
  SettingsController.getSettingsHistory,
);

export default router;
