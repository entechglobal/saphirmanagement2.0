import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { CheckCircle2 } from "lucide-react";
import { toast } from "@/shared/utils/toast";
import { ReusableTable } from "../../../shared/components/ReusableTable";
import { FiltersBar } from "../../../shared/components/FiltersBar";
import { HeaderTable } from "../../../shared/components/HeaderTable";
import { ConfirmationModal } from "../../../shared/components/ConfirmationModal";
import { createPurchaseDocumentHooks } from "../hooks/usePurchaseDocuments";

const linkClass =
  "text-[#B12B89] hover:underline font-medium focus:outline-none";

const StatusBadge = ({ status }) => {
  const defaults = {
    DRAFT: { label: "Brouillon", className: "bg-slate-500" },
    COMPLETED: { label: "Validé", className: "bg-emerald-500" },
    CONFIRMED: { label: "Confirmé", className: "bg-[#B12B89]" },
    CANCELLED: { label: "Annulé", className: "bg-red-500" },
  };
  const base = defaults[status] ?? { label: status, className: "bg-slate-400" };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[13px] text-white ${base.className}`}
    >
      {base.label}
    </span>
  );
};

export const PurchaseDocumentsPage = ({ config }) => {
  const navigate = useNavigate();
  const hooks = useMemo(() => createPurchaseDocumentHooks(config), [config]);
  const { useList, useDelete } = hooks;

  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [statusFilter, setStatusFilter] = useState(null);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const resetPage = useCallback(
    () => setPagination((p) => ({ ...p, pageIndex: 0 })),
    [],
  );

  const { data, isLoading, isFetching, isError } = useList({
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
    keyword: globalFilter,
    status: config.hideStatus ? undefined : statusFilter?.value,
  });

  const deleteMutation = useDelete();
  const rows = data?.data ?? [];
  const paginationMeta = data?.pagination;
  const totalRows = paginationMeta?.total ?? 0;
  const hasActiveFilters = !!(statusFilter || globalFilter);

  const columns = useMemo(
    () => [
      {
        accessorKey: "document.documentNumber",
        header: "N°",
        Cell: ({ row }) => (
          <Link
            to={`${config.path}/${row.original.id}/preview`}
            className={linkClass}
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.document?.documentNumber || "—"}
          </Link>
        ),
      },
      {
        accessorKey: "documentDate",
        header: "Date",
        Cell: ({ row }) => (
          <span>{dayjs(row.original.documentDate).format("DD/MM/YYYY")}</span>
        ),
      },
      {
        id: "fournisseur",
        header: "Fournisseur",
        Cell: ({ row }) => {
          const frs = row.original.document?.fournisseur;
          const name = frs?.name || "—";
          if (frs?.id) {
            return (
              <Link
                to={`/fournisseurs/${frs.id}`}
                className={linkClass}
                onClick={(e) => e.stopPropagation()}
              >
                {name}
              </Link>
            );
          }
          return <span>{name}</span>;
        },
      },
      ...(!config.hideStatus
        ? [
            {
              id: "status",
              header: "Statut",
              Cell: ({ row }) => (
                <StatusBadge status={row.original.document?.status} />
              ),
            },
          ]
        : []),
    ],
    [config],
  );

  const filters = useMemo(() => {
    if (config.hideStatus) return [];
    return [
      {
        type: "select",
        id: "status",
        label: "Statut",
        icon: CheckCircle2,
        options: [
          { value: "DRAFT", label: "Brouillon" },
          { value: "CONFIRMED", label: "Confirmé" },
          { value: "COMPLETED", label: "Validé" },
          { value: "CANCELLED", label: "Annulé" },
        ],
        value: statusFilter,
        onChange: (v) => {
          setStatusFilter(v);
          resetPage();
        },
      },
    ];
  }, [config.hideStatus, statusFilter, resetPage]);

  return (
    <div className="space-y-4">
      <HeaderTable
        title={config.title}
        onCreate={() => navigate(`${config.path}/create`)}
        createLabel={config.createLabel}
      />

      <FiltersBar
        cols={{ xs: "1fr", sm: "1fr" }}
        filters={filters}
        hasActiveFilters={hasActiveFilters}
        onReset={() => {
          setStatusFilter(null);
          setGlobalFilter("");
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
        onEdit={
          config.editable === false
            ? undefined
            : (row) => navigate(`${config.path}/${row.id}/edit`)
        }
        onPreview={(row) => navigate(`${config.path}/${row.id}/preview`)}
        onDelete={(row) => {
          setSelectedRow(row);
          setOpenConfirm(true);
        }}
        tableId={`${config.key}-table`}
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
            toast.success("Document supprimé");
            setOpenConfirm(false);
            setSelectedRow(null);
          } catch (err) {
            toast.error(
              err?.response?.data?.message || "Suppression impossible",
            );
          }
        }}
        title="Supprimer le document ?"
        message={`Supprimer ${selectedRow?.document?.documentNumber || ""} ?`}
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
