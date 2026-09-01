import React, { useState } from "react";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  useDeleteArticleVariant,
  useUpdateArticleVariant,
  usePatchArticleVariantAttributes,
} from "../../../hooks/useArticleVariants";
import { useTranslation } from "react-i18next";
import { useAttributes } from "../../../hooks/useAttributes";
import { toast } from "@/shared/utils/toast";
import { Edit2, Tag, Loader2, Plus } from "lucide-react";
import { VariantStockDialog, VariantStockBadge } from "../components/VariantStockDialog";
import { BaseModal } from "../../../../../shared/components/BaseModal";
import { ConfirmationModal } from "../../../../../shared/components/ConfirmationModal";

const ATTRIBUTE_STYLES = {
  color: {
    light: "bg-blue-50 text-blue-700 ring-blue-200",
    dark: "dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-800",
  },
  size: {
    light: "bg-purple-50 text-purple-700 ring-purple-200",
    dark: "dark:bg-purple-900/30 dark:text-violet-100 dark:ring-purple-800",
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
  const key = name.toLowerCase();
  const style = ATTRIBUTE_STYLES[key] || ATTRIBUTE_STYLES.default;
  return `${style.light} ${style.dark}`;
};

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */
export function ArticleVariantsViewTAble({ variants }) {
  const { t } = useTranslation("variants");

  const deleteMutation = useDeleteArticleVariant();
  const updateMutation = useUpdateArticleVariant();
  const patchAttributesMutation = usePatchArticleVariantAttributes();

  const [stockDialogVariant, setStockDialogVariant] = useState(null);
  const [editingVariant, setEditingVariant] = useState(null);
  const [deleteVariant, setDeleteVariant] = useState(null);
  const [editingAttributesVariant, setEditingAttributesVariant] = useState(null);

  const handleAttributesUpdate = (payload) => {
    patchAttributesMutation.mutate(
      { id: editingAttributesVariant.id, payload },
      {
        onSuccess: () => {
          toast.success(t("notifications.save_success"));
          setEditingAttributesVariant(null);
        },
        onError: () => toast.error(t("notifications.op_failed")),
      }
    );
  };

  const handleDelete = () => {
    if (!deleteVariant) return;
    deleteMutation.mutate(deleteVariant.id, {
      onSuccess: () => {
        toast.success(t("notifications.deleted"));
        setDeleteVariant(null);
      },
      onError: (error) =>
        toast.error(error?.response?.data?.message || t("notifications.op_failed")),
    });
  };

  const handleEdit = (formData) => {
    updateMutation.mutate(
      { id: editingVariant.id, payload: formData },
      {
        onSuccess: () => {
          toast.success(t("notifications.save_success"));
          setEditingVariant(null);
        },
        onError: (error) => {
          toast.error(error?.response?.data?.message || t("notifications.op_failed"));
          setEditingVariant(null);
        },
      }
    );
  };

  return (
    <>
      <Card title={t("manager.title")}>
        <div className="mb-3 text-xs font-semibold text-amber-600 dark:text-amber-400">
          {t("view.stock_info")}
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <thead className="bg-slate-50 dark:bg-[#1F2937]">
              <tr className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="px-4 py-3 text-left">{t("table.variant")}</th>
                <th className="px-4 py-3 text-left">{t("table.barcode")}</th>
                <th className="px-4 py-3 text-left">{t("table.attributes")}</th>
                <th className="px-4 py-3 text-left">{t("table.stock")}</th>
                <th className="px-4 py-3 text-right">{t("table.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {variants.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-[#111827] transition">
                  <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-100">
                    {v.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400">
                    {v.barcode}
                  </td>
                  <td className="px-4 py-3">
                    <div className="group flex flex-wrap gap-1.5 items-center">
                      {v.attributes.map((attr) => (
                        <span
                          key={attr.attributeId}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-medium rounded-full ring-1 ${getAttributeClass(attr.attributeName)}`}
                        >
                          <span className="opacity-70 capitalize">{attr.attributeName}</span>
                          <span className="font-semibold">{attr.attributeValue}</span>
                        </span>
                      ))}
                      <button
                        onClick={() => setEditingAttributesVariant(v)}
                        className="inline-flex items-center justify-center w-6 h-6 rounded-full text-slate-500 hover:text-[#B12B89] hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title={t("form.manage_attr")}
                      >
                        <EditIcon sx={{ fontSize: 14 }} />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <VariantStockBadge variantId={v.id} onClick={() => setStockDialogVariant(v)} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <VariantActions
                      onEdit={() => setEditingVariant(v)}
                      onDelete={() => setDeleteVariant(v)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MOBILE */}
        <div className="md:hidden space-y-3">
          {variants.map((v) => (
            <div
              key={v.id}
              className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-[#111827]"
            >
              <div className="font-bold text-slate-800 dark:text-slate-100">{v.name}</div>
              <div className="text-xs font-mono text-slate-500 dark:text-slate-400">{v.barcode}</div>
              <div className="flex gap-4 text-sm text-slate-700 dark:text-slate-300 mt-2">
                <div className="flex flex-wrap gap-1.5">
                  {v.attributes.map((attr) => (
                    <span
                      key={attr.attributeId}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-medium rounded-full ring-1 ${getAttributeClass(attr.attributeName)}`}
                    >
                      <span className="opacity-70 capitalize">{attr.attributeName}</span>
                      <span className="font-semibold">{attr.attributeValue}</span>
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => setEditingAttributesVariant(v)}
                  className="inline-flex items-center justify-center w-6 h-6 rounded-full text-slate-500 hover:text-[#B12B89] hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  title={t("form.manage_attr")}
                >
                  <EditIcon sx={{ fontSize: 14 }} />
                </button>
              </div>
              <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1.5">
                  {t("table.stock")}
                </p>
                <VariantStockBadge variantId={v.id} onClick={() => setStockDialogVariant(v)} />
              </div>
              <div className="flex justify-between items-center pt-3">
                <VariantActions
                  onEdit={() => setEditingVariant(v)}
                  onDelete={() => setDeleteVariant(v)}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Stock Management Dialog */}
      {stockDialogVariant && (
        <VariantStockDialog
          variant={stockDialogVariant}
          onClose={() => setStockDialogVariant(null)}
          showActions={false}
        />
      )}

      {/* Edit Attributes Modal */}
      {editingAttributesVariant && (
        <EditVariantAttributesModal
          variant={editingAttributesVariant}
          onClose={() => setEditingAttributesVariant(null)}
          onSubmit={handleAttributesUpdate}
          isLoading={patchAttributesMutation.isPending}
        />
      )}

      {/* Edit Variant Modal */}
      {editingVariant && (
        <EditVariantModal
          variant={editingVariant}
          onClose={() => setEditingVariant(null)}
          onSubmit={handleEdit}
          isLoading={updateMutation.isPending}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={!!deleteVariant}
        onClose={() => setDeleteVariant(null)}
        onConfirm={handleDelete}
        title={t("dialog.delete_title")}
        message={
          deleteVariant
            ? `${t("dialog.delete_confirm")} "${deleteVariant.name}"?`
            : ""
        }
        confirmText={t("dialog.delete_action")}
        cancelText={t("dialog.cancel")}
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}

export default ArticleVariantsViewTAble;

/* ================== EDIT VARIANT MODAL ================== */
const EditVariantModal = ({ variant, onClose, onSubmit, isLoading }) => {
  const { t } = useTranslation("variants");
  const [formData, setFormData] = useState({
    name: variant.name || "",
    barcode: variant.barcode || "",
  });

  return (
    <BaseModal
      onClose={onClose}
      disableClose={isLoading}
      title={t("form.edit_basic")}
      icon={<Edit2 size={18} className="text-[#B12B89]" />}
      iconBg="bg-blue-50 dark:bg-blue-900/30"
      maxWidth="max-w-md"
      zIndex="z-[9999]"
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
          >
            {t("dialog.cancel")}
          </button>
          <button
            form="edit-variant-form"
            type="submit"
            disabled={isLoading}
            className="flex-1 py-2.5 bg-[#B12B89] text-white rounded-xl font-bold hover:bg-[#B05596] transition-all flex justify-center items-center disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              t("dialog.save")
            )}
          </button>
        </div>
      }
    >
      <form
        id="edit-variant-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(formData);
        }}
        className="space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t("form.name_label")} *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
            required
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#B12B89] focus:border-transparent dark:bg-slate-800 dark:text-slate-100 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t("form.barcode_label")} *
          </label>
          <input
            type="text"
            name="barcode"
            value={formData.barcode}
            onChange={(e) => setFormData((p) => ({ ...p, barcode: e.target.value }))}
            required
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-mono focus:ring-2 focus:ring-[#B12B89] focus:border-transparent dark:bg-slate-800 dark:text-slate-100 outline-none"
          />
        </div>
      </form>
    </BaseModal>
  );
};

/* ================== VARIANT ACTIONS ================== */
const VariantActions = ({ onEdit, onDelete }) => {
  const { t } = useTranslation("variants");
  return (
    <div className="flex items-center gap-2 justify-end">
      <button
        onClick={onEdit}
        className="p-1.5 rounded-md text-[#B12B89] hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"
        title={t("form.edit_basic")}
      >
        <EditIcon fontSize="small" />
      </button>
      <button
        onClick={onDelete}
        className="p-1.5 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition"
        title={t("dialog.delete_action")}
      >
        <DeleteIcon fontSize="small" />
      </button>
    </div>
  );
};

/* ================== CARD ================== */
const Card = ({ title, children }) => (
  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
    <div className="px-6 py-4 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
      <h3 className="font-bold text-[11px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
        {title}
      </h3>
    </div>
    <div className="p-6 space-y-3">{children}</div>
  </div>
);

/* ================== EDIT ATTRIBUTES MODAL ================== */
const EditVariantAttributesModal = ({ variant, onClose, onSubmit, isLoading }) => {
  const { t } = useTranslation("variants");
  const [attributes, setAttributes] = useState(
    variant.attributes.map((a) => ({
      attributeId: a.attributeId,
      attributeName: a.attributeName,
      attributeValueId: a.attributeValueId,
    }))
  );

  const { data: attributesData, isLoading: isLoadingAttributes } = useAttributes();
  const allAttributes = attributesData?.data || [];

  const isAttributeUsed = (attributeId, index) =>
    attributes.some((a, i) => a.attributeId === attributeId && i !== index);

  const addNewAttributeRow = () =>
    setAttributes((prev) => [
      ...prev,
      { attributeId: "", attributeName: "", attributeValueId: "" },
    ]);

  const removeAttributeRow = (index) =>
    setAttributes((prev) => prev.filter((_, i) => i !== index));

  const handleTypeChange = (index, attributeId) => {
    const attribute = allAttributes.find((c) => c.id === Number(attributeId));
    setAttributes((prev) =>
      prev.map((attr, i) =>
        i === index
          ? {
              ...attr,
              attributeId: Number(attributeId),
              attributeName: attribute ? attribute.name : "",
              attributeValueId: "",
            }
          : attr
      )
    );
  };

  const handleValueChange = (index, valueId) =>
    setAttributes((prev) =>
      prev.map((attr, i) =>
        i === index ? { ...attr, attributeValueId: Number(valueId) } : attr
      )
    );

  if (isLoadingAttributes) return null;

  return (
    <BaseModal
      onClose={onClose}
      disableClose={isLoading}
      title={t("view.manage_attributes_title")}
      icon={<Tag size={18} className="text-[#B12B89]" />}
      iconBg="bg-blue-50 dark:bg-blue-900/30"
      maxWidth="max-w-2xl"
      zIndex="z-[9999]"
      footer={
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={addNewAttributeRow}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#B12B89] hover:text-blue-400 transition-all group"
          >
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 group-hover:bg-blue-100 text-[#B12B89]">
              <Plus size={13} />
            </span>
            {t("form.add_another")}
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
            >
              {t("dialog.cancel")}
            </button>
            <button
              form="edit-attr-form"
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 text-sm font-bold text-white bg-[#B12B89] hover:bg-[#B05596] rounded-xl disabled:opacity-50 transition flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                t("dialog.save")
              )}
            </button>
          </div>
        </div>
      }
    >
      <form
        id="edit-attr-form"
        onSubmit={(e) => {
          e.preventDefault();
          const payload = {
            attributes: attributes
              .filter((a) => a.attributeId && a.attributeValueId)
              .map((a) => ({
                attributeId: a.attributeId,
                attributeValueId: a.attributeValueId,
              })),
          };
          onSubmit(payload);
        }}
      >
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
          {attributes.map((attr, index) => (
            <div
              key={index}
              className="flex flex-col md:flex-row gap-3 items-end bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800"
            >
              <div className="flex-1 w-full">
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                  {t("form.attr_type")}
                </label>
                <select
                  required
                  value={attr.attributeId}
                  onChange={(e) => handleTypeChange(index, e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm dark:bg-slate-900 outline-none focus:ring-2 focus:ring-[#B12B89]"
                >
                  <option value="">{t("form.select_type")}</option>
                  {allAttributes.map((a) => (
                    <option key={a.id} value={a.id} disabled={isAttributeUsed(a.id, index)}>
                      {a.name.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1 w-full">
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                  {t("form.attr_value")}
                </label>
                <select
                  required
                  disabled={!attr.attributeId}
                  value={attr.attributeValueId}
                  onChange={(e) => handleValueChange(index, e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm dark:bg-slate-900 disabled:opacity-50 outline-none focus:ring-2 focus:ring-[#B12B89]"
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
                onClick={() => removeAttributeRow(index)}
                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
              >
                <DeleteIcon sx={{ fontSize: 18 }} />
              </button>
            </div>
          ))}
        </div>
      </form>
    </BaseModal>
  );
};
