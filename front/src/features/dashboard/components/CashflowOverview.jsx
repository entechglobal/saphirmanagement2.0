import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { compactMAD, formatMAD } from "../utils/formatMoney";

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

const ModeBar = ({ income, expense }) => {
  const total = income + expense;
  if (!total) return null;
  const incomePct = (income / total) * 100;
  return (
    <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-[#2e2e2e]">
      {income > 0 && (
        <div className="h-full bg-emerald-500" style={{ width: `${incomePct}%` }} />
      )}
      {expense > 0 && (
        <div className="h-full bg-amber-500" style={{ width: `${100 - incomePct}%` }} />
      )}
    </div>
  );
};

export const CashflowOverview = ({ data, isLoading, granularity = "day" }) => {
  const { t } = useTranslation("dashboard");

  const series = useMemo(() => {
    const incomeSeries = data?.clients?.series ?? [];
    const expenseSeries = data?.fournisseurs?.series ?? [];
    const byPeriod = new Map();

    for (const row of incomeSeries) {
      byPeriod.set(row.period, {
        period: row.period,
        income: row.amount ?? 0,
        expense: 0,
      });
    }
    for (const row of expenseSeries) {
      const existing = byPeriod.get(row.period) || {
        period: row.period,
        income: 0,
        expense: 0,
      };
      existing.expense = row.amount ?? 0;
      byPeriod.set(row.period, existing);
    }

    return [...byPeriod.values()];
  }, [data]);

  const modes = useMemo(() => {
    const map = new Map();
    for (const m of data?.clients?.byMode ?? []) {
      map.set(m.mode, { mode: m.mode, income: m.amount ?? 0, expense: 0 });
    }
    for (const m of data?.fournisseurs?.byMode ?? []) {
      const existing = map.get(m.mode) || { mode: m.mode, income: 0, expense: 0 };
      existing.expense = m.amount ?? 0;
      map.set(m.mode, existing);
    }
    return [...map.values()].sort(
      (a, b) => b.income + b.expense - (a.income + a.expense),
    );
  }, [data]);

  const hasSeries = series.some((s) => s.income || s.expense);
  const paymentCount =
    (data?.clients?.totals?.paymentCount ?? 0) +
    (data?.fournisseurs?.totals?.paymentCount ?? 0);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-[#2e2e2e] dark:bg-[#1c1c1c] sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
          {t("cashflow.title")}
        </h2>
        <p className="text-[11px] text-slate-400">
          {t("cashflow.payments", { count: paymentCount })}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          {isLoading && !data ? (
            <div className="h-64 animate-pulse rounded-xl bg-slate-100 dark:bg-[#2e2e2e]/50" />
          ) : !hasSeries ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">
              {t("cashflow.no_data")}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="fill-income" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="fill-expense" x1="0" y1="0" x2="0" y2="1">
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
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={compactMAD} width={48} />
                <Tooltip content={<ChartTooltip granularity={granularity} />} />
                <Area
                  type="monotone"
                  dataKey="income"
                  name={t("cashflow.income")}
                  stroke="#10B981"
                  strokeWidth={2}
                  fill="url(#fill-income)"
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  name={t("cashflow.expense")}
                  stroke="#F59E0B"
                  strokeWidth={2}
                  fill="url(#fill-expense)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
          {hasSeries && (
            <div className="mt-2 flex flex-wrap items-center gap-4 px-1 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {t("cashflow.income")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                {t("cashflow.expense")}
              </span>
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
            {t("cashflow.by_mode")}
          </h3>
          {isLoading && !data ? (
            <div className="h-64 animate-pulse rounded-xl bg-slate-100 dark:bg-[#2e2e2e]/50" />
          ) : modes.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-slate-400">
              {t("cashflow.no_data")}
            </div>
          ) : (
            <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
              {modes.map((m) => (
                <div key={m.mode}>
                  <div className="flex items-center justify-between gap-2 text-[12px]">
                    <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                      {t(`modes.${m.mode}`, { defaultValue: m.mode })}
                    </span>
                    <span className="shrink-0 tabular-nums text-slate-500">
                      <span className="text-emerald-600 dark:text-emerald-400">
                        +{formatMAD(m.income)}
                      </span>
                      <span className="mx-1 text-slate-300">/</span>
                      <span className="text-amber-600 dark:text-amber-400">
                        −{formatMAD(m.expense)}
                      </span>
                    </span>
                  </div>
                  <ModeBar income={m.income} expense={m.expense} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
