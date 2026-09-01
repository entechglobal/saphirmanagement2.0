import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";

/* ============================================================
   TIME RANGE UTILITY
   Centralized time range logic with system hour boundaries
   
   Example: systemStartHour = 12, systemEndHour = 12
   Means: Operations allowed 24/7 (12:00 to next day 12:00)
   
   Example: systemStartHour = 8, systemEndHour = 18
   Means: Operations allowed 08:00 to 18:00 daily
   
   Example: systemStartHour = 22, systemEndHour = 6
   Means: Operations allowed 22:00 to 06:00 (crosses midnight)
============================================================ */

/**
 * Get system hour boundaries
 * Cached to avoid repeated database calls
 */
let hourSettingsCache = null;
let hourSettingsCacheTime = 0;
const CACHE_TTL = 10000; // 1 minute

const getSystemHourBoundaries = async () => {
  const now = Date.now();

  if (hourSettingsCache && now - hourSettingsCacheTime < CACHE_TTL) {
    return hourSettingsCache;
  }

  const settings = await prisma.systemSettings.findFirst({
    select: {
      systemStartHour: true,
      systemEndHour: true,
    },
  });

  if (!settings) {
    throw new ApiError("System hour settings not configured", 500);
  }

  hourSettingsCache = {
    systemStartHour: settings.systemStartHour,
    systemEndHour: settings.systemEndHour,
  };
  hourSettingsCacheTime = now;

  return hourSettingsCache;
};

/**
 * Clear hour settings cache (call when settings are updated)
 */
export const clearHourSettingsCache = () => {
  hourSettingsCache = null;
  hourSettingsCacheTime = 0;
};

/* ============================================================
   CHECK IF TIME IS WITHIN SYSTEM HOURS
============================================================ */

/**
 * Check if a given time is within system operating hours
 *
 * @param {Date} dateTime - Date/time to check
 * @returns {Promise<boolean>} True if within hours, false otherwise
 */
export const isWithinSystemHours = async (dateTime) => {
  const { systemStartHour, systemEndHour } = await getSystemHourBoundaries();

  // If no hour restrictions set, always return true
  if (systemStartHour === null || systemEndHour === null) {
    return true;
  }

  const hour = new Date(dateTime).getHours();

  // Special case: Same start and end hour = 24/7 operation
  if (systemStartHour === systemEndHour) {
    return true; // 24/7 access (e.g., 12h to 12h = full 24 hours)
  }

  // Handle normal case (e.g., 8h to 18h)
  if (systemStartHour < systemEndHour) {
    return hour >= systemStartHour && hour < systemEndHour;
  }

  // Handle overnight case (e.g., 22h to 6h - crosses midnight)
  return hour >= systemStartHour || hour < systemEndHour;
};

/**
 * Validate if a time is within system operating hours
 * Throws error if outside hours
 *
 * @param {Date} dateTime - Date/time to validate
 * @param {string} operation - Operation name for error message
 * @throws {ApiError} If outside system hours
 */
export const validateSystemHours = async (
  dateTime,
  operation = "operation",
) => {
  const { systemStartHour, systemEndHour } = await getSystemHourBoundaries();

  // If no hour restrictions, allow all times
  if (systemStartHour === null || systemEndHour === null) {
    return true;
  }

  const isWithinHours = await isWithinSystemHours(dateTime);

  if (!isWithinHours) {
    const hour = new Date(dateTime).getHours();
    const hourRange = await formatSystemHourRange();

    throw new ApiError(
      `Cannot perform ${operation} outside system operating hours. Current time: ${hour}:00, Allowed hours: ${hourRange}`,
      400,
    );
  }

  return true;
};

/* ============================================================
   FILTER TRANSACTIONS BY SYSTEM HOURS
============================================================ */

/**
 * Filter transactions to only include those within system hours
 *
 * @param {Array} transactions - Array of transactions with createdAt field
 * @returns {Promise<Array>} Filtered transactions
 */
export const filterBySystemHours = async (transactions, field = "createdAt") => {
  const { systemStartHour, systemEndHour } = await getSystemHourBoundaries();

  // If no hour restrictions, return all
  if (systemStartHour === null || systemEndHour === null) {
    return transactions;
  }

  // If same hour = 24/7, return all
  if (systemStartHour === systemEndHour) {
    return transactions;
  }

  return transactions.filter((transaction) => {
    const hour = new Date(transaction[field]).getHours();

    // Normal hours (e.g., 8h to 18h)
    if (systemStartHour < systemEndHour) {
      return hour >= systemStartHour && hour < systemEndHour;
    }

    // Overnight hours (e.g., 22h to 6h)
    return hour >= systemStartHour || hour < systemEndHour;
  });
};

/* ============================================================
   BUILD HOUR FILTER FOR QUERIES
============================================================ */

/**
 * Build a raw SQL filter for hour-based filtering
 * This is used in Prisma queries
 *
 * @returns {Promise<string|null>} SQL WHERE clause for hour filtering or null if no restrictions
 */
export const buildHourFilterSQL = async () => {
  const { systemStartHour, systemEndHour } = await getSystemHourBoundaries();

  // If no hour restrictions, no filter needed
  if (systemStartHour === null || systemEndHour === null) {
    return null;
  }

  // If same hour = 24/7, no filter needed
  if (systemStartHour === systemEndHour) {
    return null;
  }

  // Normal hours (e.g., 8h to 18h)
  if (systemStartHour < systemEndHour) {
    return `EXTRACT(HOUR FROM "createdAt") >= ${systemStartHour} AND EXTRACT(HOUR FROM "createdAt") < ${systemEndHour}`;
  }

  // Overnight hours (e.g., 22h to 6h)
  return `(EXTRACT(HOUR FROM "createdAt") >= ${systemStartHour} OR EXTRACT(HOUR FROM "createdAt") < ${systemEndHour})`;
};

/* ============================================================
   GET NEXT AVAILABLE TIME WITHIN SYSTEM HOURS
============================================================ */

/**
 * Get the next available time within system operating hours
 * Useful for scheduling operations
 *
 * @param {Date} requestedTime - Requested time
 * @returns {Promise<Date>} Next available time within hours
 */
export const getNextAvailableTime = async (requestedTime) => {
  const { systemStartHour, systemEndHour } = await getSystemHourBoundaries();

  // If no hour restrictions or 24/7, return requested time
  if (
    systemStartHour === null ||
    systemEndHour === null ||
    systemStartHour === systemEndHour
  ) {
    return new Date(requestedTime);
  }

  const date = new Date(requestedTime);
  const hour = date.getHours();

  // Check if already within hours
  const isWithinHours =
    systemStartHour < systemEndHour
      ? hour >= systemStartHour && hour < systemEndHour
      : hour >= systemStartHour || hour < systemEndHour;

  if (isWithinHours) {
    return date;
  }

  // Calculate next available time
  const nextDate = new Date(date);

  // Normal hours (e.g., 8h to 18h)
  if (systemStartHour < systemEndHour) {
    if (hour < systemStartHour) {
      // Same day, at start hour
      nextDate.setHours(systemStartHour, 0, 0, 0);
    } else {
      // Next day, at start hour
      nextDate.setDate(nextDate.getDate() + 1);
      nextDate.setHours(systemStartHour, 0, 0, 0);
    }
  } else {
    // Overnight hours (e.g., 22h to 6h)
    if (hour >= systemEndHour && hour < systemStartHour) {
      // Same day, at start hour
      nextDate.setHours(systemStartHour, 0, 0, 0);
    } else {
      // Already after end hour or before start hour - good to go
      return date;
    }
  }

  return nextDate;
};

/* ============================================================
   FORMAT HOUR RANGE FOR DISPLAY
============================================================ */

/**
 * Format system hour range for display
 *
 * @returns {Promise<string>} Formatted hour range
 */
export const formatSystemHourRange = async () => {
  const { systemStartHour, systemEndHour } = await getSystemHourBoundaries();

  if (systemStartHour === null || systemEndHour === null) {
    return "24/7 (No restrictions)";
  }

  // Same hour = 24/7
  if (systemStartHour === systemEndHour) {
    return `24/7 (${formatHour(systemStartHour)} to ${formatHour(systemEndHour)})`;
  }

  const range = `${formatHour(systemStartHour)} - ${formatHour(systemEndHour)}`;

  // Indicate if crosses midnight
  if (systemStartHour > systemEndHour) {
    return `${range} (crosses midnight)`;
  }

  return range;
};

/**
 * Helper: Format hour for display
 */
const formatHour = (hour) => {
  return `${hour.toString().padStart(2, "0")}:00`;
};

/* ============================================================
   CALCULATE AVAILABLE HOURS PER DAY
============================================================ */

/**
 * Calculate how many hours per day are available for operations
 *
 * @returns {Promise<number>} Hours available (0-24)
 */
export const getAvailableHoursPerDay = async () => {
  const { systemStartHour, systemEndHour } = await getSystemHourBoundaries();

  if (systemStartHour === null || systemEndHour === null) {
    return 24;
  }

  // Same hour = 24/7
  if (systemStartHour === systemEndHour) {
    return 24;
  }

  // Normal hours
  if (systemStartHour < systemEndHour) {
    return systemEndHour - systemStartHour;
  }

  // Overnight hours
  return 24 - systemStartHour + systemEndHour;
};

/* ============================================================
   USAGE EXAMPLES
============================================================ */

/*
// Example 1: Validate operation time
await validateSystemHours(
  new Date(),
  "stock transfer"
);

// Example 2: Check if current time is within hours
const canOperate = await isWithinSystemHours(new Date());

if (canOperate) {
  // Proceed with operation
} else {
  // Show message: "Operations only allowed during X - Y hours"
}

// Example 3: Filter transactions by system hours
const filteredTransactions = await filterBySystemHours(allTransactions);

// Example 4: Get next available time
const nextTime = await getNextAvailableTime(new Date());
console.log(`Next available time: ${nextTime}`);

// Example 5: Display hour range to user
const hourRange = await formatSystemHourRange();
console.log(`System hours: ${hourRange}`);

// Example 6: Calculate available hours
const availableHours = await getAvailableHoursPerDay();
console.log(`Operations allowed for ${availableHours} hours per day`);

// Example 7: 24/7 Operation
// Set: systemStartHour = 12, systemEndHour = 12
// Result: 24/7 access (12:00 to next day 12:00 = full 24 hours)

// Example 8: Normal Business Hours
// Set: systemStartHour = 8, systemEndHour = 18
// Result: 08:00 to 18:00 (10 hours per day)

// Example 9: Night Shift
// Set: systemStartHour = 22, systemEndHour = 6
// Result: 22:00 to 06:00 next day (8 hours, crosses midnight)
*/

export default {
  isWithinSystemHours,
  validateSystemHours,
  filterBySystemHours,
  buildHourFilterSQL,
  getNextAvailableTime,
  formatSystemHourRange,
  getAvailableHoursPerDay,
  clearHourSettingsCache,
};
