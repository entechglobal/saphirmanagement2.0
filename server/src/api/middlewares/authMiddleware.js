import jwt from "jsonwebtoken";
import ApiError from "../utils/apiError.js";
import prisma from "../../loaders/prisma.js";

/**
 * ========================================
 * AUTH MIDDLEWARE (UPDATED for Multi-Société with Cookies)
 * ========================================
 *
 * Token payload includes:
 * - userId: user ID
 * - role: user role name
 * - societeId: user's société ID (null for super admin)
 */

/**
 * Authentication Middleware
 * Verifies JWT token from cookies and sets req.user
 */
export const auth = async (req, res, next) => {
  try {
    // Get token from cookies (fallback to Authorization header)
    let token = req.cookies?.accessToken;

    // Fallback to Authorization header if cookie not present
    if (!token && req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      throw new ApiError("Not authorized. Please login.", 401);
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // Get user from database with société info
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        roleId: true,
        societeId: true,
        isSuperAdmin: true,
        societe: {
          select: {
            id: true,
            raisonSocial: true,
            logo: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      throw new ApiError("User not found. Token invalid.", 401);
    }

    // Set user in request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      roleId: user.roleId,
      roleName: user.role.name,
      societeId: user.societeId,
      isSuperAdmin: user.isSuperAdmin,
      societe: user.societe,
    };

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      next(new ApiError("Invalid token. Please login again.", 401));
    } else if (error.name === "TokenExpiredError") {
      next(new ApiError("Token expired. Please login again.", 401));
    } else {
      next(error);
    }
  }
};

/**
 * Optional Auth Middleware
 * Sets req.user if token is valid, but doesn't require authentication
 * Use for public endpoints that have optional user context
 */
export const optionalAuth = async (req, res, next) => {
  try {
    let token = req.cookies?.accessToken;

    // Fallback to Authorization header
    if (!token && req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      // No token - continue without user
      return next();
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        roleId: true,
        societeId: true,
        isSuperAdmin: true,
        societe: {
          select: {
            id: true,
            raisonSocial: true,
            logo: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        roleId: user.roleId,
        roleName: user.role.name,
        societeId: user.societeId,
        isSuperAdmin: user.isSuperAdmin,
        societe: user.societe,
      };
    }

    next();
  } catch (error) {
    // Invalid token - continue without user
    next();
  }
};

/**
 * Société Context Required
 * Ensures user has a société (not super admin without context)
 */
export const requireSocieteContext = (req, res, next) => {
  if (!req.user?.societeId) {
    throw new ApiError(
      "This operation requires a société context. Please select a société.",
      400,
    );
  }
  next();
};

export default auth;
