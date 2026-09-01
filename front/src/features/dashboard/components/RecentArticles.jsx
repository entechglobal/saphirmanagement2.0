import { useTranslation } from "react-i18next"
import { useArticles } from "../hooks/useDashboard"
import { RectangleStackIcon } from "@heroicons/react/24/outline"

const SkeletonRow = () => (
  <tr className="animate-pulse">
    <td className="py-3 px-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" /></td>
    <td className="py-3 px-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" /></td>
    <td className="py-3 px-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" /></td>
    <td className="py-3 px-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12" /></td>
    <td className="py-3 px-4"><div className="h-5 w-14 bg-gray-200 dark:bg-gray-700 rounded-full" /></td>
  </tr>
)

export const RecentArticles = () => {
  const { t } = useTranslation("dashboard")
  const { data, isLoading } = useArticles({ limit: 8 })
  const articles = data?.data ?? []

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <RectangleStackIcon className="w-4 h-4 text-primary" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t("recent_articles.title")}</h3>
          </div>
          <p className="text-xs text-gray-400">
            {data
              ? t("recent_articles.total_count", { count: data.pagination?.numberOfPages * data.pagination?.limit })
              : t("loading")}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto -mx-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700">
              <th className="text-left py-2 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("recent_articles.col_article")}</th>
              <th className="text-left py-2 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("recent_articles.col_family")}</th>
              <th className="text-left py-2 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("recent_articles.col_buy_price")}</th>
              <th className="text-left py-2 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("recent_articles.col_sell_price")}</th>
              <th className="text-left py-2 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("recent_articles.col_stock")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              : articles.map((article) => (
                  <tr key={article.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="py-3 px-6">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[180px]">{article.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{article.barcode?.slice(0, 20)}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs text-gray-600 dark:text-gray-300">{article.family?.name ?? "—"}</span>
                    </td>
                    <td className="py-3 px-4 tabular-nums font-medium text-gray-700 dark:text-gray-200">
                      {Number(article.prixAchat).toLocaleString()} MAD
                    </td>
                    <td className="py-3 px-4 tabular-nums font-medium text-primary">
                      {Number(article.prixVente1).toLocaleString()} MAD
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          article.gereEnStock
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                        }`}
                      >
                        {article.gereEnStock ? t("recent_articles.managed") : t("recent_articles.not_managed")}
                      </span>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
