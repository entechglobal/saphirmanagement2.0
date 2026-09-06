import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";
import ApiFeatures from "../utils/apiFeatures.js";
import bcrypt from "bcryptjs";

import asyncHandler from "express-async-handler";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { uploadSingleImage } from "../middlewares/uploadImageMiddleware.js";
import { buildImageUrl } from "../utils/buildImageUrl.js";

/* ============================================================
   USER SERVICE
   Manages users with RBAC, société isolation, and permissions
============================================================ */

/* ============================================================
   HELPER: Hash Password
============================================================ */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

/* ============================================================
   HELPER: Validate Unique Email
============================================================ */
const validateUniqueEmail = async (email, excludeUserId = null) => {
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing && existing.id !== excludeUserId) {
    throw new ApiError(
      "Email already in use. Please use a different email address.",
      409,
    );
  }
};

/* ============================================================
   HELPER: Validate Role
============================================================ */
const validateRole = async (roleId) => {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    select: { id: true, name: true },
  });

  if (!role) {
    throw new ApiError("Role not found", 404);
  }

  return role;
};

/* ============================================================
   HELPER: Validate Société
============================================================ */
const validateSociete = async (societeId) => {
  if (!societeId) return null;

  const societe = await prisma.societe.findUnique({
    where: { id: societeId },
    select: { id: true, raisonSocial: true },
  });

  if (!societe) {
    throw new ApiError("Société not found", 404);
  }

  return societe;
};

const isLivreurRole = (role) => role?.name === "Livreur";
const isPreparateurRole = (role) => role?.name === "Preparateur";

const toOptionalBoolean = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (value === true || value === "true" || value === "1" || value === 1) return true;
  if (value === false || value === "false" || value === "0" || value === 0) return false;
  return undefined;
};

const resolveExtraRoles = (role, canBePreparateur, canBeLivreur) => ({
  canBePreparateur: isPreparateurRole(role) || Boolean(canBePreparateur),
  canBeLivreur: isLivreurRole(role) || Boolean(canBeLivreur),
});

/**
 * Ensure an INTERN Delivery exists when the user can act as livreur,
 * and deactivate it when they no longer can.
 */
const syncLivreurDelivery = async (
  tx,
  { userId, name, societeId, active, enable },
) => {
  const existing = await tx.delivery.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (enable) {
    if (!societeId) {
      throw new ApiError(
        "A société is required to assign the livreur operational role",
        400,
      );
    }

    if (existing) {
      await tx.delivery.update({
        where: { id: existing.id },
        data: {
          name,
          societeId,
          type: "INTERN",
          active: active ?? true,
        },
      });
      return;
    }

    await tx.delivery.create({
      data: {
        societeId,
        userId,
        name,
        type: "INTERN",
        active: active ?? true,
      },
    });
    return;
  }

  if (existing) {
    await tx.delivery.update({
      where: { id: existing.id },
      data: { active: false },
    });
  }
};

/* ============================================================
   HELPER: Build User Includes
============================================================ */
const USER_INCLUDES = {
  role: {
    select: {
      id: true,
      name: true,
    },
  },
  societe: {
    select: {
      id: true,
      raisonSocial: true,
      logo: true,
    },
  },
};

/* ============================================================
   HELPER: Format User Response (Remove Password)
============================================================ */
const formatUserResponse = (user) => {
  if (!user) return null;

  const { password, profile, ...rest } = user;

  return {
    ...rest,
    profile: profile
      ? buildImageUrl("profiles", profile) // 👈 adjust folder name if needed
      : null,
  };
};

export const uploadProfileImage = uploadSingleImage("profile");

// Resize image middleware
export const resizeImage = asyncHandler(async (req, res, next) => {
  if (req.file) {
    const filename = `profile-${uuidv4()}-${Date.now()}.jpeg`;

    await sharp(req.file.buffer)
      .resize(200, 200)
      .toFormat("jpeg")
      .jpeg({ quality: 90 })
      .toFile(`uploads/profiles/${filename}`);
    req.body.profile = filename;
  }
  next();
});

/* ============================================================
   CREATE USER
============================================================ */
export const create = async (data, currentUser) => {
  const {
    email,
    name,
    password,
    roleId,
    societeId,
    isSuperAdmin = false,
    profile,
    active = true,
  } = data;
  const requestedCanBePreparateur = toOptionalBoolean(data.canBePreparateur);
  const requestedCanBeLivreur = toOptionalBoolean(data.canBeLivreur);

  // Authorization checks
  if (!currentUser.isSuperAdmin) {
    // Regular users cannot create super admins
    if (isSuperAdmin) {
      throw new ApiError(
        "Only Super Admins can create other Super Admin users",
        403,
      );
    }

    // Regular users can only create users in their own société
    if (societeId !== currentUser.societeId) {
      throw new ApiError(
        "You can only create users within your own société",
        403,
      );
    }
  }

  // Super Admin creation rules
  if (isSuperAdmin && societeId) {
    throw new ApiError(
      "Super Admin users cannot be assigned to a société. Remove societeId.",
      400,
    );
  }

  // Regular user creation rules
  if (!isSuperAdmin && !societeId) {
    throw new ApiError(
      "Non-Super Admin users must be assigned to a société",
      400,
    );
  }

  // Validate unique email
  await validateUniqueEmail(email);

  // Validate role
  const role = await validateRole(roleId);

  // Validate société (if provided)
  await validateSociete(societeId);

  // Hash password
  const hashedPassword = await hashPassword(password);

  const extraRoles = resolveExtraRoles(
    role,
    requestedCanBePreparateur,
    requestedCanBeLivreur,
  );

  // Create user (+ linked INTERN Delivery when they can act as Livreur)
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        roleId,
        societeId,
        isSuperAdmin,
        profile,
        active,
        canBePreparateur: extraRoles.canBePreparateur,
        canBeLivreur: extraRoles.canBeLivreur,
      },
      include: USER_INCLUDES,
    });

    if (extraRoles.canBeLivreur) {
      await syncLivreurDelivery(tx, {
        userId: created.id,
        name: created.name,
        societeId,
        active,
        enable: true,
      });
    }

    return created;
  });

  return formatUserResponse(user);
};

/* ============================================================
   GET ALL USERS
============================================================ */
export const getAll = async (query, currentUser) => {
  const where = {};

  // Super Admin: can see all users (optional société filter)
  if (currentUser.isSuperAdmin) {
    if (query.societeId) {
      where.societeId = parseInt(query.societeId);
      delete query.societeId;
    }

    // Filter by isSuperAdmin
    if (query.isSuperAdmin !== undefined) {
      where.isSuperAdmin = query.isSuperAdmin === "true";
      delete query.isSuperAdmin;
    }
  } else {
    // Regular User: only own société's users
    where.societeId = currentUser.societeId;
    delete query.societeId;
    delete query.isSuperAdmin;
  }

  // Filter by role
  if (query.roleId) {
    where.roleId = parseInt(query.roleId);
    delete query.roleId;
  }

  // Filter by active status
  if (query.active !== undefined) {
    where.active = query.active === "true";
    delete query.active;
  }

  // Search by name or email
  if (query.search || query.keyword) {
    const term = query.search || query.keyword;
    where.OR = [
      { name: { contains: term } },
      { email: { contains: term } },
    ];
    delete query.search;
    delete query.keyword;
  }

  const count = await prisma.user.count({ where });

  const apiFeatures = new ApiFeatures(query).sort().paginate(count);
  const { orderBy, skip, take } = apiFeatures.build();

  const users = await prisma.user.findMany({
    where,
    orderBy: orderBy || { createdAt: "desc" },
    skip,
    take,
    include: USER_INCLUDES,
  });

  return {
    results: users.length,
    pagination: apiFeatures.paginationResult,
    data: users.map(formatUserResponse),
  };
};

/* ============================================================
   GET USER BY ID
============================================================ */
export const getById = async (id, currentUser) => {
  const user = await prisma.user.findUnique({
    where: { id },
    include: USER_INCLUDES,
  });

  if (!user) {
    throw new ApiError("User not found", 404);
  }

  // Authorization: Super Admin can view any user
  if (!currentUser.isSuperAdmin) {
    // Regular users can only view users from their own société
    if (user.societeId !== currentUser.societeId) {
      throw new ApiError(
        "Access denied. This user belongs to another société.",
        403,
      );
    }
  }

  return formatUserResponse(user);
};

/* ============================================================
   GET CURRENT USER (ME)
============================================================ */
export const getCurrentUser = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      ...USER_INCLUDES,
      _count: {
        select: {
          stockTransactions: true,
          createdClientDocuments: true, // CORRECTED
          createdFournisseurDocuments: true, // CORRECTED
          createdTransfers: true,
          createdInventories: true,
        },
      },
    },
  });

  if (!user) {
    throw new ApiError("User not found", 404);
  }

  return {
    ...formatUserResponse(user),
    isSocieteAdmin: user.role?.name === "Societe_Admin",
  };
};

/* ============================================================
   UPDATE USER
============================================================ */
export const update = async (id, data, currentUser) => {
  const { name, email, roleId, societeId, isSuperAdmin, profile, active } =
    data;
  const requestedCanBePreparateur = toOptionalBoolean(data.canBePreparateur);
  const requestedCanBeLivreur = toOptionalBoolean(data.canBeLivreur);

  // Fetch existing user
  const existingUser = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      societeId: true,
      isSuperAdmin: true,
      email: true,
      profile: true,
      active: true,
      roleId: true,
      canBePreparateur: true,
      canBeLivreur: true,
      role: { select: { id: true, name: true } },
    },
  });

  if (!existingUser) {
    throw new ApiError("User not found", 404);
  }

  // Authorization: Super Admin can update any user
  if (!currentUser.isSuperAdmin) {
    // Regular users can only update users from their own société
    if (existingUser.societeId !== currentUser.societeId) {
      throw new ApiError(
        "Access denied. This user belongs to another société.",
        403,
      );
    }

    // Regular users cannot change isSuperAdmin status
    if (
      isSuperAdmin !== undefined &&
      isSuperAdmin !== existingUser.isSuperAdmin
    ) {
      throw new ApiError(
        "You do not have permission to change Super Admin status",
        403,
      );
    }

    // Regular users cannot move users to another société
    if (societeId !== undefined && societeId !== currentUser.societeId) {
      throw new ApiError("You cannot move users to another société", 403);
    }
  }

  // Validation: Super Admin cannot be assigned to a société
  if (isSuperAdmin && societeId) {
    throw new ApiError(
      "Super Admin users cannot be assigned to a société",
      400,
    );
  }

  // Validation: Regular users must have a société
  if (
    isSuperAdmin === false &&
    (societeId === null || (societeId === undefined && !existingUser.societeId))
  ) {
    throw new ApiError(
      "Non-Super Admin users must be assigned to a société",
      400,
    );
  }

  // Validate unique email (if changing)
  if (email && email !== existingUser.email) {
    await validateUniqueEmail(email, id);
  }

  // Validate role (if changing)
  const nextRole = roleId
    ? await validateRole(roleId)
    : existingUser.role;

  // Validate société (if changing)
  if (societeId !== undefined) {
    await validateSociete(societeId);
  }

  if (existingUser.active !== active && id === currentUser.id) {
    throw new ApiError("You cannot change your own account status", 400);
  }

  const nextSocieteId =
    societeId !== undefined ? societeId : existingUser.societeId;
  const nextName = name || existingUser.name;
  const nextActive = active !== undefined ? active : existingUser.active;

  const extraRoles = resolveExtraRoles(
    nextRole,
    requestedCanBePreparateur !== undefined
      ? requestedCanBePreparateur
      : existingUser.canBePreparateur,
    requestedCanBeLivreur !== undefined
      ? requestedCanBeLivreur
      : existingUser.canBeLivreur,
  );

  // Build update data
  const updateData = {
    ...(name && { name }),
    ...(email && { email }),
    ...(roleId && { roleId }),
    ...(profile !== undefined && { profile }),
    ...(active !== undefined && { active }),
    canBePreparateur: extraRoles.canBePreparateur,
    canBeLivreur: extraRoles.canBeLivreur,
  };

  // Handle société update
  if (societeId !== undefined) {
    updateData.societeId = societeId;
  }

  // Handle isSuperAdmin update
  if (isSuperAdmin !== undefined) {
    updateData.isSuperAdmin = isSuperAdmin;
  }

  // If new image is provided, delete old image

  const hasImageField = Object.prototype.hasOwnProperty.call(data, "profile");

  if (hasImageField && existingUser.profile) {
    const isRemoved = data.profile === null || data.profile === "";
    const isChanged = data.profile && data.profile !== existingUser.profile;

    if (isRemoved || isChanged) {
      const oldImagePath = path.join(
        process.cwd(),
        "uploads/profiles",
        existingUser.profile,
      );
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }
  }

  // Update user (+ sync linked INTERN Delivery for livreur capability)
  const updatedUser = await prisma.$transaction(async (tx) => {
    const result = await tx.user.update({
      where: { id },
      data: updateData,
      include: USER_INCLUDES,
    });

    await syncLivreurDelivery(tx, {
      userId: id,
      name: nextName,
      societeId: nextSocieteId,
      active: nextActive,
      enable: extraRoles.canBeLivreur,
    });

    return result;
  });

  return formatUserResponse(updatedUser);
};

/* ============================================================
   UPDATE PASSWORD
============================================================ */
export const updatePassword = async (id, data, currentUser) => {
  const { currentPassword, newPassword } = data;

  // Fetch user with password
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, password: true, societeId: true },
  });

  if (!user) {
    throw new ApiError("User not found", 404);
  }

  // Authorization
  const isSelf = currentUser.id === id;
  const canUpdateAnyUser =
    currentUser.isSuperAdmin ||
    (user.societeId === currentUser.societeId && !isSelf);

  if (!isSelf && !canUpdateAnyUser) {
    throw new ApiError(
      "You can only change your own password or passwords of users in your société",
      403,
    );
  }

  // If user is changing their own password, verify current password
  if (isSelf) {
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new ApiError("Current password is incorrect", 401);
    }
  }

  // Hash new password
  const hashedPassword = await hashPassword(newPassword);

  // Update password
  await prisma.user.update({
    where: { id },
    data: { password: hashedPassword },
  });

  return { message: "Password updated successfully" };
};

/* ============================================================
   DEACTIVATE USER (Soft Delete)
============================================================ */
export const deactivate = async (id, currentUser) => {
  // Fetch user
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, societeId: true, isSuperAdmin: true, active: true },
  });

  if (!user) {
    throw new ApiError("User not found", 404);
  }

  // Prevent deactivating self
  if (id === currentUser.id) {
    throw new ApiError("You cannot deactivate your own account", 400);
  }

  // Authorization
  if (!currentUser.isSuperAdmin) {
    // Regular users can only deactivate users from their own société
    if (user.societeId !== currentUser.societeId) {
      throw new ApiError(
        "Access denied. This user belongs to another société.",
        403,
      );
    }

    // Regular users cannot deactivate Super Admins
    if (user.isSuperAdmin) {
      throw new ApiError(
        "You do not have permission to deactivate Super Admin users",
        403,
      );
    }
  }

  // Deactivate
  await prisma.user.update({
    where: { id },
    data: { active: false },
  });

  return { message: "User deactivated successfully" };
};

/* ============================================================
   REACTIVATE USER
============================================================ */
export const reactivate = async (id, currentUser) => {
  // Fetch user
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, societeId: true, active: true },
  });

  if (!user) {
    throw new ApiError("User not found", 404);
  }

  // Authorization
  if (!currentUser.isSuperAdmin) {
    // Regular users can only reactivate users from their own société
    if (user.societeId !== currentUser.societeId) {
      throw new ApiError(
        "Access denied. This user belongs to another société.",
        403,
      );
    }
  }

  // Reactivate
  await prisma.user.update({
    where: { id },
    data: { active: true },
  });

  return { message: "User reactivated successfully" };
};

/* ============================================================
   DELETE USER (Hard Delete)
   Only Super Admin can permanently delete users
============================================================ */
export const remove = async (id, currentUser) => {
  // Only Super Admin can hard delete
  if (!currentUser.isSuperAdmin) {
    throw new ApiError(
      "Only Super Admins can permanently delete users. Use deactivate instead.",
      403,
    );
  }

  // Fetch user
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, profile: true },
  });

  if (!user) {
    throw new ApiError("User not found", 404);
  }

  // Prevent deleting self
  if (id === currentUser.id) {
    throw new ApiError("You cannot delete your own account", 400);
  }

  // If new image is provided, delete old image
  if (user.profile) {
    const oldImagePath = path.join(
      process.cwd(),
      "uploads/profiles",
      user.profile,
    );

    if (fs.existsSync(oldImagePath)) {
      fs.unlinkSync(oldImagePath);
    }
  }

  // Delete linked Delivery (if any) then the user, atomically
  await prisma.$transaction(async (tx) => {
    await tx.delivery.deleteMany({ where: { userId: id } });
    await tx.user.delete({ where: { id } });
  });

  return { message: "User permanently deleted" };
};

/* ============================================================
   GET USER STATISTICS
============================================================ */
export const getStatistics = async (userId, currentUser) => {
  // Fetch user
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, societeId: true },
  });

  if (!user) {
    throw new ApiError("User not found", 404);
  }

  // Authorization
  if (!currentUser.isSuperAdmin && user.societeId !== currentUser.societeId) {
    throw new ApiError(
      "Access denied. This user belongs to another société.",
      403,
    );
  }

  // Get statistics
  const [
    stockTransactionsCount,
    clientDocumentsCount,
    fournisseurDocumentsCount,
    paymentsCount,
    transfersCreatedCount,
    transfersValidatedCount,
    inventoriesCreatedCount,
    inventoriesValidatedCount,
  ] = await Promise.all([
    prisma.stockTransaction.count({ where: { createdBy: userId } }),
    prisma.clientDocument.count({ where: { createdBy: userId } }),
    prisma.fournisseurDocument.count({ where: { createdBy: userId } }),
    prisma.payment.count({ where: { createdBy: userId } }),
    prisma.stockTransfer.count({ where: { createdBy: userId } }),
    prisma.stockTransfer.count({ where: { validatedBy: userId } }),
    prisma.inventory.count({ where: { createdBy: userId } }),
    prisma.inventory.count({ where: { validatedBy: userId } }),
  ]);

  return {
    stockTransactions: stockTransactionsCount,
    clientDocuments: clientDocumentsCount,
    fournisseurDocuments: fournisseurDocumentsCount,
    payments: paymentsCount,
    transfers: {
      created: transfersCreatedCount,
      validated: transfersValidatedCount,
    },
    inventories: {
      created: inventoriesCreatedCount,
      validated: inventoriesValidatedCount,
    },
    totalActions:
      stockTransactionsCount +
      clientDocumentsCount +
      fournisseurDocumentsCount +
      paymentsCount +
      transfersCreatedCount +
      inventoriesCreatedCount,
  };
};

/* ============================================================
   GET USERS BY SOCIÉTÉ
============================================================ */
export const getBySociete = async (societeId, currentUser, query = {}) => {
  // Authorization
  if (!currentUser.isSuperAdmin && societeId !== currentUser.societeId) {
    throw new ApiError(
      "Access denied. You can only view users from your own société.",
      403,
    );
  }

  // Validate société exists
  await validateSociete(societeId);

  const where = { societeId };

  // Filter by role
  if (query.roleId) {
    where.roleId = parseInt(query.roleId);
  }

  // Filter by active status
  if (query.active !== undefined) {
    where.active = query.active === "true";
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { name: "asc" },
    include: USER_INCLUDES,
  });

  return {
    societeId,
    results: users.length,
    data: users.map(formatUserResponse),
  };
};
