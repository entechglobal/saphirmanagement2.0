import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";

export const create = async (data) => {
  const { name, active = true } = data;

  const existing = await prisma.caisseLabel.findUnique({ where: { name } });
  if (existing)
    throw new ApiError("Un libellé avec ce nom existe déjà", 409);

  return prisma.caisseLabel.create({ data: { name, active } });
};

export const getAll = async (query = {}) => {
  const { page = 1, limit = 50, search, active } = query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {};
  if (active !== undefined)
    where.active = active === "true" || active === true;
  if (search) where.name = { contains: search };

  const [labels, total] = await Promise.all([
    prisma.caisseLabel.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { name: "asc" },
    }),
    prisma.caisseLabel.count({ where }),
  ]);

  return {
    data: labels,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
};

export const getById = async (id) => {
  const label = await prisma.caisseLabel.findUnique({
    where: { id: parseInt(id) },
  });
  if (!label) throw new ApiError("Libellé introuvable", 404);
  return label;
};

export const update = async (id, data) => {
  const label = await getById(id);
  const { name, active } = data;

  if (name && name !== label.name) {
    const existing = await prisma.caisseLabel.findUnique({ where: { name } });
    if (existing)
      throw new ApiError("Un libellé avec ce nom existe déjà", 409);
  }

  return prisma.caisseLabel.update({
    where: { id: label.id },
    data: {
      ...(name !== undefined && { name }),
      ...(active !== undefined && { active }),
    },
  });
};

export const remove = async (id) => {
  const label = await getById(id);

  const usedCount = await prisma.caisseTransaction.count({
    where: { labelId: label.id },
  });
  if (usedCount > 0) {
    throw new ApiError(
      "Ce libellé est utilisé dans des transactions et ne peut pas être supprimé",
      400
    );
  }

  await prisma.caisseLabel.delete({ where: { id: label.id } });
};
