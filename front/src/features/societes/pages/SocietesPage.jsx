import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/shared/utils/toast";
import { CheckCircle, XCircle } from "lucide-react";
import { CiImageOff } from "react-icons/ci";
import { Building2, Globe, Phone, Mail } from "lucide-react";
import { BuildingOffice2Icon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";

/* ---------- Hooks ----------- */
import {
    useSocietes,
    useDeleteSociete,
} from "../hooks/useSocietes";

/* ---------- Table ---------- */
import { ReusableTable } from "../../../shared/components/ReusableTable";
import { ConfirmationModal } from "../../../shared/components/ConfirmationModal";
import { HeaderTable } from "../../../shared/components/HeaderTable";

export const SocietesPage = () => {
    const { t } = useTranslation("societes");
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
    const { data, isLoading, isFetching, isError } = useSocietes({
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
        keyword: globalFilter,
    });

    const deleteMutation = useDeleteSociete();

    const tableData = data?.data ?? [];
    const paginationMeta = data?.pagination;
    const results = data?.results;

    const totalRows = paginationMeta
        ? paginationMeta.numberOfPages * paginationMeta.limit
        : 0;

    /* ---------- Columns ---------- */
    const columns = [
        {
            accessorKey: "logo",
            header: t("logo"),
            size: 88,
            enableSorting: false,
            Cell: ({ cell }) => {
                const url = cell.getValue();
                return url ? (
                    <img
                        src={url}
                        alt=""
                        className="h-12 w-16 object-contain"
                        onError={(e) => {
                            e.currentTarget.src =
                                "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
                        }}
                    />
                ) : (
                    <CiImageOff className="h-10 w-10 text-gray-400" />
                );
            },
        },
        {
            accessorKey: "raisonSocial",
            header: t("company_name"),
        },
        {
            accessorKey: "phone",
            header: t("phone"),
            Cell: ({ cell }) => (
                <span className="inline-flex items-center gap-1 font-medium">
                    <Phone className="w-3 h-3 text-blue-500" />
                    {cell.getValue() || "—"}
                </span>
            ),
        },
        {
            accessorKey: "email",
            header: t("email"),
            Cell: ({ cell }) => (
                <span className="inline-flex items-center gap-1">
                    <Mail className="w-3 h-3 text-green-600" />
                    {cell.getValue() || "—"}
                </span>
            ),
        },
        { accessorKey: "address", header: t("address") },
        {
            accessorKey: "siteWeb",
            header: t("website"),
            Cell: ({ cell }) =>
                cell.getValue() ? (
                    <a
                        href={`https://${cell.getValue()}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-[#B12B89] font-medium underline"
                    >
                        <Globe className="w-3 h-3 text-blue-500" />
                        {cell.getValue()}
                    </a>
                ) : (
                    <span className="text-gray-400">—</span>
                ),
        },
        { accessorKey: "ice", header: t("ice") },
        { accessorKey: "rc", header: t("rc") },
        { accessorKey: "tp", header: t("tp") },
        { accessorKey: "if", header: t("if") },
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
        onCreate={() => navigate("/societes/create")}
        createLabel={t("create_company")}
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

                    onEdit={(row) => {
                        const id = Number(row?.id ?? row?.original?.id);
                        if (Number.isFinite(id) && id > 0) navigate(`/societes/${id}/edit`);
                    }}
                    onShow={(row) => {
                        const id = Number(row?.id ?? row?.original?.id);
                        if (Number.isFinite(id) && id > 0) navigate(`/societes/${id}`);
                    }}
                    onDelete={(row) => {
                        const data = row?.id != null ? row : row?.original;
                        if (data?.id != null) handleDeleteClick(data);
                    }}

                    /* tableId */
                    tableId="societes-table"
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
        </>
    );
};