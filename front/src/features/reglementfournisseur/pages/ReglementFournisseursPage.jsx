import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/shared/utils/toast";
import { useTranslation } from "react-i18next";
import { CreditCard, Building2, Calendar, Printer } from "lucide-react";
import dayjs from "dayjs";

import {
  useReglementFournisseurs,
  useDeleteReglementFournisseur,
  useRFFournisseurs,
  usePrintReglementFournisseur,
} from "../hooks/useReglementFournisseur";
import { useOperatingHours } from "@/shared/hooks/useOperatingHours";
import { ReusableTable } from "../../../shared/components/ReusableTable";
import { FiltersBar } from "../../../shared/components/FiltersBar";
import { HeaderTable } from "../../../shared/components/HeaderTable";
import { ConfirmationModal } from "../../../shared/components/ConfirmationModal";

const fmt = (n) =>
  Number(n ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MODE_CONFIG = {
  ESPECE:         { color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800" },
  CHEQUE:         { color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800" },
  EFFET:          { color: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800" },
  CARTE_BANCAIRE: { color: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/20 dark:text-sky-300 dark:border-sky-800" },
  VIREMENT:       { color: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800" },
};

const ModeReglementBadge = ({ mode }) => {
  const { t } = useTranslation("reglementFournisseur");
  const config = MODE_CONFIG[mode] ?? { color: "bg-slate-50 text-slate-500 border-slate-200" };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wide ${config.color}`}>
      {t(`mode_${mode}`, mode)}
    </span>
  );
};

export const ReglementFournisseursPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation("reglementFournisseur");

  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [selectedFrs, setSelectedFrs] = useState(null);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

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
    console.log("[ReglementFournisseursPage] Time filter changed:", {
      startDateTime: startDateTime?.format("DD/MM/YYYY HH:mm:ss") ?? null,
      endDateTime: endDateTime?.format("DD/MM/YYYY HH:mm:ss") ?? null,
      apiStartDate: apiStartDate ?? null,
      apiEndDate: apiEndDate ?? null,
    });
  }, [apiStartDate, apiEndDate]);

  const { data: frsData, isLoading: frsLoading } = useRFFournisseurs({});
  const frsOptions = frsData?.data ?? [];

  const { data, isLoading, isFetching, isError } = useReglementFournisseurs({
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
    fournisseurId: selectedFrs?.id,
    startDate: apiStartDate,
    endDate: apiEndDate,
  });

  const deleteMutation = useDeleteReglementFournisseur();
  const printMutation = usePrintReglementFournisseur();

  const tableData = data?.data ?? [];
  const paginationMeta = data?.pagination;
  const results = data?.results;
  const totalRows = paginationMeta ? paginationMeta.numberOfPages * paginationMeta.limit : 0;

  const datesAreDefault = startDateTime?.isSame(defaultStart) && endDateTime?.isSame(defaultEnd);
  const hasActiveFilters = !!(selectedFrs || !datesAreDefault || globalFilter);

  const resetPage = useCallback(() => setPagination((p) => ({ ...p, pageIndex: 0 })), []);

  const handleReset = useCallback(() => {
    setSelectedFrs(null);
    setStartDateTime(defaultStart);
    setEndDateTime(defaultEnd);
    setGlobalFilter("");
    resetPage();
  }, [resetPage]);

  const handleDeleteClick = (row) => { setSelectedRow(row); setOpenConfirm(true); };

  const confirmDelete = () => {
    if (!selectedRow) return;
    deleteMutation.mutate(
      { id: selectedRow.id },
      {
        onSuccess: (res) => {
          toast.success(res?.message || t("delete_success"));
          setOpenConfirm(false);
          setSelectedRow(null);
        },
        onError: (err) => {
          setOpenConfirm(false);
          toast.error(err?.response?.data?.message || t("delete_error"));
        },
      }
    );
  };

  const handlePrint = (row) => {
    if (!row?.id) return;
    printMutation.mutate(row.id, {
      onError: (err) => toast.error(err?.response?.data?.message || t("print_error")),
    });
  };

  const columns = useMemo(() => [
    {
      id: "id",
      header: t("col_ref"),
      Cell: ({ row }) => (
        <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 dark:bg-[#222222] px-2 py-0.5 rounded">
          #{row.original.id}
        </span>
      ),
    },
    {
      accessorKey: "date",
      header: t("col_date"),
      Cell: ({ cell }) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-sm">{cell.getValue() || "—"}</span>
        </div>
      ),
    },
    {
      accessorKey: "fournisseur.name",
      header: t("col_fournisseur"),
      Cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {row.original.fournisseur?.name || "—"}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "modeReglement",
      header: t("col_mode"),
      Cell: ({ cell }) => <ModeReglementBadge mode={cell.getValue()} />,
    },
    {
      id: "documentNumbers",
      header: t("col_br_lies"),
      Cell: ({ row }) => {
        const docs = row.original.documentNumbers ?? [];
        return (
          <div className="flex flex-wrap gap-1">
            {docs.length > 0 ? docs.map((doc) => (
              <span key={doc} className="font-mono text-[10px] font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800">
                {doc}
              </span>
            )) : <span className="text-slate-400 text-xs">Avance</span>}
          </div>
        );
      },
    },
    {
      accessorKey: "montantRegle",
      header: t("col_montant_regle"),
      Cell: ({ cell }) => (
        <span className="font-mono text-sm font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-500/20">
          {fmt(cell.getValue())} <span className="text-[10px] ml-1 opacity-70">MAD</span>
        </span>
      ),
    },
    {
      accessorKey: "montantBR",
      header: t("col_montant_br"),
      Cell: ({ cell }) => (
        <span className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#222222] px-2 py-1 rounded-md border border-slate-200 dark:border-[#2e2e2e]">
          {fmt(cell.getValue())} <span className="text-[10px] ml-1 opacity-70">MAD</span>
        </span>
      ),
    },
    {
      accessorKey: "solde",
      header: t("col_solde"),
      Cell: ({ cell }) => {
        const v = Number(cell.getValue() ?? 0);
        return (
          <span className={`font-mono text-sm font-black px-2 py-1 rounded-md border shadow-sm ${v > 0
            ? "text-red-600 bg-red-50 border-red-100 dark:bg-red-500/10 dark:border-red-500/20"
            : "text-gray-400 bg-gray-50 border-gray-100 dark:bg-[#222222]/50 dark:border-[#2e2e2e] opacity-60"
          }`}>
            {fmt(v)} <span className="text-[10px] ml-1 uppercase opacity-70">MAD</span>
          </span>
        );
      },
    },
    {
      accessorKey: "refDocument",
      header: t("col_ref_doc"),
      Cell: ({ cell }) => (
        <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{cell.getValue() || "—"}</span>
      ),
    },
    {
      id: "actions",
      header: t("col_print"),
      Cell: ({ row }) => (
        <button
          type="button"
          onClick={() => handlePrint(row.original)}
          disabled={printMutation.isPending}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Printer className="w-3.5 h-3.5" />
          {printMutation.isPending ? "..." : t("btn_pdf")}
        </button>
      ),
    },
  ], [t]);

  return (
    <div className="p-4 md:p-8 min-h-screen transition-colors duration-300">
      <HeaderTable
        title={t("page_title")}
        onCreate={() => navigate("/reglements-fournisseur/create")}
        createLabel={t("create_new")}
      />

      <FiltersBar
        cols={{ xs: "1fr", sm: "repeat(2, 1fr)" }}
        filters={[
          {
            type: "async-select",
            id: "fournisseur",
            label: t("filter_fournisseur"),
            icon: Building2,
            options: frsOptions.map((f) => ({ ...f, label: f.name })),
            value: selectedFrs,
            onChange: (v) => { setSelectedFrs(v); resetPage(); },
            loading: frsLoading,
            getOptionLabel: (o) => o?.label ?? o?.name ?? "",
            allLabel: t("filter_all_fournisseurs"),
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
            startLabel: t("filter_start_date"),
            endLabel: t("filter_end_date"),
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
        paginationResults={results}
        setPagination={setPagination}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        enableRowActions={true}
        onDelete={handleDeleteClick}
        tableId="reglements-fournisseur-table"
      />

      <ConfirmationModal
        isOpen={openConfirm}
        onClose={() => setOpenConfirm(false)}
        onConfirm={confirmDelete}
        title={t("delete_title")}
        message={t("delete_message", { id: selectedRow?.id })}
        confirmText={t("btn_delete")}
        cancelText={t("btn_cancel")}
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
