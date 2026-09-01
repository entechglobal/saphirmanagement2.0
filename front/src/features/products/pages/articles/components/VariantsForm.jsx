import { useState, useEffect, useRef } from "react";
import { Plus, X, Package, Loader2, QrCode, Warehouse } from "lucide-react";
import { toast } from "@/shared/utils/toast";
import { useNavigate, useLocation } from "react-router-dom";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { useArticle } from "../../../hooks/useArticles";
import { useStockByArticle } from "../../../hooks/useStocks";
import {
  useCreateArticleVariant,
  useUpdateArticleVariant,
  useDeleteArticleVariant,
  usePatchArticleVariantAttributes,
} from "../../../hooks/useArticleVariants";
import { useAttributes } from "../../../hooks/useAttributes";
import { useTranslation } from "react-i18next";
import { VariantStockDialog, VariantStockBadge } from "./VariantStockDialog";
import { VariantBuilderModal } from "./VariantBuilderModal";
import { VariantStockWizardModal } from "./VariantStockWizardModal";
import { BaseModal } from "../../../../../shared/components/BaseModal";
import { ConfirmationModal } from "../../../../../shared/components/ConfirmationModal";
import { FormCard } from "../../../../../shared/components/FormCard";

const BRAND_COLOR = "#C86AAC";

const ATTRIBUTE_STYLES = {
  color: {
    light: "bg-blue-50 text-blue-700 ring-blue-200",
    dark: "dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-800",
  },
  size: {
    light: "bg-purple-50 text-purple-700 ring-purple-200",
    dark: "dark:bg-purple-900/30 dark:text-purple-300 dark:ring-purple-800",
  },
  material: {
    light: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dark: "dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800",
  },
  default: {
    light: "bg-slate-100 text-slate-700 ring-slate-200",
    dark: "dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
  },
};

const getAttributeClass = (name) => {
  const key = name?.toLowerCase();
  const style = ATTRIBUTE_STYLES[key] || ATTRIBUTE_STYLES.default;
  return `${style.light} ${style.dark} ring-1`;
};

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */
export const VariantsManager = ({ returnTo, onBeforeFinish }) => {
  const { t } = useTranslation("variants");
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const parentId = searchParams.get("parentId");

  const { data, isLoading: articleLoading } = useArticle(parentId);
  const parentArticle = data?.data;
  const variants = parentArticle?.variants || [];
  const hasVariants = variants.length > 0;

  const { data: attributesData } = useAttributes();
  const allAttributes = attributesData?.data || [];

  const [variantAttributes, setVariantAttributes] = useState([
    { id: crypto.randomUUID(), attributeId: "", attributeValueId: "" },
  ]);
  const [formData, setFormData] = useState({ barcode: "" });
  const [errors, setErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editMode, setEditMode] = useState(null);
  const [dialog, setDialog] = useState({ type: null, variant: null });
  const [stockDialogVariant, setStockDialogVariant] = useState(null);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [stockWizardOpen, setStockWizardOpen] = useState(false);
  const [wizardHasAddedStock, setWizardHasAddedStock] = useState(false);
  const [shouldTriggerWizard, setShouldTriggerWizard] = useState(false);
  const expectedVariantCount = useRef(0);

  // Open wizard only once variants list has caught up with the expected count
  useEffect(() => {
    if (shouldTriggerWizard && variants.length >= expectedVariantCount.current) {
      setStockWizardOpen(true);
      setShouldTriggerWizard(false);
    }
  }, [shouldTriggerWizard, variants.length]);

  const { data: stocksData } = useStockByArticle(parentId);
  const hasStock = wizardHasAddedStock || (stocksData?.data?.length ?? 0) > 0;

  const createVariantMutation = useCreateArticleVariant();
  const updateVariantMutation = useUpdateArticleVariant();
  const deleteVariantMutation = useDeleteArticleVariant();
  const patchAttributesMutation = usePatchArticleVariantAttributes();

  const isMutating =
    createVariantMutation.isPending ||
    updateVariantMutation.isPending ||
    patchAttributesMutation.isPending;

  const generateBarcode = () => {
    const timestamp = Date.now().toString();
    const random = Math.floor(100 + Math.random() * 900).toString();
    setFormData((prev) => ({ ...prev, barcode: (timestamp + random).slice(-13) }));
  };

  const validateForm = () => {
    let newErrors = {};
    if (editMode !== "attributes") {
      if (!formData.barcode?.trim()) newErrors.barcode = t("notifications.barcode_required");
    }
    if (!editingId || editMode === "attributes") {
      const incomplete = variantAttributes.some(
        (a) => !a.attributeId || !a.attributeValueId
      );
      if (incomplete) {
        toast.error(t("notifications.attr_incomplete"));
        return false;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({ barcode: "" });
    setVariantAttributes([{ id: crypto.randomUUID(), attributeId: "", attributeValueId: "" }]);
    setErrors({});
    setEditingId(null);
    setEditMode(null);
  };

  const handleFinish = () => {
    onBeforeFinish?.();
    sessionStorage.removeItem(`wizard_article_${parentId}`);
    if (returnTo) {
      navigate(decodeURIComponent(returnTo));
      return;
    }
    navigate("/articles");
  };

  const isAttributeUsed = (attrId, currentId) =>
    variantAttributes.some(
      (a) => a.id !== currentId && Number(a.attributeId) === Number(attrId)
    );

  const updateAttribute = (id, key, value) => {
    setVariantAttributes((prev) =>
      prev.map((attr) => {
        if (attr.id !== id) return attr;
        if (key === "attributeId")
          return { ...attr, attributeId: Number(value), attributeValueId: "" };
        return { ...attr, [key]: Number(value) };
      })
    );
  };

  const addAttributeRow = () =>
    setVariantAttributes((p) => [
      ...p,
      { id: crypto.randomUUID(), attributeId: "", attributeValueId: "" },
    ]);

  const removeAttributeRow = (id) =>
    setVariantAttributes((p) => (p.length > 1 ? p.filter((a) => a.id !== id) : p));

  const openCreate = () => {
    resetForm();
    setDialog({ type: "builder", variant: null });
  };

  const openEditBasic = (v) => {
    setEditingId(v.id);
    setEditMode("basic");
    setFormData({ barcode: v.barcode || "" });
    setDialog({ type: "form", variant: v });
  };

  const openEditAttributes = (v) => {
    setEditingId(v.id);
    setEditMode("attributes");
    setVariantAttributes(
      v.attributes.map((a) => ({
        id: a.id || crypto.randomUUID(),
        attributeId: Number(a.attributeId),
        attributeValueId: Number(a.attributeValueId),
      }))
    );
    setDialog({ type: "form", variant: v });
  };

  const handleSaveVariant = async () => {
    if (!validateForm()) return;
    const attrPayload = variantAttributes.map((a) => ({
      attributeId: Number(a.attributeId),
      attributeValueId: Number(a.attributeValueId),
    }));
    try {
      if (editingId) {
        if (editMode === "attributes") {
          await patchAttributesMutation.mutateAsync({
            id: editingId,
            payload: { attributes: attrPayload },
          });
        } else {
          await updateVariantMutation.mutateAsync({ id: editingId, payload: { ...formData } });
        }
      } else {
        await createVariantMutation.mutateAsync({
          articleId: Number(parentId),
          variants: [{ ...formData, attributes: attrPayload }],
        });
      }
      toast.success(t("notifications.save_success"));
      setDialog({ type: null, variant: null });
      resetForm();
      if (!editingId) {
        expectedVariantCount.current = variants.length + 1;
        setShouldTriggerWizard(true);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || t("notifications.op_failed"));
      setDialog({ type: null, variant: null });
    }
  };

  if (articleLoading)
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="animate-spin text-[#C86AAC]" />
      </div>
    );

  const isAttrOnly = !!editingId && editMode === "attributes";

  const formDialogTitle = isAttrOnly
    ? t("form.manage_attr")
    : editingId
    ? t("form.edit_basic")
    : t("form.add_title");

  return (
    <div className="space-y-6">
      <FormCard title={t("article_info.title") || "Article Information"}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-y-4 gap-x-8 px-2 py-1">
          <InfoField label={t("article_info.name")} value={parentArticle?.name} />
          <InfoField label={t("article_info.family")} value={parentArticle?.family?.name || "Standard"} />
          <InfoField
            label={t("article_info.barcode")}
            value={parentArticle?.barcode || t("article_info.no_barcode")}
          />
          <div className="md:border-l md:pl-8 border-slate-100 dark:border-slate-800">
            <InfoField label={t("article_info.reference")} value={`#${parentArticle?.id}`} />
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
          {t("article_info.total")}:{" "}
          {t("article_info.variants_count", { count: variants.length })}
        </div>
      </FormCard>

      <FormCard
        title={`${t("manager.title") || "Variants"} (${variants.length})`}
        action={
          <div className="flex items-center gap-2">
            {hasVariants && (
              <button
                onClick={() => setStockWizardOpen(true)}
                className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-2 rounded-xl font-bold text-sm transition-all"
              >
                <Warehouse size={16} /> Stock
              </button>
            )}
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-[#C86AAC] hover:bg-[#B05596] text-white px-4 py-2 rounded-xl font-bold text-sm transition-all"
            >
              <Plus size={18} /> {t("manager.add_button")}
            </button>
          </div>
        }
      >
        {/* DESKTOP TABLE */}
        <div className="hidden md:block overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr className="text-left text-slate-500 uppercase text-[10px] tracking-wider">
                <th className="px-4 py-3">{t("table.variant")}</th>
                <th className="px-4 py-3">{t("table.barcode")}</th>
                <th className="px-4 py-3">{t("table.attributes")}</th>
                <th className="px-4 py-3">{t("table.stock")}</th>
                <th className="px-4 py-3 text-right">{t("table.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {variants.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{v.name}</td>
                  <td className="px-4 py-3 font-mono text-slate-500 text-xs">
                    {v.barcode || (
                      <span className="italic text-slate-400">{t("table.no_barcode")}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {v.attributes?.map((attr) => (
                        <span
                          key={attr.id || attr.attributeId}
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getAttributeClass(attr.attributeName)}`}
                        >
                          {attr.attributeName}: {attr.attributeValue}
                        </span>
                      ))}
                      <button
                        onClick={() => openEditAttributes(v)}
                        className="p-1 hover:text-[#C86AAC] text-slate-400"
                        title="Edit attributes"
                      >
                        <EditIcon style={{ fontSize: 14 }} />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <VariantStockBadge variantId={v.id} onClick={() => setStockDialogVariant(v)} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <VariantActions
                      onEdit={() => openEditBasic(v)}
                      onDelete={() => setDialog({ type: "delete", variant: v })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARDS */}
        <div className="md:hidden space-y-3">
          {variants.map((v) => (
            <div
              key={v.id}
              className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 bg-white dark:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{v.name}</p>
                  <p className="text-xs font-mono text-slate-500 mt-0.5">
                    {v.barcode || (
                      <span className="italic text-slate-400">{t("table.no_barcode")}</span>
                    )}
                  </p>
                </div>
                <VariantActions
                  onEdit={() => openEditBasic(v)}
                  onDelete={() => setDialog({ type: "delete", variant: v })}
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {v.attributes?.map((attr) => (
                  <span
                    key={attr.id || attr.attributeId}
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getAttributeClass(attr.attributeName)}`}
                  >
                    {attr.attributeName}: {attr.attributeValue}
                  </span>
                ))}
                <button
                  onClick={() => openEditAttributes(v)}
                  className="p-1.5 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <EditIcon style={{ fontSize: 14 }} />
                </button>
              </div>
              <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1.5">
                  {t("table.stock")}
                </p>
                <VariantStockBadge variantId={v.id} onClick={() => setStockDialogVariant(v)} />
              </div>
            </div>
          ))}
        </div>
      </FormCard>

      {hasVariants && (
        <div className="flex flex-col sm:flex-row items-center justify-end gap-4 border-t border-slate-200 dark:border-slate-800 pt-8 mt-4">
          <button
            onClick={() => hasStock ? handleFinish() : setShowFinishModal(true)}
            className="w-full sm:w-auto px-10 py-3 rounded-xl text-white font-bold transition-all hover:brightness-110 active:scale-95 shadow-lg shadow-[#C86AAC]/25"
            style={{ backgroundColor: BRAND_COLOR }}
          >
            {t("manager.finish_button")}
          </button>
        </div>
      )}

      {/* Form Dialog (create / edit-basic / edit-attributes) */}
      {dialog.type === "form" && (
        <BaseModal
          onClose={() => { setDialog({ type: null, variant: null }); resetForm(); }}
          title={formDialogTitle}
          icon={<Package size={18} className="text-[#C86AAC]" />}
          iconBg="bg-[#C86AAC]/15 dark:bg-[#C86AAC]/20"
          maxWidth="max-w-lg"
          zIndex="z-[9999]"
          bodyClassName="overflow-y-auto flex-1 px-6 py-5 space-y-3"
          footer={
            <div className="flex gap-3">
              <button
                onClick={() => { setDialog({ type: null, variant: null }); resetForm(); }}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {t("dialog.cancel")}
              </button>
              <button
                onClick={handleSaveVariant}
                disabled={isMutating}
                className="flex-1 py-2.5 bg-[#C86AAC] text-white rounded-xl font-bold hover:bg-[#B05596] transition-all flex justify-center items-center disabled:opacity-50"
              >
                {isMutating ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  t("dialog.save")
                )}
              </button>
            </div>
          }
        >
          {!isAttrOnly && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                {t("form.barcode_label")} *
              </label>
              <div className="flex gap-2">
                <input
                  name="barcode"
                  value={formData.barcode}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      [e.target.name]: e.target.value,
                    }))
                  }
                  className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm dark:bg-slate-900 focus:ring-2 focus:ring-[#C86AAC] outline-none"
                />
                <button
                  type="button"
                  onClick={generateBarcode}
                  className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                >
                  <QrCode size={14} /> {t("form.generate")}
                </button>
              </div>
              {errors.barcode && (
                <p className="text-red-500 text-xs mt-1">{errors.barcode}</p>
              )}
            </div>
          )}

          {(editMode === "attributes" || !editingId) && (
            <div className="space-y-3">
              {isAttrOnly && (
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {t("form.attr_config")}
                </p>
              )}
              {variantAttributes.map((attr) => (
                <div key={attr.id} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      {t("form.attr_type")}
                    </label>
                    <select
                      value={attr.attributeId}
                      onChange={(e) => updateAttribute(attr.id, "attributeId", e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm dark:bg-slate-900 focus:ring-2 focus:ring-[#C86AAC] outline-none"
                    >
                      <option value="">{t("form.select_type")}</option>
                      {allAttributes.map((a) => (
                        <option key={a.id} value={a.id} disabled={isAttributeUsed(a.id, attr.id)}>
                          {a.name.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      {t("form.attr_value")}
                    </label>
                    <select
                      value={attr.attributeValueId}
                      disabled={!attr.attributeId}
                      onChange={(e) => updateAttribute(attr.id, "attributeValueId", e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm dark:bg-slate-900 disabled:opacity-50 focus:ring-2 focus:ring-[#C86AAC] outline-none"
                    >
                      <option value="">{t("form.select_value")}</option>
                      {allAttributes
                        .find((a) => a.id === Number(attr.attributeId))
                        ?.values.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.value}
                          </option>
                        ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttributeRow(attr.id)}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors self-end mb-0.5"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addAttributeRow}
                className="flex items-center gap-1.5 text-[#C86AAC] text-xs font-semibold hover:underline"
              >
                <Plus size={14} /> {t("form.add_another")}
              </button>
            </div>
          )}
        </BaseModal>
      )}

      {/* Variant Builder (create mode) */}
      {dialog.type === "builder" && (
        <VariantBuilderModal
          allAttributes={allAttributes}
          articleId={parentId}
          onClose={() => setDialog({ type: null, variant: null })}
          loading={createVariantMutation.isPending}
          onSubmit={async (variantsPayload) => {
            try {
              await createVariantMutation.mutateAsync({
                articleId: Number(parentId),
                variants: variantsPayload,
              });
              toast.success(
                t("notifications.variants_created", { count: variantsPayload.length })
              );
              setDialog({ type: null, variant: null });
              expectedVariantCount.current = variants.length + variantsPayload.length;
              setShouldTriggerWizard(true);
            } catch (err) {
              toast.error(err?.response?.data?.message || t("notifications.create_failed"));
            }
          }}
        />
      )}

      {/* Delete Variant Confirmation */}
      <ConfirmationModal
        isOpen={dialog.type === "delete"}
        onClose={() => setDialog({ type: null, variant: null })}
        onConfirm={async () => {
          await deleteVariantMutation.mutateAsync(dialog.variant.id);
          toast.success(t("notifications.deleted"));
          setDialog({ type: null, variant: null });
        }}
        title={t("dialog.delete_title")}
        message={
          dialog.variant
            ? `${t("dialog.delete_confirm")} "${dialog.variant.name}"?`
            : ""
        }
        confirmText={t("dialog.delete_action")}
        cancelText={t("dialog.cancel")}
        variant="danger"
        isLoading={deleteVariantMutation.isPending}
      />

      <ConfirmationModal
        isOpen={showFinishModal}
        onClose={() => setShowFinishModal(false)}
        onConfirm={() => { setShowFinishModal(false); handleFinish(); }}
        title={t("finish_modal.title")}
        message={t("finish_modal.message")}
        confirmText={t("finish_modal.confirm")}
        cancelText={t("finish_modal.cancel")}
        variant="danger"
      />

      {/* Stock Management Dialog */}
      {stockDialogVariant && (
        <VariantStockDialog
          variant={stockDialogVariant}
          onClose={() => setStockDialogVariant(null)}
        />
      )}

      {/* Stock Wizard — after variant creation */}
      {stockWizardOpen && (
        <VariantStockWizardModal
          items={variants}
          mode="variant"
          onClose={() => setStockWizardOpen(false)}
          onFinish={(saved) => { setStockWizardOpen(false); if (saved) setWizardHasAddedStock(true); }}
        />
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────────────────────── */

const InfoField = ({ label, value }) => (
  <div className="flex flex-col gap-1">
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{label}</p>
    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{value || "—"}</p>
  </div>
);

const VariantActions = ({ onEdit, onDelete }) => (
  <div className="flex items-center justify-end gap-1">
    <button
      onClick={onEdit}
      className="p-1.5 text-slate-400 hover:text-[#C86AAC] hover:bg-[#C86AAC]/10 dark:hover:bg-[#C86AAC]/20 rounded-xl transition-colors"
    >
      <EditIcon style={{ fontSize: 16 }} />
    </button>
    <button
      onClick={onDelete}
      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
    >
      <DeleteIcon style={{ fontSize: 16 }} />
    </button>
  </div>
);

export default VariantsManager;
