import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  ChevronRight,
  Coins,
  Package,
  ShoppingBag,
  Users,
} from "lucide-react";
import {
  DashboardDateFilter,
  DEFAULT_PRESET,
  getPresetRange,
} from "@/features/dashboard/components/DashboardDateFilter";
import { useCommercialStats } from "../../commandes/hooks/useCommands";
import { HeaderTable } from "@/shared/components/HeaderTable";
import { SelectUI } from "@/shared/ui/SelectUI";

const ORDER_STATUSES = [
  "EN_COURS",
  "CONFIRME",
  "PREPARE",
  "COLLECTE",
  "EN_ROUTE",
  "LIVRE",
  "PAYE",
  "ANNULE",
];
  
const fmt = (n) =>
  Number(n || 0).toLocaleString("fr-MA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const KpiCard = ({ icon: Icon, label, value, accent }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[#2e2e2e] dark:bg-[#1c1c1c]">
    <div className="flex items-center gap-3">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}
      >
        <Icon className="h-4.5 w-4.5" strokeWidth={2} />
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p className="mt-0.5 text-lg font-black text-slate-800 dark:text-slate-100">
          {value}
        </p>
      </div>
    </div>
  </div>
);

const CommercialRow = ({ commercial, rank, t }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-[#2e2e2e] dark:bg-[#1c1c1c]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-start transition hover:bg-slate-50 dark:hover:bg-[#222222]"
      >
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
            rank === 1
              ? "bg-[#B12B89] text-white"
              : "bg-slate-100 text-slate-500 dark:bg-[#2a2a2a]"
          }`}
        >
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
            {commercial.name}
          </p>
          <p className="text-[11px] text-slate-400">
            {t("saphir_commercial_stats.orders_label", {
              count: commercial.orderCount,
            })}
            {" · "}
            CA {fmt(commercial.totalCA)} MAD
          </p>
        </div>
        <div className="text-end">
          <p className="text-sm font-black text-[#B12B89]">
            {fmt(commercial.totalCommission)} MAD
          </p>
          <p className="text-[10px] text-slate-400">
            {t("saphir_commercial_stats.commission")}
          </p>
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
        )}
      </button>

      {open && (
        <div className="border-t border-slate-100 dark:border-[#2e2e2e]">
          {(commercial.orders || []).length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-slate-400">
              {t("saphir_commercial_stats.no_orders")}
            </p>
          ) : (
            <ul className="divide-y divide-slate-50 dark:divide-[#2e2e2e]">
              {commercial.orders.map((order) => (
                <li key={order.id}>
                  <Link
                    to={`/commandes/${order.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-slate-50 dark:hover:bg-[#222222]"
                  >
                    <Package className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                        {order.clientName || "—"}
                      </p>
                      <p className="truncate text-[10px] text-slate-400">
                        {[
                          order.documentNumber,
                          order.commandStatus
                            ? t(`status_label_${order.commandStatus}`, order.commandStatus)
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <div className="text-end">
                      <p className="text-[12px] font-bold text-slate-700 dark:text-slate-200">
                        {fmt(order.amountDue)} MAD
                      </p>
                      <p className="text-[10px] font-semibold text-[#B12B89]">
                        {fmt(order.totalCommission)} MAD
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export const CommercialStatsPage = () => {
  const { t } = useTranslation("dashboard");
  const [range, setRange] = useState(() => {
    const [from, to] = getPresetRange(DEFAULT_PRESET);
    return { from, to };
  });
  const [selectedStatuses, setSelectedStatuses] = useState([]);

  const dateFrom = range.from?.format("YYYY-MM-DDTHH:mm:ss");
  const dateTo = range.to?.format("YYYY-MM-DDTHH:mm:ss");
  const commandStatus = selectedStatuses.length ? selectedStatuses.join(",") : undefined;

  const { data, isLoading, isError } = useCommercialStats({
    dateFrom,
    dateTo,
    commandStatus,
  });
  const payload = data?.data ?? data ?? {};
  const summary = payload.summary ?? {};
  const commercials = useMemo(
    () => payload.commercials ?? [],
    [payload.commercials],
  );

  const statusOptions = useMemo(
    () =>
      ORDER_STATUSES.map((value) => ({
        value,
        label: t(`status_label_${value}`, value),
      })),
    [t],
  );

  return (
    <div className="min-h-screen p-4 md:p-8 transition-colors duration-300">
      <HeaderTable title={t("saphir_commercial_stats.title")} />

      <div className="mb-5 grid grid-cols-1 gap-3 xl:grid-cols-[1fr_280px] xl:items-start">
        <DashboardDateFilter
          from={range.from}
          to={range.to}
          onChange={(from, to) => setRange({ from, to })}
        />
        <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-[#2e2e2e] dark:bg-[#222222] sm:p-4">
          <SelectUI
            label={t("saphir_commercial_stats.filter_status")}
            multiple
            clearable
            searchable
            value={selectedStatuses}
            options={statusOptions}
            placeholder={t("saphir_commercial_stats.filter_all_statuses")}
            onChange={(e) => setSelectedStatuses(e.target.value || [])}
          />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Users}
          label={t("saphir_commercial_stats.kpi_commercials")}
          value={summary.commercialCount ?? 0}
          accent="bg-fuchsia-50 text-[#B12B89] dark:bg-fuchsia-900/20"
        />
        <KpiCard
          icon={ShoppingBag}
          label={t("saphir_commercial_stats.kpi_orders")}
          value={summary.orderCount ?? 0}
          accent="bg-blue-50 text-blue-600 dark:bg-blue-900/20"
        />
        <KpiCard
          icon={Package}
          label={t("saphir_commercial_stats.kpi_ca")}
          value={`${fmt(summary.totalCA)} MAD`}
          accent="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20"
        />
        <KpiCard
          icon={Coins}
          label={t("saphir_commercial_stats.kpi_commission")}
          value={`${fmt(summary.totalCommission)} MAD`}
          accent="bg-amber-50 text-amber-600 dark:bg-amber-900/20"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-[#222222]"
            />
          ))}
        </div>
      ) : isError ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-8 text-center text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/10">
          {t("saphir_commercial_stats.error")}
        </p>
      ) : commercials.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 py-16 dark:border-[#2e2e2e]">
          <Users className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-semibold text-slate-500">
            {t("saphir_commercial_stats.empty")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {commercials.map((c, idx) => (
            <CommercialRow key={c.id} commercial={c} rank={idx + 1} t={t} />
          ))}
        </div>
      )}
    </div>
  );
};
