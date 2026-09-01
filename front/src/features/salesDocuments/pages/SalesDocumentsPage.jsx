import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { CheckCircle2, User } from "lucide-react";
import { toast } from "@/shared/utils/toast";
import { ReusableTable } from "../../../shared/components/ReusableTable";
import { FiltersBar } from "../../../shared/components/FiltersBar";
import { HeaderTable } from "../../../shared/components/HeaderTable";
import { ConfirmationModal } from "../../../shared/components/ConfirmationModal";
import { useOperatingHours } from "@/shared/hooks/useOperatingHours";
import { createSalesDocumentHooks } from "../hooks/useSalesDocuments";

const linkClass =
  "text-[#B12B89] hover:underline font-medium focus:outline-none";

const StatusBadge = ({ status, labels }) => {
  const defaults = {
    DRAFT: {
      label: "Brouillon",
      className: "bg-slate-500",
    },
    COMPLETED: {
      label: "Validé",
      className: "bg-emerald-500",
    },
    CONFIRMED: {
      label: "Confirmé",
      className: "bg-[#B12B89]",
    },
    CANCELLED: {
      label: "Annulé",
      className: "bg-red-500",
    },
  };
  const base = defaults[status] ?? {
    label: status,
    className: "bg-slate-400",
  };
  const label = labels?.[status] || base.label;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[13px] text-white ${base.className}`}
    >
      {label}
    </span>
  );
};

export const SalesDocumentsPage = ({ config }) => {
  const navigate = useNavigate();
  const hooks = useMemo(() => createSalesDocumentHooks(config), [config]);
  const { useList, useDelete, useUpdate, useClients } = hooks;
  const isFacture = config.key === "facture";
  const showClientDateFilters = isFacture || config.key === "devis";

  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [statusFilter, setStatusFilter] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientKeyword, setClientKeyword] = useState("");
  const [openConfirm, setOpenConfirm] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const { startHour, endHour } = useOperatingHours();
  const defaultStart =
    startHour != null
      ? dayjs()
          .startOf("month")
          .hour(startHour)
          .minute(0)
          .second(0)
          .millisecond(0)
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
    if (startHour != null) {
      setStartDateTime((d) =>
        d.hour(startHour).minute(0).second(0).millisecond(0),
      );
    }
    if (endHour != null) {
      setEndDateTime((d) => d.hour(endHour).minute(0).second(0).millisecond(0));
    }
  }, [startHour, endHour]);

  const resetPage = useCallback(
    () => setPagination((p) => ({ ...p, pageIndex: 0 })),
    [],
  );

  const apiStartDate =
    showClientDateFilters && startDateTime?.isValid()
      ? startDateTime.format("YYYY-MM-DDTHH:mm:ss")
      : undefined;
  const apiEndDate =
    showClientDateFilters && endDateTime?.isValid()
      ? endDateTime.format("YYYY-MM-DDTHH:mm:ss")
      : undefined;

  const { data: clientsData, isLoading: clientsLoading } = useClients({
    pageSize: 100,
    keyword: clientKeyword,
  });
  const clientOptions = clientsData?.data ?? [];

  const { data, isLoading, isFetching, isError } = useList({
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
    keyword: globalFilter,
    status: config.hideStatus ? undefined : statusFilter?.value,
    clientId: showClientDateFilters ? selectedClient?.id : undefined,
    startDate: apiStartDate,
    endDate: apiEndDate,
  });

  const deleteMutation = useDelete();
  const updateMutation = useUpdate();

  const rows = data?.data ?? [];
  const paginationMeta = data?.pagination;
  const totalRows = paginationMeta?.total ?? 0;

  const datesAreDefault =
    startDateTime?.isSame(defaultStart) && endDateTime?.isSame(defaultEnd);
  const hasActiveFilters = !!(
    statusFilter ||
    (showClientDateFilters && selectedClient) ||
    (showClientDateFilters && !datesAreDefault) ||
    globalFilter
  );

  const handleReset = useCallback(() => {
    setStatusFilter(null);
    setSelectedClient(null);
    setClientKeyword("");
    setStartDateTime(defaultStart);
    setEndDateTime(defaultEnd);
    setGlobalFilter("");
    resetPage();
  }, [defaultStart, defaultEnd, resetPage]);

  const handleToggleStatus = async (row) => {
    if (!config.statusToggle) return;
    const current = row.document?.status;
    const targetStatus = current === "DRAFT" ? "COMPLETED" : "DRAFT";
    try {
      await updateMutation.mutateAsync({
        id: row.id,
        payload: { status: targetStatus },
      });
      toast.success(
        targetStatus === "COMPLETED"
          ? "Facture marquée comme livrée"
          : "Facture remise en brouillon",
      );
    } catch (err) {
      toast.error(err?.response?.data?.message || "Changement de statut impossible");
    }
  };

  const columns = useMemo(() => {
    const cols = [
      {
        accessorKey: "document.documentNumber",
        header: "N°",
        Cell: ({ row }) => {
          const num = row.original.document?.documentNumber;
          return (
            <Link
              to={`${config.path}/${row.original.id}/preview`}
              className={linkClass}
              onClick={(e) => e.stopPropagation()}
            >
              {num || "—"}
            </Link>
          );
        },
      },
      {
        accessorKey: "documentDate",
        header: "Date",
        Cell: ({ row }) => (
          <span>
            {dayjs(row.original.documentDate).format("DD/MM/YYYY")}
          </span>
        ),
      },
      {
        id: "client",
        header: "Client",
        Cell: ({ row }) => {
          const client = row.original.document?.client;
          const name = client?.name || row.original.document?.clientName || "—";
          if (client?.id) {
            return (
              <Link
                to={`/clients/${client.id}`}
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
    ];

    if (!config.hideStatus) {
      cols.push({
        id: "status",
        header: "Statut",
        Cell: ({ row }) => {
          const badge = (
            <StatusBadge
              status={row.original.document?.status}
              labels={config.statusLabels}
            />
          );
          if (!config.statusToggle) return badge;
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleStatus(row.original);
              }}
              disabled={updateMutation.isPending}
              className="cursor-pointer disabled:opacity-50"
              title="Cliquer pour changer le statut"
            >
              {badge}
            </button>
          );
        },
      });
    }

    if (!config.hidePrices) {
      cols.push({
        id: "totalTTC",
        header: "Total TTC",
        Cell: ({ row }) => (
          <span className="tabular-nums">
            {Number(row.original.document?.totalTTC || 0).toLocaleString(
              "fr-MA",
              { minimumFractionDigits: 2, maximumFractionDigits: 2 },
            )}{" "}
            DH
          </span>
        ),
      });
    }

    if (config.key === "facture") {
      cols.push({
        id: "bl",
        header: "BL lié",
        Cell: ({ row }) => {
          const bl = row.original.bonLivraison;
          const blId = row.original.bonLivraisonId || bl?.id;
          const blNum = bl?.document?.documentNumber;
          if (!blId) {
            return <span>—</span>;
          }
          return (
            <Link
              to={`/bon-livraisons/${blId}/preview`}
              className={linkClass}
              onClick={(e) => e.stopPropagation()}
            >
              {blNum || `BL #${blId}`}
            </Link>
          );
        },
      });
    }

    return cols;
  }, [config, updateMutation.isPending]);

  const filters = useMemo(() => {
    const list = [];

    if (!config.hideStatus) {
      list.push({
        type: "select",
        id: "status",
        label: "Statut",
        icon: CheckCircle2,
        options: config.statusToggle
          ? [
              {
                value: "DRAFT",
                label: config.statusLabels?.DRAFT || "Brouillon",
              },
              {
                value: "COMPLETED",
                label: config.statusLabels?.COMPLETED || "Livré",
              },
            ]
          : [
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
      });
    }

    if (showClientDateFilters) {
      list.push(
        {
          type: "async-select",
          id: "client",
          label: "Client",
          icon: User,
          options: clientOptions,
          value: selectedClient,
          onChange: (v) => {
            setSelectedClient(v);
            resetPage();
          },
          loading: clientsLoading,
          getOptionLabel: (o) => o?.name ?? o?.raisonSocial ?? "",
          onInputChange: setClientKeyword,
        },
        {
          type: "date-range",
          id: "dateRange",
          startDateTime,
          endDateTime,
          onStartChange: (v) => {
            setStartDateTime(v);
            if (v && endDateTime && v.isAfter(endDateTime)) {
              setEndDateTime(null);
            }
            resetPage();
          },
          onEndChange: (v) => {
            setEndDateTime(v);
            resetPage();
          },
          startLabel: "Date début",
          endLabel: "Date fin",
        },
      );
    }

    return list;
  }, [
    config.hideStatus,
    config.statusToggle,
    config.statusLabels,
    statusFilter,
    showClientDateFilters,
    clientOptions,
    selectedClient,
    clientsLoading,
    startDateTime,
    endDateTime,
    resetPage,
  ]);

  return (
    <div className="space-y-4">
      <HeaderTable
        title={config.title}
        onCreate={() => navigate(`${config.path}/create`)}
        createLabel={config.createLabel}
      />

      <FiltersBar
          cols={{
            xs: "1fr",
            sm: showClientDateFilters
              ? config.hideStatus
                ? "repeat(2, 1fr)"
                : "repeat(3, 1fr)"
              : "1fr",
          }}
          filters={filters}
          hasActiveFilters={hasActiveFilters}
          onReset={handleReset}
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
