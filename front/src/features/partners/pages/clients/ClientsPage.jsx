import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/shared/utils/toast";
import { CheckCircle, XCircle, User, Building2,Handshake } from "lucide-react";
import { useTranslation } from "react-i18next";


/* ---------- Hooks ----------- */
import {
  useClients,
  useDeleteClient,
  useExportClientsCsv,
  useExportClientsXlsx,
  useImportClientsCsv,
  useImportClientsXlsx,
  useImportClientsXlsxSimple,
  useImportClientsCsvSimple,
} from "../../hooks/useClients";

import { useSocietes } from "../../../societes/hooks/useSocietes";

/* ---------- Components ---------- */
import { HeaderTable } from "../../../../shared/components/HeaderTable";
import { ReusableTable } from "../../../../shared/components/ReusableTable";
import { ConfirmationModal } from "../../../../shared/components/ConfirmationModal";
import { ImportModal } from "../../../../shared/components/ImportModal";
import { useAuth } from "../../../auth/hooks/useAuth";

export const ClientsPage = () => {
  const { t } = useTranslation("clients");
  const navigate = useNavigate();
  const { user } = useAuth();

  /* ---------- State ---------- */
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 5 });
  const [openConfirm, setOpenConfirm] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const [openImport, setOpenImport] = useState(false);

  /* ---------- API ---------- */
  const { data: societesData } = useSocietes({ pageIndex: 0, pageSize: 100 });
  const societes = societesData?.data || [];

  const { data, isLoading, isFetching, isError } = useClients({
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
    keyword: globalFilter,
  });

  const deleteMutation = useDeleteClient();
  const importCsvMutation = useImportClientsCsv();
  const importXlsxMutation = useImportClientsXlsx();
  const importCsvMutationSimple = useImportClientsCsvSimple();
  const importXlsxMutationSimple = useImportClientsXlsxSimple();
  const exportCsvMutation = useExportClientsCsv();
  const exportXlsxMutation = useExportClientsXlsx();

  const tableData = data?.data ?? [];
  const paginationMeta = data?.pagination;
  const results = data?.results;
  const totalRows = paginationMeta ? paginationMeta.numberOfPages * paginationMeta.limit : 0;

  /* ---------- Columns ---------- */
  const columns = useMemo(() => [
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
          <span className={`px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${badge.className}`}>
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {badge.label}
          </span>
        );
      },
    },
    { accessorKey: "phone", header: t("columns.phone") },
    { accessorKey: "email", header: t("columns.email") },
    { accessorKey: "address", header: t("columns.address") },
    { accessorKey: "city", header: t("columns.city") },
    { accessorKey: "region", header: t("columns.region") },
    { accessorKey: "website", header: t("columns.website") },
    { accessorKey: "ice", header: t("columns.ice") },
    { accessorKey: "if", header: t("columns.if") },
    { accessorKey: "rc", header: t("columns.rc") },
    { accessorKey: "tp", header: t("columns.tp") },
    {
      accessorKey: "creditLimit",
      header: t("columns.creditLimit"),
      Cell: ({ cell }) => (
        <span className="font-medium">
          {Number(cell.getValue() || 0).toLocaleString()} {t("currency")}
        </span>
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
  ], [t, user]);

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
      onError: (err) => toast.error(err?.response?.data?.message || t("delete.error")),
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
      onSuccess: (blob) => download(blob, "Clients.csv"),
      onError: () => toast.error(t("export.csv_error")),
    });
  };

  const handleExportXlsx = () => {
    exportXlsxMutation.mutate(undefined, {
      onSuccess: (blob) => download(blob, "Clients.xlsx"),
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
          <div className="p-4 md:p-8 min-h-screen transition-colors duration-300">
      {/* Page Header Section */}
      <HeaderTable
        title={t("page_title")}
        onCreate={() => navigate("/clients/create")}
        createLabel={t("create_new")}
      />
      {/* Table Container with a subtle shadow/card look */}

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

        onEdit={(row) => navigate(`/clients/${row.id}/edit`)}
        onShow={(row) => navigate(`/clients/${row.id}`)}
        onDelete={handleDeleteClick}
        {...(!user?.isSuperAdmin ? { onImport: handleImport } : {})}
        {...(user?.isSuperAdmin ? { onImportClick: () => setOpenImport(true) } : {})}
        onExportCsv={handleExportCsv}
        onExportXlsx={handleExportXlsx}
          csvLabel={t("export_csv")}
        xlsxLabel={t("export_xlsx")}

        importBttnLabel={t("import_simple")}
        exportBttnLabel={t("export_simple")}
        tableId="clients-table"
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