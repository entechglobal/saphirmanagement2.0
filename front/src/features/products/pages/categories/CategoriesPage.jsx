import { CiImageOff } from "react-icons/ci";
("use client");

import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/shared/utils/toast";

/* ---------- Hooks ----------- */
import {
  useCategories,
  useDeleteCategory,
  useImportCategoriesCsv,
  useExportCategoriesCsv,
  useImportCategoriesXlsx,
  useExportCategoriesXlsx,
} from "../../hooks/useCategories";
import { FolderIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";

/* ---------- Table ---------- */
import { ReusableTable } from "../../../../shared/components/ReusableTable";
import { HeaderTable } from "../../../../shared/components/HeaderTable";

/* ---------- Modal ---------- */
import { ConfirmationModal } from "../../../../shared/components/ConfirmationModal";

export const CategoriesPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation("categories");

  /* ---------- State ---------- */
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 5,
  });
  const [openConfirm, setOpenConfirm] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  /* ---------- API ---------- */
  const { data, isLoading, isFetching, isError } = useCategories({
    pageIndex: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    keyword: globalFilter,
  });
  
  const results = data?.results;
  const deleteMutation = useDeleteCategory();

  const importCsvMutation = useImportCategoriesCsv();
  const exportCsvMutation = useExportCategoriesCsv();

  const importXlsxMutation = useImportCategoriesXlsx();
  const exportXlsxMutation = useExportCategoriesXlsx();

  const tableData = data?.data ?? [];
  const paginationMeta = data?.pagination;

  const totalRows = paginationMeta
    ? paginationMeta.numberOfPages * paginationMeta.limit
    : 0;

  /* ---------- Columns ---------- */
  const columns = [
    { accessorKey: "id", header: t("id"), size: 80 },
    { accessorKey: "name", header: t("name") },
    {
      accessorKey: "image",
      header: t("image"),
      Cell: ({ cell }) => {
        const url = cell.getValue();
        return url ? (
          <img
            src={url}
            alt="category"
            className="w-12 h-12 object-cover rounded-full border"
            onError={(e) =>
              (e.currentTarget.src =
                "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=")
            }
          />
        ) : (
          <CiImageOff className="w-11 h-11 text-gray-400" />
        );
      },
    },
    {
      accessorKey: "visible",
      header: t("status"),
      Cell: ({ cell }) =>
        cell.getValue() ? (
          <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold">
            {t("visible")}
          </span>
        ) : (
          <span className="px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-semibold">
            {t("hidden")}
          </span>
        ),
    },
  ];

  /* ---------- Handlers ---------- */
  const handleDeleteClick = (row) => {
    setSelectedRow(row);
    setOpenConfirm(true);
  };

  const confirmDelete = () => {
    if (!selectedRow) return;

    deleteMutation.mutate(selectedRow.id, {
      onSuccess: (res) => {
        toast.success(t("toast.delete_success"));
        setOpenConfirm(false);
        setSelectedRow(null);
      },
      onError: (err) => {
        setOpenConfirm(false);
        toast.error(t("toast.delete_error"));
      },
    });
  };

  // Import / Export Handlers
  const handleImport = (file) => {
    const isXlsx = file.name.endsWith(".xlsx");
    const mutation = isXlsx ? importXlsxMutation : importCsvMutation;

    mutation.mutate(file, {
      onSuccess: (res) => toast.success(t("toast.import_success")),
      onError: (err) => toast.error(t("toast.import_error")),
    });
  };

  const handleExportCsv = () => {
    exportCsvMutation.mutate(undefined, {
      onSuccess: (blob) => download(blob, "categories.csv"),
      onError: () => toast.error(t("toast.export_error_csv")),
    });
  };

  const handleExportXlsx = () => {
    exportXlsxMutation.mutate(undefined, {
      onSuccess: (blob) => download(blob, "categories.xlsx"),
      onError: () => toast.error(t("toast.export_error_xlsx")),
    });
  };

  const download = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-8 min-h-screen transition-colors duration-300">
      {/* Page Header Section */}
      <HeaderTable
        title={t("title")}
        onCreate={() => navigate("/categories/create")}
        createLabel={t("create_new")}
      />

      <ReusableTable
        data={tableData}
        columns={columns}
        totalRows={totalRows}
        pagination={pagination}
        paginationMeta={paginationMeta}
        paginationResults={results}
        setPagination={setPagination}
        globalFilter={globalFilter}
        setGlobalFilter={setGlobalFilter}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        searchPlaceholder={t("search_placeholder")}

        onEdit={(row) => navigate(`/categories/${row.id}/edit`)}
        onDelete={handleDeleteClick}
        onImport={handleImport}
        onExportCsv={handleExportCsv}
        onExportXlsx={handleExportXlsx}
        csvLabel={t("export_csv")}
        xlsxLabel={t("export_xlsx")}

        importBttnLabel={t("import")}
        exportBttnLabel={t("export")}
        tableId="categories-table"
      />

      <ConfirmationModal
        isOpen={openConfirm}
        onClose={() => setOpenConfirm(false)}
        onConfirm={confirmDelete}
        title={t("delete_modal.title")}
        message={t("delete_modal.message")}
        confirmText={t("delete_modal.confirm")}
        cancelText={t("delete_modal.cancel")}
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};