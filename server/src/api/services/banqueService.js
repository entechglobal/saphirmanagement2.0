import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";
import ApiFeatures from "../utils/apiFeatures.js";

// ============================================
// GET ALL
// ============================================
export const getAll = async (query) => {
  const where = {};
  if (query.keyword) {
    where.OR = [
      { name: { contains: query.keyword } },
      { ville: { contains: query.keyword } },
    ];
  }

  const count = await prisma.banque.count({ where });
  const apiFeatures = new ApiFeatures(query).sort().paginate(count);
  const { select: _ignored, ...rest } = apiFeatures.build();

  const banques = await prisma.banque.findMany({ ...rest, where });

  return {
    results: banques.length,
    pagination: apiFeatures.paginationResult,
    data: banques,
  };
};

// ============================================
// GET BY ID
// ============================================
export const getById = async (id) => {
  const banque = await prisma.banque.findUnique({ where: { id } });
  if (!banque) throw new ApiError("Banque not found", 404);
  return banque;
};

// ============================================
// CREATE
// ============================================
export const create = async (data) => {
  return prisma.banque.create({ data });
};

// ============================================
// UPDATE
// ============================================
export const update = async (id, data) => {
  const banque = await prisma.banque.findUnique({ where: { id } });
  if (!banque) throw new ApiError("Banque not found", 404);
  return prisma.banque.update({ where: { id }, data });
};

// ============================================
// DELETE
// ============================================
export const remove = async (id) => {
  const banque = await prisma.banque.findUnique({
    where: { id },
    include: { _count: { select: { reglements: true } } },
  });
  if (!banque) throw new ApiError("Banque not found", 404);
  if (banque._count.reglements > 0) {
    throw new ApiError(
      `Cannot delete: banque is linked to ${banque._count.reglements} reglement(s)`,
      409,
    );
  }
  await prisma.banque.delete({ where: { id } });
};
