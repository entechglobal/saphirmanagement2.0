import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import EditIcon from "@mui/icons-material/Edit";

import DeleteIcon from "@mui/icons-material/Delete";
import { X } from "lucide-react";
import { toast } from "@/shared/utils/toast";
import {
  useAttributes,
  useCreateAttribute,
  useUpdateAttribute,
  useDeleteAttribute,
} from "../../hooks/useAttributes";

// Custom Card wrapper matching your reference style
const Card = ({ title, children }) => (
  <div className="rounded-2xl border border-slate-200 dark:border-[#2e2e2e] bg-white dark:bg-[#1c1c1c]/40 p-5 overflow-hidden">
    <div className="px-6 py-4 border-b border-slate-50 dark:border-[#2e2e2e] bg-slate-50/50 dark:bg-[#222222]/30">
      <h3 className="font-bold text-[11px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
        {title}
      </h3>
    </div>
    <div className="p-6">{children}</div>
  </div>
);

const ATTRIBUTE_STYLES = {
  color: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-800",
  size: "bg-purple-50 text-purple-700 ring-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:ring-purple-800",
  default: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-[#222222] dark:text-slate-300 dark:ring-[#2e2e2e]",
};

export const AttributePage = () => {
  const { t } = useTranslation("attributes");
  const [attributeName, setAttributeName] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [pendingValues, setPendingValues] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const { data, isLoading } = useAttributes();
  const createAttribute = useCreateAttribute();
  const updateAttribute = useUpdateAttribute();
  const deleteAttribute = useDeleteAttribute();

  const [attributes, setAttributes] = useState([]);

  useEffect(() => {
    if (data && data.data) {
      setAttributes(
        data.data.map((attr) => ({
          id: attr.id,
          name: attr.name,
          values: attr.values.map((v) => ({
            id: v.id,
            value: typeof v.value === "string" ? v.value : JSON.stringify(v.value),
          })),
        }))
      );
    }
  }, [data]);

  const addTag = () => {
    const value = tagInput.trim();
    if (!value) return;
    if (pendingValues.some((v) => v.toLowerCase() === value.toLowerCase())) {
      setTagInput("");
      return;
    }
    setPendingValues((prev) => [...prev, value]);
    setTagInput("");
  };

  const removeTag = (index) => {
    setPendingValues((prev) => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
    if (e.key === "Backspace" && !tagInput && pendingValues.length) {
      removeTag(pendingValues.length - 1);
    }
  };

  const handleSaveAttribute = () => {
    if (!attributeName || pendingValues.length === 0) return;
    if (editingId) {
      const existingAttr = attributes.find((a) => a.id === editingId);
      const removedIds = existingAttr.values
        .filter((v) => !pendingValues.includes(v.value))
        .map((v) => v.id);
      const newValues = pendingValues.filter(
        (v) => !existingAttr.values.some((ev) => ev.value === v)
      );
      const payload = {
        name: attributeName.trim(),
        ...(newValues.length > 0 && { addValues: newValues }),
        ...(removedIds.length > 0 && { removeValueIds: removedIds }),
      };
      updateAttribute.mutate(
        { id: editingId, payload },
        {
          onSuccess: () => {
            toast.success(t("toast.update_success"));
            resetForm();
          },
          onError: (err) => {
            const msg = err?.response?.data?.message || t("toast.update_error");
            toast.error(msg);
          },
        }
      );
    } else {
      createAttribute.mutate({ name: attributeName.trim(), values: pendingValues }, {
        onSuccess: () => {
          toast.success(t("toast.create_success"));
          resetForm();
        },
      });
    }
  };

  const handleEdit = (attr) => {
    setEditingId(attr.id);
    setAttributeName(attr.name);
    setPendingValues(attr.values.map((v) => v.value));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setEditingId(null);
    setAttributeName("");
    setPendingValues([]);
    setTagInput("");
  };

  const handleDelete = (id) => {
    deleteAttribute.mutate(id);
    if (editingId === id) resetForm();
  };

  const getBadgeStyle = (name) => {
    const key = name.toLowerCase();
    return ATTRIBUTE_STYLES[key] || ATTRIBUTE_STYLES.default;
  };

  if (isLoading) return <div className="p-8">{t("loading")}</div>;

  return (
    <div>
      <div className="space-y-8">

        {/* ================= FORM SECTION ================= */}
        <Card title={editingId ? t("form.edit_title") : t("form.create_title")}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                {t("form.name_label")}
              </label>
              <input
                className="w-full px-4 py-2.5 bg-white dark:bg-[#222222] border border-slate-200 dark:border-[#2e2e2e] rounded-xl focus:ring-2 focus:ring-[#C86AAC] outline-none transition dark:text-slate-100"
                placeholder={t("form.name_placeholder")}
                value={attributeName}
                onChange={(e) => setAttributeName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                {t("form.values_label")}
              </label>
              <div className="min-h-[46px] border border-slate-200 dark:border-[#2e2e2e] rounded-xl px-3 py-2 flex flex-wrap items-center gap-2 focus-within:ring-2 focus-within:ring-[#C86AAC] bg-white dark:bg-[#222222]">
                {pendingValues.map((tag, index) => (
                  <span
                    key={index}
                    className="flex items-center gap-1.5 bg-[#C86AAC]/10 dark:bg-[#C86AAC]/20 text-[#C86AAC] px-2.5 py-1 rounded-xl text-xs font-medium border border-[#C86AAC]/20"
                  >
                    {tag}
                    <X
                      size={14}
                      className="cursor-pointer hover:text-red-500 transition-colors"
                      onClick={() => removeTag(index)}
                    />
                  </span>
                ))}
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 min-w-[120px] outline-none text-sm bg-transparent dark:text-slate-200"
                  placeholder={pendingValues.length === 0 ? t("form.values_placeholder") : ""}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            {editingId && (
              <button
                onClick={resetForm}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#222222] rounded-xl transition"
              >
                {t("form.cancel")}
              </button>
            )}
            <button
              disabled={!attributeName || pendingValues.length === 0}
              onClick={handleSaveAttribute}
              className={`px-6 py-2 rounded-xl text-sm font-bold text-white transition shadow-sm disabled:opacity-50 ${editingId ? "bg-emerald-600 hover:bg-emerald-700" : "bg-[#C86AAC] hover:bg-[#B05596]"
                }`}
            >
              {editingId ? t("form.update") : t("form.create")}
            </button>
          </div>
        </Card>

        {/* ================= TABLE SECTION ================= */}
        <Card title={t("table.title")}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-200 dark:border-[#2e2e2e] rounded-xl overflow-hidden">
              <thead className="bg-slate-50 dark:bg-[#1F2937]">
                <tr className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="px-6 py-4 text-left font-bold">{t("table.col_attribute")}</th>
                  <th className="px-6 py-4 text-left font-bold">{t("table.col_values")}</th>
                  <th className="px-6 py-4 text-right font-bold">{t("table.col_actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#2e2e2e]">
                {attributes.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-slate-400 italic">
                      {t("table.empty")}
                    </td>
                  </tr>
                ) : (
                  attributes.map((attr) => (
                    <tr
                      key={attr.id}
                      className={`hover:bg-slate-50 dark:hover:bg-[#1c1c1c] transition ${editingId === attr.id ? "bg-[#C86AAC]/5 dark:bg-[#C86AAC]/10" : ""
                        }`}
                    >
                      <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-100">
                        {attr.name}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {attr.values.map((v) => (
                            <span
                              key={v.id}
                              className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-medium rounded-full ring-1 ${getBadgeStyle(attr.name)}`}
                            >
                              {v.value}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => handleEdit(attr)}
                            className="p-2 rounded-xl text-[#C86AAC] hover:bg-[#C86AAC]/10 dark:hover:bg-[#C86AAC]/20 transition"
                            title="Edit"
                          >
                            <EditIcon sx={{ fontSize: 18 }} />
                          </button>
                          <button
                            onClick={() => handleDelete(attr.id)}
                            className="p-2 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition"
                            title="Delete"
                          >
                            <DeleteIcon sx={{ fontSize: 18 }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>

  );
};