import { useTranslation } from "react-i18next"
import { useClientsSummary } from "../hooks/useDashboard"
import { TrophyIcon } from "@heroicons/react/24/outline"

const SkeletonRow = () => (
  <div className="animate-pulse flex items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-700">
    <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
    <div className="flex-1 space-y-1">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
      <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-20" />
    </div>
    <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
  </div>
)

const RANK_COLORS = ["text-yellow-500", "text-gray-400", "text-amber-600"]

export const TopClients = () => {
  const { t } = useTranslation("dashboard")
  const { data, isLoading } = useClientsSummary()

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center gap-2 mb-1">
        <TrophyIcon className="w-4 h-4 text-yellow-500" />
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t("top_clients.title")}</h3>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        {data
          ? t("top_clients.subtitle", { active: data.activeClients, total: data.totalClients })
          : t("loading")}
      </p>

      <div className="space-y-0">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
          : data?.topClients.map((client, i) => (
              <div
                key={client.id}
                className="flex items-center gap-3 py-3 border-b border-slate-200 dark:border-slate-700 last:border-0"
              >
                <span className={`text-sm font-bold w-5 text-center ${RANK_COLORS[i] ?? "text-gray-500"}`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{client.name}</p>
                  <p className="text-xs text-gray-400">{t("top_clients.orders", { count: client.totalOrders })}</p>
                </div>
                <span className="text-sm font-semibold text-primary tabular-nums">
                  {client.totalRevenue.toLocaleString()} MAD
                </span>
              </div>
            ))}
      </div>
    </div>
  )
}
