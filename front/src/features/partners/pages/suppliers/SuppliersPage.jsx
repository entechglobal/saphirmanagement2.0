import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/shared/utils/toast";
import { CheckCircle, XCircle, User, Building2, Truck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BuildingStorefrontIcon } from "@heroicons/react/24/outline"

/* ---------- Hooks ----------- */
import {
  useFournisseurs,
  useDeleteFournisseur,
  useExportFournisseursCsv,
  useExportFournisseursXlsx,
  useImportFournisseursCsv,
  useImportFournisseursXlsx,
  useImportFournisseursXlsxSimple,
  useImportFournisseursCsvSimple,
} from "../../hooks/useSuppliers";

import { useSocietes } from "../../../societes/hooks/useSocietes";
import { useAuth } from "../../../auth/hooks/useAuth";

/* ---------- Components ---------- */
import { HeaderTable } from "../../../../shared/components/HeaderTable";
import { ReusableTable } from "../../../../shared/components/ReusableTable";
import { ConfirmationModal } from "../../../../shared/components/ConfirmationModal";
import { ImportModal } from "../../../../shared/components/ImportModal";

export const SuppliersPage = () => {
  const { t } = useTranslation("suppliers");
  const navigate = useNavigate();
  const { user } = useAuth();

  /* ---------- State ---------- */
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 5,
  });
  const [openConfirm, setOpenConfirm] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  // For Import Modal logic
  const [openImport, setOpenImport] = useState(false);

  /* ---------- API ---------- */
  const { data: societesData } = useSocietes({ pageIndex: 0, pageSize: 100 });
  const societes = societesData?.data || [];

  const { data, isLoading, isFetching, isError } = useFournisseurs({
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
    keyword: globalFilter,
  });

  const deleteMutation = useDeleteFournisseur();

  // For sous admin or user api
  const importCsvMutationSimple = useImportFournisseursCsvSimple();
  const importXlsxMutationSimple = useImportFournisseursXlsxSimple();

  // Only for super admin logic api with parameter
  const importXlsxMutation = useImportFournisseursXlsx();
  const importCsvMutation = useImportFournisseursCsv();

  const exportCsvMutation = useExportFournisseursCsv();
  const exportXlsxMutation = useExportFournisseursXlsx();

  const tableData = data?.data ?? [];
  const paginationMeta = data?.pagination;
  const results = data?.results;

  const totalRows = paginationMeta
    ? paginationMeta.numberOfPages * paginationMeta.limit
    : 0;

  /* ---------- Columns ---------- */
  const columns = useMemo(
    () => [
      { accessorKey: "id", header: t("columns.id"), size: 80 },
      { accessorKey: "name", header: t("columns.name") },
      ...(user?.isSuperAdmin ? [{
        accessorKey: "societe.raisonSocial",
        header: t("columns.societe"),
        Cell: ({ row }) => row.original.societe?.raisonSocial ?? "—",
      }] : []),
      {
        accessorKey: "type",
        header: t("columns.type"),
        Cell: ({ cell }) => {
          const value = cell.getValue();

          const config = {
            PARTICULIER: {
              label: t("types.particulier"),
              icon: User,
              className: "bg-emerald-100 text-emerald-800 border border-emerald-200",
            },
            SOCIETE: {
              label: t("types.societe"),
              icon: Building2,
              className: "bg-indigo-100 text-indigo-800 border border-indigo-200",
            },
          };

          const badge = config[value] ?? {
            label: value,
            icon: null,
            className: "bg-gray-100 text-gray-800 border border-gray-200",
          };

          const Icon = badge.icon;

          return (
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${badge.className}`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {badge.label}
            </span>
          );
        },
      },

      { accessorKey: "phone", header: t("columns.phone") },
      { accessorKey: "email", header: t("columns.email") },
      { accessorKey: "address", header: t("columns.address") },
      { accessorKey: "region", header: t("columns.region") },
      { accessorKey: "website", header: t("columns.website") },

      { accessorKey: "ice", header: t("columns.ice") },
      { accessorKey: "if", header: t("columns.if") },
      { accessorKey: "rc", header: t("columns.rc") },
      { accessorKey: "tp", header: t("columns.tp") },

      {
        accessorKey: "paymentDeadline",
        header: t("columns.paymentDeadline"),
        Cell: ({ cell }) =>
          cell.getValue() ? (
            <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-semibold">
              {cell.getValue()} {t("columns.days", { defaultValue: "days" })}
            </span>
          ) : (
            "—"
          ),
      },

      { accessorKey: "bankName", header: t("columns.bank") },

      {
        accessorKey: "bankAccount",
        header: t("columns.bankAccount"),
        Cell: ({ cell }) =>
          cell.getValue() ? (
            <span className="font-mono text-xs">{cell.getValue()}</span>
          ) : (
            "—"
          ),
      },

      {
        accessorKey: "active",
        header: t("columns.status"),
        Cell: ({ cell }) =>
          cell.getValue() ? (
            <div className="flex items-center gap-1 text-green-700 font-medium">
              <CheckCircle className="w-4 h-4" />
              {t("status.active")}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-red-700 font-medium">
              <XCircle className="w-4 h-4" />
              {t("status.inactive")}
            </div>
          ),
      },
    ],
    [t, user]
  );

  /* ---------- Handlers ---------- */
  const handleDeleteClick = (row) => {
    setSelectedRow(row);
    setOpenConfirm(true);
  };

  const confirmDelete = () => {
    if (!selectedRow) return;

    deleteMutation.mutate(selectedRow.id, {
      onSuccess: (res) => {
        toast.success(res?.message || t("delete.success"));
        setOpenConfirm(false);
        setSelectedRow(null);
      },
      onError: (err) => {
        setOpenConfirm(false);
        toast.error(err?.response?.data?.message || t("delete.error"));
      },
    });
  };

  const handleImport = (file) => {
    const isXlsx = file.name.endsWith(".xlsx");
    const mutation = isXlsx ? importXlsxMutationSimple : importCsvMutationSimple;

    mutation.mutate(file, {
      onSuccess: (res) => toast.success(res?.message || t("import.success")),
      onError: (err) => toast.error(err?.response?.data?.message || t("import.error")),
    });
  };

  const handleExportCsv = () => {
    exportCsvMutation.mutate(undefined, {
      onSuccess: (blob) => download(blob, "Fournisseurs.csv"),
      onError: () => toast.error(t("export.csv_error")),
    });
  };

  const handleExportXlsx = () => {
    exportXlsxMutation.mutate(undefined, {
      onSuccess: (blob) => download(blob, "Fournisseurs.xlsx"),
      onError: () => toast.error(t("export.xlsx_error")),
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
      {user?.isSuperAdmin && (
        <ImportModal
          isOpen={openImport}
          onClose={() => setOpenImport(false)}
          societes={societes.map((s) => ({ label: s.raisonSocial, value: s.id }))}
          isLoading={importCsvMutation.isPending || importXlsxMutation.isPending}
          title={t("import.title")}
          societeLabel={t("import.societe_label")}
          cancelText={t("import.cancel")}
          submitText={t("import.submit")}
          importingText={t("import.importing")}
          onSubmit={(file, societeId) => {
            const isXlsx = file.name.endsWith(".xlsx");
            const mutation = isXlsx ? importXlsxMutation : importCsvMutation;
            mutation.mutate(
              { file, societeId },
              {
                onSuccess: (res) => {
                  toast.success(res?.message || t("import.success"));
                  setOpenImport(false);
                },
                onError: (err) => {
                  toast.error(err?.response?.data?.message || t("import.error"));
                  setOpenImport(false);
                },
              }
            );
          }}
        />
      )}

      <div className="p-4 md:p-8 min-h-screen  transition-colors duration-300">
        <HeaderTable
        title={t("title")}
        onCreate={() => navigate("/fournisseurs/create")}
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

          onEdit={(row) => navigate(`/fournisseurs/${row.id}/edit`)}
          onShow={(row) => navigate(`/fournisseurs/${row.id}`)}
          onDelete={handleDeleteClick}
          {...(!user?.isSuperAdmin ? { onImport: handleImport } : {})}
          {...(user?.isSuperAdmin ? { onImportClick: () => setOpenImport(true) } : {})}
          onExportCsv={handleExportCsv}
          onExportXlsx={handleExportXlsx}
          csvLabel={t("export_csv")}
          xlsxLabel={t("export_xlsx")}

          importBttnLabel={t("import_simple")}
          exportBttnLabel={t("export_simple")}
          tableId="fournisseurs-table"
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
    </>
  );
};