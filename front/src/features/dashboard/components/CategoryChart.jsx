import { useTranslation } from "react-i18next"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts"
import { useStockStats } from "../hooks/useDashboard"

const fmt = (n) => Number(n ?? 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 })

const SEGMENTS = [
  { key: "available",  labelKey: "stock_overview.available",  color: "#10B981" },
  { key: "reserved",   labelKey: "stock_overview.reserved",   color: "#F59E0B" },
  { key: "inTransit",  labelKey: "stock_overview.in_transit", color: "#B12B89" },
]

const SkeletonChart = () => (
  <div className="animate-pulse">
    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4" />
    <div className="h-64 bg-gray-100 dark:bg-gray-700/50 rounded-lg" />
  </div>
)

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <div className="bg-gray-900 text-gray-100 text-xs rounded-lg px-3 py-2 shadow-lg">
      <p className="font-medium">{name}</p>
      <p className="mt-0.5 tabular-nums">{fmt(value)} unités</p>
    </div>
  )
}

export const CategoryChart = () => {
  const { t } = useTranslation("dashboard")
  const { data: stockData, isLoading } = useStockStats()

  if (isLoading) return <SkeletonChart />

  const totals = stockData?.totals ?? { available: 0, reserved: 0, inTransit: 0 }
  const total = totals.available + totals.reserved + totals.inTransit

  const chartData = SEGMENTS
    .map((s) => ({
      name: t(s.labelKey),
      value: totals[s.key] ?? 0,
      color: s.color,
    }))
    .filter((d) => d.value > 0)

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
        {t("stock_overview.title")}
      </h3>
      <p className="text-xs text-gray-400 mb-4">{t("stock_overview.subtitle")}</p>

      {total === 0 ? (
        <div className="h-64 flex items-center justify-center text-sm text-gray-400">
          {t("stock_overview.no_data")}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="45%"
              innerRadius={62}
              outerRadius={98}
              paddingAngle={3}
              dataKey="value"
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span className="text-xs text-gray-600 dark:text-gray-300">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      )}

      {/* Summary row */}
      <div className="mt-1 grid grid-cols-3 gap-2 border-t border-slate-100 dark:border-slate-700 pt-3">
        {SEGMENTS.map((s) => (
          <div key={s.key} className="text-center">
            <p className="text-xs text-gray-400 truncate">{t(s.labelKey)}</p>
            <p className="text-sm font-semibold tabular-nums" style={{ color: s.color }}>
              {fmt(totals[s.key])}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
