import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "@/shared/utils/toast";
import { Clock, Play, Square, Eye } from "lucide-react";
import dayjs from "dayjs";
import { useAuth } from "@/features/auth";
import {
  useDeliveryShifts,
  useMyActiveShift,
  useStartShift,
  useCloseShift,
} from "../hooks/useShifts";
import { ReusableTable } from "../../../../shared/components/ReusableTable";
import { HeaderTable } from "../../../../shared/components/HeaderTable";
import { FiltersBar } from "../../../../shared/components/FiltersBar";
import { ConfirmationModal } from "../../../../shared/components/ConfirmationModal";
import { PERMISSIONS, hasPermission } from "@/shared/utils/permissions";

const formatMAD = (val) =>
  Number(val ?? 0).toLocaleString("fr-MA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDateTime = (val) =>
  val ? dayjs(val).format("DD/MM/YYYY HH:mm") : "—";

export const DeliveryShiftsPage = () => {
  const { t } = useTranslation("shifts");
  const navigate = useNavigate();
  const { user } = useAuth();
  const isLivreur = user?.role === "Livreur";
  const canManage = hasPermission(user, PERMISSIONS.MANAGE_DELIVERY_SHIFTS);

  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState(null);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [closeConfirm, setCloseConfirm] = useState(null);

  const { data: activeData } = useMyActiveShift(canManage && isLivreur);
  const activeShift = activeData?.data?.shift;

  const { data, isLoading, isFetching, isError } = useDeliveryShifts({
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
    status: statusFilter?.value,
    search: globalFilter,
  });

  const startMutation = useStartShift();
  const closeMutation = useCloseShift();

  const tableData = data?.data ?? [];
  const paginationMeta = data?.pagination
    ? {
        currentPage: data.pagination.page,
        limit: data.pagination.limit,
        numberOfPages: data.pagination.totalPages,
      }
    : null;
  const totalRows = data?.pagination?.total ?? 0;

  const resetPage = useCallback(
    () => setPagination((p) => ({ ...p, pageIndex: 0 })),
    [],
  );

  const handleStart = async () => {
    try {
      await startMutation.mutateAsync();
      toast.success(t("toast.started"));
    } catch (err) {
      toast.error(err?.response?.data?.message || t("toast.start_error"));
    }
  };

  const handleClose = async () => {
    if (!closeConfirm) return;
    try {
      const res = await closeMutation.mutateAsync(closeConfirm.id);
      toast.success(t("toast.closed"));
      setCloseConfirm(null);
      navigate(`/delivery-shifts/${res.data.id}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || t("toast.close_error"));
    }
  };

  const columns = useMemo(
    () => [
      { accessorKey: "id", header: t("table.id"), size: 60 },
      {
        id: "livreur",
        header: t("table.livreur"),
        Cell: ({ row }) =>
          row.original.user?.name || row.original.delivery?.name || "—",
      },
      {
        accessorKey: "status",
        header: t("table.status"),
        Cell: ({ cell }) => {
          const status = cell.getValue();
          const open = status === "OPEN";
          return (
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                open
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {open ? t("status.open") : t("status.closed")}
            </span>
          );
        },
      },
      {
        accessorKey: "startedAt",
        header: t("table.started"),
        Cell: ({ cell }) => formatDateTime(cell.getValue()),
      },
      {
        accessorKey: "closedAt",
        header: t("table.closed"),
        Cell: ({ cell }) => formatDateTime(cell.getValue()),
      },
      {
        id: "orders",
        header: t("table.orders"),
        Cell: ({ row }) =>
          row.original.totalOrders || row.original._count?.orders || 0,
      },
      {
        accessorKey: "totalCollected",
        header: t("table.collected"),
        Cell: ({ cell }) => `${formatMAD(cell.getValue())} MAD`,
      },
      {
        id: "remitted",
        header: t("table.remitted"),
        Cell: ({ row }) => {
          const { remittedAmount, remittanceCompletedAt } = row.original;
          if (remittedAmount == null) return "—";
          if (!remittanceCompletedAt) {
            return (
              <span className="text-amber-600 dark:text-amber-400">
                {formatMAD(remittedAmount)} MAD ({t("status.pending")})
              </span>
            );
          }
          return `${formatMAD(remittedAmount)} MAD`;
        },
      },
    ],
    [t],
  );

  const filters = useMemo(
    () => [
      {
        type: "select",
        id: "status",
        label: t("filters.status"),
        value: statusFilter,
        onChange: (v) => {
          setStatusFilter(v);
          resetPage();
        },
        options: [
          { value: "OPEN", label: t("status.open") },
          { value: "CLOSED", label: t("status.closed") },
        ],
      },
    ],
    [t, statusFilter, resetPage],
  );

  return (
    <div className="p-4 md:p-8 min-h-screen transition-colors duration-300 space-y-4">
      {isLivreur && canManage && (
        <div
          className={`rounded-xl border p-4 ${
            activeShift
              ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40"
              : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <Clock
                className={`mt-0.5 h-5 w-5 ${
                  activeShift ? "text-emerald-600" : "text-amber-600"
                }`}
              />
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {activeShift
                    ? t("banner.active_title")
                    : t("banner.inactive_title")}
                </p>
                <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                  {activeShift
                    ? t("banner.active_desc", {
                        since: formatDateTime(activeShift.startedAt),
                      })
                    : t("banner.inactive_desc")}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {activeShift ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/delivery-shifts/${activeShift.id}`)
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {t("actions.view")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCloseConfirm(activeShift)}
                    disabled={closeMutation.isPending}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
                  >
                    <Square className="h-3.5 w-3.5" />
                    {t("actions.close")}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={startMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  <Play className="h-3.5 w-3.5" />
                  {t("actions.start")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <HeaderTable
        title={t("title")}
        count={totalRows}
        actions={
          isLivreur && canManage && !activeShift ? (
            <button
              type="button"
              onClick={handleStart}
              disabled={startMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <Play className="h-3.5 w-3.5" />
              {t("actions.start")}
            </button>
          ) : null
        }
      />

      <FiltersBar
        filters={filters}
        hasActiveFilters={!!statusFilter}
        onReset={() => {
          setStatusFilter(null);
          resetPage();
        }}
        t={t}
      />

      <ReusableTable
        data={tableData}
        columns={columns}
        totalRows={totalRows}
        pagination={pagination}
        paginationMeta={paginationMeta}
        paginationResults={data?.results}
        setPagination={setPagination}
        globalFilter={globalFilter}
        setGlobalFilter={(v) => {
          setGlobalFilter(v);
          resetPage();
        }}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        onShow={(row) => navigate(`/delivery-shifts/${row.id}`)}
        tableId="delivery-shifts-table"
      />

      <ConfirmationModal
        isOpen={!!closeConfirm}
        onClose={() => setCloseConfirm(null)}
        onConfirm={handleClose}
        title={t("confirm.close_title")}
        message={t("confirm.close_message")}
        confirmText={t("actions.close")}
        cancelText={t("actions.cancel")}
        isLoading={closeMutation.isPending}
      />
    </div>
  );
};
