import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Scale } from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { compactMAD, formatMAD } from "../utils/formatMoney";

const formatPeriod = (period, granularity) => {
  if (!period) return "";
  if (!/^\d{4}-\d{2}/.test(period)) return period;
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
        <p key={p.dataKey} className="tabular-nums" style={{ color: p.payload?.fill || p.color || p.fill }}>
          {p.name && p.name !== "amount" ? `${p.name}: ` : ""}
          {formatMAD(p.value, 2)} MAD
        </p>
      ))}
    </div>
  );
};

const PartnerList = ({ title, rows, colorClass, barClass, emptyLabel, isLoading }) => {
  const max = rows[0]?.amount || 0;
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      {isLoading ? (
        <div className="h-32 animate-pulse rounded-xl bg-slate-100 dark:bg-[#2e2e2e]/50" />
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">{emptyLabel}</p>
      ) : (
        <div className="max-h-40 space-y-2.5 overflow-y-auto pr-1">
          {rows.map((row) => (
            <div key={row.id}>
              <div className="flex items-center justify-between gap-2 text-[12px]">
                <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                  {row.name}
                </span>
                <span className={`shrink-0 tabular-nums ${colorClass}`}>
                  {formatMAD(row.amount, 2)}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-[#2e2e2e]">
                <div
                  className={`h-full ${barClass}`}
                  style={{
                    width: `${max ? Math.max(4, (row.amount / max) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const DebtCreditOverview = ({ data, isLoading, granularity = "day" }) => {
  const { t } = useTranslation("dashboard");
  const exposure = data?.exposure;
  const clients = exposure?.clients;
  const fournisseurs = exposure?.fournisseurs;
  const gap = exposure?.gap ?? 0;

  const series = useMemo(() => {
    const byPeriod = new Map();
    for (const row of clients?.series ?? []) {
      byPeriod.set(row.period, {
        period: row.period,
        clients: row.amount ?? 0,
        fournisseurs: 0,
      });
    }
    for (const row of fournisseurs?.series ?? []) {
      const existing = byPeriod.get(row.period) || {
        period: row.period,
        clients: 0,
        fournisseurs: 0,
      };
      existing.fournisseurs = row.amount ?? 0;
      byPeriod.set(row.period, existing);
    }
    return [...byPeriod.values()];
  }, [clients, fournisseurs]);

  const comparison = useMemo(
    () => [
      {
        name: t("debt_credit.clients"),
        amount: clients?.totalReste ?? 0,
        fill: "#10B981",
      },
      {
        name: t("debt_credit.fournisseurs"),
        amount: fournisseurs?.totalReste ?? 0,
        fill: "#F59E0B",
      },
    ],
    [clients, fournisseurs, t],
  );

  const hasTotals = (clients?.totalReste || 0) > 0 || (fournisseurs?.totalReste || 0) > 0;
  const hasSeries = series.some((s) => s.clients || s.fournisseurs);
  const gapPositive = gap >= 0;
  const gapHint = gap === 0 ? "gap_even" : gapPositive ? "gap_positive" : "gap_negative";

  const kpis = [
    {
      key: "clients",
      label: t("debt_credit.clients"),
      value: clients?.totalReste,
      count: clients?.documentCount,
      cls: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
      key: "fournisseurs",
      label: t("debt_credit.fournisseurs"),
      value: fournisseurs?.totalReste,
      count: fournisseurs?.documentCount,
      cls: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-900/20",
    },
    {
      key: "gap",
      label: t("debt_credit.gap"),
      value: gap,
      hint: t(`debt_credit.${gapHint}`),
      cls: gapPositive ? "text-[#B12B89]" : "text-red-600 dark:text-red-400",
      bg: gapPositive ? "bg-fuchsia-50 dark:bg-fuchsia-900/20" : "bg-red-50 dark:bg-red-900/20",
    },
  ];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-[#2e2e2e] dark:bg-[#1c1c1c] sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <Scale className="h-4 w-4 text-[#B12B89]" />
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
            {t("debt_credit.title")}
          </h2>
          <p className="text-[11px] text-slate-400">{t("debt_credit.subtitle")}</p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {kpis.map((kpi) => (
          <div key={kpi.key} className={`rounded-xl px-4 py-3 ${kpi.bg}`}>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {kpi.label}
            </p>
            <p className={`mt-0.5 text-lg font-bold tabular-nums ${kpi.cls}`}>
              {isLoading && data == null ? "—" : `${formatMAD(kpi.value, 2)} MAD`}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {kpi.hint ||
                t("debt_credit.documents", { count: kpi.count ?? 0 })}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          {isLoading && !data ? (
            <div className="h-64 animate-pulse rounded-xl bg-slate-100 dark:bg-[#2e2e2e]/50" />
          ) : !hasTotals ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">
              {t("debt_credit.no_data")}
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={comparison} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={compactMAD} width={48} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={88}>
                    {comparison.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {hasSeries && (
                <div className="mt-2">
                  <p className="mb-1 px-1 text-[11px] text-slate-400">
                    {t("debt_credit.over_time")}
                  </p>
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="fill-debt-clients" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="fill-debt-fournisseurs" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.22} />
                          <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} />
                      <XAxis
                        dataKey="period"
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        tickFormatter={(v) => formatPeriod(v, granularity)}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        tickFormatter={compactMAD}
                        width={48}
                      />
                      <Tooltip content={<ChartTooltip granularity={granularity} />} />
                      <Area
                        type="monotone"
                        dataKey="clients"
                        name={t("debt_credit.clients")}
                        stroke="#10B981"
                        strokeWidth={2}
                        fill="url(#fill-debt-clients)"
                      />
                      <Area
                        type="monotone"
                        dataKey="fournisseurs"
                        name={t("debt_credit.fournisseurs")}
                        stroke="#F59E0B"
                        strokeWidth={2}
                        fill="url(#fill-debt-fournisseurs)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-4 px-1 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {t("debt_credit.clients")}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  {t("debt_credit.fournisseurs")}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="space-y-5">
          <PartnerList
            title={t("debt_credit.by_clients")}
            rows={clients?.byPartner ?? []}
            colorClass="text-emerald-600 dark:text-emerald-400"
            barClass="bg-emerald-500"
            emptyLabel={t("debt_credit.no_data")}
            isLoading={isLoading && !data}
          />
          <PartnerList
            title={t("debt_credit.by_fournisseurs")}
            rows={fournisseurs?.byPartner ?? []}
            colorClass="text-amber-600 dark:text-amber-400"
            barClass="bg-amber-500"
            emptyLabel={t("debt_credit.no_data")}
            isLoading={isLoading && !data}
          />
        </div>
      </div>
    </section>
  );
};
