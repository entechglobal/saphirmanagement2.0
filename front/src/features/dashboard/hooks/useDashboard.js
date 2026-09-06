import { useQuery, keepPreviousData } from "@/shared/lib/query";
import { useAuth } from "@/features/auth";
import { dashboardAPI } from "../api/dashboard.api";

export const dashboardKeys = {
  overview: (userId, dateFrom, dateTo) => [
    "dashboard-overview",
    userId,
    dateFrom,
    dateTo,
  ],
  wallets: ["dashboard-wallets"],
};

export const useDashboardOverview = ({ dateFrom, dateTo, enabled = true } = {}) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: dashboardKeys.overview(user?.id, dateFrom, dateTo),
    queryFn: () =>
      dashboardAPI.getOverview({ dateFrom, dateTo }).then((r) => r.data.data),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
    enabled,
  });
};

export const useDashboardWallets = ({ enabled = false } = {}) =>
  useQuery({
    queryKey: dashboardKeys.wallets,
    queryFn: () => dashboardAPI.getWallets().then((r) => r.data.data),
    enabled,
    staleTime: 30 * 1000,
  });
