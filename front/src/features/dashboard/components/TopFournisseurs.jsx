import { useTranslation } from "react-i18next"
import { useFournisseursSummary } from "../hooks/useDashboard"
import { TruckIcon } from "@heroicons/react/24/outline"

const SkeletonRow = () => (
  <div className="animate-pulse flex items-center gap-3 py-3 border-b border-slate-200 dark:border-slate-700">
    <div className="flex-1 space-y-1">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-28" />
      <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-16" />
    </div>
    <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
  </div>
)

export const TopFournisseurs = () => {
  const { t } = useTranslation("dashboard")
  const { data, isLoading } = useFournisseursSummary()

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center gap-2 mb-1">
        <TruckIcon className="w-4 h-4 text-primary" />
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t("top_fournisseurs.title")}</h3>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        {data
          ? t("top_fournisseurs.subtitle", { active: data.activeFournisseurs, total: Number(data.totalPaid).toLocaleString() })
          : t("loading")}
      </p>

      <div>
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
          : data?.topFournisseurs.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{f.name}</p>
                  <p className="text-xs text-gray-400">{t("top_fournisseurs.orders", { count: f.totalOrders })}</p>
                </div>
                <span className="text-sm font-semibold text-emerald-600 tabular-nums">
                  {f.totalPurchases.toLocaleString()} MAD
                </span>
              </div>
            ))}
      </div>
    </div>
  )
}
