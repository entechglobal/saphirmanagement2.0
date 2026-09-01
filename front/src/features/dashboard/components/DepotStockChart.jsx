import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { useDepots } from "../hooks/useDashboard"

const TYPES = ["ALL", "PRINCIPAL", "SECONDARY", "OUTLET"]

const TYPE_LABELS = {
  ALL: "Tous",
  PRINCIPAL: "Principal",
  SECONDARY: "Secondaire",
  OUTLET: "Outlet",
}

const SkeletonChart = () => (
  <div className="animate-pulse">
    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4" />
    <div className="h-64 bg-gray-100 dark:bg-gray-700/50 rounded-lg" />
  </div>
)

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 text-gray-100 text-xs rounded-lg px-3 py-2 shadow-lg space-y-1">
      <p className="font-semibold border-b border-gray-700 pb-1 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.fill }}>
          {p.name}: <span className="tabular-nums font-medium">{p.value.toLocaleString()}</span>
        </p>
      ))}
    </div>
  )
}

export const DepotStockChart = () => {
  const { t } = useTranslation("dashboard")
  const { data, isLoading } = useDepots()
  const [typeFilter, setTypeFilter] = useState("ALL")

  if (isLoading) return <SkeletonChart />

  const depots = data ?? []
  const filtered = typeFilter === "ALL" ? depots : depots.filter((d) => d.type === typeFilter)

  const chartData = filtered.map((depot) => ({
    name: depot.name.length > 18 ? depot.name.slice(0, 16) + "…" : depot.name,
    [t("depot_chart.articles")]: depot._count?.stockByDepot ?? 0,
    [t("depot_chart.reservations")]: depot._count?.stockReservations ?? 0,
  }))

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-1 flex-wrap">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {t("depot_chart.title")}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">{t("depot_chart.subtitle")}</p>
        </div>

        {/* Type filter chips */}
        <div className="flex gap-1 flex-wrap">
          {TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                typeFilter === type
                  ? "bg-primary text-white"
                  : "bg-slate-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-slate-600"
              }`}
            >
              {TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-sm text-gray-400 mt-4">
          {t("depot_chart.no_data")}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 4, left: -20, bottom: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              angle={-30}
              textAnchor="end"
              interval={0}
            />
            <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              formatter={(value) => (
                <span className="text-xs text-gray-500 dark:text-gray-400">{value}</span>
              )}
            />
            <Bar
              dataKey={t("depot_chart.articles")}
              fill="#B12B89"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey={t("depot_chart.reservations")}
              fill="#10B981"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
