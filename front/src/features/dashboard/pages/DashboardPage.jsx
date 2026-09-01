import { useTranslation } from "react-i18next"
import { useAuth } from "@/features/auth"
import { useCurrentUser } from "../../users/hooks/useUsers"
import {
  DashboardStats,
  DepotStockChart,
  CategoryChart,
  TopClients,
  TopFournisseurs,
  TopStockedArticles,
  DepotsList,
  RecentArticles,
} from ".."

export const DashboardPage = () => {
  const { t } = useTranslation("dashboard")
  const { user } = useAuth()
  const { data: currentUser } = useCurrentUser()
  const activeUser = currentUser?.data || {}
  const displayName = activeUser.name || user?.name || t("greeting.default_user")

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return t("greeting.morning")
    if (hour < 18) return t("greeting.afternoon")
    return t("greeting.evening")
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start gap-4 border-s-4 border-primary ps-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {`${getGreeting()}, ${displayName}`}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {t("greeting.subtitle")}
          </p>
        </div>
      </div>

      {/* KPI Row */}
      <DashboardStats />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DepotStockChart />
        <CategoryChart />
      </div>

      {/* Mid Row: Top Clients | Top Fournisseurs | Top Stocked */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <TopClients />
        <TopFournisseurs />
        <TopStockedArticles />
      </div>

      {/* Bottom Row: Depots | Recent Articles */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <DepotsList />
        <div className="xl:col-span-2">
          <RecentArticles />
        </div>
      </div>
    </div>
  )
}
