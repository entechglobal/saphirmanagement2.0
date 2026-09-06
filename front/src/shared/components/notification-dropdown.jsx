import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { toast } from "@/shared/utils/toast";
import { useAuth } from "@/features/auth";
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

export const NotificationDropdown = () => {
  const { t, i18n } = useTranslation("header");
  const shouldReduce = useReducedMotion();
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const isRTL = i18n.language === "ar";

  const { data, isLoading } = useNotifications({
    enabled: isAuthenticated,
    unreadOnly: true,
    limit: 20,
  });
  const notifications = data?.data ?? [];
  const unreadCount = data?.unreadCount ?? notifications.length;

  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const acceptTransfer = useAcceptTransferRequest();
  const declineTransfer = useDeclineTransferRequest();

  const actingId = acceptTransfer.variables || declineTransfer.variables || null;
  const isActing = acceptTransfer.isPending || declineTransfer.isPending;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKey = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  const handleAccept = (event, notification) => {
    event.stopPropagation();
    const requestId =
      notification.transferRequestId || notification.transferRequest?.id;
    if (!requestId) return;
    acceptTransfer.mutate(requestId, {
      onSuccess: (res) => {
        toast.success(res?.message || t("notifications.transfer.accepted_toast"));
        if (!notification.read) markRead.mutate(notification.id);
      },
      onError: (err) => {
        toast.error(
          err?.response?.data?.message || t("notifications.transfer.action_error")
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
        toast.success(res?.message || t("notifications.transfer.declined_toast"));
        if (!notification.read) markRead.mutate(notification.id);
      },
      onError: (err) => {
        toast.error(
          err?.response?.data?.message || t("notifications.transfer.action_error")
        );
      },
    });
  };

  const dropdownVariants = shouldReduce
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        hidden: { opacity: 0, scale: 0.95, y: -6 },
        visible: {
          opacity: 1,
          scale: 1,
          y: 0,
          transition: { type: "spring", stiffness: 400, damping: 28 },
        },
        exit: { opacity: 0, scale: 0.95, y: -4, transition: { duration: 0.13 } },
      };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={t("notifications.title")}
        className={`relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
          isOpen
            ? "bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-white"
            : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-200"
        }`}
      >
        <Bell className="h-4 w-4" strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="menu"
            className={`absolute top-[calc(100%+6px)] z-50 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-xl shadow-gray-200/40 dark:border-[#2e2e2e] dark:bg-[#1c1c1c] dark:shadow-black/40 ${
              isRTL ? "left-0" : "right-0"
            }`}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-[#2e2e2e]">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {t("notifications.title")}
              </h3>
              {unreadCount > 0 && (
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t("notifications.unread", { count: unreadCount })}
                </span>
              )}
            </div>

            <div className="max-h-[55vh] divide-y divide-gray-100 overflow-y-auto dark:divide-[#2e2e2e] sm:max-h-80">
              {isLoading ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  {t("notifications.loading")}
                </div>
              ) : notifications.length > 0 ? (
                notifications.map((notification) => {
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
                      role="menuitem"
                      onClick={() => {
                        if (!notification.read) markRead.mutate(notification.id);
                      }}
                      className="w-full cursor-pointer bg-fuchsia-50/60 px-4 py-3 text-start transition-colors hover:bg-gray-50 dark:bg-[#B12B89]/10 dark:hover:bg-white/5"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                            typeDot[meta.type] ?? typeDot.info
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                              {meta.title}
                            </p>
                            <span className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-[#B12B89]" />
                          </div>
                          <p className="mt-0.5 line-clamp-3 text-xs text-slate-500 dark:text-slate-400">
                            {meta.description}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-400">
                            {formatRelativeTime(notification.createdAt, t)}
                          </p>
                          {canRespond && (
                            <div className="mt-2.5 flex gap-2">
                              <button
                                type="button"
                                disabled={isActing}
                                onClick={(event) => handleAccept(event, notification)}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                              >
                                {thisActing && acceptTransfer.isPending
                                  ? t("notifications.transfer.processing")
                                  : t("notifications.transfer.accept")}
                              </button>
                              <button
                                type="button"
                                disabled={isActing}
                                onClick={(event) => handleDecline(event, notification)}
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
                })
              ) : (
                <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  {t("notifications.empty")}
                </div>
              )}
            </div>

            <div className="space-y-1 border-t border-gray-100 bg-gray-50 px-4 py-2.5 dark:border-[#2e2e2e] dark:bg-[#161616]">
              {unreadCount > 0 && (
                <button
                  type="button"
                  disabled={markAllRead.isPending}
                  onClick={() => markAllRead.mutate()}
                  className="w-full py-1.5 text-center text-sm font-medium text-[#B12B89] transition-colors hover:text-[#9A2478] disabled:opacity-40"
                >
                  {t("notifications.mark_all_read")}
                </button>
              )}
              <Link
                to="/notifications"
                onClick={() => setIsOpen(false)}
                className="block w-full py-1.5 text-center text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              >
                {t("notifications.view_all")}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
