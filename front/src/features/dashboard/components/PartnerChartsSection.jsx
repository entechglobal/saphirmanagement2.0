import { useTranslation } from "react-i18next";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TrendingUp, Receipt, Users, Wallet } from "lucide-react";

const MODE_COLORS = ["#B12B89", "#10B981", "#3B82F6", "#F59E0B", "#8B5CF6", "#EF4444", "#06B6D4", "#84CC16"];

export const formatMAD = (val, digits = 0) =>
  Number(val ?? 0).toLocaleString("fr-MA", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

const compactMAD = (n) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`;
  return formatMAD(n);
};

const formatPeriod = (period, granularity) => {
  if (!period) return "";
  if (granularity === "hour") {
    const [date, time] = period.split(" ");
    const [, m, d] = date.split("-");
    return `${d}/${m} ${time}`;
  }
  if (granularity === "month") {
    const [y, m] = period.split("-");
    return `${m}/${y}`;
  }
  const [, m, d] = period.split("-");
  return `${d}/${m}`;
};

const ChartTooltip = ({ active, payload, label, granularity }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-[#111111] px-3 py-2 text-xs text-white shadow-lg">
      {label && (
        <p className="mb-1 border-b border-slate-700 pb-1 font-semibold">
          {formatPeriod(label, granularity) || label}
        </p>
      )}
      {payload.map((p) => (
        <p key={p.dataKey} className="tabular-nums" style={{ color: p.color || p.fill }}>
          {p.name}: {formatMAD(p.value)} MAD
        </p>
      ))}
    </div>
  );
};

const KpiCard = ({ label, value, hint, icon: Icon, accent }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-[#2e2e2e] dark:bg-[#222222]">
    <div className="mb-2 flex items-center justify-between">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <div className="rounded-lg p-1.5" style={{ backgroundColor: `${accent}22` }}>
        <Icon className="h-4 w-4" style={{ color: accent }} strokeWidth={1.75} />
      </div>
    </div>
    <p className="text-xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-50">{value}</p>
    {hint && <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>}
  </div>
);

const SkeletonBlock = ({ className = "h-64" }) => (
  <div className={`animate-pulse rounded-xl bg-slate-100 dark:bg-[#2e2e2e]/50 ${className}`} />
);

export const PartnerChartsSection = ({
  variant = "clients",
  data,
  isLoading,
  granularity = "day",
}) => {
  const { t } = useTranslation("dashboard");
  const isClients = variant === "clients";
  const ns = isClients ? "clients_section" : "fournisseurs_section";
  const accent = isClients ? "#10B981" : "#F59E0B";
  const accentSoft = isClients ? "#B12B89" : "#EF4444";

  const totals = data?.totals ?? {};
  const series = data?.series ?? [];
  const byPartner = data?.byPartner ?? [];
  const byMode = (data?.byMode ?? []).map((m, i) => ({
    ...m,
    name: t(`modes.${m.mode}`, { defaultValue: m.mode }),
    color: MODE_COLORS[i % MODE_COLORS.length],
  }));

  const barHeight = Math.min(Math.max(byPartner.length * 32, 160), 420);

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-[#2e2e2e] dark:bg-[#1c1c1c]/20 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="h-5 w-1 rounded-full" style={{ backgroundColor: accent }} />
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">{t(`${ns}.title`)}</h2>
      </div>

      <div className="space-y-4">
      {isLoading && !data ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            label={t(`${ns}.collected`)}
            value={`${formatMAD(totals.collected)} MAD`}
            icon={Wallet}
            accent={accent}
          />
          <KpiCard
            label={t(`${ns}.payments`)}
            value={formatMAD(totals.paymentCount)}
            icon={Receipt}
            accent={accentSoft}
          />
          <KpiCard
            label={t(`${ns}.partners`)}
            value={formatMAD(totals.partnerCount)}
            icon={Users}
            accent="#3B82F6"
          />
          <KpiCard
            label={t(`${ns}.average`)}
            value={`${formatMAD(totals.average)} MAD`}
            icon={TrendingUp}
            accent="#8B5CF6"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-[#2e2e2e] dark:bg-[#222222] xl:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
            {t(`${ns}.over_time`)}
          </h3>
          {isLoading && !data ? (
            <SkeletonBlock />
          ) : series.every((s) => !s.amount) ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">
              {t(`${ns}.no_data`)}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`fill-${variant}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={accent} stopOpacity={0.28} />
                    <stop offset="95%" stopColor={accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickFormatter={(v) => formatPeriod(v, granularity)}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={compactMAD} width={48} />
                <Tooltip content={<ChartTooltip granularity={granularity} />} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  name={t(`${ns}.collected`)}
                  stroke={accent}
                  strokeWidth={2}
                  fill={`url(#fill-${variant})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-[#2e2e2e] dark:bg-[#222222]">
          <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
            {t(`${ns}.by_mode`)}
          </h3>
          {isLoading && !data ? (
            <SkeletonBlock />
          ) : byMode.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">
              {t(`${ns}.no_data`)}
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={byMode}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={78}
                    paddingAngle={2}
                  >
                    {byMode.map((entry) => (
                      <Cell key={entry.mode} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-1 max-h-24 space-y-1 overflow-y-auto">
                {byMode.map((m) => (
                  <div key={m.mode} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="flex min-w-0 items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: m.color }} />
                      <span className="truncate">{m.name}</span>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                      {formatMAD(m.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-[#2e2e2e] dark:bg-[#222222]">
        <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
          {t(`${ns}.by_partner`)}
        </h3>
        {isLoading && !data ? (
          <SkeletonBlock />
        ) : byPartner.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-400">
            {t(`${ns}.no_data`)}
          </div>
        ) : (
          <div className="overflow-y-auto" style={{ maxHeight: 420 }}>
            <ResponsiveContainer width="100%" height={barHeight}>
              <BarChart
                data={byPartner}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={compactMAD} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickFormatter={(v) => (v?.length > 16 ? `${v.slice(0, 15)}…` : v)}
                />
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <div className="rounded-lg bg-[#111111] px-3 py-2 text-xs text-white shadow-lg">
                        <p className="mb-1 font-semibold">{payload[0].payload.name}</p>
                        <p className="tabular-nums">
                          {formatMAD(payload[0].value)} MAD · {payload[0].payload.count} {t(`${ns}.payments`).toLowerCase()}
                        </p>
                      </div>
                    ) : null
                  }
                />
                <Bar dataKey="amount" name={t(`${ns}.collected`)} fill={accent} radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      </div>
    </section>
  );
};
