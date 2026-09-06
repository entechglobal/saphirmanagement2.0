import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Calendar, Clock, Plus, Warehouse, Loader2, ChevronLeft } from "lucide-react";
import { CiImageOff } from "react-icons/ci";
import { useArticle } from "../../../hooks/useArticles";
import VariantsCard from "./ArticleVariantsViewTAble";
import { useTranslation } from "react-i18next";
import { formatUnitOption } from "../../../../../shared/utils/units";
import { FormPageHeader } from "../../../../../shared/components/FormPageHeader";
import { useUpdateStock, useDeleteStock, useStockByArticle } from "../../../hooks/useStocks";
import { useDepots } from "../../../../repositories/hooks/useRepositories";
import { toast } from "@/shared/utils/toast";
import StockEntries from "../../articles/components/StockEntries";
import { VariantStockWizardModal } from "../../articles/components/VariantStockWizardModal";
import {
  BuildingOfficeIcon,
} from "@heroicons/react/24/outline";
import { SectionLoader } from "../../../../../shared/components/loadersCollections/SectionLoader";
import { NotFound } from "../../../../../shared/components/NotFound";
import { BaseModal } from "../../../../../shared/components/BaseModal";
import { ConfirmationModal } from "../../../../../shared/components/ConfirmationModal";

const BRAND_COLOR = "#B12B89";

export const ArticleViewPage = () => {
  const { t } = useTranslation("articles");
  const { t: tCommon } = useTranslation("common");
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useArticle(id);
  const article = data?.data;
  const variants = article?.variants ?? [];
  const hasVariants = variants.length > 0;

  if (isLoading) {
    return (
     <SectionLoader />
    );
  }
if (!article || isError) {
    return (
      <NotFound
        onAction={() => navigate("/articles")}
      />
    );
  }
  

  return (
    <div className="min-h-screen pb-24 font-sans antialiased text-slate-900 dark:text-slate-100">
      <FormPageHeader
        entityName={t("title")}
        backPath="/articles"
        isView={true}
        data={article}
        viewTitle={t("breadcrumb.view")}
        viewTitleMain={t("header.title")}
        backLabel={t("header.back_list")}
      />

      <div className="max-w-6xl mx-auto px-4 grid grid-cols-12 gap-8">
        {/* LEFT COLUMN: PRIMARY DETAILS */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <Card title={t("form.identification")}>
            <Info label={t("fields.full_name")} value={article.name} isBold />
            <Info label={t("fields.barcode")} value={article.barcode} isCode />
            <Info
              label={t("fields.family")}
              value={article.family?.name}
              color="text-[#B12B89]"
            />

            <div className="pt-4 mt-2 border-t border-slate-100 dark:border-[#2e2e2e]">
              <Info
                label={t("form.fields.unit_main")}
                value={
                  article.unitePrincipale
                    ? formatUnitOption(article.unitePrincipale, tCommon)
                    : null
                }
              />
              <Info
                label={t("form.fields.unit_secondary")}
                value={
                  article.uniteSecondaire
                    ? formatUnitOption(article.uniteSecondaire, tCommon)
                    : null
                }
              />
              <Info
                label={t("form.fields.unit_complementary")}
                value={
                  article.uniteComplementaire
                    ? formatUnitOption(article.uniteComplementaire, tCommon)
                    : t("values.not_assigned")
                }
              />
              <Info
                label={t("fields.conversion")}
                value={article.conversionSecondaire}
                isNumber
              />
            </div>
          </Card>

          {/* Variants table (only when article has variants) */}
          {hasVariants && <VariantsCard variants={variants} />}

          {/* Inline stock management (only when article has NO variants) */}
          {!hasVariants && (
            <ArticleStockCard articleId={article.id} articleName={article.name} />
          )}

          <Card title={t("sections.financials")}>
            <Info
              label={t("fields.purchase_cost")}
              value={article.prixAchat}
              suffix="DH"
              isNumber
              color="text-slate-600 dark:text-slate-400"
            />
            <Info
              label={t("fields.rate_v1")}
              value={article.prixVente1}
              suffix="DH"
              isNumber
              color="text-blue-700 dark:text-blue-400"
            />
            <Info
              label={t("fields.rate_v2")}
              value={article.prixVente2}
              suffix="DH"
              isNumber
              color="text-blue-700 dark:text-blue-400"
            />
            <Info
              label={t("fields.rate_v3")}
              value={article.prixVente3}
              suffix="DH"
              isNumber
              color="text-blue-700 dark:text-blue-400"
            />
            <Info
              label={t("fields.discount")}
              value={
                article.remise
                  ? `${Math.round(Number(article.remise) * 100)}%`
                  : "0%"
              }
              color="text-emerald-600"
              isBold
            />
          </Card>

          <Card title={t("sections.logistics")}>
            <Info
              label={t("fields.availability")}
              value={article.stockDisponible}
              isNumber
              color="text-slate-900 dark:text-white"
              isBold
            />
            <Info
              label={t("fields.safety_stock")}
              value={article.stockAlerte}
              isNumber
              color="text-orange-600"
            />

            <div className="pt-4 mt-2 border-t border-slate-100 dark:border-[#2e2e2e]">
              <Info
                label={t("fields.expiry_date")}
                value={
                  article.dateExpiration
                    ? new Date(article.dateExpiration).toLocaleDateString()
                    : t("values.no_expiry")
                }
                color={
                  article.dateExpiration ? "text-red-600" : "text-slate-400"
                }
              />
              <Info
                label={t("fields.grace_period")}
                value={article.dureeExpiration}
                suffix={t("values.days")}
                isNumber
              />
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: MEDIA & STATUS */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <Card title={t("sections.image")}>
            <div className="relative aspect-square w-full rounded-2xl border-2 border-dashed border-slate-200 dark:border-[#2e2e2e] bg-slate-50 dark:bg-[#111111] flex items-center justify-center overflow-hidden">
              {article.image ? (
                <img
                  src={article.image}
                  alt={article.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <CiImageOff className="w-10 h-10 text-slate-300" />
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {t("values.no_image")}
                  </span>
                </div>
              )}
            </div>
          </Card>

          <Card title={t("sections.status")}>
            <StatusBadge
              label={t("fields.visibility")}
              value={article.visible}
              yes={t("values.market_visible")}
              no={t("values.internal_only")}
            />
            <StatusBadge
              label={t("fields.tracking")}
              value={article.gereEnStock}
              yes={t("values.stock_controlled")}
              no={t("values.non_stock")}
            />
          </Card>

          <Card title={t("sections.metadata")}>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-slate-400 mt-1" />
                <div>
                  <p className="text-[10px] uppercase text-slate-400 font-bold">
                    {t("fields.created")}
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                    {new Date(article.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-slate-400 mt-1" />
                <div>
                  <p className="text-[10px] uppercase text-slate-400 font-bold">
                    {t("fields.updated")}
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                    {new Date(article.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   ARTICLE STOCK CARD  –  inline stock management for simple
   (non-variant) articles shown directly in the view page
───────────────────────────────────────────────────────────── */
const ArticleStockCard = ({ articleId, articleName }) => {
  const { t } = useTranslation("stock");
  const { data: depotsData } = useDepots({ pageSize: 1000 });
  const { data: stocksData, isLoading: stocksLoading } = useStockByArticle(articleId);

  const updateStock = useUpdateStock();
  const deleteStock = useDeleteStock();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStock, setEditingStock] = useState(null);
  const [entries, setEntries] = useState([]);
  const [stockToDelete, setStockToDelete] = useState(null);

  const existingDepotIds = stocksData?.data?.map((s) => s.depot.id) || [];
  const availableDepots =
    depotsData?.data?.filter((depot) => {
      if (editingStock && depot.id === editingStock.depot.id) return true;
      return !existingDepotIds.includes(depot.id);
    }) || [];

  const openAdd = () => setWizardOpen(true);

  const openEdit = (stock) => {
    setEditingStock(stock);
    setEntries([
      {
        depotId: stock.depot.id,
        articleId: articleId,
        variantId: null,
        quantityAvailable: stock.quantityAvailable,
        alertThreshold: stock.alertThreshold,
      },
    ]);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingStock(null);
    setEntries([]);
  };

  const handleSave = async () => {
    const isValid =
      entries.length > 0 &&
      entries.every(
        (e) =>
          Number(e.quantityAvailable) >= 0 && Number(e.alertThreshold) >= 0
      );

    if (entries.length === 0 || !isValid) {
      return toast.error(t("toast.fill_error"));
    }

    try {
      const updated = entries[0];
      await updateStock.mutateAsync({
        id: editingStock.id,
        payload: {
          quantityAvailable: updated.quantityAvailable,
          alertThreshold: updated.alertThreshold,
        },
      });
      toast.success(t("toast.updated"));
      closeForm();
    } catch {
      toast.error(t("toast.operation_failed"));
      closeForm();
    }
  };

  const handleDelete = async () => {
    if (!stockToDelete) return;
    try {
      await deleteStock.mutateAsync(stockToDelete.id);
      toast.success(t("toast.deleted"));
      setStockToDelete(null);
    } catch {
      toast.error(t("toast.delete_failed"));
      setStockToDelete(null);
    }
  };

  const stockCount = stocksData?.data?.length ?? 0;

  return (
    <>
      <div className="bg-white dark:bg-[#1c1c1c] rounded-3xl border border-slate-200 dark:border-[#2e2e2e] shadow-sm overflow-hidden">
        {/* Card header */}
        <div className="px-6 py-4 border-b border-slate-50 dark:border-[#2e2e2e] bg-slate-50/50 dark:bg-[#222222]/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Warehouse size={14} className="text-slate-400" />
            <h3 className="font-bold text-[11px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
              {t("card.title")} ({stockCount})
            </h3>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 bg-[#B12B89] hover:bg-[#B05596] text-white px-3 py-1.5 rounded-lg font-bold text-xs transition-all"
          >
            <Plus size={13} /> {t("card.add")}
          </button>
        </div>

        {/* Card body */}
        <div className="p-6">
          {stocksLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-[#B12B89]" size={22} />
            </div>
          ) : stockCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
              <Warehouse size={32} className="opacity-30" />
              <p className="text-sm font-medium">{t("card.empty_title")}</p>
              <p className="text-xs text-slate-300">
                {t("card.empty_hint")}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 dark:border-[#2e2e2e] rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-[#222222]/50">
                  <tr className="text-left text-slate-500 uppercase text-[10px] tracking-wider">
                    <th className="px-4 py-3">{t("card.col_depot")}</th>
                    <th className="px-4 py-3 text-center">{t("card.col_qty")}</th>
                    <th className="px-4 py-3 text-center">{t("card.col_alert")}</th>
                    {/* <th className="px-4 py-3 text-right">Actions</th> */}
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
                      {/* Icon Representation */}
                        <div className="relative flex-shrink-0">
                                         <img
                                           src={stock.depot.societe?.logo || "https://ui-avatars.com/api/?name=" + (stock.depot.societe?.raisonSocial || 'S')}
                                           alt={stock.depot.societe?.raisonSocial}
                                           className="w-10 h-10 object-cover rounded-lg border border-slate-200 dark:border-[#2e2e2e] bg-white"
                                           onError={(e) => (e.currentTarget.src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=")}
                                         />
                                         {/* Mini Badge */}
                                         <div className="absolute -bottom-1 -right-1 bg-white dark:bg-[#1c1c1c] rounded-full p-1 shadow-sm border border-slate-100 dark:border-[#2e2e2e]">
                                           <Warehouse size={10} className="text-blue-500" />
                                         </div>
                                       </div>
                   

                      {/* Depot & Societe Info */}
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
                      <td className="px-4 py-3 text-center font-mono font-medium text-slate-700 dark:text-slate-300">
                        {stock.quantityAvailable}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full text-xs font-bold">
                          {stock.alertThreshold}
                        </span>
                      </td>
                      {/* <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openEdit(stock)}
                            className="p-1.5 text-slate-500 hover:text-[#B12B89] hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => setStockToDelete(stock)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td> */}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Stock — Wizard */}
      {wizardOpen && (
        <VariantStockWizardModal
          items={[{ id: Number(articleId), name: articleName }]}
          mode="article"
          excludeDepotIds={existingDepotIds}
          onClose={() => setWizardOpen(false)}
          onFinish={() => setWizardOpen(false)}
        />
      )}

      {/* Edit Stock Form */}
      <BaseModal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={t("card.edit_title")}
        icon={<Warehouse size={18} className="text-[#B12B89]" />}
        iconBg="bg-blue-50 dark:bg-blue-900/30"
        maxWidth="max-w-md"
        zIndex="z-[9999]"
        footer={
          <div className="flex gap-3">
            <button
              onClick={closeForm}
              className="flex-1 py-2.5 border border-slate-200 dark:border-[#2e2e2e] rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-[#222222] transition-colors"
            >
              {t("card.cancel")}
            </button>
            <button
              onClick={handleSave}
              disabled={updateStock.isPending}
              className="flex-1 py-2.5 bg-[#B12B89] text-white rounded-xl font-bold hover:bg-[#B05596] transition-all flex justify-center items-center disabled:opacity-50"
            >
              {updateStock.isPending ? (
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
          variantId={null}
          entries={entries}
          onChange={setEntries}
          multiple={false}
        />
      </BaseModal>

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={!!stockToDelete}
        onClose={() => setStockToDelete(null)}
        onConfirm={handleDelete}
        title={t("card.delete_title")}
        message={t("card.delete_message", { name: stockToDelete?.depot?.name })}
        cancelText={t("card.cancel")}
        confirmText={t("card.delete")}
        variant="danger"
        isLoading={deleteStock.isPending}
      />
    </>
  );
};

/* ---------- UI HELPERS (unchanged) ---------- */

const Card = ({ title, children }) => (
  <div className="bg-white dark:bg-[#1c1c1c] rounded-3xl border border-slate-200 dark:border-[#2e2e2e] shadow-sm overflow-hidden">
    <div className="px-6 py-4 border-b border-slate-50 dark:border-[#2e2e2e] bg-slate-50/50 dark:bg-[#222222]/30">
      <h3 className="font-bold text-[11px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
        {title}
      </h3>
    </div>
    <div className="p-6 space-y-3">{children}</div>
  </div>
);

const Info = ({
  label,
  value,
  suffix = "",
  color = "text-slate-900 dark:text-slate-100",
  isCode = false,
  isBold = false,
  isNumber = false,
}) => (
  <div className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-[#2e2e2e]/50 last:border-0">
    <span className="text-sm text-slate-500">{label}</span>
    <span
      className={`text-sm ${color} 
        ${isCode
          ? "font-mono bg-slate-100 dark:bg-[#222222] px-1.5 py-0.5 rounded text-xs"
          : ""
        } 
        ${isBold ? "font-bold" : "font-semibold"}
        ${isNumber ? "font-mono" : ""}
      `}
    >
      {value ?? "—"} {value && suffix}
    </span>
  </div>
);

const StatusBadge = ({ label, value, yes, no }) => (
  <div className="flex items-center justify-between py-2">
    <span className="text-sm text-slate-500">{label}</span>
    <span
      className={`px-3 py-1 rounded-full text-[11px] font-bold border uppercase tracking-tight ${
        value
          ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400"
          : "bg-slate-50 border-slate-200 text-slate-500 dark:bg-[#222222] dark:border-[#2e2e2e]"
      }`}
    >
      {value ? yes : no}
    </span>
  </div>
);