import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "@/shared/utils/toast";
import {
  CheckCircle2,
  Calendar,
  Building2,
  Printer,
  Package,
  Hash,
} from "lucide-react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import {
  useBonReceptions,
  useDeleteBonReception,
  useValidateBonReception,
  useBRFournisseurs,
  usePrintBonReception,
} from "../hooks/useBonReceptions";
import { useOperatingHours } from "@/shared/hooks/useOperatingHours";
import { ReusableTable } from "../../../shared/components/ReusableTable";
import { FiltersBar } from "../../../shared/components/FiltersBar";
import { HeaderTable } from "../../../shared/components/HeaderTable";
import { ConfirmationModal } from "../../../shared/components/ConfirmationModal";

/* ─────── StatusBadge ─────── */
const StatusBadge = ({ status, t }) => {
  const config = {
    DRAFT: {
      label: t("status_badge.draft"),
      className: "bg-slate-500",
    },
    COMPLETED: {
      label: t("status_badge.completed"),
      className: "bg-emerald-500",
    },
  };

  const { label, className } = config[status] ?? {
    label: status,
    className: "bg-slate-400",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[13px] text-white ${className}`}
    >
      {label}
    </span>
  );
};

/* ─────── BonReceptionsPage ─────── */
export const BonReceptionsPage = () => {
  const { t } = useTranslation("bonReception");
  const navigate = useNavigate();

  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const [openConfirm, setOpenConfirm] = useState(false);
  const [openValidateConfirm, setOpenValidateConfirm] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [rowToValidate, setRowToValidate] = useState(null);

  const [statusFilter, setStatusFilter] = useState(null);
  const [selectedFrs, setSelectedFrs] = useState(null);

  const { startHour, endHour } = useOperatingHours();
  const defaultStart = startHour != null
    ? dayjs().startOf("month").hour(startHour).minute(0).second(0).millisecond(0)
    : dayjs().startOf("month");
  const defaultEnd = endHour != null
    ? dayjs().endOf("month").hour(endHour).minute(0).second(0).millisecond(0)
    : dayjs().endOf("month");
  const [startDateTime, setStartDateTime] = useState(defaultStart);
  const [endDateTime, setEndDateTime] = useState(defaultEnd);

  const _hoursApplied = useRef(false);
  useEffect(() => {
    if (_hoursApplied.current || (startHour == null && endHour == null)) return;
    _hoursApplied.current = true;
    if (startHour != null) setStartDateTime((d) => d.hour(startHour).minute(0).second(0).millisecond(0));
    if (endHour != null) setEndDateTime((d) => d.hour(endHour).minute(0).second(0).millisecond(0));
  }, [startHour, endHour]);

  const apiStartDate = startDateTime?.isValid() ? startDateTime.format("YYYY-MM-DDTHH:mm:ss") : undefined;
  const apiEndDate = endDateTime?.isValid() ? endDateTime.format("YYYY-MM-DDTHH:mm:ss") : undefined;

  useEffect(() => {
    console.log("[BonReceptionsPage] Time filter changed:", {
      startDateTime: startDateTime?.format("DD/MM/YYYY HH:mm:ss") ?? null,
      endDateTime: endDateTime?.format("DD/MM/YYYY HH:mm:ss") ?? null,
      apiStartDate: apiStartDate ?? null,
      apiEndDate: apiEndDate ?? null,
    });
  }, [apiStartDate, apiEndDate]);

  const { data: frsData, isLoading: frsLoading } = useBRFournisseurs({});

  const { data, isLoading, isFetching, isError } = useBonReceptions({
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
    search: globalFilter,
    startDate: apiStartDate,
    endDate: apiEndDate,
    frsId: selectedFrs?.id,
    status: statusFilter?.value,
  });

  const deleteMutation = useDeleteBonReception();
  const validateMutation = useValidateBonReception();
  const printMutation = usePrintBonReception();

  /* API response shape: { success, results, pagination, data: [...] } */
  const tableData = data?.data ?? [];
  const paginationMeta = data?.pagination;
  const totalRows = paginationMeta ? paginationMeta.totalPages * paginationMeta.limit : 0;

  const frsOptions = frsData?.data ?? [];

  const datesAreDefault = startDateTime?.isSame(defaultStart) && endDateTime?.isSame(defaultEnd);
  const hasActiveFilters = !!(statusFilter || selectedFrs || !datesAreDefault || globalFilter);

  const resetPage = useCallback(() => setPagination((p) => ({ ...p, pageIndex: 0 })), []);

  const handleReset = useCallback(() => {
    setStatusFilter(null);
    setSelectedFrs(null);
    setStartDateTime(defaultStart);
    setEndDateTime(defaultEnd);
    setGlobalFilter("");
    resetPage();
  }, [resetPage]);

  const handleDeleteClick = (row) => { setSelectedRow(row); setOpenConfirm(true); };

  const confirmDelete = () => {
    if (!selectedRow) return;
    deleteMutation.mutate(selectedRow.id, {
      onSuccess: (res) => {
        toast.success(res?.message || t("toast.delete_success"));
        setOpenConfirm(false);
        setSelectedRow(null);
      },
      onError: (err) => {
        setOpenConfirm(false);
        toast.error(err?.response?.data?.message || t("toast.delete_error"));
      },
    });
  };

  const confirmValidation = () => {
    if (!rowToValidate) return;
    validateMutation.mutate(
      { id: rowToValidate.id, targetStatus: rowToValidate.targetStatus },
      {
        onSuccess: () => {
          toast.success(
            rowToValidate.targetStatus === "COMPLETED"
              ? t("toast.validate_success_completed")
              : t("toast.validate_success_draft")
          );
          setOpenValidateConfirm(false);
          setRowToValidate(null);
        },
        onError: (err) => {
          toast.error(err?.response?.data?.message || t("toast.validate_error"));
          setOpenValidateConfirm(false);
        },
      }
    );
  };

  /* row.status is flat (not row.document.status) */
  const handleToggleStatus = (row) => {
    const targetStatus = row.status === "DRAFT" ? "COMPLETED" : "DRAFT";
    setRowToValidate({ ...row, targetStatus });
    setOpenValidateConfirm(true);
  };

  const handlePrintPDF = (row) => {
    printMutation.mutate(
      { id: row.id, view: false },
      {
        onSuccess: () => toast.success(t("toast.print_success")),
        onError: (err) => toast.error(err?.response?.data?.message || t("toast.print_error")),
      }
    );
  };

  const fmt = (n) =>
    Number(n ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const columns = useMemo(() => [
    {
      id: "id",
      header: t("br_number"),
      Cell: ({ row }) => (
        <Link
          to={`/bon-receptions/${row.original.id}/preview`}
          className="text-[#B12B89] hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          #{row.original.id}
        </Link>
      ),
    },
    {
      accessorKey: "documentReference",
      header: t("document_reference"),
      Cell: ({ row }) => (
        <span>{row.original.documentReference || "—"}</span>
      ),
    },
    {
      accessorKey: "dateReception",
      header: t("reception_date"),
      Cell: ({ row }) => (
        <span>{row.original.dateReception || "—"}</span>
      ),
    },
    {
      id: "documentNumber",
      header: t("reference_br"),
      Cell: ({ row }) => (
        <span>{row.original.documentNumber || "—"}</span>
      ),
    },
    {
      accessorKey: "status",
      header: t("status"),
      Cell: ({ row }) => (
        <button
          type="button"
          onClick={() => handleToggleStatus(row.original)}
          className="cursor-pointer"
        >
          <StatusBadge status={row.original.status} t={t} />
        </button>
      ),
    },
    {
      id: "financials",
      header: t("amounts"),
      Cell: ({ row }) => (
        <span className="tabular-nums">{fmt(row.original.totalTTC)} MAD</span>
      ),
    },
    {
      id: "print",
      header: t("print"),
      enableSorting: false,
      Cell: ({ row }) => (
        <button
          onClick={() => handlePrintPDF(row.original)}
          disabled={printMutation.isPending}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Printer className="w-3.5 h-3.5" />
          {printMutation.isPending ? "..." : t("print_button")}
        </button>
      ),
    },
  ], [t, printMutation.isPending]);

  return (
    <div className="p-4 md:p-8 min-h-screen transition-colors duration-300">
      <HeaderTable
        title={t("title")}
        onCreate={() => navigate("/bon-receptions/create")}
      />

      <FiltersBar
        cols={{ xs: "1fr", sm: "repeat(3, 1fr)" }}
        searchValue={globalFilter}
        onSearchChange={(v) => { setGlobalFilter(v); resetPage(); }}
        filters={[
          {
            type: "select",
            id: "status",
            label: t("status_filter"),
            icon: CheckCircle2,
            options: [
              { value: "DRAFT", label: t("draft") },
              { value: "COMPLETED", label: t("completed") },
            ],
            value: statusFilter,
            onChange: (v) => { setStatusFilter(v); resetPage(); },
          },
          {
            type: "async-select",
            id: "fournisseur",
            label: t("supplier"),
            icon: Building2,
            options: frsOptions,
            value: selectedFrs,
            onChange: (v) => { setSelectedFrs(v); resetPage(); },
            loading: frsLoading,
            getOptionLabel: (o) => o?.name ?? "",
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
            onEndChange: (v) => { setEndDateTime(v); resetPage(); },
            startLabel: t("start_date"),
            endLabel: t("end_date"),
          },
        ]}
        hasActiveFilters={hasActiveFilters}
        onReset={handleReset}
        t={t}
      />

      <ReusableTable
        data={tableData}
        columns={columns}
        totalRows={totalRows}
        pagination={pagination}
        paginationMeta={paginationMeta}
        setPagination={setPagination}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        onEdit={(row) => navigate(`/bon-receptions/${row.id}/edit`)}
        enableRowActions={true}
        onDelete={handleDeleteClick}
        tableId="bon-receptions-table"
      />

      <ConfirmationModal
        isOpen={openConfirm}
        onClose={() => setOpenConfirm(false)}
        onConfirm={confirmDelete}
        title={t("delete_modal.title")}
        message={t("delete_modal.message", { documentNumber: selectedRow?.documentReference ?? `#${selectedRow?.id}` })}
        confirmText={t("delete_modal.confirm")}
        cancelText={t("delete_modal.cancel")}
        variant="danger"
        isLoading={deleteMutation.isPending}
      />

      <ConfirmationModal
        isOpen={openValidateConfirm}
        onClose={() => { setOpenValidateConfirm(false); setRowToValidate(null); }}
        onConfirm={confirmValidation}
        title={
          rowToValidate?.targetStatus === "COMPLETED"
            ? t("validate_modal.title_complete")
            : t("validate_modal.title_revert")
        }
        message={
          rowToValidate?.targetStatus === "COMPLETED"
            ? t("validate_modal.message_complete", { documentNumber: rowToValidate?.documentReference ?? `#${rowToValidate?.id}` })
            : t("validate_modal.message_revert", { documentNumber: rowToValidate?.documentReference ?? `#${rowToValidate?.id}` })
        }
        confirmText={
          rowToValidate?.targetStatus === "COMPLETED"
            ? t("validate_modal.confirm_complete")
            : t("validate_modal.confirm_revert")
        }
        cancelText={t("validate_modal.cancel")}
        variant="primary"
        isLoading={validateMutation.isPending}
      />
    </div>
  );
};
