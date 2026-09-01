import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/shared/utils/toast";
import { ArrowsRightLeftIcon } from "@heroicons/react/24/outline";
import {
  Calendar,
  Warehouse,
  User,
  Building2,
  Hash,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "lucide-react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

/* ---------- Hooks ----------- */
import { useTransfers, useDeleteTransfer, useValidateTransfer } from "../hooks/useTransfers";

/* ---------- Components ---------- */
import { ReusableTable } from "../../../shared/components/ReusableTable";
import { HeaderTable } from "../../../shared/components/HeaderTable";
import { ConfirmationModal } from "../../../shared/components/ConfirmationModal";

/* ─────── Status Badge ─────── */
const StatusBadge = ({ status, t }) => {
  const config = {
    PENDING: {
      label: t("status_badge.pending"),
      icon: <Clock className="w-3 h-3" />,
      className:
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800",
    },
    COMPLETED: {
      label: t("status_badge.completed"),
      icon: <CheckCircle2 className="w-3 h-3" />,
      className:
        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800",
    },
  };

  const { label, icon, className } = config[status] ?? {
    label: status,
    icon: null,
    className: "bg-slate-50 text-slate-500 border-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wide ${className}`}
    >
      {icon}
      {label}
    </span>
  );
};

export const TransferStockPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation("transfer");

  /* ---------- State ---------- */
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 5,
  });
  const [openConfirm, setOpenConfirm] = useState(false);
  const [openValidateConfirm, setOpenValidateConfirm] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [rowToValidate, setRowToValidate] = useState(null);
  /* ---------- API ---------- */
  const { data, isLoading, isFetching, isError } = useTransfers({
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
    keyword: globalFilter,
  });

  const deleteMutation = useDeleteTransfer();

  const tableData = data?.data ?? [];
  const paginationMeta = data?.pagination;
  const results = data?.results;

  const validateTransfer = useValidateTransfer();

  const totalRows = paginationMeta
    ? paginationMeta.numberOfPages * paginationMeta.limit
    : 0;

  /* ---------- Handlers ---------- */
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
        toast.error(
          err?.response?.data?.message || t("toast.delete_error")
        );
      },
    });
  };

  const confirmValidation = () => {
    if (!rowToValidate) return;
    validateTransfer.mutate(rowToValidate.id, {
      onSuccess: () => {
        toast.success(t("toast.validate_success"));
        setOpenValidateConfirm(false);
        setRowToValidate(null);
      },
      onError: (err) => {
        toast.error(err?.response?.data?.message || t("toast.validate_error"));
        setOpenValidateConfirm(false);
      },
    });
  };

  /* ---------- Columns ---------- */
  const columns = [
    {
      accessorKey: "transferNumber",
      header: t("transfer_number"),
      Cell: ({ cell }) => (
        <span className="font-bold text-blue-700 dark:text-blue-400">
          {cell.getValue()}
        </span>
      ),
    },
    {
      accessorKey: "transferDate",
      header: t("date"),
      Cell: ({ cell }) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-sm">
            {cell.getValue()
              ? dayjs(cell.getValue()).format("DD/MM/YYYY")
              : "—"}
          </span>
        </div>
      ),
    },
    {
      id: "depots",
      header: t("source_to_destination"),
      Cell: ({ row }) => (
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-100">
          <div className="flex items-center gap-1">
            <Warehouse className="w-3.5 h-3.5 text-gray-400 dark:text-gray-300 flex-shrink-0" />
            <span className="max-w-[120px] truncate">
              {row.original.sourceDepot?.name || "—"}
            </span>
          </div>
          <ArrowRight className="w-4 h-4 text-blue-400 flex-shrink-0 rtl:scale-x-[-1]" />
          <div className="flex items-center gap-1">
            <Warehouse className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span className="max-w-[120px] truncate">
              {row.original.destinationDepot?.name || "—"}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "sourceDepot.societe.raisonSocial",
      header: t("company"),
      Cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-400 dark:text-blue-300" />
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-200">
            {row.original.sourceDepot?.societe?.raisonSocial || "—"}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: t("status"),
      Cell: ({ row }) => {
        const status = row.original.status;

        return (
          <div
            onClick={() => {
              if (status === "PENDING") {
                setRowToValidate(row.original);
                setOpenValidateConfirm(true);
              }
            }}
            className={`${
              status === "PENDING"
                ? "cursor-pointer hover:scale-105 transition"
                : "cursor-not-allowed opacity-60"
            }`}
          >
            <StatusBadge status={status} t={t} />
          </div>
        );
      },
    },
    {
      accessorKey: "notes",
      header: t("notes"),
      Cell: ({ cell }) => (
        <span
          className="text-xs italic max-w-[200px] truncate block text-gray-500 dark:text-gray-300"
          title={cell.getValue()}
        >
          {cell.getValue() || t("no_notes")}
        </span>
      ),
    },
    {
      accessorKey: "createdByUser.name",
      header: t("created_by"),
      Cell: ({ row }) => (
        <span className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-100 font-medium">
          <User className="w-4 h-4 text-gray-400 dark:text-gray-300" />
          {row.original.createdByUser?.name || t("unknown")}
        </span>
      ),
    },
    {
      accessorKey: "validatedByUser.name",
      header: t("validated_by"),
      Cell: ({ row }) => (
        <span className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-100 font-medium">
          <User className="w-4 h-4 text-gray-400 dark:text-gray-300" />
          {row.original.validatedByUser?.name || "—"}
        </span>
      ),
    },
    {
      header: t("statistics"),
      id: "stats",
      Cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-300">
              {t("lines")}
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 text-xs font-bold dark:bg-blue-900 dark:text-blue-200 dark:border-blue-800">
              <Hash className="w-3 h-3 dark:text-blue-300" />
              {row.original._count?.lines || 0}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-300">
              {t("transactions")}
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-100 text-xs font-bold dark:bg-purple-900 dark:text-purple-200 dark:border-purple-800">
              <ArrowRightLeft className="w-3 h-3 dark:text-purple-300" />
              {row.original._count?.transactions || 0}
            </span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-8 min-h-screen transition-colors duration-300">
      <HeaderTable
        title={t("title")}
        onCreate={() => navigate("/transferts/create")}
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

        onEdit={(row) => navigate(`/transferts/${row.id}/edit`)}
        enableRowActions={true}
        tableId="transfers-table"
      />

      <ConfirmationModal
        isOpen={openConfirm}
        onClose={() => setOpenConfirm(false)}
        onConfirm={confirmDelete}
        title={t("delete_modal.title")}
        message={t("delete_modal.message", { transferNumber: selectedRow?.transferNumber })}
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
        title={t("validate_modal.title")}
        message={t("validate_modal.message", { transferNumber: rowToValidate?.transferNumber })}
        confirmText={t("validate_modal.confirm")}
        cancelText={t("validate_modal.cancel")}
        variant="primary"
        isLoading={validateTransfer.isPending}
      />
    </div>
  );
};