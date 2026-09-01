import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";
import ApiFeatures from "../utils/apiFeatures.js";

// ============================================
// CREATE DELIVERY
// ============================================
export const create = async (data, societeId) => {
  if (typeof data.active === "string") {
    data.active = data.active.toLowerCase() === "true";
  }
  const name = data.name;
  const exist = await prisma.delivery.findFirst({ where: { societeId, name } });
  if (exist) {
    throw new ApiError(
      "livreur already exist with this name in this societe",
      403,
    );
  }

  return prisma.delivery.create({
    data: { ...data, societeId },
    include: {
      societe: { select: { id: true, raisonSocial: true } },
    },
  });
};

// ============================================
// GET ALL DELIVERIES
// ============================================
export const getAll = async (query, societeId = null) => {
  const where = {};

  if (societeId) where.societeId = societeId;

  if (query.active !== undefined) {
    where.active = query.active === "true";
  }

  if (query.type) where.type = query.type;
  if (query.entityType) where.entityType = query.entityType;

  if (query.keyword) {
    where.OR = [
      { name: { contains: query.keyword } },
      { tel: { contains: query.keyword } },
      { address: { contains: query.keyword } },
    ];
  }

  const count = await prisma.delivery.count({ where });

  const apiFeatures = new ApiFeatures(query).filter().sort().paginate(count);

  const deliveries = await prisma.delivery.findMany({
    ...apiFeatures.build(),
    where,
    include: {
      societe: { select: { id: true, raisonSocial: true } },
      _count: { select: { bonLivraisons: true, livreurBLs: true } },
    },
  });

  return {
    results: deliveries.length,
    pagination: apiFeatures.paginationResult,
    data: deliveries,
  };
};

// ============================================
// GET DELIVERY BY ID
// ============================================
export const getById = async (id, user = null) => {
  const delivery = await prisma.delivery.findUnique({
    where: { id },
    include: {
      societe: { select: { id: true, raisonSocial: true } },
      bonLivraisons: {
        select: {
          id: true,
          document: {
            select: { documentNumber: true, totalTTC: true, status: true },
          },
          documentDate: true,
        },
        orderBy: { documentDate: "desc" },
        take: 10,
      },
      _count: { select: { bonLivraisons: true } },
    },
  });

  if (!delivery) throw new ApiError("Delivery not found", 404);

  if (user && !user.isSuperAdmin && delivery.societeId !== user.societeId) {
    throw new ApiError("Access denied", 403);
  }

  return delivery;
};

// ============================================
// UPDATE DELIVERY
// ============================================
export const update = async (id, data, user) => {
  const delivery = await prisma.delivery.findUnique({
    where: { id },
    select: { id: true, societeId: true, userId: true },
  });

  if (!delivery) throw new ApiError("Delivery not found", 404);

  if (!user.isSuperAdmin && delivery.societeId !== user.societeId) {
    throw new ApiError("Access denied", 403);
  }

  if (typeof data.active === "string") {
    data.active = data.active.toLowerCase() === "true";
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.delivery.update({
      where: { id },
      data,
      include: {
        societe: { select: { id: true, raisonSocial: true } },
      },
    });

    if (data.name && delivery.userId) {
      await tx.user.update({
        where: { id: delivery.userId },
        data: { name: data.name },
      });
    }

    return updated;
  });
};

// ============================================
// DELETE DELIVERY
// ============================================
export const remove = async (id, user) => {
  const delivery = await prisma.delivery.findUnique({
    where: { id },
    select: {
      id: true,
      societeId: true,
      userId: true,
      _count: { select: { bonLivraisons: true } },
    },
  });

  if (!delivery) throw new ApiError("Delivery not found", 404);

  if (!user.isSuperAdmin && delivery.societeId !== user.societeId) {
    throw new ApiError("Access denied", 403);
  }

  if (delivery._count.bonLivraisons > 0) {
    throw new ApiError(
      `Cannot delete delivery: linked to ${delivery._count.bonLivraisons} bon(s) de livraison`,
      409,
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.delivery.delete({ where: { id } });
    if (delivery.userId) {
      await tx.user.delete({ where: { id: delivery.userId } });
    }
  });
};

// ============================================
// TOGGLE ACTIVE
// ============================================
export const toggleActive = async (id, user) => {
  const delivery = await prisma.delivery.findUnique({ where: { id } });

  if (!delivery) throw new ApiError("Delivery not found", 404);

  if (!user.isSuperAdmin && delivery.societeId !== user.societeId) {
    throw new ApiError("Access denied", 403);
  }

  return prisma.delivery.update({
    where: { id },
    data: { active: !delivery.active },
    include: {
      societe: { select: { id: true, raisonSocial: true } },
    },
  });
};
