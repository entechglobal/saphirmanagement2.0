"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FolderTree } from "lucide-react";
import { toast } from "@/shared/utils/toast";
import { useTranslation } from "react-i18next";

import { InputToggle } from "../../../shared/components/InputToggle";
import { Input } from "../../../shared/components/Input";
import { FormCard } from "../../../shared/components/FormCard";
import { FormActions } from "../../../shared/components/FormActions";
import { ImageUpload } from "../../../shared/components/ImageUpload";

export const CategoryForm = ({
  initialValues = null,
  onSubmit,
  isLoading = false,
  title,
}) => {
  const { t } = useTranslation("categories");
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    image: null,
    imagePreview: "",
    visible: true,
  });

  const [errors, setErrors] = useState({});
  const [imageDirty, setImageDirty] = useState(false);

  useEffect(() => {
    if (!initialValues) return;
    const src = initialValues?.data ?? initialValues;
    setForm({
      name: src?.name ?? src?.attributes?.name ?? "",
      image: null,
      imagePreview: src?.image ?? src?.attributes?.image ?? "",
      visible: typeof src?.visible !== "undefined"
        ? Boolean(src.visible)
        : Boolean(src?.attributes?.visible),
    });
    setImageDirty(false);
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

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return toast.error(t("validation.fill_required"));
    }

    let submission;
    if (form.image instanceof File || imageDirty) {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("visible", String(form.visible));
      if (form.image instanceof File) {
        fd.append("image", form.image);
      } else if (imageDirty && !form.imagePreview) {
        fd.append("image", "");
      }
      submission = fd;
    } else {
      submission = { name: form.name, visible: form.visible };
    }

    await onSubmit(submission);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormCard title={title || t("category_details")} icon={<FolderTree />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t("category_name")}
            name="name"
            placeholder={t("enter_category_name")}
            value={form.name}
            onChange={handleChange}
            error={errors.name}
            required
          />
          <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/30 p-4 flex items-center">
            <InputToggle
              label={t("visible")}
              description={t("visibility_description")}
              name="visible"
              checked={form.visible}
              onChange={handleChange}
            />
          </div>
          <div className="sm:col-span-2">
            <p className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 ml-1">
              {t("category_image")}
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

      <FormActions
        onCancel={() => navigate("/categories")}
        cancelLabel={t("common:cancel", { defaultValue: "Annuler" })}
        submitLabel={t("save_category")}
        isLoading={isLoading}
      />
    </form>
  );
};
