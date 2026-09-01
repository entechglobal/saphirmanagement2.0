import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/shared/utils/toast";
import { Plug2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/features/auth";
import { useSocietes } from "@/features/societes/hooks/useSocietes";
import { useDeliveriesList } from "../../delivries/hooks/useDeliveries";
import {
  useDeliveryProviderConfigs,
  useDeleteDeliveryProviderConfig,
} from "../hooks/useDeliveryProviderConfigs";
import { HeaderTable } from "../../../../shared/components/HeaderTable";
import { ReusableTable } from "../../../../shared/components/ReusableTable";
import { FiltersBar } from "../../../../shared/components/FiltersBar";
import { ConfirmationModal } from "../../../../shared/components/ConfirmationModal";

export const DeliveryProviderConfigsPage = () => {
  const { t } = useTranslation("deliveryProviderConfigs");
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuperAdmin = user?.isSuperAdmin ?? false;

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const [selectedLivreur, setSelectedLivreur] = useState(null);
  const [livreurKeyword, setLivreurKeyword] = useState("");

  const [selectedSociete, setSelectedSociete] = useState(null);
  const [societeKeyword, setSocieteKeyword] = useState("");

  const [openConfirm, setOpenConfirm] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const { data: livreursData, isLoading: livreursLoading } = useDeliveriesList({
    pageIndex: 0,
    pageSize: 1000,
    keyword: livreurKeyword,
  });
  const livreurOptions = (livreursData?.data ?? []).filter(
    (d) => d.entityType === "SOCIETE" && d.type === "EXTERN"
  );

  const { data: societesData, isLoading: societesLoading } = useSocietes({
    pageIndex: 0,
    pageSize: 1000,
    keyword: societeKeyword,
  });
  const societeOptions = societesData?.data ?? [];

  const { data, isLoading, isFetching, isError } = useDeliveryProviderConfigs({
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
    provider: selectedLivreur?.name ?? undefined,
    societeId: selectedSociete?.id ?? undefined,
  });

  const deleteMutation = useDeleteDeliveryProviderConfig();

  const tableData = data?.data ?? [];
  const totalRows = data?.results ?? 0;

  const hasActiveFilters = !!selectedLivreur || !!selectedSociete;

  const handleReset = () => {
    setSelectedLivreur(null);
    setLivreurKeyword("");
    setSelectedSociete(null);
    setSocieteKeyword("");
  };

  const columns = useMemo(
    () => [
      { accessorKey: "id", header: t("columns.id"), size: 60 },
      {
        accessorKey: "name",
        header: t("columns.name"),
        Cell: ({ cell }) => (
          <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
            {cell.getValue()}
          </span>
        ),
      },
      {
        accessorKey: "provider",
        header: t("columns.provider"),
        Cell: ({ cell }) => (
          <span className="text-[11px] font-bold uppercase px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-[#B12B89] dark:text-blue-400">
            {cell.getValue()}
          </span>
        ),
      },
      {
        accessorKey: "active",
        header: t("columns.status"),
        Cell: ({ row }) => (
          <span
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
              row.original.active
                ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400"
            }`}
          >
            {row.original.active ? t("status.active") : t("status.inactive")}
          </span>
        ),
      },
    ],
    [t]
  );

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

  const filters = [
    {
      type: "async-select",
      label: t("filter_livreur"),
      options: livreurOptions,
      value: selectedLivreur,
      onChange: setSelectedLivreur,
      loading: livreursLoading,
      getOptionLabel: (o) => o?.name ?? "",
      onInputChange: setLivreurKeyword,
      allLabel: t("filter_all_livreurs"),
    },
    ...(isSuperAdmin
      ? [
          {
            type: "async-select",
            label: t("filter_societe"),
            options: societeOptions,
            value: selectedSociete,
            onChange: setSelectedSociete,
            loading: societesLoading,
            getOptionLabel: (o) => o?.raisonSocial ?? "",
            onInputChange: setSocieteKeyword,
            allLabel: t("filter_all_societes"),
          },
        ]
      : []),
  ];

  return (
    <div className="p-4 md:p-8 min-h-screen transition-colors duration-300">
      <HeaderTable
        title={t("title")}
        onCreate={() => navigate("/delivery-provider-configs/create")}
        createLabel={t("create_new")}
      />

      <FiltersBar
        filters={filters}
        cols={{
          xs: "1fr",
          sm: isSuperAdmin ? "repeat(2, 1fr)" : "1fr",
        }}
        hasActiveFilters={hasActiveFilters}
        onReset={handleReset}
        t={t}
      />

      <ReusableTable
        data={tableData}
        columns={columns}
        totalRows={totalRows}
        pagination={pagination}
        setPagination={setPagination}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}

        onEdit={(row) => navigate(`/delivery-provider-configs/${row.id}/edit`)}
        onDelete={handleDeleteClick}

        tableId="delivery-provider-configs-table"
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
