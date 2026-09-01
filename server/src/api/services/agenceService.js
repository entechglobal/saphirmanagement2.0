import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";

export const getAll = async (query, societeId, user) => {
  const { search, active, page = 1, limit = 5 } = query;

  const where = {
    ...(user.isSuperAdmin ? {} : { societeId }),
    ...(active !== undefined && { active: active === "true" }),
    ...(search && {
      OR: [
        { name: { contains: search } },
        { responsable: { contains: search } },
      ],
    }),
  };

  const [total, agences] = await Promise.all([
    prisma.agence.count({ where }),
    prisma.agence.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    }),
  ]);

  return {
    data: agences,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
};

export const getById = async (id, societeId, user) => {
  const where = user.isSuperAdmin ? { id } : { id, societeId };
  const agence = await prisma.agence.findFirst({ where });
  if (!agence) throw new ApiError("Agence not found", 404);
  return agence;
};

export const create = async (data, societeId, user) => {
  if (user.isSuperAdmin && !societeId) {
    throw new ApiError("societeId is required", 400);
  }
  return prisma.agence.create({
    data: { ...data, societeId },
  });
};

export const update = async (id, data, societeId, user) => {
  const where = user.isSuperAdmin ? { id } : { id, societeId };
  const agence = await prisma.agence.findFirst({ where });
  if (!agence) throw new ApiError("Agence not found", 404);

  return prisma.agence.update({
    where: { id },
    data,
  });
};

export const remove = async (id, societeId, user) => {
  const where = user.isSuperAdmin ? { id } : { id, societeId };
  const agence = await prisma.agence.findFirst({
    where,
    include: { _count: { select: { bonLivraisons: true } } },
  });
  if (!agence) throw new ApiError("Agence not found", 404);

  if (agence._count.bonLivraisons > 0) {
    throw new ApiError(
      "Cannot delete agence with linked bon livraisons. Deactivate it instead.",
      400,
    );
  }

  await prisma.agence.delete({ where: { id } });
  return { message: "Agence deleted successfully" };
};
