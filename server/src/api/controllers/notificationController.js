import * as notificationService from "../services/notificationService.js";

export const getMyNotifications = async (req, res) => {
  const result = await notificationService.getMyNotifications(
    req.user,
    req.query
  );
  res.json({ status: "success", ...result });
};

export const getUnreadCount = async (req, res) => {
  const result = await notificationService.getUnreadCount(req.user);
  res.json({ status: "success", ...result });
};

export const markRead = async (req, res) => {
  const notification = await notificationService.markRead(
    req.params.id,
    req.user
  );
  res.json({ status: "success", data: notification });
};

export const markAllRead = async (req, res) => {
  await notificationService.markAllRead(req.user);
  res.json({ status: "success", message: "Toutes les notifications ont été marquées comme lues" });
};
