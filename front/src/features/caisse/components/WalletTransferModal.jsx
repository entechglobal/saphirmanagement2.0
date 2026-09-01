import { useState, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "@/shared/utils/toast";
import { ArrowLeftRight } from "lucide-react";
import { BaseModal } from "../../../shared/components/BaseModal";
import { Input } from "../../../shared/components/Input";
import { SelectDropDown } from "../../../shared/components/SelectDropDown";
import { useCreateTransfer, useTransferableCaisses, useMyCaisse } from "../hooks/useCaisse";
import { useSocietes } from "../../societes/hooks/useSocietes";
import { useAuth } from "../../auth/hooks/useAuth";

const formatMAD = (val) =>
  Number(val ?? 0).toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const walletLabel = (c) => {
  if (c.caisseType === "BANK") return c.banque?.name || c.name;
  if (c.caisseType === "COFFRE") return c.name;
  return c.user?.name || c.name;
};

const walletSubLabel = (c) =>
  `${c.caisseType} • ${formatMAD(c.currentBalance)} MAD`;

export const WalletTransferModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation("caisse");
  const { user } = useAuth();
  const isSuperAdmin = !!user?.isSuperAdmin;
  const transferMutation = useCreateTransfer();

  const [selectedSocieteId, setSelectedSocieteId] = useState(null);

  const { data: myCaisseData } = useMyCaisse({ enabled: isOpen && !isSuperAdmin });
  const myCaisse = myCaisseData?.data;

  const { data: societesData } = useSocietes({ pageIndex: 0, pageSize: 200, keyword: "", enabled: isOpen && isSuperAdmin });
  const societes = societesData?.data ?? [];

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
    defaultValues: { sourceCaisseId: "", destinationCaisseId: "", amount: "", note: "" },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        sourceCaisseId: !isSuperAdmin && myCaisse?.id ? String(myCaisse.id) : "",
        destinationCaisseId: "",
        amount: "",
        note: "",
      });
      setSelectedSocieteId(null);
    }
  }, [isOpen, reset, isSuperAdmin, myCaisse?.id]);

  const sourceCaisseId = watch("sourceCaisseId");
  const effectiveSourceId = isSuperAdmin ? sourceCaisseId : myCaisse?.id;

  const { data: allCaissesData } = useTransferableCaisses({
    societeId: isSuperAdmin ? selectedSocieteId : undefined,
    enabled: isOpen && isSuperAdmin,
  });

  const { data: destCaissesData } = useTransferableCaisses({
    societeId: isSuperAdmin ? selectedSocieteId : undefined,
    excludeCaisseId: effectiveSourceId || undefined,
    enabled: isOpen && !!effectiveSourceId,
  });

  const allCaisses = allCaissesData?.data ?? [];
  const destCaisses = destCaissesData?.data ?? [];

  const selectedSource = useMemo(() => {
    if (!isSuperAdmin) return myCaisse || null;
    return allCaisses.find((c) => String(c.id) === String(sourceCaisseId)) || null;
  }, [isSuperAdmin, myCaisse, allCaisses, sourceCaisseId]);

  useEffect(() => {
    setValue("destinationCaisseId", "");
  }, [sourceCaisseId, selectedSocieteId, setValue]);

  const onSubmit = (values) => {
    const sourceId = isSuperAdmin ? Number(values.sourceCaisseId) : Number(myCaisse?.id);
    if (!sourceId) {
      toast.error(t("err_source_caisse_required"));
      return;
    }

    transferMutation.mutate(
      {
        sourceCaisseId: sourceId,
        destinationCaisseId: Number(values.destinationCaisseId),
        amount: Number(values.amount),
        note: values.note || undefined,
      },
      {
        onSuccess: (res) => {
          toast.success(res?.message || t("success_transfer"));
          onClose();
        },
        onError: (err) => {
          const apiErrors = err?.response?.data?.errors;
          if (Array.isArray(apiErrors)) {
            apiErrors.forEach((e) => {
              if (e.path) setError(e.path, { type: "server", message: e.msg });
            });
          }
          toast.error(err?.response?.data?.message || t("err_transfer"));
        },
      }
    );
  };

  const societeOptions = useMemo(
    () => societes.map((s) => ({ label: s.raisonSocial, subLabel: s.ice ?? undefined, value: s.id })),
    [societes]
  );

  const sourceOptions = useMemo(
    () => allCaisses.map((c) => ({ label: walletLabel(c), subLabel: walletSubLabel(c), value: c.id })),
    [allCaisses]
  );

  const destOptions = useMemo(
    () => destCaisses.map((c) => ({ label: walletLabel(c), subLabel: walletSubLabel(c), value: c.id })),
    [destCaisses]
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      disableClose={transferMutation.isPending}
      title={t("modal_transfer_title")}
      subtitle={isSuperAdmin ? t("modal_transfer_subtitle") : t("modal_transfer_subtitle_own")}
      icon={<ArrowLeftRight size={18} className="text-violet-500" />}
      iconBg="bg-violet-50 dark:bg-violet-900/20"
      maxWidth="max-w-md"
      footer={
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={transferMutation.isPending} className="px-5 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 transition disabled:opacity-50">
            {t("btn_cancel")}
          </button>
          <button type="submit" form="wallet-transfer-form" disabled={transferMutation.isPending || (!isSuperAdmin && !myCaisse)} className="px-6 py-2 text-sm font-bold rounded-xl text-white bg-violet-500 shadow-lg shadow-violet-500/20 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50">
            {transferMutation.isPending ? t("btn_processing") : t("btn_confirm_transfer")}
          </button>
        </div>
      }
    >
      <form id="wallet-transfer-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {isSuperAdmin && (
          <SelectDropDown
            label={t("field_societe")}
            value={selectedSocieteId ?? ""}
            onChange={(e) => setSelectedSocieteId(e.target.value || null)}
            options={societeOptions}
            placeholder={t("placeholder_all_societes")}
            emptyMessage={t("no_societe_available")}
          />
        )}

        {isSuperAdmin ? (
          <Controller
            control={control}
            name="sourceCaisseId"
            rules={{ required: t("err_source_caisse_required") }}
            render={({ field }) => (
              <SelectDropDown
                label={t("field_source_caisse")}
                {...field}
                options={sourceOptions}
                error={errors.sourceCaisseId?.message}
                required
                placeholder={t("placeholder_select_caisse")}
                emptyMessage={t("no_caisse_available")}
              />
            )}
          />
        ) : (
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ml-1">
              {t("field_source_caisse")}
            </label>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {myCaisse ? walletLabel(myCaisse) : t("no_caisse_available")}
              </p>
              {myCaisse && (
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {walletSubLabel(myCaisse)}
                </p>
              )}
            </div>
          </div>
        )}

        {selectedSource && (
          <div className="flex justify-between items-center px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t("available_balance")}</span>
            <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">{formatMAD(selectedSource.currentBalance)} MAD</span>
          </div>
        )}

        <Controller
          control={control}
          name="destinationCaisseId"
          rules={{ required: t("err_dest_caisse_required") }}
          render={({ field }) => (
            <SelectDropDown
              label={t("field_dest_caisse")}
              {...field}
              options={destOptions}
              error={errors.destinationCaisseId?.message}
              required
              placeholder={t("placeholder_select_caisse")}
              emptyMessage={t("no_caisse_available")}
              disabled={!effectiveSourceId}
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
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ml-1">{t("field_note")}</label>
          <textarea
            {...register("note")}
            rows={2}
            placeholder={t("placeholder_note")}
            className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-[#B12B89] focus:ring-4 focus:ring-[#B12B89]/5 outline-none transition-all resize-none"
          />
        </div>
      </form>
    </BaseModal>
  );
};
