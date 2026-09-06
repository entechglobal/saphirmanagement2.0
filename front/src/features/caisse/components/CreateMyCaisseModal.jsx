import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "@/shared/utils/toast";
import { Wallet } from "lucide-react";
import { BaseModal } from "../../../shared/components/BaseModal";
import { Input } from "../../../shared/components/Input";
import { useCreateMyCaisse } from "../hooks/useCaisse";
import { useAuth } from "../../auth/hooks/useAuth";

const getMyPreviewName = (user) => {
  if (!user) return "";
  return `Wallet Utilisateur - ${user.name}`;
};

export const CreateMyCaisseModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation("caisse");
  const { user } = useAuth();
  const createMyCaisse = useCreateMyCaisse();
  const previewName = getMyPreviewName(user);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { initialBalance: "" },
  });

  useEffect(() => {
    if (isOpen) reset({ initialBalance: "" });
  }, [isOpen, reset]);

  const onSubmit = (values) => {
    createMyCaisse.mutate(
      { initialBalance: values.initialBalance !== "" ? Number(values.initialBalance) : 0 },
      {
        onSuccess: (res) => {
          toast.success(res?.message || t("success_my_caisse_created"));
          onClose();
        },
        onError: (err) => {
          toast.error(err?.response?.data?.message || t("err_create_my_caisse"));
        },
      }
    );
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      disableClose={createMyCaisse.isPending}
      title={t("modal_create_my_caisse_title")}
      subtitle={t("modal_create_my_caisse_subtitle")}
      icon={<Wallet size={18} className="text-blue-500" />}
      iconBg="bg-blue-50 dark:bg-blue-900/20"
      maxWidth="max-w-sm"
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={createMyCaisse.isPending}
            className="px-5 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 transition disabled:opacity-50"
          >
            {t("btn_cancel")}
          </button>
          <button
            type="submit"
            form="create-my-caisse-form"
            disabled={createMyCaisse.isPending}
            className="px-6 py-2 text-sm font-bold rounded-xl text-white shadow-lg shadow-blue-500/25 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: "#B12B89" }}
          >
            {createMyCaisse.isPending ? t("btn_creating") : t("btn_create")}
          </button>
        </div>
      }
    >
      <form id="create-my-caisse-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Auto-generated name preview */}
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/15 border border-blue-100 dark:border-blue-800/40">
          <Wallet className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-0.5">
              {t("name_preview_label")}
            </p>
            <p className="text-sm font-bold text-blue-700 dark:text-blue-300">{previewName}</p>
          </div>
        </div>

        <Input
          label={t("field_initial_balance")}
          type="number"
          step="0.01"
          min="0"
          {...register("initialBalance")}
          error={errors.initialBalance?.message}
          placeholder={t("placeholder_amount")}
        />
      </form>
    </BaseModal>
  );
};
