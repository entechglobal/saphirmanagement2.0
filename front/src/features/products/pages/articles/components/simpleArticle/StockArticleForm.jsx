import { useState } from "react";
import { Plus, Loader2, Edit2, Trash2, Warehouse } from "lucide-react";
import { toast } from "@/shared/utils/toast";
import { useLocation, useNavigate } from "react-router-dom";
import { useArticle } from "../../../../hooks/useArticles";
import { useCreateStock, useUpdateStock, useDeleteStock, useStockByArticle } from "../../../../hooks/useStocks";
import { useDepots } from "../../../../../repositories/hooks/useRepositories";
import { useTranslation } from "react-i18next";
import StockEntries from "../StockEntries";
import { VariantStockWizardModal } from "../VariantStockWizardModal";
import { SectionLoader } from "../../../../../../shared/components/loadersCollections/SectionLoader";
import { BaseModal } from "../../../../../../shared/components/BaseModal";
import { ConfirmationModal } from "../../../../../../shared/components/ConfirmationModal";
import { FormCard } from "../../../../../../shared/components/FormCard";


const BRAND_COLOR = "#C86AAC";

export const StockArticleForm = ({ variantMode, variantId, returnTo, onBeforeFinish }) => {
  const { t } = useTranslation("stocks");
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const articleId = searchParams.get("articleId");

  // Data fetching
  const { data: articleData, isLoading: articleLoading } = useArticle(articleId);
  const { data: depotsData } = useDepots({ pageSize: 1000 });
  const { data: stocksData } = useStockByArticle(articleId);
  const parentArticle = articleData?.data;

  // State for Dialogs
  const [wizardOpen, setWizardOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStock, setEditingStock] = useState(null);
  const [entries, setEntries] = useState([]);
  const [showSkipModal, setShowSkipModal] = useState(false);

  // State for Delete Confirmation
  const [stockToDelete, setStockToDelete] = useState(null);

  const existingDepotIds = stocksData?.data?.map(stock => stock.depot.id) || [];
  const availableDepots = depotsData?.data?.filter(depot => {
    if (editingStock && depot.id === editingStock.depot.id) return true;
    return !existingDepotIds.includes(depot.id);
  }) || [];

  // Mutations
  const createStock = useCreateStock();
  const updateStock = useUpdateStock();
  const deleteStock = useDeleteStock();

  const handleDelete = async () => {
    if (!stockToDelete) return;
    try {
      await deleteStock.mutateAsync(stockToDelete.id);
      toast.success(t("toast.deleted"));
      setStockToDelete(null);
    } catch (err) {
      toast.error(t("toast.delete_failed"));
      setStockToDelete(null);
    }
  };
  const handleFinish = () => {
    onBeforeFinish?.();
    sessionStorage.removeItem(`wizard_article_${articleId}`);
    // this function help like draft
    if (returnTo) {
      // Cas article simple terminé (pas de step stock obligatoire)

      navigate(decodeURIComponent(returnTo));
      return;
    }

    navigate("/articles");
  };

  const handleSave = async () => {
    const isValid = entries.length > 0 && entries.every(
      (e) => Number(e.quantityAvailable) >= 0 && Number(e.alertThreshold) >= 0
    );

    if (entries.length === 0 || !isValid) {
      return toast.error(t("toast.fill_error"));
    }

    try {
      if (editingStock) {
        const updatedEntry = entries[0];
        await updateStock.mutateAsync({
          id: editingStock.id,
          payload: {
            quantityAvailable: updatedEntry.quantityAvailable,
            alertThreshold: updatedEntry.alertThreshold,
          }
        });
        toast.success(t("toast.updated"));
      } else {
        await createStock.mutateAsync({ entries });
        toast.success(t("toast.created"));
      }
      closeDialog();
    } catch (err) {
      toast.error(t("toast.operation_failed"));
    }
  };

  const closeDialog = () => {
    setIsFormOpen(false);
    setEditingStock(null);
    setEntries([]);
  };

  const openEdit = (stock) => {
    setEditingStock(stock);
    setEntries([{
      depotId: stock.depot.id,
      articleId: stock.articleId,
      quantityAvailable: stock.quantityAvailable,
      alertThreshold: stock.alertThreshold
    }]);
    setIsFormOpen(true);
  };

  if (articleLoading) return (
    <SectionLoader />
  );

  return (
    <div className="space-y-6">
      {/* Article Info Card */}
      {!variantMode && (<FormCard title={t("article_info.title")}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-y-4 gap-x-8 px-2 py-1">
          <InfoField label={t("article_info.name")} value={parentArticle?.name} />
          <InfoField label={t("article_info.barcode")} value={parentArticle?.barcode} isMono isBrand />
          <InfoField label={t("article_info.family")} value={parentArticle?.family?.name || t("article_info.standard")} />
          <div className="md:border-l md:pl-8 border-slate-100 dark:border-[#2e2e2e]">
            <InfoField label={t("article_info.reference")} value={`#${parentArticle?.id}`} isMono isMuted />
          </div>
        </div>
      </FormCard>)}


      {/* Stock Management Card */}
      <FormCard
        title={`${t("card.stock_levels")} (${stocksData?.data?.length || 0})`}
        action={
          <button
            onClick={() => setWizardOpen(true)}
            className="flex items-center gap-2 bg-[#C86AAC] hover:bg-[#B05596] text-white px-4 py-2 rounded-xl font-bold text-sm transition-all"
          >
            <Plus size={18} /> {t("card.add")}
          </button>
        }
      >
        {/* ── Mobile cards (xs) ── */}
        <div className="sm:hidden space-y-2">
          {stocksData?.data.map((stock) => (
            <div key={stock.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-[#2e2e2e] bg-slate-50/60 dark:bg-[#222222]/30">
              <div className="relative flex-shrink-0">
                <img
                  src={stock.depot.societe?.logo || "https://ui-avatars.com/api/?name=" + (stock.depot.societe?.raisonSocial || "S")}
                  alt={stock.depot.societe?.raisonSocial}
                  className="w-10 h-10 object-cover rounded-xl border border-slate-200 dark:border-[#2e2e2e] bg-white"
                  onError={(e) => (e.currentTarget.src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=")}
                />
                <div className="absolute -bottom-1 -end-1 bg-white dark:bg-[#1c1c1c] rounded-full p-0.5 shadow-sm border border-slate-100 dark:border-[#2e2e2e]">
                  <Warehouse size={9} className="text-[#C86AAC]" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{stock.depot.name}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
                  {stock.depot.societe?.raisonSocial || t("card.main_company")}
                </p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-xs text-slate-500">
                    {t("card.col_qty")}: <strong className="text-slate-700 dark:text-slate-200">{stock.quantityAvailable}</strong>
                  </span>
                  <span className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
                    ⚠ {stock.alertThreshold}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1 flex-shrink-0">
                <button onClick={() => openEdit(stock)} className="p-1.5 text-slate-400 hover:text-[#C86AAC] hover:bg-[#C86AAC]/10 dark:hover:bg-[#C86AAC]/20 rounded-xl transition-colors">
                  <Edit2 size={15} />
                </button>
                <button onClick={() => setStockToDelete(stock)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ── Desktop table (sm+) ── */}
        <div className="hidden sm:block overflow-x-auto border border-slate-200 dark:border-[#2e2e2e] rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-[#222222]/50">
              <tr className="text-start text-slate-500 uppercase text-[10px] tracking-wider">
                <th className="px-4 py-3 text-start">{t("card.col_depot")}</th>
                <th className="px-4 py-3 text-center">{t("card.col_qty")}</th>
                <th className="px-4 py-3 text-center">{t("card.col_alert")}</th>
                <th className="px-4 py-3 text-end">{t("card.col_actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#2e2e2e]">
              {stocksData?.data.map((stock) => (
                <tr key={stock.id} className="hover:bg-slate-50/50 dark:hover:bg-[#222222]/30 transition">
                  <td className="px-4 py-3 min-w-[220px]">
                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        <img
                          src={stock.depot.societe?.logo || "https://ui-avatars.com/api/?name=" + (stock.depot.societe?.raisonSocial || "S")}
                          alt={stock.depot.societe?.raisonSocial}
                          className="w-10 h-10 object-cover rounded-xl border border-slate-200 dark:border-[#2e2e2e] bg-white"
                          onError={(e) => (e.currentTarget.src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=")}
                        />
                        <div className="absolute -bottom-1 -end-1 bg-white dark:bg-[#1c1c1c] rounded-full p-1 shadow-sm border border-slate-100 dark:border-[#2e2e2e]">
                          <Warehouse size={10} className="text-[#C86AAC]" />
                        </div>
                      </div>
                      <div className="flex flex-col min-w-0 leading-tight">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{stock.depot.name}</span>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                          {stock.depot.societe?.raisonSocial || t("card.main_company")}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-medium">{stock.quantityAvailable}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full text-xs font-bold">
                      {stock.alertThreshold}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-end">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(stock)} className="p-1.5 text-slate-500 hover:text-[#C86AAC] hover:bg-[#C86AAC]/10 rounded-xl transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => setStockToDelete(stock)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </FormCard>
      {!variantMode && (<div className="flex flex-col sm:flex-row items-center justify-end gap-4 border-t border-slate-200 dark:border-[#2e2e2e] pt-8 mt-4">
        {stocksData?.data?.length > 0 ? (
          /* Done/Finish Button (Primary) */
          <button
            onClick={handleFinish}
            className="w-full sm:w-auto px-10 py-3 rounded-xl text-white font-bold transition-all hover:brightness-110 active:scale-95 shadow-lg shadow-[#C86AAC]/25 flex items-center justify-center gap-2"
            style={{ backgroundColor: BRAND_COLOR }}
          >

            {t("form.buttons.finish", "Done & Finish")}
          </button>
        ) : (
          /* Skip Button (Secondary style but prominent) */
          <button
            onClick={() => setShowSkipModal(true)}
            className="w-full sm:w-auto px-10 py-3 rounded-xl text-slate-600 dark:text-slate-400 font-bold border-2 border-slate-200 dark:border-[#2e2e2e] hover:bg-slate-50 dark:hover:bg-[#222222] transition-all flex items-center justify-center gap-2"
          >
            {t("form.buttons.skip", "Skip and Finish")}
          </button>
        )}
      </div>
      )}


      {wizardOpen && parentArticle && (
        <VariantStockWizardModal
          items={[{ id: Number(articleId), name: parentArticle.name }]}
          mode="article"
          excludeDepotIds={existingDepotIds}
          onClose={() => setWizardOpen(false)}
          onFinish={() => setWizardOpen(false)}
        />
      )}

      <BaseModal
        isOpen={isFormOpen}
        onClose={closeDialog}
        title={editingStock ? t("card.edit_title") : t("card.add_title")}
        icon={<Warehouse className="w-5 h-5 text-[#C86AAC]" />}
        iconBg="bg-[#C86AAC]/15 dark:bg-[#C86AAC]/20"
        maxWidth="max-w-md"
        zIndex="z-[9999]"
        bodyClassName="flex-1 overflow-y-auto px-6 py-5 space-y-4"
        footer={
          <div className="flex gap-3">
            <button
              onClick={closeDialog}
              className="flex-1 py-2.5 border border-slate-200 dark:border-[#2e2e2e] rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-[#222222] transition-colors"
            >
              {t("card.cancel")}
            </button>
            <button
              onClick={handleSave}
              disabled={createStock.isPending || updateStock.isPending}
              className="flex-1 py-2.5 bg-[#C86AAC] text-white rounded-xl font-bold hover:bg-[#B05596] transition-all flex justify-center items-center disabled:opacity-50"
            >
              {(createStock.isPending || updateStock.isPending) ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                t("card.save")
              )}
            </button>
          </div>
        }
      >
        <StockEntries
          depots={availableDepots}
          articleId={Number(articleId)}
          variantId={Number(variantId)}
          entries={entries}
          onChange={setEntries}
          multiple={!editingStock}
        />
      </BaseModal>

      <ConfirmationModal
        isOpen={showSkipModal}
        onClose={() => setShowSkipModal(false)}
        onConfirm={() => { setShowSkipModal(false); handleFinish(); }}
        title={t("skip_modal.title")}
        message={t("skip_modal.message")}
        confirmText={t("skip_modal.confirm")}
        cancelText={t("skip_modal.cancel")}
        variant="danger"
      />

      <ConfirmationModal
        isOpen={!!stockToDelete}
        onClose={() => setStockToDelete(null)}
        onConfirm={handleDelete}
        title={t("dialog.delete_title", "Supprimer le stock")}
        message={`${t("dialog.delete_confirm", "Êtes-vous sûr de vouloir supprimer le stock de")} ${stockToDelete?.depot?.name} ?`}
        confirmText={t("dialog.delete_action", "Supprimer")}
        cancelText={t("dialog.cancel", "Annuler")}
        variant="danger"
        isLoading={deleteStock.isPending}
      />
    </div>
  );
};



const InfoField = ({ label, value, isMono, isBrand, isMuted }) => (
  <div className="flex flex-col gap-1">
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{label}</p>
    <p className={`text-sm font-semibold ${isMono ? 'font-mono' : ''
      } ${isBrand ? 'text-[#C86AAC]' : isMuted ? 'text-slate-500' : 'text-slate-900 dark:text-slate-100'
      }`}>
      {value || "—"}
    </p>
  </div>
);

