import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "@/shared/utils/toast";
import { Wallet, Building2, TrendingUp, TrendingDown, PlusCircle, Landmark, Vault } from "lucide-react";
import { useCaisses, useUpdateCaisse, useDeleteCaisse, useMyCaisse } from "../hooks/useCaisse";
import { useAuth } from "../../auth/hooks/useAuth";
import { ReusableTable } from "../../../shared/components/ReusableTable";
import { HeaderTable } from "../../../shared/components/HeaderTable";
import { ConfirmationModal } from "../../../shared/components/ConfirmationModal";
import { CreateCaisseModal } from "../components/CreateCaisseModal";
import { CreateMyCaisseModal } from "../components/CreateMyCaisseModal";
import { CreateBankWalletModal } from "../components/CreateBankWalletModal";
import { CreateCoffreWalletModal } from "../components/CreateCoffreWalletModal";

const formatMAD = (val) =>
  Number(val ?? 0).toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TYPE_CONFIG = {
  USER: {
    label: "Utilisateur",
    cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    icon: <Wallet className="w-3 h-3" />,
  },
  BANK: {
    label: "Banque",
    cls: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
    icon: <Landmark className="w-3 h-3" />,
  },
  CAISSE: {
    label: "Caisse",
    cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    icon: <Vault className="w-3 h-3" />,
  },
};

const ActiveSwitch = ({ row, isPending, onToggle }) => {
  const active = row.active;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      onClick={() => onToggle(row)}
      disabled={isPending}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
        active ? "bg-[#B12B89]" : "bg-slate-200 dark:bg-[#2e2e2e]"
      } ${isPending ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
          active ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
};

export const CaissesUsersPage = () => {
  const { t } = useTranslation("caisse");
  const { user } = useAuth();
  const isSuperAdmin = !!user?.isSuperAdmin;
  const isSocieteAdmin = !isSuperAdmin && (user?.roleName ?? user?.role?.name ?? user?.role) === "Societe_Admin";
  const isAdmin = isSuperAdmin || isSocieteAdmin;

  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 15 });
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateBank, setShowCreateBank] = useState(false);
  const [showCreateCoffre, setShowCreateCoffre] = useState(false);
  const [showCreateMyCaisse, setShowCreateMyCaisse] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toggleTarget, setToggleTarget] = useState(null);

  const { data: myCaisseData, isLoading: myCaisseLoading } = useMyCaisse();
  const hasMyCaisse = !!myCaisseData?.data;

  const { data, isLoading, isFetching, isError } = useCaisses({
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
    keyword: globalFilter,
  });

  const updateMutation = useUpdateCaisse();
  const deleteMutation = useDeleteCaisse();

  const caisses = data?.data ?? [];
  const paginationMeta = data?.pagination;
  const totalRows = paginationMeta ? paginationMeta.numberOfPages * paginationMeta.limit : 0;

  const confirmToggle = () => {
    if (!toggleTarget) return;
    updateMutation.mutate(
      { id: toggleTarget.id, payload: { active: !toggleTarget.active } },
      {
        onSuccess: (res) => {
          toast.success(res?.message || (toggleTarget.active ? t("success_caisse_deactivated") : t("success_caisse_activated")));
          setToggleTarget(null);
        },
        onError: (err) => {
          toast.error(err?.response?.data?.message || t("err_update_caisse"));
          setToggleTarget(null);
        },
      }
    );
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: (res) => {
        toast.success(res?.message || t("success_caisse_deleted"));
        setDeleteTarget(null);
      },
      onError: (err) => {
        toast.error(err?.response?.data?.message || t("err_delete_caisse"));
        setDeleteTarget(null);
      },
    });
  };

  const columns = useMemo(() => [
    {
      accessorKey: "name",
      header: t("col_caisse_name"),
      Cell: ({ cell, row }) => {
        const cfg = TYPE_CONFIG[row.original.caisseType] ?? TYPE_CONFIG.USER;
        return (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
              <Wallet className="w-4 h-4 text-[#B12B89]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                {cell.getValue()}
              </p>
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold mt-0.5 ${cfg.cls}`}>
                {cfg.icon}{cfg.label}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "user.name",
      header: t("col_user"),
      Cell: ({ cell, row }) => {
        const type = row.original.caisseType;
        if (type === "BANK") {
          return (
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{row.original.banque?.name ?? "—"}</p>
              <p className="text-[11px] text-slate-400">{row.original.banque?.RIB ?? ""}</p>
            </div>
          );
        }
        if (type === "CAISSE") {
          return <span className="text-sm text-slate-500 italic">{t("caisse_cash_label")}</span>;
        }
        return (
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{cell.getValue() ?? "—"}</p>
            <p className="text-[11px] text-slate-400">{row.original.user?.role?.name?.replace("_", " ") ?? ""}</p>
          </div>
        );
      },
    },
    ...(isSuperAdmin ? [
      {
        accessorKey: "societe.raisonSocial",
        header: t("col_societe"),
        Cell: ({ cell }) => (
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <Building2 className="w-3.5 h-3.5 text-[#B12B89] flex-shrink-0" />
              <span className="text-sm font-medium">{cell.getValue() ?? "—"}</span>
            </div>
          ),
      },
    ] : []),
    {
      accessorKey: "currentBalance",
      header: t("col_current_balance"),
      Cell: ({ cell, row }) => {
        const balance = Number(cell.getValue() ?? 0);
        const diff = balance - Number(row.original.initialBalance ?? 0);
        return (
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {formatMAD(balance)} <span className="text-xs font-normal text-slate-400">MAD</span>
            </p>
            {diff !== 0 && (
              <div className={`flex items-center gap-0.5 text-[11px] font-semibold ${diff > 0 ? "text-emerald-500" : "text-red-500"}`}>
                {diff > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {diff > 0 ? "+" : ""}{formatMAD(diff)}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "active",
      header: t("col_status"),
      size: 90,
      Cell: ({ row }) => (
        <ActiveSwitch
          row={row.original}
          isPending={updateMutation.isPending && updateMutation.variables?.id === row.original.id}
          onToggle={setToggleTarget}
        />
      ),
    },
  ], [t, isSuperAdmin, updateMutation.isPending, updateMutation.variables]);

  return (
    <>
      <div className="p-4 md:p-8 min-h-screen transition-colors duration-300">
        <HeaderTable
        title={t("caisses_page_title")}
        subtitle={t("caisses_page_subtitle")}
        onCreate={() => setShowCreate(true)}
        createLabel={t("btn_create_user_wallet")}
        actions={
          <>
            <button type="button" onClick={() => setShowCreateBank(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3.5 text-[13px] font-semibold text-sky-700 transition-all hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-900/20 dark:text-sky-300">
              <Landmark className="h-4 w-4" />
              {t("btn_create_bank_wallet")}
            </button>
            <button type="button" onClick={() => setShowCreateCoffre(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 text-[13px] font-semibold text-amber-700 transition-all hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
              <Vault className="h-4 w-4" />
              {t("btn_create_coffre_wallet")}
            </button>
          </>
        }
      />

        {!myCaisseLoading && !hasMyCaisse && isAdmin && (
          <div className="mb-5 flex items-center justify-between gap-4 px-5 py-4 rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/15">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-800/40 flex items-center justify-center flex-shrink-0">
                <Wallet className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                  {t("no_caisse_banner_title")}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-500">
                  {t("no_caisse_banner_subtitle")}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateMyCaisse(true)}
              className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl bg-amber-500 hover:brightness-110 text-white shadow-lg shadow-amber-500/25 active:scale-95 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              {t("btn_create_my_caisse")}
            </button>
          </div>
        )}

        <ReusableTable
          data={caisses}
          columns={columns}
          totalRows={totalRows}
          pagination={pagination}
          paginationMeta={paginationMeta}
          setPagination={setPagination}
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter}
          isLoading={isLoading}
          isFetching={isFetching}
          isError={isError}
          onDelete={(row) => setDeleteTarget(row)}
          tableId="caisses-users-table"
        />
      </div>

      <CreateCaisseModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
      <CreateBankWalletModal isOpen={showCreateBank} onClose={() => setShowCreateBank(false)} />
      <CreateCoffreWalletModal isOpen={showCreateCoffre} onClose={() => setShowCreateCoffre(false)} />
      <CreateMyCaisseModal isOpen={showCreateMyCaisse} onClose={() => setShowCreateMyCaisse(false)} />

      {/* Toggle active confirmation */}
      <ConfirmationModal
        isOpen={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={confirmToggle}
        title={toggleTarget?.active ? t("deactivate_caisse_title") : t("activate_caisse_title")}
        message={
          toggleTarget?.active
            ? t("deactivate_caisse_message", { name: toggleTarget?.name })
            : t("activate_caisse_message", { name: toggleTarget?.name })
        }
        confirmText={toggleTarget?.active ? t("btn_deactivate") : t("btn_activate")}
        cancelText={t("btn_cancel")}
        variant={toggleTarget?.active ? "warning" : "success"}
        isLoading={updateMutation.isPending}
      />

      {/* Delete confirmation */}
      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={t("delete_caisse_title")}
        message={t("delete_caisse_message", { name: deleteTarget?.name })}
        confirmText={t("delete_caisse_confirm")}
        cancelText={t("btn_cancel")}
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </>
  );
};
