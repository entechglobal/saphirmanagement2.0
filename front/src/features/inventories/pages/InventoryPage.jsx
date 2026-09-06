import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/shared/utils/toast";
import { ClipboardDocumentListIcon } from "@heroicons/react/24/outline";
import { Calendar, Warehouse, User, CheckCircle, Clock, Building2, Hash, ArrowRightLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

/* ---------- Hooks ----------- */
import { useInventories, useDeleteInventory } from "../hooks/useInventories";

/* ---------- Components ---------- */
import { ReusableTable } from "../../../shared/components/ReusableTable";
import { HeaderTable } from "../../../shared/components/HeaderTable";
import { ConfirmationModal } from "../../../shared/components/ConfirmationModal";

export const InventoryPage = () => {
    const navigate = useNavigate();
    const { t } = useTranslation("inventory");

    /* ---------- State ---------- */
    const [globalFilter, setGlobalFilter] = useState("");
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 5,
    });
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);

    /* ---------- API ---------- */
    const { data, isLoading, isFetching, isError } = useInventories({
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
        keyword: globalFilter,
    });

    const deleteMutation = useDeleteInventory();

    const tableData = data?.data ?? [];
    const paginationMeta = data?.pagination;
    const results = data?.results;

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
                toast.error(err?.response?.data?.message || t("toast.delete_error"));
            },
        });
    };

    /* ---------- Columns (Mapping All JSON Data) ---------- */
    const columns = [
        {
            accessorKey: "inventoryNumber",
            header: t("inventory_number"),
            Cell: ({ cell, row }) => (
                <div className="flex flex-col">
                    <span className="font-bold text-blue-700">{cell.getValue()}</span>

                </div>
            )
        },
        {
            accessorKey: "inventoryDate",
            header: t("inventory_date"),
            Cell: ({ cell }) => (
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-700 dark:text-gray-100">
                        {cell.getValue()}                        </span>

                </div>
            ),
        },
        {
            accessorKey: "depot.name",
            header: t("depot"),
            Cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="flex items-center gap-1 font-medium text-gray-700 dark:text-gray-100 text-sm">
                        <Warehouse className="w-3.5 h-3.5 text-gray-500 dark:text-gray-300" />
                        {row.original.depot?.name || "—"}
                    </span>
                </div>
            ),
        },
        {
            accessorKey: "depot.societe.raisonSocial",
            header: t("company"),
            Cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-400 dark:text-blue-300" />
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-200">
                        {row.original.depot?.societe?.raisonSocial || "—"}
                    </span>
                </div>
            ),
        },
        {
            accessorKey: "notes",
            header: t("notes"),
            Cell: ({ cell }) => (
                <span className="text-xs italic max-w-[200px] truncate block text-gray-500 dark:text-gray-300" title={cell.getValue()}>
                    {cell.getValue() || t("no_notes")}
                </span>
            ),
        },
        {
            accessorKey: "gap",
            header: t("total_variance"),
            Cell: ({ cell }) => {
                const raw = cell.getValue();
                const value = Number(raw);
                if (raw === null || raw === undefined || raw === "") {
                    return <span className="text-slate-400 dark:text-slate-500">—</span>;
                }
                if (value === 0) {
                    return (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-500 dark:bg-[#222222] dark:text-slate-400">
                            <Minus className="w-3.5 h-3.5" />
                            0
                        </span>
                    );
                }
                if (value > 0) {
                    return (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            <TrendingUp className="w-3.5 h-3.5" />
                            +{value.toLocaleString("fr-FR")}
                        </span>
                    );
                }
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                        <TrendingDown className="w-3.5 h-3.5" />
                        {value.toLocaleString("fr-FR")}
                    </span>
                );
            },
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
            header: t("statistics"),
            id: "stats",
            Cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-300">{t("product_count")}</span>
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 text-xs font-bold dark:bg-blue-900 dark:text-blue-200 dark:border-blue-800">
                            <Hash className="w-3 h-3 dark:text-blue-300" /> {row.original._count?.lines || 0}
                        </span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-300">{t("transactions_count")}</span>
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-100 text-xs font-bold dark:bg-purple-900 dark:text-purple-200 dark:border-purple-800">
                            <ArrowRightLeft className="w-3 h-3 dark:text-purple-300" /> {row.original._count?.transactions || 0}
                        </span>
                    </div>
                </div>
            ),
        }
    ];

    return (
        <div className="p-4 md:p-8 min-h-screen transition-colors duration-300">
            <HeaderTable
        title={t("title")}
        onCreate={() => navigate("/inventaires/create")}
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

                onEdit={(row) => navigate(`/inventaires/${row.id}/edit`)}
                enableRowActions={true}
                tableId="inventories-table"
            />

            <ConfirmationModal
                isOpen={openConfirm}
                onClose={() => setOpenConfirm(false)}
                onConfirm={confirmDelete}
                title={t("delete_modal.title")}
                message={t("delete_modal.message", { inventoryNumber: selectedRow?.inventoryNumber })}
                confirmText={t("delete_modal.confirm")}
                cancelText={t("delete_modal.cancel")}
                variant="danger"
                isLoading={deleteMutation.isPending}
            />
        </div>
    );
};