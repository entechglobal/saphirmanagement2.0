import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "@/shared/utils/toast";
import { CheckCircle2, Printer } from "lucide-react";
import dayjs from "dayjs";
import {
  useBonRetourFournisseurs,
  useDeleteBonRetourFournisseur,
  useValidateBonRetourFournisseur,
  usePrintBonRetourFournisseur,
} from "../hooks/useBonRetourFournisseurs";
import { useOperatingHours } from "@/shared/hooks/useOperatingHours";
import { ReusableTable } from "../../../shared/components/ReusableTable";
import { FiltersBar } from "../../../shared/components/FiltersBar";
import { HeaderTable } from "../../../shared/components/HeaderTable";
import { ConfirmationModal } from "../../../shared/components/ConfirmationModal";

const StatusBadge = ({ status }) => {
  const config = {
    DRAFT: { label: "Brouillon", className: "bg-slate-500" },
    COMPLETED: { label: "Validé", className: "bg-emerald-500" },
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

const linkClass =
  "text-[#B12B89] hover:underline font-medium focus:outline-none";

export const BonRetourFournisseursPage = () => {
  const navigate = useNavigate();
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [openConfirm, setOpenConfirm] = useState(false);
  const [openValidateConfirm, setOpenValidateConfirm] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [rowToValidate, setRowToValidate] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);

  const { startHour, endHour } = useOperatingHours();
  const defaultStart =
    startHour != null
      ? dayjs().startOf("month").hour(startHour).minute(0).second(0).millisecond(0)
      : dayjs().startOf("month");
  const defaultEnd =
    endHour != null
      ? dayjs().endOf("month").hour(endHour).minute(0).second(0).millisecond(0)
      : dayjs().endOf("month");
  const [startDateTime, setStartDateTime] = useState(defaultStart);
  const [endDateTime, setEndDateTime] = useState(defaultEnd);
  const hoursApplied = useRef(false);

  useEffect(() => {
    if (hoursApplied.current || (startHour == null && endHour == null)) return;
    hoursApplied.current = true;
    if (startHour != null)
      setStartDateTime((d) => d.hour(startHour).minute(0).second(0).millisecond(0));
    if (endHour != null)
      setEndDateTime((d) => d.hour(endHour).minute(0).second(0).millisecond(0));
  }, [startHour, endHour]);

  const apiStartDate = startDateTime?.isValid()
    ? startDateTime.format("YYYY-MM-DDTHH:mm:ss")
    : undefined;
  const apiEndDate = endDateTime?.isValid()
    ? endDateTime.format("YYYY-MM-DDTHH:mm:ss")
    : undefined;

  const resetPage = useCallback(
    () => setPagination((p) => ({ ...p, pageIndex: 0 })),
    [],
  );

  const { data, isLoading, isFetching, isError } = useBonRetourFournisseurs({
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
    keyword: globalFilter,
    startDate: apiStartDate,
    endDate: apiEndDate,
    status: statusFilter?.value,
  });

  const deleteMutation = useDeleteBonRetourFournisseur();
  const validateMutation = useValidateBonRetourFournisseur();
  const printMutation = usePrintBonRetourFournisseur();

  const rows = data?.data ?? [];
  const paginationMeta = data?.pagination;
  const totalRows = paginationMeta?.total ?? 0;

  const columns = useMemo(
    () => [
      {
        accessorKey: "documentNumber",
        header: "N°",
        Cell: ({ row }) => (
          <Link
            to={`/bon-retour-fournisseurs/${row.original.id}/preview`}
            className={linkClass}
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.documentNumber}
          </Link>
        ),
      },
      {
        accessorKey: "documentDate",
        header: "Date",
        Cell: ({ row }) => <span>{row.original.documentDate || "—"}</span>,
      },
      {
        id: "fournisseur",
        header: "Fournisseur",
        Cell: ({ row }) => (
          <span>{row.original.fournisseurName || row.original.clientName || "—"}</span>
        ),
      },
      {
        id: "depot",
        header: "Dépôt",
        Cell: ({ row }) => <span>{row.original.depot?.name || "—"}</span>,
      },
      {
        id: "status",
        header: "Statut",
        Cell: ({ row }) => (
          <button
            type="button"
            onClick={() => {
              setRowToValidate(row.original);
              setOpenValidateConfirm(true);
            }}
            className="cursor-pointer"
          >
            <StatusBadge status={row.original.status} />
          </button>
        ),
      },
      {
        id: "totalTTC",
        header: "Total TTC",
        Cell: ({ row }) => (
          <span className="tabular-nums">
            {Number(row.original.totalTTC || 0).toLocaleString("fr-MA", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            DH
          </span>
        ),
      },
      {
        id: "print",
        header: "Imprimer",
        enableSorting: false,
        Cell: ({ row }) => (
          <button
            type="button"
            onClick={() => printMutation.mutate({ id: row.original.id })}
            disabled={printMutation.isPending}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-xs font-semibold transition disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" />
            PDF
          </button>
        ),
      },
    ],
    [printMutation.isPending],
  );

  const filters = useMemo(
    () => [
      {
        type: "select",
        id: "status",
        label: "Statut",
        icon: CheckCircle2,
        options: [
          { value: "DRAFT", label: "Brouillon" },
          { value: "COMPLETED", label: "Validé" },
        ],
        value: statusFilter,
        onChange: (v) => {
          setStatusFilter(v);
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
          resetPage();
        },
        onEndChange: (v) => {
          setEndDateTime(v);
          resetPage();
        },
        startLabel: "Date début",
        endLabel: "Date fin",
      },
    ],
    [statusFilter, startDateTime, endDateTime, resetPage],
  );

  return (
    <div className="space-y-4">
      <HeaderTable
        title="Bons de retour fournisseur"
        onCreate={() => navigate("/bon-retour-fournisseurs/create")}
        createLabel="Nouveau retour fournisseur"
      />

      <FiltersBar
        cols={{ xs: "1fr", sm: "repeat(2, 1fr)" }}
        filters={filters}
        hasActiveFilters={!!(statusFilter || globalFilter)}
        onReset={() => {
          setStatusFilter(null);
          setGlobalFilter("");
          setStartDateTime(defaultStart);
          setEndDateTime(defaultEnd);
          resetPage();
        }}
        searchValue={globalFilter}
        onSearchChange={(v) => {
          setGlobalFilter(v);
          resetPage();
        }}
      />

      <ReusableTable
        data={rows}
        columns={columns}
        totalRows={totalRows}
        pagination={pagination}
        paginationMeta={paginationMeta}
        paginationResults={data?.results}
        setPagination={setPagination}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        enableRowActions
        onEdit={(row) => {
          if (row.status !== "DRAFT") {
            toast.error("Seul un brouillon peut être modifié");
            return;
          }
          navigate(`/bon-retour-fournisseurs/${row.id}/edit`);
        }}
        onPreview={(row) =>
          navigate(`/bon-retour-fournisseurs/${row.id}/preview`)
        }
        onDelete={(row) => {
          setSelectedRow(row);
          setOpenConfirm(true);
        }}
        tableId="bon-retour-fournisseur-table"
      />

      <ConfirmationModal
        isOpen={openConfirm}
        onClose={() => {
          setOpenConfirm(false);
          setSelectedRow(null);
        }}
        onConfirm={async () => {
          try {
            await deleteMutation.mutateAsync(selectedRow.id);
            toast.success("Retour fournisseur supprimé");
            setOpenConfirm(false);
            setSelectedRow(null);
          } catch (err) {
            toast.error(err?.response?.data?.message || "Suppression impossible");
          }
        }}
        title="Supprimer le retour ?"
        message={`Supprimer ${selectedRow?.documentNumber || ""} ?`}
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />

      <ConfirmationModal
        isOpen={openValidateConfirm}
        onClose={() => {
          setOpenValidateConfirm(false);
          setRowToValidate(null);
        }}
        onConfirm={async () => {
          const targetStatus =
            rowToValidate?.status === "DRAFT" ? "COMPLETED" : "DRAFT";
          try {
            await validateMutation.mutateAsync({
              id: rowToValidate.id,
              targetStatus,
            });
            toast.success(
              targetStatus === "COMPLETED"
                ? "Retour validé (stock sorti)"
                : "Retour remis en brouillon",
            );
            setOpenValidateConfirm(false);
            setRowToValidate(null);
          } catch (err) {
            toast.error(err?.response?.data?.message || "Validation impossible");
          }
        }}
        title={
          rowToValidate?.status === "DRAFT"
            ? "Valider le retour ?"
            : "Remettre en brouillon ?"
        }
        message={
          rowToValidate?.status === "DRAFT"
            ? "La validation sort le stock (RETURN_OUT) et ajuste les bons de réception."
            : "Le stock sera restauré et la réconciliation financière annulée."
        }
        confirmText="Confirmer"
        cancelText="Annuler"
        isLoading={validateMutation.isPending}
      />
    </div>
  );
};
