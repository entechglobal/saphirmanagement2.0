"use client";

import { useState, useRef, useEffect } from "react";
import { BellIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";

// Mock notifications
const mockNotifications = [
  {
    id: "1",
    title: "Stock Alert: Low Inventory",
    description: "SKU-2024-001 is below the minimum stock threshold",
    timestamp: "1h ago",
    read: false,
    type: "error",
  },
  {
    id: "2",
    title: "Stock Alert: Reorder Needed",
    description: "SKU-2024-045 needs to be reordered soon",
    timestamp: "3h ago",
    read: false,
    type: "warning",
  },
  {
    id: "3",
    title: "Expiration Alert",
    description: "Product SKU-2024-078 will expire in 5 days",
    timestamp: "5h ago",
    read: false,
    type: "warning",
  },
  {
    id: "4",
    title: "Stock Alert: Overstock",
    description: "SKU-2024-032 is over the recommended stock limit",
    timestamp: "1d ago",
    read: true,
    type: "info",
  },
  {
    id: "5",
    title: "Expiration Alert",
    description: "Product SKU-2024-056 expired yesterday",
    timestamp: "2d ago",
    read: true,
    type: "error",
  },
];

export const NotificationDropdown = ({
  isDark = false,
  onNotificationClick,
  onViewAll,
}) => {
  const { i18n } = useTranslation();
  const [notifications, setNotifications] = useState(mockNotifications);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationClick = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    if (onNotificationClick) onNotificationClick(id);
  };

  const handleViewAll = () => {
    if (onViewAll) onViewAll();
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getTypeStyles = (type) => {
    switch (type) {
      case "success":
        return "bg-green-50 dark:bg-green-950/30 border-l-4 border-green-500";
      case "warning":
        return "bg-yellow-50 dark:bg-yellow-950/30 border-l-4 border-yellow-500";
      case "error":
        return "bg-red-50 dark:bg-red-950/30 border-l-4 border-red-500";
      default:
        return "bg-blue-50 dark:bg-blue-950/30 border-l-4 border-[#B12B89]";
    }
  };

  const getTypeIndicator = (type) => {
    switch (type) {
      case "success":
        return "bg-green-500";
      case "warning":
        return "bg-yellow-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-[#B12B89]";
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-all relative"
        aria-label="Notifications"
      >
        <BellIcon className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full min-w-5">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={`
          fixed inset-x-3 top-[76px] z-50
          sm:absolute sm:inset-x-auto sm:top-auto sm:mt-2 sm:w-96
          ${i18n.language === "ar" ? "sm:left-0" : "sm:right-0"}
          bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden
        `}>
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {unreadCount} unread
              </span>
            )}
          </div>

          {/* Scrollable Notifications List */}
          <div className="max-h-[55vh] sm:max-h-96 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification.id)}
                  className={`w-full px-4 py-3 text-left transition-colors ${
                    notification.read
                      ? "bg-white dark:bg-gray-800"
                      : "bg-blue-50 dark:bg-blue-950/20"
                  } hover:bg-gray-50 dark:hover:bg-gray-700/50`}
                >
                  <div className="flex items-start gap-3">
                    {/* Type Indicator */}
                    <div
                      className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${getTypeIndicator(
                        notification.type
                      )}`}
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-sm truncate ${
                            notification.read
                              ? "text-gray-900 dark:text-gray-100"
                              : "text-gray-900 dark:text-gray-100 font-bold"
                          }`}
                        >
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <span className="inline-flex w-2 h-2 bg-[#B12B89] rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
                        {notification.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {notification.timestamp}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No notifications
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            <button
              onClick={handleViewAll}
              className="w-full text-center text-sm font-medium text-[#B12B89] dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors py-2"
            >
              View All Notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
