import { AiOutlineArrowRight } from "react-icons/ai"; 
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import {
  Landmark,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PlusCircle,
  MinusCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  Users,
  Shield,
  ArrowLeftRight,
  ArrowRight,
  Wallet,
} from "lucide-react";
import { useAuth } from "../../auth/hooks/useAuth";
import { useOperatingHours } from "@/shared/hooks/useOperatingHours";
import { useAllCaisseTransactions, useMyCaisse } from "../hooks/useCaisse";
import { useUsers, useUsersBySociete } from "../../users/hooks/useUsers";
import { ReusableTable } from "../../../shared/components/ReusableTable";
import { FiltersBar } from "../../../shared/components/FiltersBar";
import { HeaderTable } from "../../../shared/components/HeaderTable";
import { CreateCaisseModal } from "../components/CreateCaisseModal";
import { CreateMyCaisseModal } from "../components/CreateMyCaisseModal";
import { ChargeModal } from "../components/ChargeModal";
import { TransferModal } from "../components/TransferModal";
import { WalletTransferModal } from "../components/WalletTransferModal";
import { STATIC_ROLES } from "../../settings/permissions/api/permissions.api";
import { Button } from "@headlessui/react";

const formatMAD = (val) =>
  Number(val ?? 0).toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ENCAISSEMENT_TYPES = ["INITIAL_BALANCE", "TRANSFER_IN", "INCOME"];

export const GestionCaissePage = () => {
  const { t } = useTranslation("caisse");
  const { user } = useAuth();
  const isSuperAdmin = !!user?.isSuperAdmin;
  const isSocieteAdmin = user?.role === "Societe_Admin";
  const isAdmin = isSuperAdmin || isSocieteAdmin;
  // Filter state (option objects for FiltersBar, primitives for API)
  const { startHour, endHour } = useOperatingHours();
  const defaultStart = startHour != null
    ? dayjs().startOf("month").hour(startHour).minute(0).second(0).millisecond(0)
    : dayjs().startOf("month");
  const defaultEnd = endHour != null
    ? dayjs().endOf("month").hour(endHour).minute(0).second(0).millisecond(0)
    : dayjs().endOf("month");

  const [typeFilter, setTypeFilter] = useState(null);
  const [userFilter, setUserFilter] = useState(null);
  const [roleFilter, setRoleFilter] = useState(null);
  const [startDateTime, setStartDateTime] = useState(defaultStart);
  const [endDateTime, setEndDateTime] = useState(defaultEnd);

  const _hoursApplied = useRef(false);
  useEffect(() => {
    if (_hoursApplied.current || (startHour == null && endHour == null)) return;
    _hoursApplied.current = true;
    if (startHour != null) setStartDateTime((d) => d.hour(startHour).minute(0).second(0).millisecond(0));
    if (endHour != null) setEndDateTime((d) => d.hour(endHour).minute(0).second(0).millisecond(0));
  }, [startHour, endHour]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });

  // Own caisse check
  const { data: myCaisseData, isLoading: myCaisseLoading } = useMyCaisse();
  const hasMyCaisse = !!myCaisseData?.data;

  // Modals
  const [showCreateCaisse, setShowCreateCaisse] = useState(false);
  const [showCreateMyCaisse, setShowCreateMyCaisse] = useState(false);
  const [showCharge, setShowCharge] = useState(false);
  const [transferMode, setTransferMode] = useState(null);
  const [showWalletTransfer, setShowWalletTransfer] = useState(false);

  const resetPage = useCallback(() => setPagination((p) => ({ ...p, pageIndex: 0 })), []);

  const apiDateFrom = startDateTime?.isValid() ? startDateTime.format("YYYY-MM-DDTHH:mm:ss") : undefined;
  const apiDateTo = endDateTime?.isValid() ? endDateTime.format("YYYY-MM-DDTHH:mm:ss") : undefined;

  useEffect(() => {
    console.log("[GestionCaissePage] Time filter changed:", {
      startDateTime: startDateTime?.format("DD/MM/YYYY HH:mm:ss") ?? null,
      endDateTime: endDateTime?.format("DD/MM/YYYY HH:mm:ss") ?? null,
      apiDateFrom: apiDateFrom ?? null,
      apiDateTo: apiDateTo ?? null,
    });
  }, [apiDateFrom, apiDateTo]);

  const { data, isLoading, isFetching, isError } = useAllCaisseTransactions({
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
    direction: typeFilter?.value || undefined,
    dateFrom: apiDateFrom,
    dateTo: apiDateTo,
    userId: userFilter?.id || undefined,
    roleId: roleFilter?.value || undefined,
  });

  const transactions = data?.data ?? [];
  const summary = data?.summary;
  const paginationMeta = data?.pagination;
  const totalRows = paginationMeta?.total ?? 0;

  // Users for filter dropdown (scoped by société, narrowed by selected role)
  const { data: allUsersData } = useUsers({ pageIndex: 0, pageSize: 200, keyword: "" });
  const { data: societeUsersData } = useUsersBySociete(user?.societeId);
  const usersForFilter = useMemo(() => {
    const list = isSuperAdmin ? allUsersData?.data ?? [] : societeUsersData?.data ?? [];
    if (!roleFilter?.value) return list;
    return list.filter((u) => Number(u.roleId) === Number(roleFilter.value));
  }, [isSuperAdmin, allUsersData, societeUsersData, roleFilter]);

  const datesAreDefault = startDateTime?.isSame(defaultStart) && endDateTime?.isSame(defaultEnd);
  const hasActiveFilters = !!(typeFilter || userFilter || roleFilter || !datesAreDefault);

  const handleReset = useCallback(() => {
    setTypeFilter(null);
    setUserFilter(null);
    setRoleFilter(null);
    setStartDateTime(defaultStart);
    setEndDateTime(defaultEnd);
    resetPage();
  }, [resetPage]);

  // Type filter options
  const typeOptions = useMemo(() => [
    { value: "in", label: t("type_encaissement") },
    { value: "out", label: t("type_decaissement") },
  ], [t]);

  // Role filter options (Super Admin = roleId 1, not in STATIC_ROLES)
  const roleOptions = useMemo(() => [
    { value: 1, label: "Super Admin" },
    ...STATIC_ROLES.map((r) => ({ value: r.id, label: r.name.replace("_", " ") })),
  ], []);

  const filtersConfig = useMemo(() => {
    const base = [
      {
        type: "select",
        id: "type",
        label: t("filter_type"),
        icon: ArrowLeftRight,
        options: typeOptions,
        value: typeFilter,
        onChange: (v) => { setTypeFilter(v); resetPage(); },
      },
    ];

    if (isAdmin) {
      base.push(
        {
          type: "async-select",
          id: "user",
          label: t("filter_user"),
          icon: Users,
          options: usersForFilter.map((u) => ({ ...u, label: u.name })),
          value: userFilter,
          onChange: (v) => { setUserFilter(v?.id === null ? null : v); resetPage(); },
          allLabel: t("filter_all_users"),
          getOptionLabel: (o) => o?.label ?? o?.name ?? "",
        },
        {
          type: "select",
          id: "role",
          label: t("filter_role"),
          icon: Shield,
          options: roleOptions,
          value: roleFilter,
          onChange: (v) => {
            setRoleFilter(v);
            // Drop the selected user if it no longer belongs to the chosen role
            if (v?.value && userFilter && Number(userFilter.roleId) !== Number(v.value)) {
              setUserFilter(null);
            }
            resetPage();
          },
        }
      );
    }

    base.push({
      type: "date-range",
      id: "dateRange",
      startDateTime,
      endDateTime,
      onStartChange: (v) => {
        setStartDateTime(v);
        if (v && endDateTime && v.isAfter(endDateTime)) setEndDateTime(null);
        resetPage();
      },
      onEndChange: (v) => { setEndDateTime(v); resetPage(); },
      startLabel: t("filter_date_from"),
      endLabel: t("filter_date_to"),
    });

    return base;
  }, [t, typeOptions, roleOptions, typeFilter, userFilter, roleFilter, startDateTime, endDateTime, isAdmin, usersForFilter, resetPage]);

  const columns = useMemo(() => [
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
              {d.toLocaleTimeString("fr-MA", { hour: "2-digit", minute: "2-digit" })}
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
        const isEnc = ENCAISSEMENT_TYPES.includes(cell.getValue());
        return (
          <span
            className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wide ${
              isEnc
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800"
                : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
            }`}
          >
            {isEnc ? t("type_label_encaissement") : t("type_label_decaissement")}
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
        else if (tx.transactionType === "CHARGE") label = tx.label?.name || t("libelle_charge");
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
        return <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>;
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
          <span className={`font-mono text-sm font-bold ${isPos ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
            {isPos ? "+" : ""}{formatMAD(Math.abs(val))} <span className="text-[10px] ml-0.5 opacity-70">MAD</span>
          </span>
        );
      },
    },
    {
      id: "utilisateur",
      header: t("col_user"),
      Cell: ({ row }) => (
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {row.original.caisse?.user?.name || row.original.caisse?.name || "—"}
        </span>
      ),
    },
    {
      accessorKey: "newBalance",
      header: t("col_balance"),
      size: 130,
      Cell: ({ cell }) => (
        <span className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300">
          {formatMAD(cell.getValue())} <span className="text-[10px] ml-0.5 opacity-70">MAD</span>
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
  ], [t]);

  return (
    <>
      <div className="p-4 md:p-8 min-h-screen transition-colors duration-300">
        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
          <HeaderTable
            title={t("page_title")}
            icon={<Landmark className="w-5 h-5 text-[#B12B89]" />}
          />
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {isAdmin && (
              <ActionBtn
                label={t("btn_create_caisse")}
                icon={<PlusCircle className="w-4 h-4" />}
                cls={PRIMARY_BTN}
                onClick={() => setShowCreateCaisse(true)}
              />
            )}
            <ActionBtn
              label={t("btn_create_charge")}
              icon={<MinusCircle className="w-4 h-4 text-red-500" />}
              cls={SECONDARY_BTN}
              onClick={() => setShowCharge(true)}
            />
            {isAdmin && (
              <>
                <ActionBtn
                  label={t("btn_transfer")}
                  icon={<ArrowLeftRight className="w-4 h-4 text-violet-500" />}
                  cls={SECONDARY_BTN}
                  onClick={() => setShowWalletTransfer(true)}
                />
                <ActionBtn
                  label={t("btn_retrait")}
                  icon={<ArrowDownCircle className="w-4 h-4 text-amber-500" />}
                  cls={SECONDARY_BTN}
                  onClick={() => setTransferMode("retrait")}
                />
                <ActionBtn
                  label={t("btn_depot")}
                  icon={<ArrowUpCircle className="w-4 h-4 text-emerald-500" />}
                  cls={SECONDARY_BTN}
                  onClick={() => setTransferMode("depot")}
                />
              </>
            )}
          </div>
        </div>

        {/* ── No-caisse banner ─────────────────────────────────────── */}
        {!myCaisseLoading && !hasMyCaisse && isAdmin && (
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
              onClick={() => setShowCreateMyCaisse(true)}
              className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-[13px] font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4" />
              {t("btn_create_my_caisse")}
            </button>
          </div>
        )}

        {/* ── Stats cards ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <StatCard
            label={t("stat_final_balance")}
            value={`${formatMAD(summary?.soldeFinal)} MAD`}
            icon={<DollarSign className="w-5 h-5" />}
            color="text-emerald-600 dark:text-emerald-400"
            bg="bg-emerald-50 dark:bg-emerald-900/20"
            loading={isLoading}
          />
          {userFilter && (
            <>
              <StatCard
                label={t("stat_total_in")}
                value={`${formatMAD(summary?.totalEncaissements)} MAD`}
                icon={<TrendingUp className="w-5 h-5" />}
                color="text-[#B12B89] dark:text-blue-400"
                bg="bg-blue-50 dark:bg-blue-900/20"
                loading={isLoading}
              />
              <StatCard
                label={t("stat_total_out")}
                value={`${formatMAD(summary?.totalDecaissements)} MAD`}
                icon={<TrendingDown className="w-5 h-5" />}
                color="text-red-500"
                bg="bg-red-50 dark:bg-red-900/20"
                loading={isLoading}
              />
            </>
          )}
        </div>

        {/* ── Filters (FiltersBar — same pattern as ReglementFournisseur) ── */}
        <FiltersBar
          filters={filtersConfig}
          cols={{ xs: "1fr", sm: "repeat(2, 1fr)", md: `repeat(${filtersConfig.length}, 1fr)` }}
          hasActiveFilters={hasActiveFilters}
          onReset={handleReset}
          t={t}
        />

        {/* ── Transactions table ───────────────────────────────────── */}
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
          tableId="gestion-caisse-transactions"
          enableRowActions={false}
        />
      </div>

      {/* ── Modals ───────────────────────────────────────────────── */}
      <CreateMyCaisseModal isOpen={showCreateMyCaisse} onClose={() => setShowCreateMyCaisse(false)} />
      <CreateCaisseModal isOpen={showCreateCaisse} onClose={() => setShowCreateCaisse(false)} />
      <ChargeModal isOpen={showCharge} onClose={() => setShowCharge(false)} />
      <TransferModal
        isOpen={!!transferMode}
        onClose={() => setTransferMode(null)}
        mode={transferMode ?? "retrait"}
      />
      <WalletTransferModal
        isOpen={showWalletTransfer}
        onClose={() => setShowWalletTransfer(false)}
      />
    </>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────────

const PRIMARY_BTN =
  "bg-[#B12B89] text-white hover:brightness-110 shadow-[0_1px_2px_rgba(16,24,40,0.06)]";

const SECONDARY_BTN =
  "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-transparent dark:text-slate-200 dark:hover:bg-slate-800";

const ActionBtn = ({ label, icon, cls, onClick }) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-all active:scale-[0.98] ${cls}`}
  >
    {icon}
    {label}
  </button>
);

const StatCard = ({ label, value, icon, color, bg, loading }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:border-slate-800 dark:bg-slate-900">
    <div className="mb-2.5 flex items-center justify-between">
      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bg} ${color}`}>{icon}</div>
    </div>
    {loading ? (
      <div className="h-7 w-36 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
    ) : (
      <p className={`text-[22px] font-bold tracking-[-0.01em] ${color}`}>{value}</p>
    )}
  </div>
);
