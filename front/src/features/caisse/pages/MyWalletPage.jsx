import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  MinusCircle,
  PlusCircle,
  DollarSign,
  Clock,
} from "lucide-react";
import { useOperatingHours } from "@/shared/hooks/useOperatingHours";
import {
  useMyCaisse,
  useCaisseTransactions,
  useCaisseDashboard,
} from "../hooks/useCaisse";
import { ReusableTable } from "../../../shared/components/ReusableTable";
import { FiltersBar } from "../../../shared/components/FiltersBar";
import { HeaderTable } from "../../../shared/components/HeaderTable";
import { CreateMyCaisseModal } from "../components/CreateMyCaisseModal";
import { ChargeModal } from "../components/ChargeModal";
import { WalletTransferModal } from "../components/WalletTransferModal";

const formatMAD = (val) =>
  Number(val ?? 0).toLocaleString("fr-MA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const ENCAISSEMENT_TYPES = ["INITIAL_BALANCE", "INCOME"];
const TRANSFER_TYPES = ["TRANSFER_IN", "TRANSFER_OUT"];

export const MyWalletPage = () => {
  const { t } = useTranslation("caisse");
  const { startHour, endHour } = useOperatingHours();
  const defaultStart =
    startHour != null
      ? dayjs().startOf("month").hour(startHour).minute(0).second(0).millisecond(0)
      : dayjs().startOf("month");
  const defaultEnd =
    endHour != null
      ? dayjs().endOf("month").hour(endHour).minute(0).second(0).millisecond(0)
      : dayjs().endOf("month");

  const [typeFilter, setTypeFilter] = useState(null);
  const [startDateTime, setStartDateTime] = useState(defaultStart);
  const [endDateTime, setEndDateTime] = useState(defaultEnd);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [showCreateMyCaisse, setShowCreateMyCaisse] = useState(false);
  const [showCharge, setShowCharge] = useState(false);
  const [showWalletTransfer, setShowWalletTransfer] = useState(false);

  const hoursApplied = useRef(false);
  useEffect(() => {
    if (hoursApplied.current || (startHour == null && endHour == null)) return;
    hoursApplied.current = true;
    if (startHour != null)
      setStartDateTime((d) => d.hour(startHour).minute(0).second(0).millisecond(0));
    if (endHour != null)
      setEndDateTime((d) => d.hour(endHour).minute(0).second(0).millisecond(0));
  }, [startHour, endHour]);

  const resetPage = useCallback(
    () => setPagination((p) => ({ ...p, pageIndex: 0 })),
    []
  );

  const { data: myCaisseData, isLoading: myCaisseLoading } = useMyCaisse();
  const myCaisse = myCaisseData?.data;
  const hasMyCaisse = !!myCaisse?.id;

  const apiDateFrom = startDateTime?.isValid()
    ? startDateTime.format("YYYY-MM-DDTHH:mm:ss")
    : undefined;
  const apiDateTo = endDateTime?.isValid()
    ? endDateTime.format("YYYY-MM-DDTHH:mm:ss")
    : undefined;

  const { data, isLoading, isFetching, isError } = useCaisseTransactions(
    myCaisse?.id,
    {
      pageIndex: pagination.pageIndex,
      pageSize: pagination.pageSize,
      direction: typeFilter?.value || undefined,
      dateFrom: apiDateFrom,
      dateTo: apiDateTo,
    }
  );

  const { data: dashboardResponse, isLoading: dashboardLoading } =
    useCaisseDashboard(myCaisse?.id, {
      dateFrom: apiDateFrom,
      dateTo: apiDateTo,
    });

  const transactions = data?.data ?? [];
  const paginationMeta = data?.pagination;
  const totalRows = paginationMeta?.total ?? 0;
  const stats = dashboardResponse?.data?.stats;

  const datesAreDefault =
    startDateTime?.isSame(defaultStart) && endDateTime?.isSame(defaultEnd);
  const hasActiveFilters = !!(typeFilter || !datesAreDefault);

  const handleReset = useCallback(() => {
    setTypeFilter(null);
    setStartDateTime(defaultStart);
    setEndDateTime(defaultEnd);
    resetPage();
  }, [defaultStart, defaultEnd, resetPage]);

  const typeOptions = useMemo(
    () => [
      { value: "in", label: t("type_encaissement") },
      { value: "out", label: t("type_decaissement") },
      { value: "transfer", label: t("type_transfert") },
    ],
    [t]
  );

  const filtersConfig = useMemo(
    () => [
      {
        type: "select",
        id: "type",
        label: t("filter_type"),
        icon: ArrowLeftRight,
        options: typeOptions,
        value: typeFilter,
        onChange: (v) => {
          setTypeFilter(v);
          resetPage();
        },
      },
      {
        type: "date-range",
        id: "dateRange",
        startDateTime,
        endDateTime,
        onStartChange: (v) => {
          setStartDateTime(v);
          if (v && endDateTime && v.isAfter(endDateTime)) setEndDateTime(null);
          resetPage();
        },
        onEndChange: (v) => {
          setEndDateTime(v);
          resetPage();
        },
        startLabel: t("filter_date_from"),
        endLabel: t("filter_date_to"),
      },
    ],
    [t, typeOptions, typeFilter, startDateTime, endDateTime, resetPage]
  );

  const columns = useMemo(
    () => [
      {
        id: "date_op",
        header: t("col_date_op"),
        accessorKey: "createdAt",
        size: 150,
        Cell: ({ cell }) => {
          const d = new Date(cell.getValue());
          return (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {d.toLocaleDateString("fr-MA")}
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                {d.toLocaleTimeString("fr-MA", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "transactionType",
        header: t("col_type"),
        size: 140,
        Cell: ({ cell }) => {
          const type = cell.getValue();
          const isTransfer = TRANSFER_TYPES.includes(type);
          const isEnc = ENCAISSEMENT_TYPES.includes(type);
          const cls = isTransfer
            ? "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-800"
            : isEnc
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800"
              : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800";
          const label = isTransfer
            ? t("type_label_transfert")
            : isEnc
              ? t("type_label_encaissement")
              : t("type_label_decaissement");
          return (
            <span
              className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wide ${cls}`}
            >
              {label}
            </span>
          );
        },
      },
      {
        id: "libelle",
        header: t("col_libelle"),
        Cell: ({ row }) => {
          const tx = row.original;
          let label = "";
          if (tx.transactionType === "INITIAL_BALANCE") label = t("libelle_initial");
          else if (tx.transactionType === "CHARGE")
            label = tx.label?.name || t("libelle_charge");
          else if (tx.transactionType === "TRANSFER_IN")
            label = tx.referenceCaisse?.name
              ? t("libelle_transfer_in", { name: tx.referenceCaisse.name })
              : t("libelle_transfer_in_noname");
          else if (tx.transactionType === "TRANSFER_OUT")
            label = tx.referenceCaisse?.name
              ? t("libelle_transfer_out", { name: tx.referenceCaisse.name })
              : t("libelle_transfer_out_noname");
          else if (tx.transactionType === "INCOME") label = t("libelle_income");
          else if (tx.transactionType === "EXPENSE") label = t("libelle_expense");
          return (
            <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
          );
        },
      },
      {
        accessorKey: "amount",
        header: t("col_amount"),
        size: 140,
        Cell: ({ cell }) => {
          const val = Number(cell.getValue());
          const isPos = val >= 0;
          return (
            <span
              className={`font-mono text-sm font-bold ${
                isPos ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
              }`}
            >
              {isPos ? "+" : ""}
              {formatMAD(Math.abs(val))}{" "}
              <span className="ml-0.5 text-[10px] opacity-70">MAD</span>
            </span>
          );
        },
      },
      {
        accessorKey: "newBalance",
        header: t("col_balance"),
        size: 130,
        Cell: ({ cell }) => (
          <span className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300">
            {formatMAD(cell.getValue())}{" "}
            <span className="ml-0.5 text-[10px] opacity-70">MAD</span>
          </span>
        ),
      },
      {
        accessorKey: "note",
        header: t("col_observation"),
        Cell: ({ cell }) => (
          <span className="text-xs text-slate-500">{cell.getValue() || "—"}</span>
        ),
      },
    ],
    [t]
  );

  const available = Number(myCaisse?.availableBalance ?? myCaisse?.currentBalance ?? 0);
  const current = Number(myCaisse?.currentBalance ?? 0);
  const pendingOutgoing = Number(myCaisse?.pendingOutgoing ?? 0);
  const statsLoading = myCaisseLoading || dashboardLoading;

  return (
    <>
      <div className="min-h-screen p-4 transition-colors duration-300 md:p-8">
        <HeaderTable
          title={t("my_wallet_title")}
          subtitle={hasMyCaisse ? myCaisse.name : t("my_wallet_subtitle")}
          actions={
            hasMyCaisse ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowCharge(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 transition-all hover:bg-slate-50 active:scale-[0.98] dark:border-[#2e2e2e] dark:bg-transparent dark:text-slate-200 dark:hover:bg-[#222222]"
                >
                  <MinusCircle className="h-4 w-4 text-red-500" />
                  {t("btn_create_charge")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowWalletTransfer(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#B12B89] px-3 py-2 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(16,24,40,0.06)] transition-all hover:brightness-110 active:scale-[0.98]"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                  {t("btn_transfer")}
                </button>
              </>
            ) : null
          }
        />

        {!myCaisseLoading && !hasMyCaisse && (
          <div className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 dark:border-amber-800/50 dark:bg-amber-900/15">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-800/40">
                <Wallet className="h-[18px] w-[18px] text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-amber-800 dark:text-amber-300">
                  {t("no_caisse_banner_title")}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-500">
                  {t("no_caisse_banner_subtitle")}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateMyCaisse(true)}
              className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-[13px] font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]"
            >
              <PlusCircle className="h-4 w-4" />
              {t("btn_create_my_caisse")}
            </button>
          </div>
        )}

        {hasMyCaisse && (
          <>
            <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-emerald-200 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:border-emerald-900/40 dark:bg-[#1c1c1c]">
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
                    {t("stat_final_balance")}
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                    <DollarSign className="h-5 w-5" />
                  </div>
                </div>
                {statsLoading ? (
                  <div className="h-7 w-36 animate-pulse rounded-lg bg-slate-100 dark:bg-[#222222]" />
                ) : (
                  <>
                    <p className="text-[22px] font-bold tracking-[-0.01em] text-emerald-600 dark:text-emerald-400">
                      {formatMAD(current)} MAD
                    </p>
                    {pendingOutgoing > 0 && (
                      <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                        <Clock className="h-3 w-3" />
                        {t("pending_outgoing", { amount: formatMAD(pendingOutgoing) })}
                      </p>
                    )}
                    {pendingOutgoing > 0 && (
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {t("available_balance")}: {formatMAD(available)} MAD
                      </p>
                    )}
                  </>
                )}
              </div>
              <StatCard
                label={t("stat_total_in")}
                value={`${formatMAD(stats?.totalEntrees)} MAD`}
                icon={<TrendingUp className="h-5 w-5" />}
                color="text-[#B12B89] dark:text-blue-400"
                bg="bg-blue-50 dark:bg-blue-900/20"
                loading={statsLoading}
              />
              <StatCard
                label={t("stat_total_out")}
                value={`${formatMAD(stats?.totalSorties)} MAD`}
                icon={<TrendingDown className="h-5 w-5" />}
                color="text-red-500"
                bg="bg-red-50 dark:bg-red-900/20"
                loading={statsLoading}
              />
              <StatCard
                label={t("stat_total_transfer")}
                value={`${formatMAD(stats?.totalTransfers)} MAD`}
                icon={<ArrowLeftRight className="h-5 w-5" />}
                color="text-violet-600 dark:text-violet-400"
                bg="bg-violet-50 dark:bg-violet-900/20"
                loading={statsLoading}
              />
            </div>

            <FiltersBar
              filters={filtersConfig}
              cols={{ xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(2, 1fr)" }}
              hasActiveFilters={hasActiveFilters}
              onReset={handleReset}
              t={t}
            />

            <ReusableTable
              data={transactions}
              columns={columns}
              totalRows={totalRows}
              pagination={pagination}
              paginationMeta={paginationMeta}
              setPagination={setPagination}
              isLoading={isLoading}
              isFetching={isFetching}
              isError={isError}
              tableId="my-wallet-transactions"
              enableRowActions={false}
            />
          </>
        )}
      </div>

      <CreateMyCaisseModal
        isOpen={showCreateMyCaisse}
        onClose={() => setShowCreateMyCaisse(false)}
      />
      <ChargeModal isOpen={showCharge} onClose={() => setShowCharge(false)} />
      <WalletTransferModal
        isOpen={showWalletTransfer}
        onClose={() => setShowWalletTransfer(false)}
      />
    </>
  );
};

const StatCard = ({ label, value, icon, color, bg, loading }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:border-[#2e2e2e] dark:bg-[#1c1c1c]">
    <div className="mb-2.5 flex items-center justify-between">
      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bg} ${color}`}>
        {icon}
      </div>
    </div>
    {loading ? (
      <div className="h-7 w-36 animate-pulse rounded-lg bg-slate-100 dark:bg-[#222222]" />
    ) : (
      <p className={`text-[22px] font-bold tracking-[-0.01em] ${color}`}>{value}</p>
    )}
  </div>
);
