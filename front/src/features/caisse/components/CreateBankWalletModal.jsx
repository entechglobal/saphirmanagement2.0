import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "@/shared/utils/toast";
import { Landmark } from "lucide-react";
import { BaseModal } from "../../../shared/components/BaseModal";
import { Input } from "../../../shared/components/Input";
import { SelectDropDown } from "../../../shared/components/SelectDropDown";
import { useCreateBankWallet } from "../hooks/useCaisse";
import { useBanques } from "../../stracture/banques/hooks/useBanques";
import { useSocietes } from "../../societes/hooks/useSocietes";
import { useAuth } from "../../auth/hooks/useAuth";

export const CreateBankWalletModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation("caisse");
  const { user } = useAuth();
  const isSuperAdmin = !!user?.isSuperAdmin;
  const createMutation = useCreateBankWallet();

  const { data: societesData } = useSocietes({ pageIndex: 0, pageSize: 200, keyword: "", enabled: isOpen });
  const { data: banquesData } = useBanques({ pageIndex: 0, pageSize: 200, keyword: "", enabled: isOpen });

  const societes = societesData?.data ?? [];
  const banques = banquesData?.data ?? [];

  const { control, register, handleSubmit, reset, watch, setError, formState: { errors } } = useForm({
    defaultValues: { societeId: "", banqueId: "", name: "", initialBalance: "" },
  });

  useEffect(() => {
    if (!isOpen) reset({ societeId: "", banqueId: "", name: "", initialBalance: "" });
  }, [isOpen, reset]);

  const selectedBanqueId = watch("banqueId");
  const selectedBanque = banques.find((b) => String(b.id) === String(selectedBanqueId));

  const onSubmit = (values) => {
    createMutation.mutate(
      {
        ...(isSuperAdmin && values.societeId ? { societeId: Number(values.societeId) } : {}),
        banqueId: Number(values.banqueId),
        name: values.name?.trim() || undefined,
        initialBalance: values.initialBalance !== "" ? Number(values.initialBalance) : 0,
      },
      {
        onSuccess: (res) => {
          toast.success(res?.message || t("success_bank_wallet_created"));
          onClose();
        },
        onError: (err) => {
          const apiErrors = err?.response?.data?.errors;
          if (Array.isArray(apiErrors)) {
            apiErrors.forEach((e) => {
              if (e.path) setError(e.path, { type: "server", message: e.msg });
            });
          }
          toast.error(err?.response?.data?.message || t("err_create_caisse"));
        },
      }
    );
  };

  const societeOptions = useMemo(
    () => societes.map((s) => ({ label: s.raisonSocial, value: s.id })),
    [societes]
  );

  const banqueOptions = useMemo(
    () => banques.map((b) => ({ label: b.name, subLabel: b.RIB ?? undefined, value: b.id })),
    [banques]
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      disableClose={createMutation.isPending}
      title={t("modal_create_bank_wallet_title")}
      subtitle={t("modal_create_bank_wallet_subtitle")}
      icon={<Landmark size={18} className="text-sky-500" />}
      iconBg="bg-sky-50 dark:bg-sky-900/20"
      maxWidth="max-w-md"
      footer={
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={createMutation.isPending} className="px-5 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400">{t("btn_cancel")}</button>
          <button type="submit" form="create-bank-wallet-form" disabled={createMutation.isPending} className="px-6 py-2 text-sm font-bold rounded-xl text-white bg-sky-500 shadow-lg shadow-sky-500/20 disabled:opacity-50">
            {createMutation.isPending ? t("btn_creating") : t("btn_create")}
          </button>
        </div>
      }
    >
      <form id="create-bank-wallet-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

        <Controller
          control={control}
          name="banqueId"
          rules={{ required: t("err_banque_required") }}
          render={({ field }) => (
            <SelectDropDown label={t("field_banque")} {...field} options={banqueOptions} error={errors.banqueId?.message} required placeholder={t("placeholder_select_banque")} />
          )}
        />

        {selectedBanque && (
          <div className="px-4 py-3 rounded-xl bg-sky-50 dark:bg-sky-900/15 border border-sky-100 dark:border-sky-800/40 text-sm text-sky-700 dark:text-sky-300">
            {t("bank_wallet_preview", { name: selectedBanque.name })}
          </div>
        )}

        <Input label={t("field_wallet_name_optional")} {...register("name")} placeholder={t("placeholder_bank_wallet_name")} />
        <Input label={t("field_initial_balance")} type="number" step="0.01" min="0" {...register("initialBalance")} placeholder={t("placeholder_amount")} />
      </form>
    </BaseModal>
  );
};
