import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { dashboardAPI } from "../api/dashboard.api";

export const dashboardKeys = {
  overview: (dateFrom, dateTo) => ["dashboard-overview", dateFrom, dateTo],
  wallets: ["dashboard-wallets"],
};

export const useDashboardOverview = ({ dateFrom, dateTo } = {}) =>
  useQuery({
    queryKey: dashboardKeys.overview(dateFrom, dateTo),
    queryFn: () =>
      dashboardAPI.getOverview({ dateFrom, dateTo }).then((r) => r.data.data),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });

export const useDashboardWallets = ({ enabled = false } = {}) =>
  useQuery({
    queryKey: dashboardKeys.wallets,
    queryFn: () => dashboardAPI.getWallets().then((r) => r.data.data),
    enabled,
    staleTime: 30 * 1000,
  });
