import { useState } from "react";
import { FolderTree, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "@/shared/utils/toast";
import { BaseModal } from "../../../shared/components/BaseModal";
import { Input } from "../../../shared/components/Input";
import { useCreateCategory } from "../hooks/useCategories";

const extractId = (res) => res?.data?.id ?? res?.id ?? null;

export const QuickCreateCategoryModal = ({ isOpen, onClose, onCreated, zIndex = "z-[80]" }) => {
  const { t } = useTranslation("categories");
  const createMutation = useCreateCategory();
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const reset = () => {
    setName("");
    setError("");
  };

  const handleClose = () => {
    if (createMutation.isPending) return;
    reset();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("validation.name_required"));
      return;
    }
    try {
      const res = await createMutation.mutateAsync({ name: name.trim(), visible: true });
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
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      disableClose={createMutation.isPending}
      title={t("quick_create_title")}
      subtitle={t("quick_create_subtitle")}
      icon={<FolderTree size={16} className="text-[#B12B89]" />}
      iconBg="bg-[#B12B89]/10"
      zIndex={zIndex}
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
            form="quick-create-category-form"
            disabled={createMutation.isPending}
            className="inline-flex items-center gap-2 px-4 h-10 rounded-md text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: "#B12B89" }}
          >
            {createMutation.isPending && <Loader2 size={14} className="animate-spin" />}
            {t("save_category")}
          </button>
        </div>
      }
    >
      <form id="quick-create-category-form" onSubmit={handleSubmit}>
        <Input
          label={t("category_name")}
          name="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
          placeholder={t("enter_category_name")}
          error={error}
          required
          autoFocus
        />
      </form>
    </BaseModal>
  );
};
