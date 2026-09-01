import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";
import { clearSettingsCache } from "./domain/stockValidationService.js";
import { clearHourSettingsCache } from "../utils/timeRangeUtility.js";

/* ============================================================
   SYSTEM SETTINGS MANAGEMENT SERVICE
   Handles settings updates with validation and impact analysis
============================================================ */

/* ============================================================
   SETTINGS CHANGE HISTORY
============================================================ */

/**
 * Log settings change for audit trail
 *
 * @param {string} settingName - Name of the setting changed
 * @param {any} oldValue - Previous value
 * @param {any} newValue - New value
 * @param {number} userId - User who made the change
 * @param {string} reason - Reason for change (optional)
 */
const logSettingChange = async (
  settingName,
  oldValue,
  newValue,
  userId,
  reason = null,
) => {
  await prisma.settingsChangeLog.create({
    data: {
      settingName,
      oldValue: oldValue !== null ? JSON.stringify(oldValue) : null,
      newValue: newValue !== null ? JSON.stringify(newValue) : null,
      changedBy: userId,
      reason,
      changedAt: new Date(),
    },
  });
};

/* ============================================================
   NEGATIVE STOCK SETTING CHANGES
============================================================ */

/**
 * Validate allowNegativeStock change
 * Checks if change would cause data inconsistency
 *
 * @param {boolean} newValue - New setting value
 * @returns {Promise<Object>} Validation result with warnings
 */
const validateNegativeStockChange = async (newValue) => {
  const warnings = [];
  const impacts = [];

  // If changing FROM true TO false (enabling validation)
  if (newValue === false) {
    const negativeStockCount = await prisma.stockByDepot.count({
      where: { quantityAvailable: { lt: 0 } },
    });

    if (negativeStockCount > 0) {
      const negativeStockItems = await prisma.stockByDepot.findMany({
        where: { quantityAvailable: { lt: 0 } },
        include: {
          depot: { select: { name: true, code: true } },
          article: { select: { name: true, barcode: true } },
          variant: {
            select: {
              name: true,
              article: { select: { name: true } },
              variantAttributes: {
                include: {
                  attributeValue: { select: { value: true } },
                },
              },
            },
          },
        },
        take: 10,
      });

      warnings.push({
        severity: "HIGH",
        message: `${negativeStockCount} stock record(s) currently have negative quantities`,
        details: negativeStockItems.map((stock) => ({
          depot: `${stock.depot.name} (${stock.depot.code})`,
          product:
            stock.article?.name ||
            (stock.variant
              ? `${stock.variant.article.name} (${stock.variant.variantAttributes
                  .map((va) => va.attributeValue.value)
                  .join(" - ")})`
              : "Unknown"),
          currentStock: stock.quantityAvailable,
        })),
        action:
          "These items will need stock adjustments before further operations are allowed",
      });
    }

    impacts.push({
      module: "All Stock Operations",
      impact:
        "Stock operations will be blocked if they would result in negative stock",
      severity: "MEDIUM",
    });
  } else {
    // Changing FROM false TO true (disabling validation)
    impacts.push({
      module: "All Stock Operations",
      impact: "Stock can now become negative. Operations will not be blocked.",
      severity: "LOW",
    });
  }

  return {
    isValid: true,
    warnings,
    impacts,
    requiresConfirmation: warnings.length > 0,
  };
};

/**
 * Update allowNegativeStock setting
 *
 * @param {boolean} newValue - New setting value
 * @param {number} userId - User making the change
 * @param {string} reason - Reason for change
 * @param {boolean} forceUpdate - Skip validation warnings
 * @returns {Promise<Object>} Update result
 */
export const updateAllowNegativeStock = async (
  newValue,
  userId,
  reason = null,
  forceUpdate = false,
) => {
  const currentSettings = await prisma.systemSettings.findFirst({
    select: { id: true, allowNegativeStock: true },
  });

  if (!currentSettings) {
    throw new ApiError("System settings not found", 404);
  }

  if (currentSettings.allowNegativeStock === newValue) {
    return {
      success: true,
      message: "Setting already has this value",
      changed: false,
    };
  }

  const validation = await validateNegativeStockChange(newValue);

  if (!forceUpdate && validation.requiresConfirmation) {
    return {
      success: false,
      requiresConfirmation: true,
      validation,
      message: "Setting change requires confirmation due to potential impacts",
    };
  }

  await prisma.systemSettings.update({
    where: { id: currentSettings.id },
    data: { allowNegativeStock: newValue },
  });

  await logSettingChange(
    "allowNegativeStock",
    currentSettings.allowNegativeStock,
    newValue,
    userId,
    reason,
  );

  clearSettingsCache();

  return {
    success: true,
    changed: true,
    oldValue: currentSettings.allowNegativeStock,
    newValue,
    validation,
    message: "Setting updated successfully",
  };
};

/* ============================================================
   HOUR RANGE SETTING CHANGES
============================================================ */

/**
 * Helper: Format hour for display
 *
 * @param {number} hour
 * @returns {string} e.g. "08:00"
 */
const formatHourDisplay = (hour) => {
  return `${hour.toString().padStart(2, "0")}:00`;
};

/**
 * Validate hour range change
 * Checks impact on existing data
 *
 * @param {number|null} newStartHour - New system start hour (0-23)
 * @param {number|null} newEndHour - New system end hour (0-23)
 * @returns {Promise<Object>} Validation result
 */
const validateHourRangeChange = async (newStartHour, newEndHour) => {
  const warnings = [];
  const impacts = [];

  if (newStartHour !== null && (newStartHour < 0 || newStartHour > 23)) {
    throw new ApiError("systemStartHour must be between 0 and 23", 400);
  }

  if (newEndHour !== null && (newEndHour < 0 || newEndHour > 23)) {
    throw new ApiError("systemEndHour must be between 0 and 23", 400);
  }

  // Both hours must be set or both null
  if ((newStartHour === null) !== (newEndHour === null)) {
    throw new ApiError(
      "Both systemStartHour and systemEndHour must be set or both null",
      400,
    );
  }

  if (newStartHour !== null && newEndHour !== null) {
    let availableHours;

    if (newStartHour === newEndHour) {
      availableHours = 24; // 24/7 operation
    } else if (newStartHour < newEndHour) {
      availableHours = newEndHour - newStartHour;
    } else {
      availableHours = 24 - newStartHour + newEndHour;
    }

    // Check transactions outside new hours
    if (newStartHour !== newEndHour) {
      const outsideCondition =
        newStartHour < newEndHour
          ? `(EXTRACT(HOUR FROM "createdAt") < ${newStartHour} OR EXTRACT(HOUR FROM "createdAt") >= ${newEndHour})`
          : `(EXTRACT(HOUR FROM "createdAt") >= ${newEndHour} AND EXTRACT(HOUR FROM "createdAt") < ${newStartHour})`;

      const result = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*) as count FROM stock_transactions WHERE ${outsideCondition}`,
      );

      const count = parseInt(result[0]?.count || 0);

      if (count > 0) {
        warnings.push({
          severity: "HIGH",
          message: `${count} transaction(s) exist outside the new operating hours`,
          details: `These transactions will be filtered out when querying by hour restrictions`,
          action:
            "Verify this hour range is correct for your business operations",
        });

        impacts.push({
          module: "Stock Transactions (Hour Filter)",
          impact: `${count} records created outside ${formatHourDisplay(newStartHour)}-${formatHourDisplay(newEndHour)} will be filtered`,
          severity: "MEDIUM",
        });
      }
    }

    impacts.push({
      module: "All Operations",
      impact: `Operations will be restricted to ${availableHours} hours per day (${formatHourDisplay(newStartHour)}-${formatHourDisplay(newEndHour)})`,
      severity: availableHours < 12 ? "HIGH" : "MEDIUM",
    });
  } else {
    impacts.push({
      module: "All Operations",
      impact: "24/7 operations enabled (no hour restrictions)",
      severity: "LOW",
    });
  }

  return {
    isValid: true,
    warnings,
    impacts,
    requiresConfirmation: warnings.length > 0,
  };
};

/**
 * Update system hour range settings
 *
 * @param {number|null} newStartHour - New system start hour (0-23 or null)
 * @param {number|null} newEndHour - New system end hour (0-23 or null)
 * @param {number} userId - User making the change
 * @param {string} reason - Reason for change
 * @param {boolean} forceUpdate - Skip validation warnings
 * @returns {Promise<Object>} Update result
 */
export const updateSystemHourRange = async (
  newStartHour,
  newEndHour,
  userId,
  reason = null,
  forceUpdate = false,
) => {
  const currentSettings = await prisma.systemSettings.findFirst({
    select: {
      id: true,
      systemStartHour: true,
      systemEndHour: true,
    },
  });

  if (!currentSettings) {
    throw new ApiError("System settings not found", 404);
  }

  const startChanged = currentSettings.systemStartHour !== newStartHour;
  const endChanged = currentSettings.systemEndHour !== newEndHour;

  if (!startChanged && !endChanged) {
    return {
      success: true,
      message: "Settings already have these values",
      changed: false,
    };
  }

  const validation = await validateHourRangeChange(newStartHour, newEndHour);

  if (!forceUpdate && validation.requiresConfirmation) {
    return {
      success: false,
      requiresConfirmation: true,
      validation,
      message:
        "Hour range change requires confirmation due to potential impacts",
    };
  }

  await prisma.systemSettings.update({
    where: { id: currentSettings.id },
    data: {
      systemStartHour: newStartHour,
      systemEndHour: newEndHour,
    },
  });

  if (startChanged) {
    await logSettingChange(
      "systemStartHour",
      currentSettings.systemStartHour,
      newStartHour,
      userId,
      reason,
    );
  }

  if (endChanged) {
    await logSettingChange(
      "systemEndHour",
      currentSettings.systemEndHour,
      newEndHour,
      userId,
      reason,
    );
  }

  clearHourSettingsCache();

  return {
    success: true,
    changed: true,
    oldValues: {
      systemStartHour: currentSettings.systemStartHour,
      systemEndHour: currentSettings.systemEndHour,
    },
    newValues: {
      systemStartHour: newStartHour,
      systemEndHour: newEndHour,
    },
    validation,
    message: "Hour range settings updated successfully",
  };
};

/* ============================================================
   GET SETTINGS WITH IMPACT ANALYSIS
============================================================ */

/**
 * Get current settings with impact analysis for potential changes
 *
 * @returns {Promise<Object>} Current settings and statistics
 */
export const getSettingsWithImpact = async () => {
  const settings = await prisma.systemSettings.findFirst();

  if (!settings) {
    throw new ApiError("System settings not found", 404);
  }

  const [totalTransactions, negativeStockCount] = await Promise.all([
    prisma.stockTransaction.count(),
    prisma.stockByDepot.count({
      where: { quantityAvailable: { lt: 0 } },
    }),
  ]);

  let transactionsOutsideHours = 0;

  if (
    settings.systemStartHour !== null &&
    settings.systemEndHour !== null &&
    settings.systemStartHour !== settings.systemEndHour // Not 24/7
  ) {
    const { systemStartHour, systemEndHour } = settings;

    const outsideCondition =
      systemStartHour < systemEndHour
        ? `(EXTRACT(HOUR FROM "createdAt") < ${systemStartHour} OR EXTRACT(HOUR FROM "createdAt") >= ${systemEndHour})`
        : `(EXTRACT(HOUR FROM "createdAt") >= ${systemEndHour} AND EXTRACT(HOUR FROM "createdAt") < ${systemStartHour})`;

    const result = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM stock_transactions WHERE ${outsideCondition}`,
    );

    transactionsOutsideHours = parseInt(result[0]?.count || 0);
  }

  return {
    settings: {
      allowNegativeStock: settings.allowNegativeStock,
      systemStartHour: settings.systemStartHour,
      systemEndHour: settings.systemEndHour,
    },
    statistics: {
      totalStockTransactions: totalTransactions,
      negativeStockRecords: negativeStockCount,
      transactionsOutsideHours,
      transactionsWithinHours: totalTransactions - transactionsOutsideHours,
    },
    impacts: {
      allowNegativeStock: {
        current: settings.allowNegativeStock
          ? "Stock can become negative"
          : "Stock cannot become negative",
        changingToFalse:
          negativeStockCount > 0
            ? `Would affect ${negativeStockCount} items with negative stock`
            : "No impact - no negative stock exists",
      },
      hourRange: {
        current:
          settings.systemStartHour !== null
            ? `${formatHourDisplay(settings.systemStartHour)} - ${formatHourDisplay(settings.systemEndHour)}${settings.systemStartHour === settings.systemEndHour ? " (24/7)" : ""}`
            : "24/7 (no restrictions)",
        recordsOutsideRange: transactionsOutsideHours,
        recordsInsideRange: totalTransactions - transactionsOutsideHours,
      },
    },
  };
};

/* ============================================================
   GET SETTINGS CHANGE HISTORY
============================================================ */

/**
 * Get history of settings changes
 *
 * @param {Object} filters - Filters (limit, settingName, etc.)
 * @returns {Promise<Array>} Change history
 */
export const getSettingsChangeHistory = async (filters = {}) => {
  const { limit = 50, page = 1, settingName } = filters;

  const where = {};

  if (settingName) {
    where.settingName = settingName;
  }

  const changes = await prisma.settingsChangeLog.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { changedAt: "desc" },
    take: limit,
    skip: (page - 1) * limit,
  });

  return changes.map((change) => ({
    id: change.id,
    settingName: change.settingName,
    oldValue: change.oldValue ? JSON.parse(change.oldValue) : null,
    newValue: change.newValue ? JSON.parse(change.newValue) : null,
    changedAt: change.changedAt,
    changedBy: change.user,
    reason: change.reason,
  }));
};

/* ============================================================
   BULK SETTINGS UPDATE
============================================================ */

/**
 * Update multiple settings at once with validation
 *
 * @param {Object} updates - Settings to update
 * @param {number} userId - User making changes
 * @param {string} reason - Reason for changes
 * @param {boolean} forceUpdate - Skip validation warnings
 * @returns {Promise<Object>} Update results
 */
export const updateMultipleSettings = async (
  updates,
  userId,
  reason = null,
  forceUpdate = false,
) => {
  const results = {
    allowNegativeStock: null,
    hourRange: null,
  };

  if (updates.allowNegativeStock !== undefined) {
    results.allowNegativeStock = await updateAllowNegativeStock(
      updates.allowNegativeStock,
      userId,
      reason,
      forceUpdate,
    );

    if (!results.allowNegativeStock.success && !forceUpdate) {
      return {
        success: false,
        requiresConfirmation: true,
        results,
      };
    }
  }

  if (
    updates.systemStartHour !== undefined ||
    updates.systemEndHour !== undefined
  ) {
    results.hourRange = await updateSystemHourRange(
      updates.systemStartHour,
      updates.systemEndHour,
      userId,
      reason,
      forceUpdate,
    );

    if (!results.hourRange.success && !forceUpdate) {
      return {
        success: false,
        requiresConfirmation: true,
        results,
      };
    }
  }

  return {
    success: true,
    results,
    message: "Settings updated successfully",
  };
};

/* ============================================================
   EXPORTS
============================================================ */

export default {
  updateAllowNegativeStock,
  updateSystemHourRange,
  updateMultipleSettings,
  getSettingsWithImpact,
  getSettingsChangeHistory,
};
