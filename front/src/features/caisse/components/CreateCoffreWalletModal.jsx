import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "@/shared/utils/toast";
import { Vault } from "lucide-react";
import { BaseModal } from "../../../shared/components/BaseModal";
import { Input } from "../../../shared/components/Input";
import { SelectDropDown } from "../../../shared/components/SelectDropDown";
import { useCreateCoffreWallet } from "../hooks/useCaisse";
import { useSocietes } from "../../societes/hooks/useSocietes";
import { useAuth } from "../../auth/hooks/useAuth";

export const CreateCoffreWalletModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation("caisse");
  const { user } = useAuth();
  const isSuperAdmin = !!user?.isSuperAdmin;
  const createMutation = useCreateCoffreWallet();

  const { data: societesData } = useSocietes({ pageIndex: 0, pageSize: 200, keyword: "", enabled: isOpen });
  const societes = societesData?.data ?? [];

  const { control, register, handleSubmit, reset, setError, formState: { errors } } = useForm({
    defaultValues: { societeId: "", name: "Caisse", initialBalance: "" },
  });

  useEffect(() => {
    if (!isOpen) reset({ societeId: "", name: "Caisse", initialBalance: "" });
  }, [isOpen, reset]);

  const onSubmit = (values) => {
    createMutation.mutate(
      {
        ...(isSuperAdmin && values.societeId ? { societeId: Number(values.societeId) } : {}),
        name: values.name?.trim() || "Caisse",
        initialBalance: values.initialBalance !== "" ? Number(values.initialBalance) : 0,
      },
      {
        onSuccess: (res) => {
          toast.success(res?.message || t("success_coffre_wallet_created"));
          onClose();
        },
        onError: (err) => {
          toast.error(err?.response?.data?.message || t("err_create_caisse"));
        },
      }
    );
  };

  const societeOptions = useMemo(
    () => societes.map((s) => ({ label: s.raisonSocial, value: s.id })),
    [societes]
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      disableClose={createMutation.isPending}
      title={t("modal_create_coffre_wallet_title")}
      subtitle={t("modal_create_coffre_wallet_subtitle")}
      icon={<Vault size={18} className="text-amber-500" />}
      iconBg="bg-amber-50 dark:bg-amber-900/20"
      maxWidth="max-w-md"
      footer={
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={createMutation.isPending} className="px-5 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400">{t("btn_cancel")}</button>
          <button type="submit" form="create-coffre-wallet-form" disabled={createMutation.isPending} className="px-6 py-2 text-sm font-bold rounded-xl text-white bg-amber-500 shadow-lg shadow-amber-500/20 disabled:opacity-50">
            {createMutation.isPending ? t("btn_creating") : t("btn_create")}
          </button>
        </div>
      }
    >
      <form id="create-coffre-wallet-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {isSuperAdmin && (
          <Controller
            control={control}
            name="societeId"
            rules={{ required: t("err_societe_required") }}
            render={({ field }) => (
              <SelectDropDown label={t("field_societe")} {...field} options={societeOptions} error={errors.societeId?.message} required placeholder={t("placeholder_select_societe")} />
            )}
          />
        )}

        <Input label={t("field_coffre_name")} {...register("name", { required: t("err_coffre_name_required") })} error={errors.name?.message} required placeholder={t("placeholder_coffre_name")} />
        <Input label={t("field_initial_balance")} type="number" step="0.01" min="0" {...register("initialBalance")} placeholder={t("placeholder_amount")} />
      </form>
    </BaseModal>
  );
};
