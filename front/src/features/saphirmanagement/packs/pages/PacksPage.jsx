// src/features/packs/pages/PacksPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/shared/utils/toast";
import { Box, Package, Copy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ReusableTable } from "../../../../shared/components/ReusableTable";
import { ConfirmationModal } from "../../../../shared/components/ConfirmationModal";
import { HeaderTable } from "../../../../shared/components/HeaderTable";
import { usePacks, useDeletePack } from "../hooks/usePacks";
import { PrintBarcodeModal } from "../../../products/components/PrintBarcodeModal";

export const PacksPage = () => {
  const { t } = useTranslation("packs");
  const navigate = useNavigate();

  /* ── State ── */
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [openPrintBarcode, setOpenPrintBarcode] = useState(false);

  /* ── API ── */
  const { data, isLoading, isFetching, isError } = usePacks({
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
    keyword: globalFilter,
  });

  const deleteMutation = useDeletePack();

  const tableData = data?.data ?? [];
  const paginationMeta = data?.pagination
    ? {
        currentPage: data.pagination.page,
        limit: data.pagination.limit,
        numberOfPages: data.pagination.totalPages,
      }
    : null;
  const totalRows = data?.pagination ? data.pagination.total : 0;

  /* ── Columns ── */
  const columns = [
    {
      accessorKey: "barcode",
      header: t("columns.barcode"),
      size: 150,
      Cell: ({ cell }) => {
        const value = cell.getValue();
        if (!value) return <span className="text-gray-400">—</span>;
        return (
          <div
            onClick={() => {
              navigator.clipboard.writeText(value);
              toast.success(t("toast.barcode_copied"));
            }}
            className="flex items-center gap-2 font-mono text-sm text-slate-600 dark:text-slate-400 cursor-pointer px-2 py-1 rounded-md transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-[#B12B89] dark:hover:text-blue-400"
            title={t("toast.barcode_copied")}
          >
            <span className="font-medium">{value}</span>
            <Copy className="w-3.5 h-3.5 opacity-50" />
          </div>
        );
      },
    },
    {
      accessorKey: "name",
      header: t("columns.name"),
      size: 200,
      Cell: ({ cell }) => <span className="font-semibold text-gray-800 dark:text-gray-200">{cell.getValue()}</span>
    },
    {
      accessorKey: "tauxMarge",
      header: t("columns.margin"),
      Cell: ({ cell }) => <span className="text-[#B12B89] font-medium">{cell.getValue()}%</span>,
    },
    {
      accessorKey: "montantVenteArticles",
      header: t("columns.total_articles"),
      Cell: ({ cell }) => `${Number(cell.getValue()).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH`,
    },
    {
      accessorKey: "remise",
      header: t("columns.discount"),
      Cell: ({ cell }) => (
        <span className={Number(cell.getValue()) > 0 ? "text-red-500 font-bold" : "text-gray-400"}>
          {cell.getValue()}%
        </span>
      ),
    },
      {
      accessorKey: "purchasePrice",
      header: t("columns.purchase_price"),
      Cell: ({ cell }) => (
        <span className="text-blue-700 font-bold text-lg">
          {Number(cell.getValue()).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
        </span>
      ),
    },
    {
      accessorKey: "prixVentePack",
      header: t("columns.sale_price"),
      Cell: ({ cell }) => (
        <span className="text-green-700 font-bold text-lg">
          {Number(cell.getValue()).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
        </span>
      ),
    },
    {
      accessorKey: "active",
      header: t("columns.status"),
      size: 100,
      Cell: ({ cell }) =>
        cell.getValue() ? (
          <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold uppercase tracking-wider border border-green-200">
            {t("status.active")}
          </span>
        ) : (
          <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-bold uppercase tracking-wider border border-gray-200">
            {t("status.inactive")}
          </span>
        ),
    },
    {
      accessorKey: "createdAt",
      header: t("columns.created_at"),
      Cell: ({ cell }) => new Date(cell.getValue()).toLocaleDateString("fr-FR"),
    },
  ];

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

  return (
   <div className="p-4 md:p-8 min-h-screen transition-colors duration-300">
      <HeaderTable
        title={t("page_title")}
        onCreate={() => navigate("/packs/create")}
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

          onEdit={(row) => navigate(`/packs/${row.id}/edit`)}
          onDelete={handleDeleteClick}
          onPrint={() => setOpenPrintBarcode(true)}
          printBttnLabel={t("print_barcode")}

          tableId="packs-table"
        />
    
      <PrintBarcodeModal
        isOpen={openPrintBarcode}
        onClose={() => setOpenPrintBarcode(false)}
        initialMode="packs"
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
    </div>
  );
};