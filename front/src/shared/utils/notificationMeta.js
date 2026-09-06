export const formatMAD = (val) =>
  Number(val ?? 0).toLocaleString("fr-MA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const formatRelativeTime = (date, t) => {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 1) return t("notifications.time.just_now");
  if (minutes < 60) return t("notifications.time.minutes_ago", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("notifications.time.hours_ago", { count: hours });
  const days = Math.floor(hours / 24);
  return t("notifications.time.days_ago", { count: days });
};

export const notificationMeta = (notification, t) => {
  const payload =
    typeof notification.payload === "string"
      ? JSON.parse(notification.payload)
      : notification.payload || {};
  const amount = formatMAD(payload.amount);
  const senderName = payload.senderName || t("notifications.someone");
  const destinationName = payload.destinationName || "";
  const responderName = payload.responderName || t("notifications.someone");

  switch (notification.type) {
    case "WALLET_TRANSFER_REQUEST":
      return {
        type: "info",
        title: payload.requiresSuperAdmin
          ? t("notifications.transfer.incoming_admin_title")
          : t("notifications.transfer.incoming_title"),
        description: payload.requiresSuperAdmin
          ? t("notifications.transfer.incoming_admin_desc", {
              senderName,
              amount,
              destinationName,
            })
          : t("notifications.transfer.incoming_desc", { senderName, amount }),
      };
    case "WALLET_TRANSFER_ACCEPTED":
      return {
        type: "success",
        title: t("notifications.transfer.accepted_title"),
        description: t("notifications.transfer.accepted_desc", {
          responderName,
          amount,
          destinationName,
        }),
      };
    case "WALLET_TRANSFER_DECLINED":
      return {
        type: "error",
        title: t("notifications.transfer.declined_title"),
        description: t("notifications.transfer.declined_desc", {
          responderName,
          amount,
          destinationName,
        }),
      };
    default:
      return {
        type: "info",
        title: t("notifications.title"),
        description: "",
      };
  }
};

export const typeDot = {
  success: "bg-green-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
  info: "bg-[#B12B89]",
};
