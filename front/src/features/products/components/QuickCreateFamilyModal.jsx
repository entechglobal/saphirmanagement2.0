import { useState } from "react";
import { Layers, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "@/shared/utils/toast";
import { BaseModal } from "../../../shared/components/BaseModal";
import { Input } from "../../../shared/components/Input";
import { SelectDropDown } from "../../../shared/components/SelectDropDown";
import { SelectWithQuickAdd } from "./SelectWithQuickAdd";
import { QuickCreateCategoryModal } from "./QuickCreateCategoryModal";
import { useCategories } from "../hooks/useCategories";
import { useCreateFamily } from "../hooks/useFamilies";

const TVA_OPTIONS = [
  { label: "0%", value: 0 },
  { label: "7%", value: 0.07 },
  { label: "10%", value: 0.1 },
  { label: "15%", value: 0.15 },
  { label: "20%", value: 0.2 },
];

const extractId = (res) => res?.data?.id ?? res?.id ?? null;

export const QuickCreateFamilyModal = ({ isOpen, onClose, onCreated }) => {
  const { t } = useTranslation("families");
  const createMutation = useCreateFamily();
  const { data: categoriesData, isLoading: categoriesLoading } = useCategories({
    pageSize: 1000,
  });
  const categoriesOptions =
    categoriesData?.data?.map((c) => ({ value: c.id, label: c.name })) || [];

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tva, setTva] = useState(0.2);
  const [errors, setErrors] = useState({});
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const reset = () => {
    setName("");
    setCategoryId("");
    setTva(0.2);
    setErrors({});
  };

  const handleClose = () => {
    if (createMutation.isPending) return;
    reset();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!name.trim()) next.name = t("validation.name_required");
    if (!categoryId) next.categoryId = t("validation.category_required");
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    try {
      const res = await createMutation.mutateAsync({
        name: name.trim(),
        categoryId: Number(categoryId),
        TVA: Number(tva),
        manageInStock: true,
        visible: true,
      });
      const id = extractId(res);
      toast.success(t("quick_created"));
      reset();
      onCreated?.(id, { name: name.trim() });
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || t("validation.fill_required"));
    }
  };

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        onClose={handleClose}
        disableClose={createMutation.isPending}
        title={t("quick_create_title")}
        subtitle={t("quick_create_subtitle")}
        icon={<Layers size={16} className="text-[#B12B89]" />}
        iconBg="bg-[#B12B89]/10"
        zIndex="z-[70]"
        maxWidth="max-w-md"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={createMutation.isPending}
              className="px-4 h-10 rounded-md border border-slate-300 dark:border-[#2e2e2e] text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#222222] disabled:opacity-50"
            >
              {t("delete_modal.cancel")}
            </button>
            <button
              type="submit"
              form="quick-create-family-form"
              disabled={createMutation.isPending}
              className="inline-flex items-center gap-2 px-4 h-10 rounded-md text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: "#B12B89" }}
            >
              {createMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              {t("save_family")}
            </button>
          </div>
        }
      >
        <form id="quick-create-family-form" onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t("family_name")}
            name="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErrors((prev) => ({ ...prev, name: null }));
            }}
            placeholder={t("name_placeholder")}
            error={errors.name}
            required
            autoFocus
          />
          <SelectWithQuickAdd
            label={t("category")}
            name="categoryId"
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setErrors((prev) => ({ ...prev, categoryId: null }));
            }}
            error={errors.categoryId}
            options={categoriesOptions}
            isLoading={categoriesLoading}
            required
            onAdd={() => setShowCategoryModal(true)}
            addLabel={t("quick_add_category")}
          />
          <SelectDropDown
            label={t("tva_label")}
            name="TVA"
            value={tva}
            onChange={(e) => setTva(e.target.value)}
            options={TVA_OPTIONS}
          />
        </form>
      </BaseModal>

      <QuickCreateCategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onCreated={(id) => {
          if (id) setCategoryId(String(id));
        }}
        zIndex="z-[90]"
      />
    </>
  );
};
