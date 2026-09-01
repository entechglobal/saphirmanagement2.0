// src/features/agences/pages/AgencesPage.jsx
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "@/shared/utils/toast";
import { Building2 } from "lucide-react";
import { Switch, Tooltip } from "@mui/material";

import {
  useAgences,
  useDeleteAgence,
  useToggleAgenceActive,
} from "../hooks/useAgences";
import { ReusableTable } from "../../../../shared/components/ReusableTable";
import { ConfirmationModal } from "../../../../shared/components/ConfirmationModal";
import { HeaderTable } from "../../../../shared/components/HeaderTable";

export const AgencesPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation("agences");

  /* ── State ── */
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const [openToggleConfirm, setOpenToggleConfirm] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [pendingActive, setPendingActive] = useState(null);

  /* ── API ── */
  const { data, isLoading, isFetching, isError } = useAgences({
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
    keyword: globalFilter,
  });

  const deleteMutation = useDeleteAgence();
  const toggleMutation = useToggleAgenceActive();

  const tableData = data?.data ?? [];
  const paginationMeta = data?.pagination
    ? {
        currentPage: data.pagination.page,
        limit: data.pagination.limit,
        numberOfPages: data.pagination.totalPages,
      }
    : null;
  const totalRows = data?.pagination
    ? data.pagination.total
    : 0;

  /* ── Columns ── */
  const columns = useMemo(() => [
    { accessorKey: "id", header: t("table.id"), size: 60 },
    { accessorKey: "name", header: t("table.name") },
    { accessorKey: "localisation", header: t("table.localisation") },
    { accessorKey: "responsable", header: t("table.responsable") },
    {
      accessorKey: "active",
      header: t("table.status"),
      Cell: ({ row }) => (
        <Tooltip title={row.original.active ? t("tooltip.deactivate") : t("tooltip.activate")}>
          <Switch
            checked={row.original.active}
            size="small"
            color="success"
            onChange={() => {
              setSelectedRow(row.original);
              setPendingActive(!row.original.active);
              setOpenToggleConfirm(true);
            }}
          />
        </Tooltip>
      ),
    },
    {
      accessorKey: "createdAt",
      header: t("table.created_date"),
      Cell: ({ cell }) =>
        new Date(cell.getValue()).toLocaleDateString(),
    },
  ], [t]);

  /* ── Handlers ── */
  const handleDeleteClick = (row) => {
    setSelectedRow(row);
    setOpenDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (!selectedRow) return;
    deleteMutation.mutate(selectedRow.id, {
      onSuccess: (res) => {
        toast.success(res?.message || t("toast.delete_success"));
        setOpenDeleteConfirm(false);
        setSelectedRow(null);
      },
      onError: (err) => {
        setOpenDeleteConfirm(false);
        toast.error(err?.response?.data?.message || t("toast.delete_error"));
      },
    });
  };

  const confirmToggle = () => {
    if (!selectedRow) return;
    toggleMutation.mutate(
      { id: selectedRow.id, active: pendingActive },
      {
        onSuccess: () => {
          toast.success(t("toast.status_updated"));
          setOpenToggleConfirm(false);
          setSelectedRow(null);
          setPendingActive(null);
        },
        onError: (err) => {
          setOpenToggleConfirm(false);
          toast.error(err?.response?.data?.message || t("toast.status_error"));
        },
      }
    );
  };

  return (
    <div className="p-4 md:p-8 min-h-screen transition-colors duration-300">
      <HeaderTable
        title={t("title")}
        onCreate={() => navigate("/agences/create")}
        createLabel={t("table.create_new")}
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

        onEdit={(row) => navigate(`/agences/${row.id}/edit`)}
        onDelete={handleDeleteClick}

        tableId="agences-table"
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

      {/* Toggle confirmation */}
      <ConfirmationModal
        isOpen={openToggleConfirm}
        onClose={() => {
          setOpenToggleConfirm(false);
          setSelectedRow(null);
          setPendingActive(null);
        }}
        onConfirm={confirmToggle}
        title={pendingActive ? t("toggle_modal.activate_title") : t("toggle_modal.deactivate_title")}
        message={pendingActive
          ? t("toggle_modal.activate_message", { name: selectedRow?.name })
          : t("toggle_modal.deactivate_message", { name: selectedRow?.name })}
        confirmText={pendingActive ? t("toggle_modal.activate_confirm") : t("toggle_modal.deactivate_confirm")}
        cancelText={t("toggle_modal.cancel")}
        variant={pendingActive ? "success" : "warning"}
        isLoading={toggleMutation.isPending}
      />
    </div>
  );
};