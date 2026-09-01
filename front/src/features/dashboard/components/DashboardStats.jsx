import { useTranslation } from "react-i18next"
import {
  CubeIcon,
  UserGroupIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  BanknotesIcon,
  ArchiveBoxXMarkIcon,
} from "@heroicons/react/24/outline"
import { useStockStats, useClientsSummary, useFournisseursSummary } from "../hooks/useDashboard"
import { StatCard } from "./StatCard"

const SkeletonCard = () => (
  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md p-5 animate-pulse">
    <div className="flex items-center justify-between mb-3">
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
      <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
    <div className="flex justify-between items-center mt-3.5">
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-10" />
      <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-[72px]" />
    </div>
  </div>
)

const trendGrowth = (trend) => {
  if (!trend?.length || trend[0] === 0) return undefined
  return +((( trend[trend.length - 1] - trend[0]) / trend[0]) * 100).toFixed(1)
}

export const DashboardStats = () => {
  const { t } = useTranslation("dashboard")
  const { data: stockData,        isLoading: stockLoading        } = useStockStats()
  const { data: clientsData,      isLoading: clientsLoading      } = useClientsSummary()
  const { data: fournisseursData, isLoading: fournisseursLoading } = useFournisseursSummary()

  const isLoading = stockLoading || clientsLoading || fournisseursLoading

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  const cards = [
    {
      title:     t("stats.total_entries"),
      value:     stockData?.totalEntries,
      icon:      CubeIcon,
      iconColor: "#B12B89",
      sparkline: stockData?.totalEntriesTrend,
      growth:    trendGrowth(stockData?.totalEntriesTrend),
    },
    {
      title:     t("stats.out_of_stock"),
      value:     stockData?.outOfStock,
      icon:      ArchiveBoxXMarkIcon,
      iconColor: "#EF4444",
      sparkline: stockData?.outOfStockTrend,
      growth:    trendGrowth(stockData?.outOfStockTrend),
    },
    {
      title:     t("stats.low_stock"),
      value:     stockData?.lowStock,
      icon:      ExclamationTriangleIcon,
      iconColor: "#F59E0B",
      sparkline: stockData?.lowStockTrend,
      growth:    trendGrowth(stockData?.lowStockTrend),
    },
    {
      title:     t("stats.active_clients"),
      value:     clientsData ? `${clientsData.activeClients}/${clientsData.totalClients}` : null,
      icon:      UserGroupIcon,
      iconColor: "#8B5CF6",
      sparkline: clientsData?.activeClientsTrend,
      growth:    trendGrowth(clientsData?.activeClientsTrend),
    },
    {
      title:     t("stats.fournisseurs"),
      value:     fournisseursData ? `${fournisseursData.activeFournisseurs}/${fournisseursData.totalFournisseurs}` : null,
      icon:      TruckIcon,
      iconColor: "#10B981",
      sparkline: fournisseursData?.activeFournisseursTrend,
      growth:    trendGrowth(fournisseursData?.activeFournisseursTrend),
    },
    {
      title:     t("stats.income"),
      value:     clientsData?.totalOutstanding
        ? Number(clientsData.totalOutstanding).toLocaleString("fr-FR", { maximumFractionDigits: 0 })
        : "0",
      icon:      BanknotesIcon,
      iconColor: "#1D9E75",
      suffix:    " MAD",
      sparkline: clientsData?.outstandingTrend,
      growth:    trendGrowth(clientsData?.outstandingTrend),
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card) => <StatCard key={card.title} {...card} />)}
    </div>
  )
}
