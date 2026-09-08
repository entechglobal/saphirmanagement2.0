import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "@/shared/utils/toast";
import {
  CheckCircle2,
  User,
} from "lucide-react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

/* ---------- Hooks ---------- */
import {
  useBonLivraisons,
  useDeleteBonLivraison,
  useValidateBonLivraison,
  useBLClients,
} from "../hooks/useBonLivraisons";
import { useDepots } from "../../repositories/hooks/useRepositories";
import { useOperatingHours } from "@/shared/hooks/useOperatingHours";
/* ---------- Shared Components ---------- */
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
    CANCELLED: {
      label: t("status_badge.cancelled"),
      className: "bg-rose-500",
    },
    PAID: {
      label: t("status_badge.paid"),
      className: "bg-emerald-600",
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

/* ─────── BonLivraisonsPage ─────── */
export const BonLivraisonsPage = () => {
  const { t } = useTranslation("bonLivraison");
  const navigate = useNavigate();

  /* Pagination / search */
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  /* Modals */
  const [openConfirm, setOpenConfirm] = useState(false);
  const [openValidateConfirm, setOpenValidateConfirm] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [rowToValidate, setRowToValidate] = useState(null);

  /* Filters */
  const [statusFilter, setStatusFilter] = useState(null);
  const [selectedDepot, setSelectedDepot] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);

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

  const _hoursApplied = useRef(false);
  useEffect(() => {
    if (_hoursApplied.current || (startHour == null && endHour == null)) return;
    _hoursApplied.current = true;
    if (startHour != null)
      setStartDateTime((d) =>
        d.hour(startHour).minute(0).second(0).millisecond(0),
      );
    if (endHour != null)
      setEndDateTime((d) => d.hour(endHour).minute(0).second(0).millisecond(0));
  }, [startHour, endHour]);

  const apiStartDate = startDateTime?.isValid()
    ? startDateTime.format("YYYY-MM-DDTHH:mm:ss")
    : undefined;
  const apiEndDate = endDateTime?.isValid()
    ? endDateTime.format("YYYY-MM-DDTHH:mm:ss")
    : undefined;

  useEffect(() => {
    console.log("[BonLivraisonsPage] Time filter changed:", {
      startDateTime: startDateTime?.format("DD/MM/YYYY HH:mm:ss") ?? null,
      endDateTime: endDateTime?.format("DD/MM/YYYY HH:mm:ss") ?? null,
      apiStartDate: apiStartDate ?? null,
      apiEndDate: apiEndDate ?? null,
    });
  }, [apiStartDate, apiEndDate]);

  /* Data */
  const { data: depotsData, isLoading: depotsLoading } = useDepots();
  const { data: clientsData, isLoading: clientsLoading } = useBLClients({
    pageSize: 10000,
  });

  const { data, isLoading, isFetching, isError } = useBonLivraisons({
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
    keyword: globalFilter,
    startDate: apiStartDate,
    endDate: apiEndDate,
    depotId: selectedDepot?.id,
    clientId: selectedClient?.id,
    status: statusFilter?.value,
  });

  const deleteMutation = useDeleteBonLivraison();
  const validateMutation = useValidateBonLivraison();

  const tableData = data?.data ?? [];
  const paginationMeta = data?.pagination;
  const results = data?.results;
  const totalRows = paginationMeta
    ? paginationMeta.totalPages * paginationMeta.limit
    : 0;

  const depotOptions = depotsData?.data ?? [];
  const clientOptions = clientsData?.data ?? [];

  const datesAreDefault =
    startDateTime?.isSame(defaultStart) && endDateTime?.isSame(defaultEnd);
  const hasActiveFilters = !!(
    statusFilter ||
    selectedDepot ||
    selectedClient ||
    !datesAreDefault ||
    globalFilter
  );

  const resetPage = useCallback(
    () => setPagination((p) => ({ ...p, pageIndex: 0 })),
    [],
  );

  const handleReset = useCallback(() => {
    setStatusFilter(null);
    setSelectedDepot(null);
    setSelectedClient(null);
    setStartDateTime(defaultStart);
    setEndDateTime(defaultEnd);
    setGlobalFilter("");
    resetPage();
  }, [resetPage]);

  /* Handlers */
  const handleDeleteClick = (row) => {
    setSelectedRow(row);
    setOpenConfirm(true);
  };

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
      {
        id: rowToValidate.id,
        targetStatus: rowToValidate.targetStatus,
      },
      {
        onSuccess: () => {
          toast.success(
            rowToValidate.targetStatus === "COMPLETED"
              ? t("toast.validate_success_completed")
              : t("toast.validate_success_draft"),
          );
          setOpenValidateConfirm(false);
          setRowToValidate(null);
        },
        onError: (err) => {
          toast.error(
            err?.response?.data?.message || t("toast.validate_error"),
          );
          setOpenValidateConfirm(false);
        },
      },
    );
  };

  const handleToggleStatus = (row) => {
    const currentStatus = row.document?.status;
    const targetStatus = currentStatus === "DRAFT" ? "COMPLETED" : "DRAFT";

    setRowToValidate({
      ...row,
      targetStatus,
    });

    setOpenValidateConfirm(true);
  };

  const fmt = (n) =>
    Number(n ?? 0).toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  /* Columns */
  const columns = useMemo(
    () => [
      {
        accessorKey: "document.documentNumber",
        header: t("bl_number"),
        Cell: ({ row }) => (
          <Link
            to={`/bon-livraisons/${row.original.id}/preview`}
            className="text-[#B12B89] hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.document?.documentNumber || "—"}
          </Link>
        ),
      },
      {
        id: "linkedOrder",
        header: t("linked_order"),
        Cell: ({ row }) => {
          const orderId = row.original.sourceOrderId;
          const orderNumber =
            row.original.sourceOrder?.document?.documentNumber ||
            (orderId ? `#${orderId}` : null);
          if (!orderId) return <span>—</span>;
          return (
            <Link
              to={`/commandes/${orderId}`}
              className="text-[#B12B89] hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {orderNumber}
            </Link>
          );
        },
      },
      {
        accessorKey: "documentDate",
        header: t("document_date"),
        Cell: ({ cell }) => (
          <span>{cell.getValue() ? cell.getValue() : "—"}</span>
        ),
      },
      {
        accessorKey: "dateLivraison",
        header: t("delivery_date"),
        Cell: ({ cell }) => (
          <span>{cell.getValue() ? cell.getValue() : "—"}</span>
        ),
      },
      {
        accessorKey: "document.client.name",
        header: t("client"),
        Cell: ({ row }) => {
          const client = row.original.document?.client;
          const name = client?.name || row.original.document?.clientName || "—";
          return client?.id ? (
            <Link
              to={`/clients/${client.id}`}
              className="text-[#B12B89] hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {name}
            </Link>
          ) : (
            <span>{name}</span>
          );
        },
      },
      {
        accessorKey: "depot.name",
        header: t("depot"),
        Cell: ({ row }) => <span>{row.original.depot?.name || "—"}</span>,
      },
      {
        accessorKey: "delivery.name",
        header: t("delivery_person"),
        Cell: ({ row }) => (
          <span>{row.original.delivery?.name || "—"}</span>
        ),
      },
      {
        accessorKey: "document.status",
        header: t("status"),
        Cell: ({ row }) => {
          const status = row.original.document?.status;
          const isLinkedOrder = !!row.original.sourceOrderId;
          if (isLinkedOrder) {
            return <StatusBadge status={status} t={t} />;
          }
          return (
            <button
              type="button"
              onClick={() => handleToggleStatus(row.original)}
              className="cursor-pointer"
            >
              <StatusBadge status={status} t={t} />
            </button>
          );
        },
      },
      {
        id: "financials",
        header: t("amounts"),
        Cell: ({ row }) => {
          const doc = row.original.document;
          return (
            <span className="tabular-nums">
              {fmt(doc?.totalTTC)} MAD
            </span>
          );
        },
      },
      {
        id: "payment",
        header: t("payment"),
        Cell: ({ row: { original } }) => {
          const amount = original.document?.amountPaid;
          const displayValue =
            amount !== undefined && amount !== null
              ? amount.toLocaleString()
              : "—";

          return (
            <span className="tabular-nums">
              {displayValue} MAD
            </span>
          );
        },
      },
      {
        id: "Montant Du",
        header: t("amount_due"),
        Cell: ({ row: { original } }) => {
          const amount = original.document?.amountDue;
          const displayValue =
            amount !== undefined && amount !== null
              ? amount.toLocaleString()
              : "—";

          return (
            <span className="tabular-nums">
              {displayValue} MAD
            </span>
          );
        },
      },
      {
        id: "restToPay",
        header: t("rest_to_pay"),
        Cell: ({ row: { original } }) => {
          const total = original.document?.amountDue || 0;
          const paid = original.document?.amountPaid || 0;
          const rest = Math.max(0, total - paid);

          return (
            <span className="tabular-nums">
              {original.document
                ? rest.toLocaleString(undefined, { minimumFractionDigits: 2 })
                : "—"}{" "}
              MAD
            </span>
          );
        },
      },
      {
        accessorKey: "document.notes",
        header: t("notes"),
        Cell: ({ cell }) => (
          <span
            className="text-xs italic max-w-[160px] truncate block text-gray-500 dark:text-gray-300"
            title={cell.getValue()}
          >
            {cell.getValue() || "—"}
          </span>
        ),
      },
    ],
    [t, navigate],
  );

  return (
    <div className="p-4 md:p-8 min-h-screen transition-colors duration-300">
      <HeaderTable
        title={t("title")}
        onCreate={() => navigate("/bon-livraisons/create")}
      />

      <FiltersBar
        cols={{ xs: "1fr", sm: "repeat(3, 1fr)" }}
        searchValue={globalFilter}
        onSearchChange={(v) => {
          setGlobalFilter(v);
          resetPage();
        }}
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
            onChange: (v) => {
              setStatusFilter(v);
              resetPage();
            },
          },
          {
            type: "async-select",
            id: "client",
            label: t("client"),
            icon: User,
            options: clientOptions,
            value: selectedClient,
            onChange: (v) => {
              setSelectedClient(v);
              resetPage();
            },
            loading: clientsLoading,
            getOptionLabel: (o) => o?.name ?? o?.raisonSocial ?? "",
          },
          {
            type: "date-range",
            id: "dateRange",
            startDateTime,
            endDateTime,
            onStartChange: (v) => {
              setStartDateTime(v);
              if (v && endDateTime && v.isAfter(endDateTime))
                setEndDateTime(null);
              resetPage();
            },
            onEndChange: (v) => {
              setEndDateTime(v);
              resetPage();
            },
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
        paginationResults={results}
        setPagination={setPagination}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}

        onEdit={(row) =>
          row.sourceOrderId
            ? navigate(`/commandes/${row.sourceOrderId}`)
            : navigate(`/bon-livraisons/${row.id}/edit`)
        }
        onPreview={(row) => navigate(`/bon-livraisons/${row.id}/preview`)}
        enableRowActions={true}
        onDelete={(row) => {
          if (row.sourceOrderId) {
            toast.error(t("toast.linked_order_locked"));
            return;
          }
          handleDeleteClick(row);
        }}
        tableId="bon-livraisons-table"
      />

      <ConfirmationModal
        isOpen={openConfirm}
        onClose={() => setOpenConfirm(false)}
        onConfirm={confirmDelete}
        title={t("delete_modal.title")}
        message={t("delete_modal.message", {
          documentNumber: selectedRow?.document?.documentNumber,
        })}
        confirmText={t("delete_modal.confirm")}
        cancelText={t("delete_modal.cancel")}
        variant="danger"
        isLoading={deleteMutation.isPending}
      />

      <ConfirmationModal
        isOpen={openValidateConfirm}
        onClose={() => {
          setOpenValidateConfirm(false);
          setRowToValidate(null);
        }}
        onConfirm={confirmValidation}
        title={
          rowToValidate?.targetStatus === "COMPLETED"
            ? t("validate_modal.title_complete")
            : t("validate_modal.title_revert")
        }
        message={
          rowToValidate?.targetStatus === "COMPLETED"
            ? t("validate_modal.message_complete", {
                documentNumber: rowToValidate?.document?.documentNumber,
              })
            : t("validate_modal.message_revert", {
                documentNumber: rowToValidate?.document?.documentNumber,
              })
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
