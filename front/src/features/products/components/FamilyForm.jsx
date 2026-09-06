"use client";

import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layers, Settings2 } from "lucide-react";
import { toast } from "@/shared/utils/toast";
import { useTranslation } from "react-i18next";

import { useCategories } from "../hooks/useCategories";
import { ImageUpload } from "../../../shared/components/ImageUpload";
import { FormCard } from "../../../shared/components/FormCard";
import { FormActions } from "../../../shared/components/FormActions";
import { Input } from "../../../shared/components/Input";
import { InputToggle } from "../../../shared/components/InputToggle";
import { SelectDropDown } from "../../../shared/components/SelectDropDown";
import { SelectWithQuickAdd } from "./SelectWithQuickAdd";
import { QuickCreateCategoryModal } from "./QuickCreateCategoryModal";

const TVA_OPTIONS = [
  { label: "0%", value: 0 },
  { label: "7%", value: 0.07 },
  { label: "10%", value: 0.10 },
  { label: "15%", value: 0.15 },
  { label: "20%", value: 0.2 },
];

export const FamilyForm = ({ id, initialValues, onSubmit, isLoading }) => {
  const { t } = useTranslation("families");
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    name: "",
    categoryId: "",
    manageInStock: true,
    TVA: "",
    remise: "",
    visible: true,
    image: null,
    imagePreview: "",
  });

  const [imageDirty, setImageDirty] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const { data: categoriesData, isLoading: categoriesLoading } = useCategories({
    pageSize: 1000,
  });

  const categoriesOptions = categoriesData?.data?.map((c) => ({
    value: c.id,
    label: c.name,
  })) || [];

  const initializedRef = useRef(false);

  useEffect(() => {
    initializedRef.current = false;
  }, [id]);

  useEffect(() => {
    if (!initialValues || initializedRef.current) return;
    setForm({
      name: initialValues.name ?? "",
      categoryId: initialValues.categoryId ? String(initialValues.categoryId) : "",
      manageInStock: Boolean(initialValues.manageInStock),
      visible: Boolean(initialValues.visible),
      TVA: initialValues.TVA ?? "",
      remise: initialValues.remise || "",
      image: null,
      imagePreview: initialValues.imagePreview ?? "",
    });
    initializedRef.current = true;
  }, [initialValues]);

  const handleChange = (e, checked) => {
    const name = e?.target?.name;
    if (!name) return;
    const value = typeof checked === "boolean" ? checked : e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev) => ({ ...prev, image: file, imagePreview: reader.result }));
      setImageDirty(true);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setForm((prev) => ({ ...prev, image: null, imagePreview: "" }));
    setImageDirty(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = t("validation.name_required");
    if (!form.categoryId) newErrors.categoryId = t("validation.category_required");

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return toast.error(t("validation.fill_required"));
    }

    const payload = {
      name: form.name,
      categoryId: form.categoryId,
      manageInStock: form.manageInStock,
      TVA: form.TVA,
      remise: form.remise ? Number(form.remise) / 100 : 0,
      visible: form.visible,
    };

    if (form.image instanceof File || imageDirty) {
      const fd = new FormData();
      Object.entries(payload).forEach(([k, v]) => fd.append(k, v ?? ""));
      if (form.image instanceof File) {
        fd.append("image", form.image);
      } else if (imageDirty && !form.imagePreview) {
        fd.append("image", "");
      }
      await onSubmit(fd);
    } else {
      await onSubmit(payload);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormCard title={t("family_details")} icon={<Layers />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t("family_name")}
            name="name"
            placeholder={t("name_placeholder")}
            value={form.name}
            onChange={handleChange}
            error={errors.name}
            required
          />
          <SelectWithQuickAdd
            label={t("category")}
            name="categoryId"
            value={form.categoryId}
            onChange={handleChange}
            error={errors.categoryId}
            options={categoriesOptions}
            isLoading={categoriesLoading}
            required
            onAdd={() => setShowCategoryModal(true)}
            addLabel={t("quick_add_category")}
          />
          <div className="sm:col-span-2">
            <p className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 ml-1">
              {t("family_image")}
            </p>
            <div className="max-w-[220px]">
              <ImageUpload
                label={t("upload_image")}
                imagePreview={form.imagePreview}
                onImageChange={handleImageUpload}
                onRemove={handleRemoveImage}
              />
            </div>
          </div>
        </div>
      </FormCard>

      <FormCard title={t("commercial_settings")} icon={<Settings2 />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectDropDown
            label={t("tva_label")}
            name="TVA"
            value={form.TVA}
            onChange={handleChange}
            options={TVA_OPTIONS}
          />
          <Input
            label={t("remise_label")}
            name="remise"
            type="number"
            placeholder="0"
            min="0"
            max="100"
            value={form.remise}
            onChange={handleChange}
          />
          <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-slate-100 dark:border-[#2e2e2e] bg-slate-50/80 dark:bg-[#222222]/30 p-4">
            <InputToggle
              label={t("manage_stock")}
              description={t("stock_description")}
              name="manageInStock"
              checked={form.manageInStock}
              onChange={handleChange}
            />
            <InputToggle
              label={t("visible")}
              description={t("visibility_description")}
              name="visible"
              checked={form.visible}
              onChange={handleChange}
            />
          </div>
        </div>
      </FormCard>

      <FormActions
        onCancel={() => navigate("/families")}
        cancelLabel={t("common:cancel", { defaultValue: "Annuler" })}
        submitLabel={t("save_family")}
        isLoading={isLoading}
      />

      <QuickCreateCategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onCreated={(id) => {
          if (id) {
            setForm((prev) => ({ ...prev, categoryId: String(id) }));
            setErrors((prev) => ({ ...prev, categoryId: null }));
          }
        }}
      />
    </form>
  );
};
