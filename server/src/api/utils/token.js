import jwt from "jsonwebtoken";

/**
 * ========================================
 * TOKEN UTILITIES (UPDATED for Multi-Société)
 * ========================================
 *
 * Changes:
 * - Access token now includes societeId and isSuperAdmin
 * - Refresh token includes societeId for context preservation
 */

/**
 * Sign Access Token
 *
 * Payload includes:
 * - userId: User ID
 * - email: User email
 * - role: Role name
 * - roleId: Role ID
 * - societeId: Société ID (null for super admin)
 * - isSuperAdmin: Boolean flag
 *
 * Expires: 15 minutes
 */
export const signAccessToken = (payload) => {
  const { userId, email, role, roleId, societeId, isSuperAdmin } = payload;

  return jwt.sign(
    {
      id: userId, // Keep as 'id' for backward compatibility
      userId, // Also include as 'userId'
      email,
      role,
      roleId,
      societeId, // ⭐ CRITICAL - Include société
      isSuperAdmin, // ⭐ CRITICAL - Include flag
      type: "access",
    },
    process.env.ACCESS_TOKEN_SECRET || "your-secret-key",
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "30m",
    },
  );
};

/**
 * Sign Refresh Token
 *
 * Payload includes:
 * - userId: User ID
 * - societeId: Société ID (for context preservation)
 *
 * Expires: 7 days
 */
export const signRefreshToken = (payload) => {
  const { userId, societeId } = payload;

  return jwt.sign(
    {
      userId,
      societeId, // Include for context
      type: "refresh",
    },
    process.env.REFRESH_TOKEN_SECRET || "your-refresh-secret-key",
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d",
    },
  );
};

/**
 * Verify Access Token
 *
 * Returns decoded payload if valid
 * Throws error if invalid or expired
 */
export const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key",
    );

    if (decoded.type !== "access") {
      throw new Error("Invalid token type");
    }

    return decoded;
  } catch (error) {
    throw error;
  }
};

/**
 * Verify Refresh Token
 *
 * Returns decoded payload if valid
 * Throws error if invalid or expired
 */
export const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(
      token,
      process.env.REFRESH_TOKEN_SECRET || "your-refresh-secret-key",
    );

    if (decoded.type !== "refresh") {
      throw new Error("Invalid token type");
    }

    return decoded;
  } catch (error) {
    throw error;
  }
};

/**
 * Decode Token Without Verification
 * Useful for debugging or extracting info without validation
 */
export const decodeToken = (token) => {
  return jwt.decode(token);
};

/**
 * Generate Password Reset Token
 * Optional - for forgot password functionality
 *
 * Expires: 1 hour
 */
export const signPasswordResetToken = (userId) => {
  return jwt.sign(
    {
      userId,
      type: "password_reset",
    },
    process.env.JWT_SECRET || "your-secret-key",
    {
      expiresIn: "1h",
    },
  );
};

/**
 * Verify Password Reset Token
 */
export const verifyPasswordResetToken = (token) => {
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key",
    );

    if (decoded.type !== "password_reset") {
      throw new Error("Invalid token type");
    }

    return decoded;
  } catch (error) {
    throw error;
  }
};

/**
 * Generate Email Verification Token
 * Optional - for email verification functionality
 *
 * Expires: 24 hours
 */
export const signEmailVerificationToken = (userId, email) => {
  return jwt.sign(
    {
      userId,
      email,
      type: "email_verification",
    },
    process.env.JWT_SECRET || "your-secret-key",
    {
      expiresIn: "24h",
    },
  );
};

/**
 * Verify Email Verification Token
 */
export const verifyEmailVerificationToken = (token) => {
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key",
    );

    if (decoded.type !== "email_verification") {
      throw new Error("Invalid token type");
    }

    return decoded;
  } catch (error) {
    throw error;
  }
};

/**
 * Extract Token from Request
 * Checks Authorization header and cookies
 */
export const extractTokenFromRequest = (req) => {
  // Check Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    return req.headers.authorization.split(" ")[1];
  }

  // Check cookies
  if (req.cookies?.accessToken) {
    return req.cookies.accessToken;
  }

  return null;
};

/**
 * Get Token Expiry Info
 * Returns when token expires
 */
export const getTokenExpiry = (token) => {
  const decoded = decodeToken(token);

  if (!decoded || !decoded.exp) {
    return null;
  }

  return {
    expiresAt: new Date(decoded.exp * 1000),
    isExpired: Date.now() >= decoded.exp * 1000,
    expiresIn: decoded.exp * 1000 - Date.now(), // milliseconds
  };
};
