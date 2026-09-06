import { useQuery, useMutation, useQueryClient } from "@/shared/lib/query";
import { notificationsApi } from "../api/notifications.api";

export const notificationKeys = {
  all: ["notifications"],
  list: (params = {}) => ["notifications", "list", params],
};

export const useNotifications = ({
  enabled = true,
  unreadOnly = false,
  limit = 50,
} = {}) => {
  const params = { unreadOnly, limit };
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () =>
      notificationsApi.getAll({
        limit,
        ...(unreadOnly ? { unreadOnly: true } : {}),
      }),
    enabled,
    refetchInterval: 20_000,
    staleTime: 10_000,
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
};
