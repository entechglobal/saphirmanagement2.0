import { useState } from "react";
import {
  Plus, Trash2, QrCode, Loader2, Sparkles, ChevronRight,
  Package, CheckCircle2, AlertTriangle, Shuffle,
} from "lucide-react";
import { toast } from "@/shared/utils/toast";
import { useTranslation } from "react-i18next";
import { generateBarcode } from "../../../../utils/barcodeUtils";
import { SelectDropDown } from "../../../../../shared/components/SelectDropDown";
import { BaseModal } from "../../../../../shared/components/BaseModal";

const cartesian = (arrays) =>
  arrays.reduce(
    (acc, curr) =>
      acc.flatMap((combo) => curr.map((item) => [...combo, item])),
    [[]]
  );

const AttributeSelector = ({ allAttributes, rows, onChange }) => {
  const { t } = useTranslation("variants");
  const usedAttrIds = rows.map((r) => r.attributeId).filter(Boolean);

  const addRow = () =>
    onChange([...rows, { id: crypto.randomUUID(), attributeId: "", valueIds: [] }]);

  const removeRow = (id) => onChange(rows.filter((r) => r.id !== id));

  const setAttr = (id, attrId) =>
    onChange(
      rows.map((r) =>
        r.id === id ? { ...r, attributeId: Number(attrId), valueIds: [] } : r
      )
    );

  const toggleValue = (id, valueId) =>
    onChange(
      rows.map((r) => {
        if (r.id !== id) return r;
        const numId = Number(valueId);
        const exists = r.valueIds.includes(numId);
        return {
          ...r,
          valueIds: exists ? r.valueIds.filter((v) => v !== numId) : [...r.valueIds, numId],
        };
      })
    );

  const previewCount = rows
    .filter((r) => r.attributeId && r.valueIds.length > 0)
    .reduce((acc, r) => acc * r.valueIds.length, 1);

  const validRowCount = rows.filter((r) => r.attributeId && r.valueIds.length > 0).length;
  const LIMIT = 100;

  return (
    <div className="space-y-4">
      {rows.map((row, idx) => {
        const attrObj = allAttributes.find((a) => a.id === Number(row.attributeId));
        const availableAttrs = allAttributes
          .filter((a) => !usedAttrIds.includes(a.id) || a.id === Number(row.attributeId))
          .map((a) => ({
            value: a.id,
            label: a.name.charAt(0).toUpperCase() + a.name.slice(1),
          }));

        return (
          <div
            key={row.id}
            className="rounded-2xl border border-slate-200 dark:border-[#2e2e2e] bg-slate-50 dark:bg-[#222222]/40 p-4 space-y-3"
          >
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-[#B12B89] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                {idx + 1}
              </span>
              <SelectDropDown
                value={row.attributeId}
                onChange={(e) => setAttr(row.id, e.target.value)}
                options={availableAttrs}
                placeholder={t("builder.select_attr")}
                sx={{ flex: 1, "& .MuiSelect-select": { py: "8px" } }}
              />
              {rows.length > 1 && (
                <button
                  onClick={() => removeRow(row.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>

            {attrObj ? (
              <div className="flex flex-wrap gap-2 pl-9">
                {attrObj.values.map((v) => {
                  const selected = row.valueIds.includes(v.id);
                  return (
                    <button
                      key={v.id}
                      onClick={() => toggleValue(row.id, v.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all select-none ${
                        selected
                          ? "bg-[#B12B89] text-white border-[#B12B89] shadow-sm shadow-blue-300/40"
                          : "bg-white dark:bg-[#222222] text-slate-600 dark:text-slate-300 border-slate-300 dark:border-[#3a3a3a] hover:border-blue-400"
                      }`}
                    >
                      {selected && <span className="mr-1">✓</span>}
                      {v.value}
                    </button>
                  );
                })}
                {row.valueIds.length > 0 && (
                  <span className="self-center text-[10px] text-slate-400 font-bold uppercase tracking-wider ml-1">
                    {t("builder.n_selected", { count: row.valueIds.length })}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 pl-9 italic">{t("builder.pick_hint")}</p>
            )}
          </div>
        );
      })}

      {validRowCount > 0 && (
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border ${
            previewCount > LIMIT
              ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:border-red-800"
              : previewCount > LIMIT * 0.7
              ? "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800"
              : "bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:border-green-800"
          }`}
        >
          <span>{t("builder.will_generate", { count: previewCount })}</span>
          {previewCount > LIMIT && (
            <span>{t("builder.exceeds_limit", { limit: LIMIT })}</span>
          )}
        </div>
      )}

      <button
        onClick={addRow}
        className="flex items-center gap-2 text-[#B12B89] text-sm font-semibold hover:underline"
      >
        <Plus size={15} /> {t("builder.add_another_attr")}
      </button>
    </div>
  );
};

const VariantsPreviewTable = ({ variants, onChange, onSubmit, loading }) => {
  const { t } = useTranslation("variants");

  const generateAll = () =>
    onChange(variants.map((v) => ({ ...v, barcode: generateBarcode() })));

  const updateBarcode = (id, barcode) =>
    onChange(variants.map((v) => (v.id === id ? { ...v, barcode } : v)));

  const removeVariant = (id) => onChange(variants.filter((v) => v.id !== id));

  const allHaveBarcodes = variants.every((v) => v.barcode?.trim());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
          {t("builder.n_generated", { count: variants.length })}
        </p>
        <button
          onClick={generateAll}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#2e2e2e] text-xs font-semibold hover:bg-slate-50 dark:hover:bg-[#222222] transition-colors"
        >
          <Shuffle size={13} /> {t("builder.auto_barcodes")}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-[#2e2e2e] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-[#222222]/50">
            <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400">
              <th className="px-4 py-3">{t("table.variant")}</th>
              <th className="px-4 py-3">{t("table.barcode")}</th>
              <th className="px-4 py-3 text-right w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[#2e2e2e]">
            {variants.map((v) => (
              <tr
                key={v.id}
                className="hover:bg-slate-50/50 dark:hover:bg-[#222222]/30 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {v.attributes.map((a, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800"
                      >
                        {a.attributeName}: {a.valueName}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <input
                      value={v.barcode}
                      onChange={(e) => updateBarcode(v.id, e.target.value)}
                      placeholder={t("builder.barcode_placeholder")}
                      className={`w-44 rounded-lg border px-2.5 py-1.5 text-xs font-mono outline-none focus:ring-2 focus:ring-[#B12B89] transition-colors ${
                        v.barcode?.trim()
                          ? "border-slate-300 dark:border-[#3a3a3a] dark:bg-[#1c1c1c]"
                          : "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20"
                      }`}
                    />
                    <button
                      onClick={() => updateBarcode(v.id, generateBarcode())}
                      title="Generate barcode"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#B12B89] hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      <QrCode size={14} />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => removeVariant(v.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    disabled={variants.length === 1}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!allHaveBarcodes && (
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2">
          <AlertTriangle size={14} />
          {t("builder.missing_barcodes")}
        </div>
      )}

      <button
        onClick={onSubmit}
        disabled={loading || !allHaveBarcodes || variants.length === 0}
        className="w-full py-3 bg-[#B12B89] hover:bg-[#B05596] disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
      >
        {loading ? (
          <Loader2 className="animate-spin h-5 w-5" />
        ) : (
          <>
            <CheckCircle2 size={16} />
            {t("builder.save_variants", { count: variants.length })}
          </>
        )}
      </button>
    </div>
  );
};

export const VariantBuilderModal = ({
  allAttributes,
  articleId,
  onClose,
  onSubmit,
  loading,
}) => {
  const { t } = useTranslation("variants");
  const [step, setStep] = useState(1);
  const [attrRows, setAttrRows] = useState([
    { id: crypto.randomUUID(), attributeId: "", valueIds: [] },
  ]);
  const [generatedVariants, setGeneratedVariants] = useState([]);

  const handleGenerate = () => {
    const validRows = attrRows.filter((r) => r.attributeId && r.valueIds.length > 0);
    if (validRows.length === 0) {
      toast.error(t("notifications.select_attr_first"));
      return;
    }
    const total = validRows.reduce((acc, row) => acc * row.valueIds.length, 1);
    const LIMIT = 100;
    if (total > LIMIT) {
      toast.error(t("notifications.too_many_variants", { total, limit: LIMIT }));
      return;
    }
    const valueArrays = validRows.map((row) => {
      const attrObj = allAttributes.find((a) => a.id === Number(row.attributeId));
      return row.valueIds.map((vid) => {
        const valObj = attrObj?.values.find((v) => v.id === vid);
        return {
          attributeId: Number(row.attributeId),
          attributeValueId: vid,
          attributeName: attrObj?.name || "",
          valueName: valObj?.value || "",
        };
      });
    });
    const combos = cartesian(valueArrays);
    setGeneratedVariants(
      combos.map((combo) => ({ id: crypto.randomUUID(), barcode: "", attributes: combo }))
    );
    setStep(2);
  };

  const handleSubmit = async () => {
    const payload = generatedVariants.map((v) => ({
      barcode: v.barcode,
      attributes: v.attributes.map((a) => ({
        attributeId: a.attributeId,
        attributeValueId: a.attributeValueId,
      })),
    }));
    await onSubmit(payload);
  };

  const canGenerate = attrRows.some((r) => r.attributeId && r.valueIds.length > 0);

  const stepIndicator = (
    <div className="flex items-center gap-2">
      {[1, 2].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              s === step
                ? "bg-[#B12B89] text-white"
                : s < step
                ? "bg-green-500 text-white"
                : "bg-slate-100 dark:bg-[#222222] text-slate-400"
            }`}
          >
            {s < step ? "✓" : s}
          </div>
          <span
            className={`text-xs font-semibold ${
              s === step ? "text-slate-900 dark:text-slate-100" : "text-slate-400"
            }`}
          >
            {s === 1 ? t("builder.step1_label") : t("builder.step2_label")}
          </span>
          {s < 2 && <ChevronRight size={14} className="text-slate-300 mx-1" />}
        </div>
      ))}
    </div>
  );

  const footer =
    step === 1 ? (
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 border border-slate-200 dark:border-[#2e2e2e] rounded-xl font-semibold text-sm hover:bg-slate-50 dark:hover:bg-[#222222] transition-colors"
        >
          {t("builder.cancel")}
        </button>
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="flex-1 py-2.5 bg-[#B12B89] hover:bg-[#B05596] disabled:opacity-40 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
        >
          <Sparkles size={15} />
          {t("builder.generate_btn")}
        </button>
      </div>
    ) : (
      <button
        onClick={() => setStep(1)}
        className="py-2.5 px-5 border border-slate-200 dark:border-[#2e2e2e] rounded-xl font-semibold text-sm hover:bg-slate-50 dark:hover:bg-[#222222] transition-colors"
      >
        {t("builder.back")}
      </button>
    );

  return (
    <BaseModal
      onClose={onClose}
      title={step === 1 ? t("builder.title_step1") : t("builder.title_step2")}
      subtitle={step === 1 ? t("builder.desc_step1") : t("builder.desc_step2")}
      icon={<Package size={18} className="text-[#B12B89]" />}
      iconBg="bg-blue-50 dark:bg-blue-900/30"
      subHeader={stepIndicator}
      maxWidth="max-w-2xl"
      footer={footer}
      bodyClassName="flex-1 overflow-y-auto px-6 py-5"
    >
      {step === 1 ? (
        <AttributeSelector
          allAttributes={allAttributes}
          rows={attrRows}
          onChange={setAttrRows}
        />
      ) : (
        <VariantsPreviewTable
          variants={generatedVariants}
          onChange={setGeneratedVariants}
          onSubmit={handleSubmit}
          loading={loading}
        />
      )}
    </BaseModal>
  );
};
