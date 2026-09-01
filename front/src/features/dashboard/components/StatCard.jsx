import { AreaChart, Area, ResponsiveContainer } from "recharts"

const Sparkline = ({ data, color, gradId }) => {
  if (!data?.length) return null
  const chartData = data.map((v) => ({ v }))
  return (
    <ResponsiveContainer width={88} height={36}>
      <AreaChart data={chartData} margin={{ top: 3, right: 3, bottom: 3, left: 3 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.35} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.8}
          fill={`url(#${gradId})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export const StatCard = ({ title, value, growth, prefix = "", suffix = "", sparkline, icon: Icon, iconColor }) => {
  const isPositive = growth === undefined || growth >= 0
  const trendColor = isPositive ? "#1D9E75" : "#D85A30"
  const gradId = `spk-${(title ?? "x").replace(/[^a-z0-9]/gi, "")}`

  return (
    <div className="bg-card rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-xs text-gray-400 dark:text-gray-500 tracking-wide">{title}</p>
        {Icon && (
          <div
            className="p-1.5 rounded-full"
            style={{ backgroundColor: (iconColor ?? "#B12B89") + "22" }}
          >
            <Icon
              className="w-[16px] h-[16px] shrink-0"
              style={{ color: iconColor ?? "#B12B89" }}
              strokeWidth={1.5}
            />
          </div>
        )}
      </div>

      <p className="text-2xl font-medium text-gray-900 dark:text-gray-100 tracking-tight leading-none">
        {prefix}{typeof value === "number" ? value.toLocaleString() : (value ?? "—")}{suffix}
      </p>

      <div className="flex items-center justify-between mt-3">
        {growth !== undefined
          ? (
            <span className="text-xs font-medium" style={{ color: trendColor }}>
              {isPositive ? "+" : ""}{growth}%
            </span>
          )
          : <span />
        }
        {sparkline && <Sparkline data={sparkline} color={trendColor} gradId={gradId} />}
      </div>
    </div>
  )
}
