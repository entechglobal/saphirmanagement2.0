import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/shared/utils/toast";
import {
    Calendar, UserIcon, Mail, Copy,
    ShieldAlert, ShieldCheck, UserCog, CircleDollarSign,
    UserX, UserCheck, Building2
} from "lucide-react";
import { UserGroupIcon } from "@heroicons/react/24/outline";

import {
    useUsers, useDeleteUser, useDeactivateUser, useReactivateUser
} from "../../hooks/useUsers";
import { useTranslation } from "react-i18next";
import { ReusableTable } from "../../../../shared/components/ReusableTable";
import { ConfirmationModal } from "../../../../shared/components/ConfirmationModal";
import { HeaderTable } from "../../../../shared/components/HeaderTable";
import { getApiError } from "../../../../shared/utils/apiError";

export const UsersPage = () => {
    const { t } = useTranslation("users");
    const navigate = useNavigate();

    const [globalFilter, setGlobalFilter] = useState("");
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 5 });

    // Hard delete modal
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);

    // Deactivate modal
    const [openDeactivate, setOpenDeactivate] = useState(false);
    const [deactivateRow, setDeactivateRow] = useState(null);

    const { data, isLoading, isFetching, isError } = useUsers({
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
        keyword: globalFilter,
    });

    const results = data?.results;
    const tableData = data?.data ?? [];
    const paginationMeta = data?.pagination;
    const totalRows = paginationMeta
        ? paginationMeta.numberOfPages * paginationMeta.limit
        : 0;

    const deleteMutation = useDeleteUser();
    const deactivateMutation = useDeactivateUser();
    const reactivateMutation = useReactivateUser();

    const columns = [
        { accessorKey: "id", header: t("id"), size: 80 },
        {
            accessorKey: "name",
            header: t("name"),
            Cell: ({ cell }) => (
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <UserIcon className="w-4 h-4 text-[#B12B89]" />
                    </div>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {cell.getValue()}
                    </span>
                </div>
            ),
        },
        {
            accessorKey: "email",
            header: t("email"),
            Cell: ({ cell }) => {
                const email = cell.getValue();
                const handleCopyEmail = () => {
                    navigator.clipboard.writeText(email).then(() => {
                        toast.success(t("toast.email_copied"));
                    }).catch(() => {
                        toast.error(t("toast.copy_failed"));
                    });
                };
                return (
                    <div 
                        onClick={handleCopyEmail}
                        className="flex items-center gap-2 text-slate-600 dark:text-slate-400 cursor-pointer p-2 rounded-md transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-[#B12B89] dark:hover:text-blue-400"
                        title={t("email_copy_hint")}
                    >
                        <Mail className="w-4 h-4 opacity-70" />
                        <span className="font-medium">{email}</span>
                        <Copy className="w-4 h-4 opacity-50 transition-opacity" />
                    </div>
                );
            },
        },
        {
            accessorKey: "societe.raisonSocial",
            header: t("details.assigned_societe"),
            Cell: ({ cell, row }) => {
                const name = cell.getValue();
                if (row.original.isSuperAdmin) {
                    return (
                        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 italic">
                            {t("details.global_access")}
                        </span>
                    );
                }
                return (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Building2 className="w-4 h-4 text-[#B12B89] flex-shrink-0" />
                        <span className="font-medium">{name || "—"}</span>
                    </div>
                );
            },
        },
        {
            accessorKey: "role.name",
            header: t("role"),
            Cell: ({ cell }) => {
                const role = cell.getValue();
                const roleConfig = {
                    Super_Admin: {
                        color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
                        icon: <ShieldAlert className="w-4 h-4 text-red-500" />,
                        label: t("super_admin"),
                    },
                    Societe_Admin: {
                        color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
                        icon: <ShieldCheck className="w-4 h-4 text-emerald-500" />,
                        label: t("societe_admin"),
                    },
                    Gerant: {
                        color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
                        icon: <UserCog className="w-4 h-4 text-blue-500" />,
                        label: t("gerant"),
                    },
                    Caissier: {
                        color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
                        icon: <CircleDollarSign className="w-4 h-4 text-amber-500" />,
                        label: t("caissier"),
                    },
                };
                const config = roleConfig[role] || {
                    color: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400",
                    icon: <UserIcon className="w-4 h-4 text-slate-500" />,
                    label: role?.replace("_", " "),
                };
                return (
                    <div className="flex items-center gap-2">
                        {config.icon}
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${config.color}`}>
                            {config.label}
                        </span>
                    </div>
                );
            },
        },
        {
            accessorKey: "active",
            header: t("status"),
            Cell: ({ cell }) => {
                const active = cell.getValue();
                return active ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        {t("active")}
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        {t("inactive")}
                    </span>
                );
            },
        },
        {
            accessorKey: "createdAt",
            header: t("created_at"),
            Cell: ({ cell }) => {
                const value = cell.getValue();
                if (!value) {
                    return (
                        <div className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300">
                            <Calendar className="w-4 h-4 text-[#B12B89]" />
                            <span>—</span>
                        </div>
                    );
                }

                const date = new Date(value);
                const day = date.getDate().toString().padStart(2, '0');
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const year = date.getFullYear();

                return (
                    <div className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300">
                        <Calendar className="w-4 h-4 text-[#B12B89]" />
                        <span>{`${day}/${month}/${year}`}</span>
                    </div>
                );
            },
        },
    ];

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
                toast.error(getApiError(err, t("toast.delete_error")));
            },
        });
    };

    const handleDeactivateClick = (row) => {
        setDeactivateRow(row);
        setOpenDeactivate(true);
    };

    const confirmDeactivate = () => {
        if (!deactivateRow) return;
        const isActive = deactivateRow.active;
        const action = isActive ? deactivateMutation : reactivateMutation;
        action.mutate(deactivateRow.id, {
            onSuccess: (res) => {
                toast.success(res?.message || (isActive ? t("toast.deactivate_success") : t("toast.reactivate_success")));
                setOpenDeactivate(false);
                setDeactivateRow(null);
            },
            onError: (err) => {
                setOpenDeactivate(false);
                toast.error(getApiError(err, t("toast.action_error")));
            },
        });
    };

    // Extra action column for deactivate/reactivate
    const extraActions = [
        {
            label: (row) => row.active ? t("deactivate") : t("reactivate"),
            icon: (row) => row.active
                ? <UserX className="w-4 h-4" />
                : <UserCheck className="w-4 h-4" />,
            onClick: handleDeactivateClick,
            className: (row) => row.active
                ? "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                : "text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20",
        },
    ];

    return (
        <div className="p-4 md:p-8 min-h-screen transition-colors duration-300">
            <HeaderTable
        title={t("title")}
        onCreate={() => navigate("/users/create")}
        createLabel={t("create_user")}
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

                onEdit={(row) => navigate(`/users/${row.id}/edit`)}
                onShow={(row) => navigate(`/users/${row.id}`)}
                onDelete={handleDeleteClick}
                extraActions={extraActions}

                tableId="users-table"
            />

            {/* Hard delete confirmation */}
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

            {/* Deactivate / Reactivate confirmation */}
            <ConfirmationModal
                isOpen={openDeactivate}
                onClose={() => setOpenDeactivate(false)}
                onConfirm={confirmDeactivate}
                title={deactivateRow?.active ? t("deactivate_modal.title") : t("reactivate_modal.title")}
                message={
                    deactivateRow?.active
                        ? t("deactivate_modal.message")
                        : t("reactivate_modal.message")
                }
                confirmText={deactivateRow?.active ? t("deactivate_modal.confirm") : t("reactivate_modal.confirm")}
                cancelText={deactivateRow?.active ? t("deactivate_modal.cancel") : t("reactivate_modal.cancel")}
                variant={deactivateRow?.active ? "warning" : "success"}
                isLoading={deactivateMutation.isPending || reactivateMutation.isPending}
            />

        </div>
    );
};