import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import {
  DashboardDateFilter,
  DEFAULT_PRESET,
  getPresetRange,
} from "@/features/dashboard/components/DashboardDateFilter";
import { useCommercialStats } from "../../commandes/hooks/useCommands";
import { HeaderTable } from "@/shared/components/HeaderTable";
import { ReusableTable } from "@/shared/components/ReusableTable";
import { BaseModal } from "@/shared/components/BaseModal";
import { SelectUI } from "@/shared/ui/SelectUI";

const NET_PROFIT_STORAGE_KEY = "commercial-stats-show-net-profit";

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

const CELL = "text-sm font-medium text-slate-700 dark:text-slate-200";
const ACTION_BTN =
  "inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-[#2e2e2e] dark:bg-[#1c1c1c] dark:text-slate-200 dark:hover:bg-[#222222]";
const ACTION_BTN_PRIMARY =
  "inline-flex h-8 items-center justify-center rounded-lg bg-[#B12B89] px-3 text-sm font-medium text-white transition hover:brightness-110";

const fmt = (n) =>
  Number(n || 0).toLocaleString("fr-MA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-MA");
};

const Money = ({ value, className = "" }) => (
  <span className={`tabular-nums ${CELL} ${className}`}>{fmt(value)} MAD</span>
);

const KpiCard = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-[#2e2e2e] dark:bg-[#1c1c1c]">
    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
    <p className="mt-1 text-sm font-medium tabular-nums text-slate-800 dark:text-slate-100">
      {value}
    </p>
  </div>
);

const StatusText = ({ status, t }) => {
  if (!status) return <span className={CELL}>—</span>;
  return (
    <span className={CELL}>{t(`status_label_${status}`, status)}</span>
  );
};

const readStoredNetProfitVisibility = () => {
  try {
    const saved = localStorage.getItem(NET_PROFIT_STORAGE_KEY);
    if (saved === null) return true;
    return saved === "true";
  } catch {
    return true;
  }
};

const ProfitEyeButton = ({ show, onToggle, t }) => {
  const label = show
    ? t("saphir_commercial_stats.hide_net_profit")
    : t("saphir_commercial_stats.show_net_profit");
  const Icon = show ? EyeOff : Eye;
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={show}
      onClick={onToggle}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-medium text-white transition hover:brightness-110"
    >
      <Icon className="h-4 w-4" strokeWidth={1.75} />
      <span className="hidden sm:inline">
        {t("saphir_commercial_stats.col_net_profit")}
      </span>
    </button>
  );
};

const OrderDetailsModal = ({ order, onClose, t, showNetProfit }) => {
  const products = order?.products || [];
  return (
    <BaseModal
      isOpen={!!order}
      onClose={onClose}
      title={t("saphir_commercial_stats.details_title")}
      subtitle={
        order
          ? [order.documentNumber, order.clientName].filter(Boolean).join(" · ")
          : ""
      }
      maxWidth="max-w-3xl"
      footer={
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className={ACTION_BTN}>
            {t("saphir_commercial_stats.close")}
          </button>
        </div>
      }
    >
      {order && (
        <div className="space-y-4 text-sm font-medium text-slate-700 dark:text-slate-200">
          <div className={`grid grid-cols-2 gap-3 ${showNetProfit ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
            <div>
              <p className="text-slate-500">{t("saphir_commercial_stats.col_amount")}</p>
              <p className="mt-0.5 tabular-nums">{fmt(order.amountDue)} MAD</p>
            </div>
            <div>
              <p className="text-slate-500">{t("saphir_commercial_stats.col_buy")}</p>
              <p className="mt-0.5 tabular-nums">{fmt(order.boughtPrice)} MAD</p>
            </div>
            <div>
              <p className="text-slate-500">{t("saphir_commercial_stats.commission")}</p>
              <p className="mt-0.5 tabular-nums">{fmt(order.totalCommission)} MAD</p>
            </div>
            {showNetProfit && (
              <div>
                <p className="text-slate-500">{t("saphir_commercial_stats.col_net_profit")}</p>
                <p
                  className={`mt-0.5 tabular-nums ${
                    Number(order.netProfit) < 0 ? "text-red-600" : "text-emerald-600"
                  }`}
                >
                  {fmt(order.netProfit)} MAD
                </p>
              </div>
            )}
          </div>

          {products.length === 0 ? (
            <p className="py-6 text-center text-slate-400">
              {t("saphir_commercial_stats.no_products")}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-[#2e2e2e]">
              <table className="w-full border-collapse text-sm font-medium">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 dark:border-[#2e2e2e] dark:bg-[#1c1c1c]">
                    <th className="px-3 py-2 text-start">{t("saphir_commercial_stats.col_product")}</th>
                    <th className="px-3 py-2 text-start">{t("saphir_commercial_stats.col_kind")}</th>
                    <th className="px-3 py-2 text-end">{t("saphir_commercial_stats.col_qty")}</th>
                    <th className="px-3 py-2 text-end">{t("saphir_commercial_stats.col_unit_sell")}</th>
                    <th className="px-3 py-2 text-end">{t("saphir_commercial_stats.col_unit_buy")}</th>
                    <th className="px-3 py-2 text-end">{t("saphir_commercial_stats.col_unit_commission")}</th>
                    <th className="px-3 py-2 text-end">{t("saphir_commercial_stats.col_line_commission")}</th>
                    {showNetProfit && (
                      <th className="px-3 py-2 text-end">{t("saphir_commercial_stats.col_net_profit")}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, idx) => (
                    <tr
                      key={`${p.kind}-${p.name}-${idx}`}
                      className="border-b border-slate-100 last:border-b-0 dark:border-[#2e2e2e]"
                    >
                      <td className="px-3 py-2">{p.name}</td>
                      <td className="px-3 py-2">
                        {t(`saphir_commercial_stats.kind_${p.kind}`, p.kind)}
                      </td>
                      <td className="px-3 py-2 text-end tabular-nums">{p.quantity}</td>
                      <td className="px-3 py-2 text-end tabular-nums">{fmt(p.unitPrice)}</td>
                      <td className="px-3 py-2 text-end tabular-nums">{fmt(p.unitBuy)}</td>
                      <td className="px-3 py-2 text-end tabular-nums">{fmt(p.unitCommission ?? p.commission)}</td>
                      <td className="px-3 py-2 text-end tabular-nums">{fmt(p.commissionTotal)}</td>
                      {showNetProfit && (
                        <td className="px-3 py-2 text-end tabular-nums">{fmt(p.netProfit)}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </BaseModal>
  );
};

export const CommercialStatsPage = () => {
  const { t } = useTranslation("dashboard");
  const navigate = useNavigate();
  const [range, setRange] = useState(() => {
    const [from, to] = getPresetRange(DEFAULT_PRESET);
    return { from, to };
  });
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [commercialId, setCommercialId] = useState(null);
  const [ordersOf, setOrdersOf] = useState(null);
  const [detailOrder, setDetailOrder] = useState(null);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [globalFilter, setGlobalFilter] = useState("");
  const [showNetProfit, setShowNetProfit] = useState(readStoredNetProfitVisibility);

  const toggleNetProfit = useCallback(() => {
    setShowNetProfit((current) => {
      const next = !current;
      try {
        localStorage.setItem(NET_PROFIT_STORAGE_KEY, String(next));
      } catch {
        /* ignore quota / private mode */
      }
      return next;
    });
  }, []);

  const dateFrom = range.from?.format("YYYY-MM-DDTHH:mm:ss");
  const dateTo = range.to?.format("YYYY-MM-DDTHH:mm:ss");
  const commandStatus = selectedStatuses.length ? selectedStatuses.join(",") : undefined;

  const { data, isLoading, isError, isFetching } = useCommercialStats({
    dateFrom,
    dateTo,
    commandStatus,
    commercialId: commercialId || undefined,
  });
  const payload = data?.data ?? data ?? {};
  const summary = payload.summary ?? {};
  const commercials = useMemo(
    () => payload.commercials ?? [],
    [payload.commercials],
  );

  useEffect(() => {
    setDetailOrder(null);
    setGlobalFilter("");
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [dateFrom, dateTo, commandStatus, commercialId]);

  useEffect(() => {
    setOrdersOf((current) => {
      if (current) {
        const fresh = commercials.find((c) => c.id === current.id);
        if (fresh) return fresh;
        if (commercials.length === 1) return commercials[0];
        return null;
      }
      if (commercials.length === 1) return commercials[0];
      return current;
    });
  }, [commercials]);

  const showingOrders = !!ordersOf;
  const canGoBackToCommercials = commercials.length > 1;

  const statusOptions = useMemo(
    () =>
      ORDER_STATUSES.map((value) => ({
        value,
        label: t(`status_label_${value}`, value),
      })),
    [t],
  );

  const commercialOptions = useMemo(
    () =>
      (payload.filterOptions ?? []).map((c) => ({
        value: String(c.id),
        label: c.name,
      })),
    [payload.filterOptions],
  );

  const commercialRows = useMemo(() => commercials, [commercials]);
  const orderRows = useMemo(
    () =>
      (ordersOf?.orders || []).map((order) => ({
        ...order,
        commercialName: ordersOf?.name,
      })),
    [ordersOf],
  );

  const sourceRows = showingOrders ? orderRows : commercialRows;
  const filteredRows = useMemo(() => {
    const q = globalFilter.trim().toLowerCase();
    if (!q) return sourceRows;
    return sourceRows.filter((row) =>
      [
        row.name,
        row.commercialName,
        row.documentNumber,
        row.clientName,
        row.commandStatus,
        row.createdByName,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [sourceRows, globalFilter]);

  const pagedRows = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    return filteredRows.slice(start, start + pagination.pageSize);
  }, [filteredRows, pagination]);

  const commercialColumns = useMemo(() => {
    const cols = [
      {
        accessorKey: "name",
        header: t("saphir_commercial_stats.col_commercial"),
        Cell: ({ row }) => <span className={CELL}>{row.original.name}</span>,
      },
      {
        accessorKey: "orderCount",
        header: t("saphir_commercial_stats.col_orders"),
        Cell: ({ row }) => (
          <span className={`${CELL} tabular-nums`}>{row.original.orderCount}</span>
        ),
      },
      {
        accessorKey: "totalCA",
        header: t("saphir_commercial_stats.col_amount"),
        Cell: ({ row }) => <Money value={row.original.totalCA} />,
      },
      {
        accessorKey: "totalCommission",
        header: t("saphir_commercial_stats.commission"),
        Cell: ({ row }) => <Money value={row.original.totalCommission} />,
      },
    ];
    if (showNetProfit) {
      cols.push({
        accessorKey: "totalNetProfit",
        header: t("saphir_commercial_stats.col_net_profit"),
        Cell: ({ row }) => (
          <Money
            value={row.original.totalNetProfit}
            className={
              Number(row.original.totalNetProfit) < 0
                ? "text-red-600 dark:text-red-400"
                : "text-emerald-600 dark:text-emerald-400"
            }
          />
        ),
      });
    }
    cols.push({
      id: "actions",
      header: t("saphir_commercial_stats.col_actions"),
      enableSorting: false,
      Cell: ({ row }) => (
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition hover:opacity-80"
          onClick={() => {
            setOrdersOf(row.original);
            setGlobalFilter("");
            setPagination((p) => ({ ...p, pageIndex: 0 }));
          }}
        >
          <Eye className="h-4 w-4" strokeWidth={1.75} />
          {t("saphir_commercial_stats.see_orders")}
        </button>
      ),
    });
    return cols;
  }, [t, showNetProfit]);

  const orderColumns = useMemo(() => {
    const cols = [
      {
        accessorKey: "documentNumber",
        header: t("saphir_commercial_stats.col_document"),
        Cell: ({ row }) => (
          <span className={CELL}>{row.original.documentNumber || "—"}</span>
        ),
      },
      {
        accessorKey: "clientName",
        header: t("saphir_commercial_stats.col_client"),
        Cell: ({ row }) => (
          <span className={CELL}>{row.original.clientName || "—"}</span>
        ),
      },
      {
        accessorKey: "commandStatus",
        header: t("saphir_commercial_stats.col_status"),
        Cell: ({ row }) => (
          <StatusText status={row.original.commandStatus} t={t} />
        ),
      },
      {
        accessorKey: "dateLivraison",
        header: t("saphir_commercial_stats.col_date"),
        Cell: ({ row }) => (
          <span className={CELL}>
            {fmtDate(row.original.dateLivraison || row.original.createdAt)}
          </span>
        ),
      },
      {
        accessorKey: "amountDue",
        header: t("saphir_commercial_stats.col_amount"),
        Cell: ({ row }) => <Money value={row.original.amountDue} />,
      },
      {
        accessorKey: "totalCommission",
        header: t("saphir_commercial_stats.commission"),
        Cell: ({ row }) => <Money value={row.original.totalCommission} />,
      },
    ];
    if (showNetProfit) {
      cols.push({
        accessorKey: "netProfit",
        header: t("saphir_commercial_stats.col_net_profit"),
        Cell: ({ row }) => (
          <Money
            value={row.original.netProfit}
            className={
              Number(row.original.netProfit) < 0
                ? "text-red-600 dark:text-red-400"
                : "text-emerald-600 dark:text-emerald-400"
            }
          />
        ),
      });
    }
    cols.push({
      id: "actions",
      header: t("saphir_commercial_stats.col_actions"),
      enableSorting: false,
      Cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={ACTION_BTN}
            onClick={() => setDetailOrder(row.original)}
          >
            {t("saphir_commercial_stats.details")}
          </button>
          <button
            type="button"
            className={ACTION_BTN_PRIMARY}
            onClick={() => navigate(`/commandes/${row.original.id}`)}
          >
            {t("saphir_commercial_stats.see_order")}
          </button>
        </div>
      ),
    });
    return cols;
  }, [t, navigate, showNetProfit]);

  return (
    <div className="min-h-screen p-4 font-sans text-sm font-medium md:p-8">
      <HeaderTable
        title={
          showingOrders
            ? t("saphir_commercial_stats.orders_of", { name: ordersOf.name })
            : t("saphir_commercial_stats.title")
        }
      />

      <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-stretch">
        <div className="min-w-0 flex-1">
          <DashboardDateFilter
            from={range.from}
            to={range.to}
            onChange={(from, to) => setRange({ from, to })}
            className="h-full"
          />
        </div>
        <div className="flex h-full items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-[#2e2e2e] dark:bg-[#222222] sm:p-4">
          {commercialOptions.length > 1 && (
            <div className="w-full min-w-[180px] xl:w-[220px]">
              <SelectUI
                clearable
                searchable
                value={commercialId ? String(commercialId) : ""}
                options={commercialOptions}
                placeholder={t("saphir_commercial_stats.filter_all_commercials")}
                onChange={(e) => setCommercialId(e.target.value || null)}
              />
            </div>
          )}
          <div className="w-full min-w-[180px] xl:w-[220px]">
            <SelectUI
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
      </div>

      <div className={`mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 ${showNetProfit ? "xl:grid-cols-5" : "xl:grid-cols-4"}`}>
        <KpiCard
          label={t("saphir_commercial_stats.kpi_commercials")}
          value={summary.commercialCount ?? 0}
        />
        <KpiCard
          label={t("saphir_commercial_stats.kpi_orders")}
          value={summary.orderCount ?? 0}
        />
        <KpiCard
          label={t("saphir_commercial_stats.kpi_ca")}
          value={`${fmt(summary.totalCA)} MAD`}
        />
        <KpiCard
          label={t("saphir_commercial_stats.kpi_commission")}
          value={`${fmt(summary.totalCommission)} MAD`}
        />
        {showNetProfit && (
          <KpiCard
            label={t("saphir_commercial_stats.kpi_net_profit")}
            value={`${fmt(summary.totalNetProfit)} MAD`}
          />
        )}
      </div>

      {showingOrders && canGoBackToCommercials && (
        <div className="mb-3">
          <button
            type="button"
            className={ACTION_BTN}
            onClick={() => {
              setOrdersOf(null);
              setGlobalFilter("");
              setPagination((p) => ({ ...p, pageIndex: 0 }));
            }}
          >
            {t("saphir_commercial_stats.back_to_commercials")}
          </button>
        </div>
      )}

      {isError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-8 text-center text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/10">
          {t("saphir_commercial_stats.error")}
        </p>
      ) : (
        <ReusableTable
          data={pagedRows}
          columns={showingOrders ? orderColumns : commercialColumns}
          totalRows={filteredRows.length}
          pagination={pagination}
          setPagination={setPagination}
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter}
          searchPlaceholder={
            showingOrders
              ? t("saphir_commercial_stats.search_orders")
              : t("saphir_commercial_stats.search_commercials")
          }
          isLoading={isLoading}
          isFetching={isFetching}
          isError={isError}
          enableRowActions={false}
          tableId={showingOrders ? "commercial-stats-orders" : "commercial-stats"}
          customTopToolbarActions={
            <ProfitEyeButton
              show={showNetProfit}
              onToggle={toggleNetProfit}
              t={t}
            />
          }
        />
      )}

      <OrderDetailsModal
        order={detailOrder}
        onClose={() => setDetailOrder(null)}
        t={t}
        showNetProfit={showNetProfit}
      />
    </div>
  );
};
