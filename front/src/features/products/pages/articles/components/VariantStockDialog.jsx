import { useState } from "react";
import {
  Plus, Edit2, Trash2, Warehouse, ChevronDown, ChevronRight,
  AlertTriangle, Loader2,
} from "lucide-react";
import { toast } from "@/shared/utils/toast";
import { useTranslation } from "react-i18next";
import { useDepots } from "../../../../repositories/hooks/useRepositories";
import {
  useStockByVariant,
  useCreateStock,
  useUpdateStock,
  useDeleteStock,
} from "../../../hooks/useStocks";
import StockEntries from "./StockEntries";
import { BaseModal } from "../../../../../shared/components/BaseModal";
import { VariantStockWizardModal } from "./VariantStockWizardModal";

export const VariantStockBadge = ({ variantId, onClick }) => {
  const { t } = useTranslation("stocks");
  const { data: stocksData, isLoading } = useStockByVariant(variantId);
  const count = stocksData?.data?.length ?? 0;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all group
        border-slate-200 dark:border-[#2e2e2e]
        hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
      title="Manage stock"
    >
      {isLoading ? (
        <Loader2 size={13} className="animate-spin text-slate-400" />
      ) : (
        <>
          <Warehouse
            size={13}
            className="text-slate-400 group-hover:text-blue-500 transition-colors"
          />
          <span
            className={`text-xs font-bold ${count > 0 ? "text-[#B12B89]" : "text-slate-400"}`}
          >
            {count > 0 ? t("badge.depot_count", { count }) : t("badge.no_stock")}
          </span>
          <ChevronRight
            size={11}
            className="text-slate-300 group-hover:text-blue-400 transition-colors"
          />
        </>
      )}
    </button>
  );
};

export const VariantStockDialog = ({ variant, onClose, showActions = true }) => {
  const { t } = useTranslation("stocks");
  const { data: depotsData } = useDepots({ pageSize: 1000 });
  const { data: stocksData, isLoading: stocksLoading } = useStockByVariant(variant?.id);

  const createStock = useCreateStock();
  const updateStock = useUpdateStock();
  const deleteStock = useDeleteStock();

  const [view, setView] = useState("list");
  const [editingStock, setEditingStock] = useState(null);
  const [entries, setEntries] = useState([]);
  const [stockToDelete, setStockToDelete] = useState(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  const existingDepotIds = stocksData?.data?.map((s) => s.depot.id) || [];
  const availableDepots =
    depotsData?.data?.filter((depot) => {
      if (editingStock && depot.id === editingStock.depot.id) return true;
      return !existingDepotIds.includes(depot.id);
    }) || [];

  const openEdit = (stock) => {
    setEditingStock(stock);
    setEntries([
      {
        depotId: stock.depot.id,
        articleId: null,
        variantId: variant.id,
        quantityAvailable: stock.quantityAvailable,
        alertThreshold: stock.alertThreshold,
      },
    ]);
    setView("form");
  };

  const openCreate = () => setWizardOpen(true);

  const closeForm = () => {
    setView("list");
    setEditingStock(null);
    setEntries([]);
  };

  const openDeleteConfirm = (stock) => {
    setStockToDelete(stock);
    setView("delete");
  };

  const closeDelete = () => {
    setView("list");
    setStockToDelete(null);
  };

  const handleSave = async () => {
    const isValid =
      entries.length > 0 &&
      entries.every(
        (e) => Number(e.quantityAvailable) >= 0 && Number(e.alertThreshold) >= 0
      );
    if (entries.length === 0 || !isValid) return toast.error(t("toast.fill_error"));

    try {
      if (editingStock) {
        const updated = entries[0];
        await updateStock.mutateAsync({
          id: editingStock.id,
          payload: {
            quantityAvailable: updated.quantityAvailable,
            alertThreshold: updated.alertThreshold,
          },
        });
        toast.success(t("toast.updated"));
      } else {
        await createStock.mutateAsync({ entries });
        toast.success(t("toast.created"));
      }
      closeForm();
    } catch {
      toast.error(t("toast.operation_failed"));
    }
  };

  const handleDelete = async () => {
    if (!stockToDelete) return;
    try {
      await deleteStock.mutateAsync(stockToDelete.id);
      toast.success(t("toast.deleted"));
      closeDelete();
    } catch {
      toast.error(t("toast.delete_failed"));
    }
  };

  const headerTitle =
    view === "form"
      ? editingStock
        ? t("card.edit_title")
        : t("card.add_title")
      : view === "delete"
      ? t("card.delete_stock")
      : t("card.stock_management");

  const headerLeft =
    view === "form" ? (
      <button
        onClick={closeForm}
        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-[#222222] rounded-lg transition-colors"
      >
        <ChevronDown size={18} className="rotate-90" />
      </button>
    ) : undefined;

  const footer =
    view === "list" ? (
      <button
        onClick={onClose}
        className="w-full py-2.5 border border-slate-200 dark:border-[#2e2e2e] rounded-xl font-semibold text-sm hover:bg-slate-50 dark:hover:bg-[#222222] transition-colors"
      >
        {t("card.close")}
      </button>
    ) : view === "form" ? (
      <div className="flex gap-3">
        <button
          onClick={closeForm}
          className="flex-1 py-2.5 border border-slate-200 dark:border-[#2e2e2e] rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-[#222222] transition-colors"
        >
          {t("card.cancel")}
        </button>
        <button
          onClick={handleSave}
          disabled={createStock.isPending || updateStock.isPending}
          className="flex-1 py-2.5 bg-[#B12B89] text-white rounded-xl font-bold hover:bg-[#B05596] transition-all flex justify-center items-center disabled:opacity-50"
        >
          {createStock.isPending || updateStock.isPending ? (
            <Loader2 className="animate-spin h-5 w-5" />
          ) : (
            t("card.save")
          )}
        </button>
      </div>
    ) : (
      <div className="flex gap-3">
        <button
          onClick={closeDelete}
          className="flex-1 py-2.5 border border-slate-200 dark:border-[#2e2e2e] rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-[#222222] transition-colors"
        >
          {t("card.cancel")}
        </button>
        <button
          onClick={handleDelete}
          disabled={deleteStock.isPending}
          className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-50 transition-colors flex justify-center items-center"
        >
          {deleteStock.isPending ? (
            <Loader2 className="animate-spin h-5 w-5" />
          ) : (
            t("dialog.delete_action")
          )}
        </button>
      </div>
    );

  return (
    <>
    {!wizardOpen && <BaseModal
      onClose={view === "list" ? onClose : closeForm}
      title={headerTitle}
      subtitle={variant?.name}
      icon={<Warehouse size={18} className="text-[#B12B89]" />}
      iconBg="bg-blue-50 dark:bg-blue-900/30"
      headerLeft={headerLeft}
      maxWidth="max-w-xl"
      footer={footer}
      bodyClassName="overflow-y-auto flex-1 p-6"
    >
      {view === "list" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              {t("card.stock_levels")} ({stocksData?.data?.length || 0})
            </p>
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 bg-[#B12B89] hover:bg-[#B05596] text-white px-3 py-1.5 rounded-lg font-bold text-xs transition-all"
            >
              <Plus size={14} /> {t("card.add")}
            </button>
          </div>

          {stocksLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-[#B12B89]" size={22} />
            </div>
          ) : stocksData?.data?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
              <Warehouse size={32} className="opacity-30" />
              <p className="text-sm">{t("card.no_stock_entries")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 dark:border-[#2e2e2e] rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-[#222222]/50">
                  <tr className="text-left text-slate-500 uppercase text-[10px] tracking-wider">
                    <th className="px-4 py-3">{t("card.col_depot")}</th>
                    <th className="px-4 py-3 text-center">{t("card.col_qty")}</th>
                    <th className="px-4 py-3 text-center">{t("card.col_alert")}</th>
                    {showActions && (
                      <th className="px-4 py-3 text-right">{t("card.col_actions")}</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#2e2e2e]">
                  {stocksData.data.map((stock) => (
                    <tr
                      key={stock.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-[#222222]/30 transition"
                    >
                      <td className="px-4 py-3 min-w-[220px]">
                        <div className="flex items-center gap-3">
                          <div className="relative flex-shrink-0">
                            <img
                              src={
                                stock.depot.societe?.logo ||
                                "https://ui-avatars.com/api/?name=" +
                                  (stock.depot.societe?.raisonSocial || "S")
                              }
                              alt={stock.depot.societe?.raisonSocial}
                              className="w-10 h-10 object-cover rounded-lg border border-slate-200 dark:border-[#2e2e2e] bg-white"
                              onError={(e) =>
                                (e.currentTarget.src =
                                  "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=")
                              }
                            />
                            <div className="absolute -bottom-1 -right-1 bg-white dark:bg-[#1c1c1c] rounded-full p-1 shadow-sm border border-slate-100 dark:border-[#2e2e2e]">
                              <Warehouse size={10} className="text-blue-500" />
                            </div>
                          </div>
                          <div className="flex flex-col min-w-0 leading-tight">
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                              {stock.depot.name}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                              {stock.depot.societe?.raisonSocial || t("card.main_company")}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-medium">
                        {stock.quantityAvailable}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full text-xs font-bold">
                          {stock.alertThreshold}
                        </span>
                      </td>
                      {showActions && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => openEdit(stock)}
                              className="p-1.5 text-slate-500 hover:text-[#B12B89] hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => openDeleteConfirm(stock)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {view === "form" && (
        <StockEntries
          depots={availableDepots}
          articleId={null}
          variantId={Number(variant?.id)}
          entries={entries}
          onChange={setEntries}
          multiple={!editingStock}
        />
      )}

      {view === "delete" && stockToDelete && (
        <div className="py-4">
          <div className="flex items-center gap-3 text-red-600 mb-4">
            <AlertTriangle size={24} />
            <h3 className="text-lg font-bold">{t("card.confirm_deletion")}</h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
            {t("card.confirm_remove")} <b>{stockToDelete.depot.name}</b>?
          </p>
        </div>
      )}
    </BaseModal>}

    {wizardOpen && (
      <VariantStockWizardModal
        items={[{ id: variant.id, name: variant.name }]}
        mode="variant"
        excludeDepotIds={existingDepotIds}
        onClose={() => setWizardOpen(false)}
        onFinish={() => setWizardOpen(false)}
      />
    )}
    </>
  );
};
