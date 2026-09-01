import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/shared/utils/toast";
import { Landmark } from "lucide-react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import { useBanques, useDeleteBanque } from "../hooks/useBanques";
import { HeaderTable } from "../../../../shared/components/HeaderTable";
import { ReusableTable } from "../../../../shared/components/ReusableTable";
import { ConfirmationModal } from "../../../../shared/components/ConfirmationModal";

export const BanquesPage = () => {
  const { t } = useTranslation("banques");
  const navigate = useNavigate();

  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [openConfirm, setOpenConfirm] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const { data, isLoading, isFetching, isError } = useBanques({
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
    keyword: globalFilter,
  });

  const deleteMutation = useDeleteBanque();

  const tableData = data?.data ?? [];
  const paginationMeta = data?.pagination;
  const totalRows = paginationMeta ? paginationMeta.numberOfPages * paginationMeta.limit : 0;

  const columns = useMemo(() => [
    { accessorKey: "id", header: t("columns.id"), size: 80 },
    { accessorKey: "name", header: t("columns.name") },
    { accessorKey: "RIB", header: t("columns.rib") },
    { accessorKey: "ville", header: t("columns.city") },
    {
      accessorKey: "createdAt",
      header: t("columns.createdAt"),
      Cell: ({ cell }) => dayjs(cell.getValue()).format("DD/MM/YYYY"),
    },
    {
      accessorKey: "updatedAt",
      header: t("columns.updatedAt"),
      Cell: ({ cell }) => dayjs(cell.getValue()).format("DD/MM/YYYY"),
    },
  ], [t]);

  const handleDeleteClick = (row) => {
    setSelectedRow(row);
    setOpenConfirm(true);
  };

  const confirmDelete = () => {
    if (!selectedRow) return;
    deleteMutation.mutate(selectedRow.id, {
      onSuccess: () => {
        toast.success(t("delete.success"));
        setOpenConfirm(false);
        setSelectedRow(null);
      },
      onError: (err) => {
        toast.error(err?.response?.data?.message || t("delete.error"));
      },
    });
  };

  return (
    <div className="p-4 md:p-8 min-h-screen transition-colors duration-300">
      <HeaderTable
        title={t("title")}
        onCreate={() => navigate("/banque/create")}
        createLabel={t("create_new")}
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

        onEdit={(row) => navigate(`/banque/${row.id}/edit`)}
        onDelete={handleDeleteClick}

        exportBttnLabel={t("export_simple")}
        csvLabel={t("export_csv")}
        xlsxLabel={t("export_xlsx")}
        tableId="banques-table"
      />

      <ConfirmationModal
        isOpen={openConfirm}
        onClose={() => setOpenConfirm(false)}
        onConfirm={confirmDelete}
        title={t("delete.title")}
        message={t("delete.message")}
        confirmText={t("delete.confirm")}
        cancelText={t("delete.cancel")}
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
