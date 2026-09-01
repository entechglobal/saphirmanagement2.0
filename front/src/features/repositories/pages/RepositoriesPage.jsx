import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/shared/utils/toast";
import { CheckCircle, XCircle, MapPin, User, Hash, Phone, Mail } from "lucide-react";
import { ArchiveBoxIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";

/* ---------- Hooks ----------- */
import {
    useDeleteDepot,
    useDepots
} from "../hooks/useRepositories";

/* ---------- Table ---------- */
import { ReusableTable } from "../../../shared/components/ReusableTable";
import { ConfirmationModal } from "../../../shared/components/ConfirmationModal";
import { HeaderTable } from "../../../shared/components/HeaderTable";

export const RepositoriesPage = () => {
    const { t } = useTranslation("repositories");
    const navigate = useNavigate();

    /* ---------- State ---------- */
    const [globalFilter, setGlobalFilter] = useState("");
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 5,
    });
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);

    /* ---------- API ---------- */
    const { data, isLoading, isFetching, isError } = useDepots({
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
        keyword: globalFilter,
    });

    const deleteMutation = useDeleteDepot();

    const tableData = data?.data ?? [];
    const paginationMeta = data?.pagination;
    const results = data?.results;

    const totalRows = paginationMeta
        ? paginationMeta.numberOfPages * paginationMeta.limit
        : 0;

    /* ---------- Columns ---------- */
    const columns = [
        {
            accessorKey: "code",
            header: t("code"),
            size: 100,
            Cell: ({ cell }) => <span className="font-bold text-gray-700">{cell.getValue()}</span>
        },
        {
            accessorKey: "name",
            header: t("depot_name"),
        },
        {
            accessorKey: "societe.raisonSocial",
            header: t("company"),
            Cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#B12B89]">
                        {row.original.societe?.raisonSocial || "—"}
                    </span>
                </div>
            ),
        },
        {
            accessorKey: "manager",
            header: t("manager"),
            Cell: ({ cell }) => (
                <span className="inline-flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-gray-500" />
                    {cell.getValue() || "—"}
                </span>
            ),
        },
        {
            accessorKey: "city",
            header: t("city"),
            Cell: ({ row }) => (
                <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-green-500" />
                    {row.original.city}
                </span>
            ),
        },
        {
            accessorKey: "phone",
            header: t("contact"),
            Cell: ({ row }) => (
                <div className="flex flex-col text-xs gap-0.5">
                    <span className="flex items-center gap-1">{row.original.phone ? <Phone className="w-3 h-3" /> : ""} {row.original.phone}</span>
                    <span className="flex items-center gap-1 text-gray-500">{row.original.email ? <Mail className="w-3 h-3" /> : ""} {row.original.email}</span>
                </div>
            ),
        },
        {
            accessorKey: "type",
            header: t("type"),
            Cell: ({ cell }) => {
                const type = cell.getValue();
                const typeMap = {
                    PRINCIPAL: { label: t("primary"), cls: "bg-green-100 text-green-700" },
                    SECONDARY: { label: t("secondary"), cls: "bg-blue-100 text-blue-700" },
                    OUTLET: { label: t("outlet"), cls: "bg-orange-100 text-orange-700" },
                };
                const { label, cls } = typeMap[type] ?? { label: type, cls: "bg-gray-100 text-gray-600" };
                return (
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${cls}`}>
                        {label}
                    </span>
                );
            }
        },
        {
            accessorKey: "active",
            header: t("status"),
            size: 80,
            Cell: ({ cell }) => (
                cell.getValue() ? (
                    <span className="inline-flex items-center gap-1">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="ml-1 text-green-500">{t("active")}</span>
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1">
                        <XCircle className="w-5 h-5 text-red-500" />
                        <span className="ml-1 text-red-500">{t("inactive")}</span>
                    </span>
                )
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

    return (
        <>
            <div className="p-4 md:p-8 min-h-screen transition-colors duration-300">
                {/* Page Header Section */}
                <HeaderTable
        title={t("title")}
        onCreate={() => navigate("/depots/create")}
        createLabel={t("create_depot")}
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

                    onEdit={(row) => navigate(`/depots/${row.id}/edit`)}
                    onShow={(row) => navigate(`/depots/${row.id}`)}
                    onDelete={handleDeleteClick}

                    /* tableId */
                    tableId="repositories-table"
                />

                <ConfirmationModal
                    isOpen={openConfirm}
                    onClose={() => setOpenConfirm(false)}
                    onConfirm={confirmDelete}
                    title={t("delete_modal.title")}
                    message={t("delete_modal.message", { depotName: selectedRow?.name })}
                    confirmText={t("delete_modal.confirm")}
                    cancelText={t("delete_modal.cancel")}
                    variant="danger"
                    isLoading={deleteMutation.isPending}
                />
            </div>
        </>
    );
};