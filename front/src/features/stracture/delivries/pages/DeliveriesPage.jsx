import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/shared/utils/toast";
import { Truck, ToggleLeft, ToggleRight } from "lucide-react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import {
  useDeliveriesList,
  useDeleteDelivery,
  useToggleDeliveryActive,
} from "../hooks/useDeliveries";
import { HeaderTable } from "../../../../shared/components/HeaderTable";
import { ReusableTable } from "../../../../shared/components/ReusableTable";
import { ConfirmationModal } from "../../../../shared/components/ConfirmationModal";
import { Switch, Tooltip } from '@mui/material';
export const DeliveriesPage = () => {
  const { t } = useTranslation("deliveries");
  const navigate = useNavigate();

  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  /* delete modal */
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  /* toggle-active modal */
  const [openToggleConfirm, setOpenToggleConfirm] = useState(false);
  const [toggleTarget, setToggleTarget] = useState(null);

  const { data, isLoading, isFetching, isError } = useDeliveriesList({
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
    keyword: globalFilter,
  });

  const deleteMutation = useDeleteDelivery();
  const toggleMutation = useToggleDeliveryActive();

  const tableData = data?.data ?? [];
  const paginationMeta = data?.pagination;
  const totalRows = paginationMeta
    ? paginationMeta.numberOfPages * paginationMeta.limit
    : 0;

  /* ── columns ── */
  const columns = useMemo(
    () => [
      { accessorKey: "id", header: t("columns.id"), size: 60 },
      {
        accessorKey: "name",
        header: t("columns.name"),
        Cell: ({ row }) => (
          <div className="flex items-center gap-2">

            <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
              {row.original.name}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "entityType",
        header: t("columns.type"),
        Cell: ({ cell }) => (
          <span
            className={`text-[9px] font-bold uppercase px-2 py-1 rounded ${cell.getValue() === "SOCIETE"
              ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
              : "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400"
              }`}
          >
            {cell.getValue() === "SOCIETE" ? t("entity_type.societe") : t("entity_type.particulier")}
          </span>
        ),
      },
      {
        accessorKey: "societe.raisonSocial",
        header: t("columns.societe"),
        Cell: ({ row }) => (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {row.original.societe?.raisonSocial ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "tel",
        header: t("columns.phone"),
        Cell: ({ cell }) => (
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            {cell.getValue() || "—"}
          </span>
        ),
      },
      {
        accessorKey: "_count.bonLivraisons",
        header: t("columns.bls"),
        size: 80,
        Cell: ({ row }) => (
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 tabular-nums">
            {(row.original._count?.bonLivraisons ?? 0) + (row.original._count?.livreurBLs ?? 0)}
          </span>
        ),
      },
      {
        accessorKey: "active",
        header: t("columns.status"),
        Cell: ({ row }) => {
          const active = row.original.active;

          return (
            <Tooltip title={active ? t("tooltip.disable") : t("tooltip.enable")} arrow>
              <Switch
                checked={active}
                size="small"
                color="success"
                onChange={(e) => {
                  // Stop propagation if your row has a click event
                  e.stopPropagation();

                  // Set the target row for the confirmation modal
                  setToggleTarget(row.original);

                  // If you need to track the future state (like setPendingActive in your first snippet)
                  // You can add that here, otherwise just open the modal
                  setOpenToggleConfirm(true);
                }}
              />
            </Tooltip>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: t("columns.created_at"),
        Cell: ({ cell }) => (
          <span className="text-xs text-slate-400 tabular-nums">
            {dayjs(cell.getValue()).format("DD/MM/YYYY")}
          </span>
        ),
      },
    ],
    []
  );

  /* ── delete handlers ── */
  const handleDeleteClick = (row) => {
    setSelectedRow(row);
    setOpenDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (!selectedRow) return;
    deleteMutation.mutate(selectedRow.id, {
      onSuccess: () => {
        toast.success(t("toast.delete_success"));
        setOpenDeleteConfirm(false);
        setSelectedRow(null);
      },
      onError: (err) => {
        toast.error(err?.response?.data?.message || t("toast.delete_error"));
      },
    });
  };

  /* ── toggle-active handlers ── */
  const confirmToggle = () => {
    if (!toggleTarget) return;
    toggleMutation.mutate(toggleTarget.id, {
      onSuccess: () => {
        toast.success(
          toggleTarget.active
            ? t("toast.disable_success", { name: toggleTarget.name })
            : t("toast.enable_success", { name: toggleTarget.name })
        );
        setOpenToggleConfirm(false);
        setToggleTarget(null);
      },
      onError: (err) => {
        toast.error(err?.response?.data?.message || t("toast.toggle_error"));
      },
    });
  };

  return (
    <div className="p-4 md:p-8 min-h-screen transition-colors duration-300">
      <HeaderTable
        title={t("page_title")}
        onCreate={() => navigate("/deliveries/create")}
        createLabel={t("create_button")}
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
        setGlobalFilter={setGlobalFilter}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}

        onEdit={(row) => navigate(`/deliveries/${row.id}/edit`)}
        onDelete={handleDeleteClick}

        tableId="deliveries-table"
      />

      {/* Delete confirmation */}
      <ConfirmationModal
        isOpen={openDeleteConfirm}
        onClose={() => setOpenDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title={t("delete_modal.title")}
        message={t("delete_modal.message", { name: selectedRow?.name })}
        confirmText={t("delete_modal.confirm")}
        cancelText={t("delete_modal.cancel")}
        variant="danger"
        isLoading={deleteMutation.isPending}
      />

      {/* Toggle active confirmation */}
      <ConfirmationModal
        isOpen={openToggleConfirm}
        onClose={() => {
          setOpenToggleConfirm(false);
          setToggleTarget(null);
        }}
        onConfirm={confirmToggle}
        title={toggleTarget?.active ? t("toggle_modal.disable_title") : t("toggle_modal.enable_title")}
        message={
          toggleTarget?.active
            ? t("toggle_modal.disable_message", { name: toggleTarget?.name })
            : t("toggle_modal.enable_message", { name: toggleTarget?.name })
        }
        confirmText={toggleTarget?.active ? t("toggle_modal.disable_confirm") : t("toggle_modal.enable_confirm")}
        cancelText={t("toggle_modal.cancel")}
        variant={toggleTarget?.active ? "danger" : "success"}
        isLoading={toggleMutation.isPending}
      />
    </div>
  );
};
