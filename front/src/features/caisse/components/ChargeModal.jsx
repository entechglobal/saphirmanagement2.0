import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "@/shared/utils/toast";
import { MinusCircle } from "lucide-react";
import { BaseModal } from "../../../shared/components/BaseModal";
import { Input } from "../../../shared/components/Input";
import { SelectDropDown } from "../../../shared/components/SelectDropDown";
import { useCreateCharge } from "../hooks/useCaisse";
import { useCaisseLabels } from "../hooks/useCaisseLabel";

export const ChargeModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation("caisse");
  const createCharge = useCreateCharge();

  const { data: labelsData } = useCaisseLabels({ pageSize: 100, active: true, enabled: isOpen });
  const labels = labelsData?.data ?? [];

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    defaultValues: { labelId: "", amount: "", note: "" },
  });

  useEffect(() => {
    if (isOpen) reset({ labelId: "", amount: "", note: "" });
  }, [isOpen, reset]);

  const onSubmit = (values) => {
    createCharge.mutate(
      {
        labelId: Number(values.labelId),
        amount: Number(values.amount),
        note: values.note || undefined,
      },
      {
        onSuccess: (res) => {
          toast.success(res?.message || t("success_charge_created"));
          onClose();
        },
        onError: (err) => {
          const apiErrors = err?.response?.data?.errors;
          if (Array.isArray(apiErrors)) {
            apiErrors.forEach((e) => {
              if (e.path) setError(e.path, { type: "server", message: e.msg });
            });
          }
          toast.error(err?.response?.data?.message || t("err_create_charge"));
        },
      }
    );
  };

  const labelOptions = useMemo(() => labels.map((l) => ({ label: l.name, value: l.id })), [labels]);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      disableClose={createCharge.isPending}
      title={t("modal_charge_title")}
      subtitle={t("modal_charge_subtitle")}
      icon={<MinusCircle size={18} className="text-red-500" />}
      iconBg="bg-red-50 dark:bg-red-900/20"
      maxWidth="max-w-md"
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={createCharge.isPending}
            className="px-5 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 transition disabled:opacity-50"
          >
            {t("btn_cancel")}
          </button>
          <button
            type="submit"
            form="charge-form"
            disabled={createCharge.isPending}
            className="px-6 py-2 text-sm font-bold rounded-xl text-white shadow-lg shadow-red-500/20 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 bg-red-500"
          >
            {createCharge.isPending ? t("btn_saving") : t("btn_confirm")}
          </button>
        </div>
      }
    >
      <form id="charge-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Controller
          control={control}
          name="labelId"
          rules={{ required: t("err_libelle_required") }}
          render={({ field }) => (
            <SelectDropDown
              label={t("field_libelle")}
              {...field}
              options={labelOptions}
              error={errors.labelId?.message}
              required
              placeholder={t("placeholder_select_libelle")}
              emptyMessage={t("no_label_available")}
            />
          )}
        />

        <Input
          label={t("field_amount")}
          type="number"
          step="0.01"
          min="0.01"
          {...register("amount", {
            required: t("err_amount_required"),
            min: { value: 0.01, message: t("err_amount_min") },
          })}
          error={errors.amount?.message}
          required
          placeholder={t("placeholder_amount")}
        />

        <div className="w-full">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ml-1">
            {t("field_observation")}
          </label>
          <textarea
            {...register("note")}
            rows={2}
            placeholder={t("placeholder_observation")}
            className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-[#B12B89] focus:ring-4 focus:ring-[#B12B89]/5 outline-none transition-all resize-none"
          />
        </div>
      </form>
    </BaseModal>
  );
};
