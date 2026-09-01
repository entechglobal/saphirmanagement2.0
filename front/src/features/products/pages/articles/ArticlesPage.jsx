import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/shared/utils/toast";
import { CiImageOff } from "react-icons/ci";
import { Calendar, Copy } from "lucide-react";
import { DocumentIcon } from "@heroicons/react/24/outline";
import { PrintBarcodeModal } from "../../components/PrintBarcodeModal";


/* ---------- Hooks ----------- */
import {
  useArticles,
  useDeleteArticle,
  useImportArticlesCsv,
  useExportArticlesCsv,
  useImportArticlesXlsx,
  useExportArticlesXlsx,
} from "../../hooks/useArticles";

import { useTranslation } from "react-i18next";
import { formatUnit } from "../../../../shared/utils/units";

/* ---------- Table ---------- */
import { ReusableTable } from "../../../../shared/components/ReusableTable";
import { ConfirmationModal } from "../../../../shared/components/ConfirmationModal";
import { HeaderTable } from "../../../../shared/components/HeaderTable";
export const ArticlesPage = () => {
  const { t } = useTranslation("articles");
  const { t: tCommon } = useTranslation("common");
  const navigate = useNavigate();

  /* ---------- State ---------- */
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 5,
  });
  const [openConfirm, setOpenConfirm] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [openPrintBarcode, setOpenPrintBarcode] = useState(false);

  /* ---------- API ---------- */
  const { data, isLoading, isFetching, isError } = useArticles({
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
    keyword: globalFilter,
  });
  const results = data?.results;
  const deleteMutation = useDeleteArticle();

  const importCsvMutation = useImportArticlesCsv();
  const exportCsvMutation = useExportArticlesCsv();

  const importXlsxMutation = useImportArticlesXlsx();
  const exportXlsxMutation = useExportArticlesXlsx();

  const tableData = data?.data ?? [];
  const paginationMeta = data?.pagination;

  const totalRows = paginationMeta
    ? paginationMeta.numberOfPages * paginationMeta.limit
    : 0;

  /* ---------- Columns ---------- */

  const columns = [
    { accessorKey: "id", header: t("id"), size: 80 },

    {
      accessorKey: "barcode",
      header: t("barcode"),
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

    { accessorKey: "name", header: t("name") },
    {
      accessorKey: "image",
      header: t("image"),
      Cell: ({ cell }) => {
        const url = cell.getValue();
        return url ? (
          <img
            src={url}
            alt="Article"
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
      accessorKey: "family.name",
      header: t("family"),
    },

    {
      accessorKey: "unitePrincipale.symbol",
      header: t("unit"),
      Cell: ({ row }) => (
        <span>
          {formatUnit(row.original.unitePrincipale?.symbol, tCommon) || "—"}
        </span>
      ),
    },

    {
      accessorKey: "prixAchat",
      header: t("purchase_price"),
      Cell: ({ cell }) => (
        <span className="font-medium">
          {Number(cell.getValue()).toFixed(2)} dh
        </span>
      ),
    },

    {
      accessorKey: "prixVente1",
      header: `${t("sale_price")} 1`,

      Cell: ({ cell }) => (
        <span className="font-medium text-[#B12B89]">
          {Number(cell.getValue()).toFixed(2)} dh
        </span>
      ),
    },
    {
      accessorKey: "prixVente2",
      header: `${t("sale_price")} 2`,
      Cell: ({ cell }) => (
        <span className="font-medium text-[#B12B89]">
          {Number(cell.getValue()).toFixed(2)} dh
        </span>
      ),
    },
    {
      accessorKey: "prixVente3",
      header: `${t("sale_price")} 3`,
      Cell: ({ cell }) => (
        <span className="font-medium text-[#B12B89]">
          {Number(cell.getValue()).toFixed(2)} dh
        </span>
      ),
    },

    {
      accessorKey: "gereEnStock",
      header: t("manage_stock"),
      Cell: ({ cell }) =>
        cell.getValue() ? (
          <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold">
            {t("yes")}
          </span>
        ) : (
          <span className="px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-semibold">
            {t("no")}
          </span>
        ),
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

    {
      accessorKey: "dateExpiration",
      header: t("expiration_date"),
      Cell: ({ cell }) => {
        const value = cell.getValue();

        if (!value) {
          return <span className="text-gray-400">—</span>;
        }

        const date = new Date(value);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();

        return (
          <div className="flex items-center gap-2 font-medium text-gray-700">
            <Calendar className="w-4 h-4 text-blue-500" />
            <span className="text-gray-800 dark:text-gray-100">
              {`${day}/${month}/${year}`}
            </span>
          </div>
        );
      },
    },

    {
      accessorKey: "dureeExpiration",
      header: t("expiration_duration"),
      Cell: ({ cell }) => {
        const value = cell.getValue();
        let color = "bg-green-100 text-green-800";
        if (value && value <= 5) color = "bg-red-100 text-red-800";
        else if (value && value <= 10) color = "bg-yellow-100 text-yellow-800";

        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-semibold ${color}`}
          >
            {value ?? "—"} {t("days")}
          </span>
        );
      },
    },

    {
      accessorKey: "remise",
      header: t("discount"),
      Cell: ({ cell }) =>
        cell.getValue() ? (
          <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
            {Math.round(cell.getValue() * 100)}%
          </span>
        ) : (
          "—"
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

  const handleImport = (file) => {
    const isXlsx = file.name.endsWith(".xlsx");
    const mutation = isXlsx ? importXlsxMutation : importCsvMutation;

    mutation.mutate(file, {
      onSuccess: (res) => toast.success(res?.message || t("toast.import_success")),
      onError: (err) =>
        toast.error(err?.response?.data?.message || t("toast.import_error")),
    });
  };

  const handleExportCsv = () => {
    exportCsvMutation.mutate(undefined, {
      onSuccess: (blob) => download(blob, "Articles.csv"),
      onError: () => toast.error(t("toast.export_failed")),
    });
  };

  const handleExportXlsx = () => {
    exportXlsxMutation.mutate(undefined, {
      onSuccess: (blob) => download(blob, "Articles.xlsx"),
      onError: () => toast.error(t("toast.export_failed")),
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
    <>
       <div className="p-4 md:p-8 min-h-screen transition-colors duration-300">
          {/* Page Header Section */}
          <HeaderTable
        title={t("title")}
        onCreate={() => navigate("/articles/create")}
        createLabel={t("create_new")}
      />
          {/* Table Container with a subtle shadow/card look */}
    
      <ReusableTable
        /* Data */
        data={tableData}
        columns={columns}
        totalRows={totalRows}
        /* State */
        pagination={pagination}
        paginationMeta={paginationMeta}
        paginationResults={results}
        setPagination={setPagination}
        globalFilter={globalFilter}
        setGlobalFilter={setGlobalFilter}
        /* Status */
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        /* Actions */

        onEdit={(row) => navigate(`/articles/${row.id}/edit`)}
        onShow={(row) => navigate(`/articles/${row.id}`)}
        onDelete={handleDeleteClick}
        onImport={handleImport}
        onExportCsv={handleExportCsv}
        onExportXlsx={handleExportXlsx}
        csvLabel={t("export_csv")}
        xlsxLabel={t("export_xlsx")}

        importBttnLabel={t("import")}
        exportBttnLabel={t("export")}
        onPrint={() => setOpenPrintBarcode(true)}
        printBttnLabel={t("print_barcode")}
        /* tableId */
        tableId="articles-table"
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

      <PrintBarcodeModal
        isOpen={openPrintBarcode}
        onClose={() => setOpenPrintBarcode(false)}
      />
      </div>
    </>
  );
};
