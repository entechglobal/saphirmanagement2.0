import SettingsManagement from "../services/settingsManagementService.js";
import asyncHandler from "express-async-handler";

/* ============================================================
   SETTINGS MANAGEMENT CONTROLLER
============================================================ */

/* ============================================================
   GET CURRENT SETTINGS WITH IMPACT ANALYSIS
============================================================ */
export const getSettings = asyncHandler(async (req, res) => {
  const result = await SettingsManagement.getSettingsWithImpact();

  res.status(200).json({
    success: true,
    message: "Settings retrieved successfully",
    data: result,
  });
});

/* ============================================================
   UPDATE ALLOW NEGATIVE STOCK SETTING
============================================================ */
export const updateAllowNegativeStock = asyncHandler(async (req, res) => {
  const { allowNegativeStock, reason, forceUpdate } = req.body;

  const result = await SettingsManagement.updateAllowNegativeStock(
    allowNegativeStock,
    req.user.id,
    reason,
    forceUpdate || false,
  );

  if (!result.success) {
    return res.status(200).json({
      success: false,
      requiresConfirmation: true,
      data: result,
      message: result.message,
    });
  }

  res.status(200).json({
    success: true,
    message: result.message,
    data: result,
  });
});

/* ============================================================
   UPDATE SYSTEM HOUR RANGE
============================================================ */
export const updateSystemHourRange = asyncHandler(async (req, res) => {
  const { systemStartHour, systemEndHour, reason, forceUpdate } = req.body;

  const result = await SettingsManagement.updateSystemHourRange(
    systemStartHour,
    systemEndHour,
    req.user.id,
    reason,
    forceUpdate || false,
  );

  if (!result.success) {
    return res.status(200).json({
      success: false,
      requiresConfirmation: true,
      data: result,
      message: result.message,
    });
  }

  res.status(200).json({
    success: true,
    message: result.message,
    data: result,
  });
});

/* ============================================================
   UPDATE MULTIPLE SETTINGS
============================================================ */
export const updateMultipleSettings = asyncHandler(async (req, res) => {
  const { settings, reason, forceUpdate } = req.body;

  const result = await SettingsManagement.updateMultipleSettings(
    settings,
    req.user.id,
    reason,
    forceUpdate || false,
  );

  if (!result.success) {
    return res.status(200).json({
      success: false,
      requiresConfirmation: true,
      data: result,
      message: "Settings changes require confirmation",
    });
  }

  res.status(200).json({
    success: true,
    message: result.message,
    data: result,
  });
});

/* ============================================================
   GET SETTINGS CHANGE HISTORY
============================================================ */
export const getSettingsHistory = asyncHandler(async (req, res) => {
  const { limit, page, settingName } = req.query;

  const history = await SettingsManagement.getSettingsChangeHistory({
    limit: limit ? parseInt(limit) : 50,
    page: page ? parseInt(page) : 1,
    settingName,
  });

  res.status(200).json({
    success: true,
    pagination: {
      results: history.length,
      page: page,
      limit: limit,
      totalPages: Math.ceil(history.length / limit),
    },
    message: "Settings change history retrieved successfully",
    data: history,
  });
});
