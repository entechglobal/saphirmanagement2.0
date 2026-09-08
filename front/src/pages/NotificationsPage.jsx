import { useTranslation } from "react-i18next";
import { Bell } from "lucide-react";
import { toast } from "@/shared/utils/toast";
import { FormPageHeader } from "@/shared/components/FormPageHeader";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/shared/hooks/useNotifications";
import {
  useAcceptTransferRequest,
  useDeclineTransferRequest,
} from "@/features/caisse/hooks/useCaisse";
import {
  formatRelativeTime,
  notificationMeta,
  typeDot,
} from "@/shared/utils/notificationMeta";

export const NotificationsPage = () => {
  const { t } = useTranslation("header");
  const { data, isLoading } = useNotifications({ limit: 100 });
  const notifications = data?.data ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const acceptTransfer = useAcceptTransferRequest();
  const declineTransfer = useDeclineTransferRequest();

  const actingId =
    acceptTransfer.variables || declineTransfer.variables || null;
  const isActing = acceptTransfer.isPending || declineTransfer.isPending;

  const handleAccept = (event, notification) => {
    event.stopPropagation();
    const requestId =
      notification.transferRequestId || notification.transferRequest?.id;
    if (!requestId) return;
    acceptTransfer.mutate(requestId, {
      onSuccess: (res) => {
        toast.success(
          res?.message || t("notifications.transfer.accepted_toast"),
        );
        if (!notification.read) markRead.mutate(notification.id);
      },
      onError: (err) => {
        toast.error(
          err?.response?.data?.message ||
            t("notifications.transfer.action_error"),
        );
      },
    });
  };

  const handleDecline = (event, notification) => {
    event.stopPropagation();
    const requestId =
      notification.transferRequestId || notification.transferRequest?.id;
    if (!requestId) return;
    declineTransfer.mutate(requestId, {
      onSuccess: (res) => {
        toast.success(
          res?.message || t("notifications.transfer.declined_toast"),
        );
        if (!notification.read) markRead.mutate(notification.id);
      },
      onError: (err) => {
        toast.error(
          err?.response?.data?.message ||
            t("notifications.transfer.action_error"),
        );
      },
    });
  };

  return (
    <div>
      <FormPageHeader
        createTitle={t("notifications.title")}
        backPath="/"
        backLabel={t("notifications.back")}
        rightContent={
          unreadCount > 0 ? (
            <button
              type="button"
              disabled={markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-[#B12B89] transition-colors hover:bg-[#B12B89]/10 disabled:opacity-40"
            >
              {t("notifications.mark_all_read")}
            </button>
          ) : null
        }
      />
      {unreadCount > 0 && (
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          {t("notifications.unread", { count: unreadCount })}
        </p>
      )}

      <div className="mx-auto max-w-3xl px-4 pb-10 overflow-hidden rounded-xl border border-gray-200/80 bg-white dark:border-[#2e2e2e] dark:bg-[#1c1c1c]">
        {isLoading ? (
          <div className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
            {t("notifications.loading")}
          </div>
        ) : notifications.length > 0 ? (
          <div className="divide-y divide-gray-100 dark:divide-[#2e2e2e]">
            {notifications.map((notification) => {
              const meta = notificationMeta(notification, t);
              const canRespond =
                notification.type === "WALLET_TRANSFER_REQUEST" &&
                notification.transferRequest?.status === "PENDING";
              const requestId =
                notification.transferRequestId ||
                notification.transferRequest?.id;
              const thisActing = isActing && actingId === requestId;

              return (
                <div
                  key={notification.id}
                  onClick={() => {
                    if (!notification.read) markRead.mutate(notification.id);
                  }}
                  className={`cursor-pointer px-4 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-white/5 ${
                    notification.read
                      ? ""
                      : "bg-fuchsia-50/60 dark:bg-[#B12B89]/10"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        typeDot[meta.type] ?? typeDot.info
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className={`truncate text-sm text-slate-900 dark:text-slate-100 ${
                            notification.read ? "font-medium" : "font-bold"
                          }`}
                        >
                          {meta.title}
                        </p>
                        {!notification.read && (
                          <span className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-[#B12B89]" />
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                        {meta.description}
                      </p>
                      <p className="mt-1.5 text-xs text-slate-400">
                        {formatRelativeTime(notification.createdAt, t)}
                      </p>
                      {canRespond && (
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            disabled={isActing}
                            onClick={(event) =>
                              handleAccept(event, notification)
                            }
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {thisActing && acceptTransfer.isPending
                              ? t("notifications.transfer.processing")
                              : t("notifications.transfer.accept")}
                          </button>
                          <button
                            type="button"
                            disabled={isActing}
                            onClick={(event) =>
                              handleDecline(event, notification)
                            }
                            className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/70"
                          >
                            {thisActing && declineTransfer.isPending
                              ? t("notifications.transfer.processing")
                              : t("notifications.transfer.decline")}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
            <Bell className="h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("notifications.empty")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
