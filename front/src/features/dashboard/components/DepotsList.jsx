import { useTranslation } from "react-i18next"
import { useDepots } from "../hooks/useDashboard"
import { BuildingStorefrontIcon } from "@heroicons/react/24/outline"

const TYPE_COLORS = {
  PRINCIPAL: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  SECONDARY: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  OUTLET: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
}

const SkeletonRow = () => (
  <div className="animate-pulse flex items-center gap-3 py-3 border-b border-slate-200 dark:border-slate-700">
    <div className="flex-1 space-y-1">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-40" />
      <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-24" />
    </div>
    <div className="h-5 w-14 bg-gray-200 dark:bg-gray-700 rounded-full" />
    <div className="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded" />
  </div>
)

export const DepotsList = () => {
  const { t } = useTranslation("dashboard")
  const { data: depots, isLoading } = useDepots()

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center gap-2 mb-1">
        <BuildingStorefrontIcon className="w-4 h-4 text-primary" />
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t("depots.title")}</h3>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        {depots ? t("depots.active_count", { count: depots.length }) : t("loading")}
      </p>

      <div>
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
          : depots?.map((depot) => (
              <div
                key={depot.id}
                className="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{depot.name}</p>
                  <p className="text-xs text-gray-400 truncate">{depot.city ?? depot.societe?.raisonSocial}</p>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                    TYPE_COLORS[depot.type] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {depot.type}
                </span>
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 tabular-nums shrink-0">
                  {depot._count?.stockByDepot ?? 0}
                </span>
              </div>
            ))}
      </div>
    </div>
  )
}
