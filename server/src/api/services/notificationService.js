import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";

const TRANSFER_REQUEST_INCLUDE = {
  sourceCaisse: {
    select: {
      id: true,
      name: true,
      caisseType: true,
      user: { select: { id: true, name: true } },
      banque: { select: { id: true, name: true } },
    },
  },
  destinationCaisse: {
    select: {
      id: true,
      name: true,
      caisseType: true,
      userId: true,
      user: { select: { id: true, name: true } },
      banque: { select: { id: true, name: true } },
    },
  },
  createdBy: { select: { id: true, name: true } },
  respondedBy: { select: { id: true, name: true } },
};

export const createNotifications = async (
  tx,
  { userIds, type, payload, transferRequestId }
) => {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (!uniqueIds.length) return;

  await tx.notification.createMany({
    data: uniqueIds.map((userId) => ({
      userId,
      type,
      payload: payload ?? undefined,
      transferRequestId: transferRequestId ?? null,
    })),
  });
};

export const getMyNotifications = async (currentUser, query = {}) => {
  const limit = Math.min(parseInt(query.limit) || 50, 100);
  const unreadOnly =
    query.unreadOnly === true ||
    query.unreadOnly === "true" ||
    query.read === "false";

  const where = { userId: currentUser.id };
  if (unreadOnly) where.read = false;

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        transferRequest: { include: TRANSFER_REQUEST_INCLUDE },
      },
    }),
    prisma.notification.count({
      where: { userId: currentUser.id, read: false },
    }),
  ]);

  return { data: notifications, unreadCount };
};

export const getUnreadCount = async (currentUser) => {
  const unreadCount = await prisma.notification.count({
    where: { userId: currentUser.id, read: false },
  });
  return { unreadCount };
};

export const markRead = async (id, currentUser) => {
  const notification = await prisma.notification.findUnique({
    where: { id: parseInt(id) },
  });
  if (!notification) throw new ApiError("Notification introuvable", 404);
  if (notification.userId !== currentUser.id) {
    throw new ApiError("Accès refusé", 403);
  }

  return prisma.notification.update({
    where: { id: notification.id },
    data: { read: true },
  });
};

export const markAllRead = async (currentUser) => {
  await prisma.notification.updateMany({
    where: { userId: currentUser.id, read: false },
    data: { read: true },
  });
};
