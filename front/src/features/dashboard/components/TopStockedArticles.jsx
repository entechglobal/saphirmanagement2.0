import { useTranslation } from "react-i18next"
import { useStockStats } from "../hooks/useDashboard"
import { CubeIcon } from "@heroicons/react/24/outline"

const SkeletonRow = () => (
  <div className="animate-pulse flex items-center gap-3 py-3 border-b border-slate-200 dark:border-slate-700">
    <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
    <div className="flex-1 space-y-1">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-36" />
      <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-24" />
    </div>
    <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
  </div>
)

export const TopStockedArticles = () => {
  const { t } = useTranslation("dashboard")
  const { data, isLoading } = useStockStats()

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center gap-2 mb-1">
        <CubeIcon className="w-4 h-4 text-primary" />
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t("top_stocked.title")}</h3>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        {data
          ? t("top_stocked.subtitle", { count: data.totals.available.toLocaleString() })
          : t("loading")}
      </p>

      <div>
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
          : data?.topStocked.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 py-3 border-b border-slate-200 dark:border-slate-700 last:border-0"
              >
                <div className="bg-primary/10 p-2 rounded-lg shrink-0">
                  <CubeIcon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {item.article.name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{item.depot.name}</p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 tabular-nums shrink-0">
                  {Number(item.quantityAvailable).toLocaleString()}
                </span>
              </div>
            ))}
      </div>
    </div>
  )
}
