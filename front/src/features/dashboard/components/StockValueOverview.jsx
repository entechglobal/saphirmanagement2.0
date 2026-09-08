import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Warehouse } from "lucide-react";
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
          {p.name}: {formatMAD(p.value, 2)} MAD
        </p>
      ))}
    </div>
  );
};

export const StockValueOverview = ({ data, isLoading, granularity = "day" }) => {
  const { t } = useTranslation("dashboard");
  const stock = data?.stockValue;
  const series = useMemo(() => stock?.series ?? [], [stock]);
  const byDepot = useMemo(() => stock?.byDepot ?? [], [stock]);
  const hasSeries = series.some((s) => s.amount);
  const maxDepot = byDepot[0]?.value || 0;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-[#2e2e2e] dark:bg-[#1c1c1c] sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Warehouse className="h-4 w-4 text-[#B12B89]" />
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
              {t("stock_value.title")}
            </h2>
            <p className="text-[11px] text-slate-400">{t("stock_value.subtitle")}</p>
          </div>
        </div>
        <p className="shrink-0 text-right text-sm font-bold tabular-nums text-[#B12B89]">
          {isLoading && data == null ? "—" : `${formatMAD(stock?.total, 2)} MAD`}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          {isLoading && !data ? (
            <div className="h-64 animate-pulse rounded-xl bg-slate-100 dark:bg-[#2e2e2e]/50" />
          ) : !hasSeries ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">
              {t("stock_value.no_data")}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="fill-stock-value" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#B12B89" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#B12B89" stopOpacity={0} />
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
                  name={t("stock_value.inbound")}
                  stroke="#B12B89"
                  strokeWidth={2}
                  fill="url(#fill-stock-value)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
            {t("stock_value.by_depot")}
          </h3>
          {isLoading && !data ? (
            <div className="h-64 animate-pulse rounded-xl bg-slate-100 dark:bg-[#2e2e2e]/50" />
          ) : byDepot.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-slate-400">
              {t("stock_value.no_data")}
            </div>
          ) : (
            <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
              {byDepot.map((d) => (
                <div key={d.id}>
                  <div className="flex items-center justify-between gap-2 text-[12px]">
                    <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                      {d.name}
                    </span>
                    <span className="shrink-0 tabular-nums text-slate-500">
                      {formatMAD(d.value, 2)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-[#2e2e2e]">
                    <div
                      className="h-full bg-[#B12B89]"
                      style={{
                        width: `${maxDepot ? Math.max(4, (d.value / maxDepot) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
