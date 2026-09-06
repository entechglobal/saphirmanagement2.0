import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";
import { createTransfer } from "./caisseService.js";

const SHIFT_INCLUDE = {
  user: { select: { id: true, name: true, email: true } },
  delivery: { select: { id: true, name: true, type: true } },
  remittanceCaisse: {
    select: {
      id: true,
      name: true,
      caisseType: true,
      user: { select: { id: true, name: true } },
      banque: { select: { id: true, name: true, RIB: true } },
    },
  },
  orders: {
    include: {
      bonLivraison: {
        include: {
          document: {
            select: {
              id: true,
              documentNumber: true,
              totalTTC: true,
              amountPaid: true,
              status: true,
              client: { select: { id: true, name: true, phone: true } },
            },
          },
        },
      },
    },
    orderBy: { linkedAt: "desc" },
  },
  _count: { select: { orders: true } },
};

const SHIFT_LIST_INCLUDE = {
  user: { select: { id: true, name: true, email: true } },
  delivery: { select: { id: true, name: true, type: true } },
  remittanceCaisse: {
    select: {
      id: true,
      name: true,
      caisseType: true,
      user: { select: { id: true, name: true } },
      banque: { select: { id: true, name: true } },
    },
  },
  _count: { select: { orders: true } },
};

const isLivreur = (user) => user?.roleName === "Livreur";

const canViewAllShifts = (user) =>
  !!user?.isSuperAdmin ||
  ["Super_Admin", "Societe_Admin", "Gerant"].includes(user?.roleName);

const resolveDeliveryForUser = async (userId) =>
  prisma.delivery.findUnique({
    where: { userId },
    select: { id: true, societeId: true, name: true },
  });

const getUserWalletBalance = async (userId) => {
  const caisse = await prisma.caisse.findUnique({
    where: { userId },
    select: { id: true, currentBalance: true },
  });
  return {
    caisseId: caisse?.id || null,
    balance: parseFloat(caisse?.currentBalance || 0),
  };
};

export const getActiveShiftForUser = async (userId) =>
  prisma.deliveryShift.findFirst({
    where: { userId, status: "OPEN" },
    include: SHIFT_INCLUDE,
  });

/**
 * Require an open shift for Livreur when marking LIVRE / PAYE.
 * Returns the active shift or throws.
 */
export const requireActiveShiftForLivreur = async (user) => {
  if (!isLivreur(user)) return null;
  const shift = await getActiveShiftForUser(user.id);
  if (!shift) {
    throw new ApiError(
      "Vous devez démarrer un shift avant de marquer une commande comme livrée ou payée",
      409,
    );
  }
  return shift;
};

/**
 * Attach a BL to the livreur's active shift on LIVRE / PAYE.
 */
export const linkOrderToActiveShift = async (
  tx,
  { user, bonLivraisonId, status, amount },
) => {
  if (!isLivreur(user)) return null;

  const shift = await tx.deliveryShift.findFirst({
    where: { userId: user.id, status: "OPEN" },
  });
  if (!shift) {
    throw new ApiError(
      "Vous devez démarrer un shift avant de marquer une commande comme livrée ou payée",
      409,
    );
  }

  const existing = await tx.deliveryShiftOrder.findUnique({
    where: {
      shiftId_bonLivraisonId: {
        shiftId: shift.id,
        bonLivraisonId,
      },
    },
  });

  const amountNum = parseFloat(amount || 0);

  if (existing) {
    await tx.deliveryShiftOrder.update({
      where: { id: existing.id },
      data: {
        linkedStatus: status,
        amount: amountNum > 0 ? amountNum : existing.amount,
        linkedAt: new Date(),
      },
    });
  } else {
    await tx.deliveryShiftOrder.create({
      data: {
        shiftId: shift.id,
        bonLivraisonId,
        linkedStatus: status,
        amount: amountNum,
      },
    });
  }

  return shift;
};

export const getMyActive = async (user) => {
  const shift = await getActiveShiftForUser(user.id);
  const wallet = await getUserWalletBalance(user.id);
  return { shift, wallet };
};

export const startShift = async (user) => {
  if (!isLivreur(user) && !user.isSuperAdmin) {
    throw new ApiError("Seuls les livreurs peuvent démarrer un shift", 403);
  }

  const existing = await getActiveShiftForUser(user.id);
  if (existing) {
    throw new ApiError("Vous avez déjà un shift ouvert", 409);
  }

  const delivery = await resolveDeliveryForUser(user.id);
  const societeId = delivery?.societeId || user.societeId;
  if (!societeId) {
    throw new ApiError("Aucune société associée à cet utilisateur", 400);
  }

  const wallet = await getUserWalletBalance(user.id);

  const shift = await prisma.deliveryShift.create({
    data: {
      societeId,
      userId: user.id,
      deliveryId: delivery?.id || null,
      status: "OPEN",
      openingBalance: wallet.balance,
    },
    include: SHIFT_INCLUDE,
  });

  return { shift, wallet };
};

export const getAll = async (query, societeId, user) => {
  const {
    status,
    userId,
    page = 1,
    limit = 20,
    search,
    dateFrom,
    dateTo,
  } = query;

  const where = {
    ...(user.isSuperAdmin
      ? societeId
        ? { societeId: parseInt(societeId) }
        : {}
      : { societeId: user.societeId }),
  };

  if (!canViewAllShifts(user)) {
    where.userId = user.id;
  } else if (userId) {
    where.userId = parseInt(userId);
  }

  if (status) where.status = String(status).toUpperCase();

  if (dateFrom || dateTo) {
    where.startedAt = {};
    if (dateFrom) where.startedAt.gte = new Date(dateFrom);
    if (dateTo) where.startedAt.lte = new Date(dateTo);
  }

  if (search) {
    where.OR = [
      { user: { name: { contains: search } } },
      { delivery: { name: { contains: search } } },
    ];
  }

  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 20;

  const [total, data] = await Promise.all([
    prisma.deliveryShift.count({ where }),
    prisma.deliveryShift.findMany({
      where,
      include: SHIFT_LIST_INCLUDE,
      orderBy: { startedAt: "desc" },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
  ]);

  return {
    data,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

export const getById = async (id, user) => {
  const shift = await prisma.deliveryShift.findUnique({
    where: { id: parseInt(id) },
    include: SHIFT_INCLUDE,
  });
  if (!shift) throw new ApiError("Shift introuvable", 404);

  if (!user.isSuperAdmin && shift.societeId !== user.societeId) {
    throw new ApiError("Access denied", 403);
  }
  if (!canViewAllShifts(user) && shift.userId !== user.id) {
    throw new ApiError("Access denied", 403);
  }

  const wallet =
    shift.userId === user.id
      ? await getUserWalletBalance(user.id)
      : await getUserWalletBalance(shift.userId);

  return { ...shift, wallet };
};

const computeShiftTotals = (orders) => {
  let totalCollected = 0;
  let deliveredCount = 0;
  let paidCount = 0;

  for (const order of orders) {
    const status = order.linkedStatus;
    const amount = parseFloat(order.amount || 0);
    if (status === "PAYE") {
      paidCount += 1;
      totalCollected += amount;
    } else if (status === "LIVRE") {
      deliveredCount += 1;
    }
  }

  return {
    totalCollected: parseFloat(totalCollected.toFixed(2)),
    deliveredCount,
    paidCount,
    totalOrders: orders.length,
  };
};

export const closeShift = async (id, user) => {
  const shiftId = parseInt(id);
  const shift = await prisma.deliveryShift.findUnique({
    where: { id: shiftId },
    include: { orders: true },
  });
  if (!shift) throw new ApiError("Shift introuvable", 404);

  if (!user.isSuperAdmin && shift.societeId !== user.societeId) {
    throw new ApiError("Access denied", 403);
  }
  if (!canViewAllShifts(user) && shift.userId !== user.id) {
    throw new ApiError("Vous ne pouvez fermer que votre propre shift", 403);
  }
  if (shift.status !== "OPEN") {
    throw new ApiError("Ce shift est déjà fermé", 400);
  }

  const wallet = await getUserWalletBalance(shift.userId);
  const totals = computeShiftTotals(shift.orders);

  const closed = await prisma.deliveryShift.update({
    where: { id: shiftId },
    data: {
      status: "CLOSED",
      closedAt: new Date(),
      closingBalance: wallet.balance,
      totalCollected: totals.totalCollected,
      totalOrders: totals.totalOrders,
      deliveredCount: totals.deliveredCount,
      paidCount: totals.paidCount,
    },
    include: SHIFT_INCLUDE,
  });

  return {
    ...closed,
    wallet,
    remittanceSuggested: parseFloat(
      Math.max(
        0,
        wallet.balance - parseFloat(shift.openingBalance || 0),
      ).toFixed(2),
    ),
  };
};

export const remitShift = async (id, data, user) => {
  const shiftId = parseInt(id);
  const { destinationCaisseId, amount, note } = data;

  const shift = await prisma.deliveryShift.findUnique({
    where: { id: shiftId },
  });
  if (!shift) throw new ApiError("Shift introuvable", 404);

  if (!user.isSuperAdmin && shift.societeId !== user.societeId) {
    throw new ApiError("Access denied", 403);
  }
  if (shift.userId !== user.id && !user.isSuperAdmin) {
    throw new ApiError(
      "Seul le livreur du shift peut envoyer le solde",
      403,
    );
  }
  if (shift.status !== "CLOSED") {
    throw new ApiError("Fermez le shift avant d'envoyer le solde", 400);
  }
  if (shift.remittanceCompletedAt || shift.remittedAmount != null) {
    throw new ApiError("Le solde de ce shift a déjà été envoyé", 400);
  }

  const wallet = await getUserWalletBalance(shift.userId);
  if (!wallet.caisseId) {
    throw new ApiError("Aucun wallet configuré pour ce livreur", 400);
  }

  const remitAmount =
    amount != null
      ? parseFloat(amount)
      : parseFloat(
          Math.max(
            0,
            wallet.balance - parseFloat(shift.openingBalance || 0),
          ).toFixed(2),
        );

  if (remitAmount <= 0) {
    throw new ApiError("Montant de versement invalide", 400);
  }

  const transferResult = await createTransfer(
    {
      sourceCaisseId: wallet.caisseId,
      destinationCaisseId: parseInt(destinationCaisseId),
      amount: remitAmount,
      note:
        note ||
        `Versement shift #${shift.id} — ${new Date(shift.startedAt).toLocaleDateString("fr-FR")}`,
    },
    user,
  );

  const transferRequestId =
    transferResult?.transferRequest?.id || null;

  const updated = await prisma.deliveryShift.update({
    where: { id: shiftId },
    data: {
      remittedAmount: remitAmount,
      remittanceNote: note || null,
      remittanceCaisseId: parseInt(destinationCaisseId),
      transferRequestId,
      remittanceCompletedAt: transferResult?.pending ? null : new Date(),
    },
    include: SHIFT_INCLUDE,
  });

  return {
    shift: updated,
    transfer: transferResult,
  };
};
