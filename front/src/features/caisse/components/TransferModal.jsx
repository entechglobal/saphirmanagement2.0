import { useState, useEffect, useMemo, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "@/shared/utils/toast";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { BaseModal } from "../../../shared/components/BaseModal";
import { Input } from "../../../shared/components/Input";
import { SelectDropDown } from "../../../shared/components/SelectDropDown";
import { useCreateRetrait, useCreateDepot, useTransferableCaisses } from "../hooks/useCaisse";
import { useSocietes } from "../../societes/hooks/useSocietes";
import { useAuth } from "../../auth/hooks/useAuth";

const formatMAD = (val) =>
  Number(val ?? 0).toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const TransferModal = ({ isOpen, onClose, mode = "retrait" }) => {
  const { t } = useTranslation("caisse");
  const { user } = useAuth();
  const isSuperAdmin = !!user?.isSuperAdmin;
  const isRetrait = mode === "retrait";

  const retraitMutation = useCreateRetrait();
  const depotMutation = useCreateDepot();
  const mutation = isRetrait ? retraitMutation : depotMutation;

  // Super Admin: société selector state (not in form — not sent to backend)
  const [selectedSocieteId, setSelectedSocieteId] = useState(null);

  // Societes list for Super Admin
  const { data: societesData } = useSocietes({ pageIndex: 0, pageSize: 200, keyword: "", enabled: isOpen });
  const societes = societesData?.data ?? [];

  // Transferable caisses — scoped by société for Super Admin, own société for Societe Admin
  const { data: transferableData } = useTransferableCaisses({
    societeId: isSuperAdmin ? selectedSocieteId : undefined,
    enabled: isOpen,
  });
  const transferableCaisses = transferableData?.data ?? [];

  const config = {
    title: isRetrait ? t("modal_retrait_title") : t("modal_depot_title"),
    subtitle: isRetrait ? t("modal_retrait_subtitle") : t("modal_depot_subtitle"),
    icon: isRetrait
      ? <ArrowDownCircle size={18} className="text-amber-500" />
      : <ArrowUpCircle size={18} className="text-emerald-500" />,
    iconBg: isRetrait ? "bg-amber-50 dark:bg-amber-900/20" : "bg-emerald-50 dark:bg-emerald-900/20",
    btnClass: isRetrait
      ? "bg-amber-500 shadow-lg shadow-amber-500/20"
      : "bg-emerald-500 shadow-lg shadow-emerald-500/20",
    btnLabel: isRetrait ? t("btn_confirm_retrait") : t("btn_confirm_depot"),
  };

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm({
    defaultValues: { caisseId: "", amount: "", note: "" },
  });

  useEffect(() => {
    if (isOpen) {
      reset({ caisseId: "", amount: "", note: "" });
      setSelectedSocieteId(null);
    }
  }, [isOpen, reset]);

  // Reset caisse selection when société changes
  useEffect(() => {
    setValue("caisseId", "");
  }, [selectedSocieteId, setValue]);

  const onSubmit = (values) => {
    const payload = isRetrait
      ? { sourceCaisseId: Number(values.caisseId), amount: Number(values.amount), note: values.note || undefined }
      : { destinationCaisseId: Number(values.caisseId), amount: Number(values.amount), note: values.note || undefined };

    mutation.mutate(payload, {
      onSuccess: (res) => {
        toast.success(res?.message || (isRetrait ? t("success_retrait") : t("success_depot")));
        onClose();
      },
      onError: (err) => {
        const apiErrors = err?.response?.data?.errors;
        if (Array.isArray(apiErrors)) {
          apiErrors.forEach((e) => {
            const fieldPath =
              e.path === "sourceCaisseId" || e.path === "destinationCaisseId"
                ? "caisseId"
                : e.path;
            if (fieldPath) setError(fieldPath, { type: "server", message: e.msg });
          });
        }
        toast.error(err?.response?.data?.message || t("err_transfer"));
      },
    });
  };

  const selectedCaisseId = watch("caisseId");
  const selectedCaisse = useMemo(
    () => transferableCaisses.find((c) => String(c.id) === String(selectedCaisseId)),
    [transferableCaisses, selectedCaisseId]
  );

  const societeOptions = useMemo(
    () => societes.map((s) => ({ label: s.raisonSocial, subLabel: s.ice ?? undefined, value: s.id })),
    [societes]
  );

  const caisseOptions = useMemo(
    () =>
      transferableCaisses.map((c) => {
        const label =
          c.caisseType === "BANK"
            ? c.banque?.name || c.name
            : c.caisseType === "CAISSE"
              ? c.name
              : c.user?.name || c.name;
        return {
          label,
          subLabel: `${c.caisseType} • ${formatMAD(c.currentBalance)} MAD`,
          value: c.id,
        };
      }),
    [transferableCaisses]
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      disableClose={mutation.isPending}
      title={config.title}
      subtitle={config.subtitle}
      icon={config.icon}
      iconBg={config.iconBg}
      maxWidth="max-w-md"
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="px-5 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 transition disabled:opacity-50"
          >
            {t("btn_cancel")}
          </button>
          <button
            type="submit"
            form="transfer-form"
            disabled={mutation.isPending}
            className={`px-6 py-2 text-sm font-bold rounded-xl text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 ${config.btnClass}`}
          >
            {mutation.isPending ? t("btn_processing") : config.btnLabel}
          </button>
        </div>
      }
    >
      <form id="transfer-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Société selector — Super Admin only */}
        {isSuperAdmin && (
          <SelectDropDown
            label={t("field_societe")}
            value={selectedSocieteId ?? ""}
            onChange={(e) => setSelectedSocieteId(e.target.value || null)}
            options={societeOptions}
            required
            placeholder={t("placeholder_select_societe")}
            emptyMessage={t("no_societe_available")}
          />
        )}

        {/* Source / Destination caisse selector */}
        <Controller
          control={control}
          name="caisseId"
          rules={{
            required: isRetrait ? t("err_source_caisse_required") : t("err_dest_caisse_required"),
          }}
          render={({ field }) => (
            <SelectDropDown
              label={isRetrait ? t("field_source_caisse") : t("field_dest_caisse")}
              {...field}
              options={caisseOptions}
              error={errors.caisseId?.message}
              required
              placeholder={t("placeholder_select_caisse")}
              emptyMessage={t("no_caisse_available")}
              disabled={isSuperAdmin && !selectedSocieteId}
            />
          )}
        />

        {/* Balance display — only for Retrait when a caisse is selected */}
        {isRetrait && selectedCaisse && (
          <div className="flex justify-between items-center px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#222222]/60 border border-slate-200 dark:border-[#2e2e2e]">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t("available_balance")}
            </span>
            <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
              {formatMAD(selectedCaisse.availableBalance ?? selectedCaisse.currentBalance)} MAD
            </span>
          </div>
        )}

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
            {t("field_note")}
          </label>
          <textarea
            {...register("note")}
            rows={2}
            placeholder={t("placeholder_note")}
            className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-[#2e2e2e] bg-white dark:bg-[#222222]/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-[#B12B89] focus:ring-4 focus:ring-[#B12B89]/5 outline-none transition-all resize-none"
          />
        </div>
      </form>
    </BaseModal>
  );
};
