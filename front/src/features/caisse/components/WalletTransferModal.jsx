import { useState, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "@/shared/utils/toast";
import { ArrowLeftRight, ChevronDown } from "lucide-react";
import {
  TextField,
  MenuItem,
  ListSubheader,
  CircularProgress,
} from "@mui/material";
import { BaseModal } from "../../../shared/components/BaseModal";
import { Input } from "../../../shared/components/Input";
import { SelectDropDown } from "../../../shared/components/SelectDropDown";
import {
  useCreateTransfer,
  useTransferableCaisses,
  useMyCaisse,
} from "../hooks/useCaisse";
import { useSocietes } from "../../societes/hooks/useSocietes";
import { useAuth } from "../../auth/hooks/useAuth";

const formatMAD = (val) =>
  Number(val ?? 0).toLocaleString("fr-MA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const TYPE_ORDER = ["USER", "SOCIETE", "CENTRAL", "BANK", "COFFRE"];

const TYPE_LABEL_KEYS = {
  USER: "wallet_group_users",
  SOCIETE: "wallet_group_societe",
  CENTRAL: "wallet_group_central",
  BANK: "wallet_group_banks",
  COFFRE: "wallet_group_coffres",
};

const walletLabel = (c) => {
  if (c.caisseType === "BANK") return c.banque?.name || c.name;
  if (c.caisseType === "COFFRE") return c.name;
  if (c.caisseType === "CENTRAL") return c.name || "Caisse Centrale";
  if (c.caisseType === "SOCIETE") return c.name || c.societe?.raisonSocial;
  return c.user?.name || c.name;
};

const walletSubLabel = (c) => {
  const parts = [];
  if (c.caisseType === "BANK" && c.banque?.RIB) parts.push(c.banque.RIB);
  if (c.caisseType === "USER" && c.user?.role?.name) parts.push(c.user.role.name);
  if (c.societe?.raisonSocial) parts.push(c.societe.raisonSocial);
  parts.push(`${formatMAD(c.currentBalance)} MAD`);
  return parts.filter(Boolean).join(" · ");
};

const groupCaisses = (caisses) => {
  const groups = {};
  for (const c of caisses) {
    const type = c.caisseType || "USER";
    if (!groups[type]) groups[type] = [];
    groups[type].push(c);
  }
  return TYPE_ORDER.filter((type) => groups[type]?.length).map((type) => ({
    type,
    items: groups[type],
  }));
};

const DEST_FIELD_SX = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "6px",
    fontSize: "0.875rem",
    height: "40px",
    backgroundColor: (theme) =>
      theme.palette.mode === "dark" ? "rgba(34, 34, 34, 0.6)" : "white",
    "& fieldset": {
      borderColor: (theme) =>
        theme.palette.mode === "dark" ? "#2e2e2e" : "#cbd5e1",
    },
    "&:hover fieldset": {
      borderColor: (theme) =>
        theme.palette.mode === "dark" ? "#3a3a3a" : "#94a3b8",
    },
    "&.Mui-focused fieldset": {
      borderWidth: "1px",
      borderColor: "#B12B89",
    },
  },
  "& .MuiSelect-select": {
    padding: "9px 14px",
    color: (theme) =>
      theme.palette.mode === "dark" ? "#f5f5f5" : "#0f172a",
  },
};

export const WalletTransferModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation("caisse");
  const { user } = useAuth();
  const isSuperAdmin = !!user?.isSuperAdmin;
  const transferMutation = useCreateTransfer();

  const [selectedSocieteId, setSelectedSocieteId] = useState(null);

  const { data: myCaisseData } = useMyCaisse({
    enabled: isOpen && !isSuperAdmin,
  });
  const myCaisse = myCaisseData?.data;

  const { data: societesData } = useSocietes({
    pageIndex: 0,
    pageSize: 200,
    keyword: "",
    enabled: isOpen && isSuperAdmin,
  });
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
    defaultValues: {
      sourceCaisseId: "",
      destinationCaisseId: "",
      amount: "",
      note: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        sourceCaisseId:
          !isSuperAdmin && myCaisse?.id ? String(myCaisse.id) : "",
        destinationCaisseId: "",
        amount: "",
        note: "",
      });
      setSelectedSocieteId(null);
    }
  }, [isOpen, reset, isSuperAdmin, myCaisse?.id]);

  const sourceCaisseId = watch("sourceCaisseId");
  const destinationCaisseId = watch("destinationCaisseId");
  const effectiveSourceId = isSuperAdmin ? sourceCaisseId : myCaisse?.id;

  const { data: allCaissesData, isLoading: sourceLoading } =
    useTransferableCaisses({
      societeId: isSuperAdmin ? selectedSocieteId : undefined,
      enabled: isOpen && isSuperAdmin,
    });

  const { data: destCaissesData, isLoading: destLoading } =
    useTransferableCaisses({
      societeId: isSuperAdmin ? selectedSocieteId : undefined,
      excludeCaisseId: effectiveSourceId || undefined,
      enabled: isOpen && !!effectiveSourceId,
    });

  const allCaisses = allCaissesData?.data ?? [];
  const destCaisses = destCaissesData?.data ?? [];
  const destGroups = useMemo(() => groupCaisses(destCaisses), [destCaisses]);

  const selectedSource = useMemo(() => {
    if (!isSuperAdmin) return myCaisse || null;
    return (
      allCaisses.find((c) => String(c.id) === String(sourceCaisseId)) || null
    );
  }, [isSuperAdmin, myCaisse, allCaisses, sourceCaisseId]);

  const selectedDest = useMemo(
    () =>
      destCaisses.find((c) => String(c.id) === String(destinationCaisseId)) ||
      null,
    [destCaisses, destinationCaisseId]
  );

  useEffect(() => {
    setValue("destinationCaisseId", "");
  }, [sourceCaisseId, selectedSocieteId, setValue]);

  const onSubmit = (values) => {
    const sourceId = isSuperAdmin
      ? Number(values.sourceCaisseId)
      : Number(myCaisse?.id);
    if (!sourceId) {
      toast.error(t("err_source_caisse_required"));
      return;
    }

    const maxAmount = Number(
      selectedSource?.availableBalance ?? selectedSource?.currentBalance ?? 0
    );
    if (Number(values.amount) > maxAmount) {
      setError("amount", {
        type: "manual",
        message: t("err_amount_exceeds_available", {
          amount: formatMAD(maxAmount),
          defaultValue: `Solde disponible insuffisant (${formatMAD(maxAmount)} MAD)`,
        }),
      });
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
          const req =
            res?.data?.transferRequest || res?.transferRequest || null;
          toast.success(
            res?.pending
              ? req?.requiresSuperAdmin
                ? t("success_transfer_pending_admin")
                : t("success_transfer_pending")
              : res?.message || t("success_transfer")
          );
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
    () =>
      societes.map((s) => ({
        label: s.raisonSocial,
        subLabel: s.ice ?? undefined,
        value: s.id,
      })),
    [societes]
  );

  const sourceOptions = useMemo(
    () =>
      allCaisses.map((c) => ({
        label: walletLabel(c),
        subLabel: walletSubLabel(c),
        value: c.id,
      })),
    [allCaisses]
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      disableClose={transferMutation.isPending}
      title={t("modal_transfer_title")}
      subtitle={
        isSuperAdmin
          ? t("modal_transfer_subtitle")
          : t("modal_transfer_subtitle_own")
      }
      icon={<ArrowLeftRight size={18} className="text-violet-500" />}
      iconBg="bg-violet-50 dark:bg-violet-900/20"
      maxWidth="max-w-md"
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={transferMutation.isPending}
            className="px-5 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 transition disabled:opacity-50"
          >
            {t("btn_cancel")}
          </button>
          <button
            type="submit"
            form="wallet-transfer-form"
            disabled={
              transferMutation.isPending || (!isSuperAdmin && !myCaisse)
            }
            className="px-6 py-2 text-sm font-bold rounded-xl text-white bg-violet-500 shadow-lg shadow-violet-500/20 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
          >
            {transferMutation.isPending
              ? t("btn_processing")
              : t("btn_confirm_transfer")}
          </button>
        </div>
      }
    >
      <form
        id="wallet-transfer-form"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
      >
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
                isLoading={sourceLoading}
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
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-[#2e2e2e] dark:bg-[#222222]/60">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {myCaisse ? walletLabel(myCaisse) : t("no_caisse_available")}
              </p>
              {myCaisse && (
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {formatMAD(myCaisse.currentBalance)} MAD
                  {Number(myCaisse.pendingOutgoing) > 0
                    ? ` · ${t("available_balance")}: ${formatMAD(
                        myCaisse.availableBalance
                      )} MAD`
                    : ""}
                </p>
              )}
            </div>
          </div>
        )}

        {selectedSource && (
          <div className="flex justify-between items-center px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#222222]/60 border border-slate-200 dark:border-[#2e2e2e]">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t("stat_final_balance")}
            </span>
            <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
              {formatMAD(selectedSource.currentBalance)} MAD
            </span>
          </div>
        )}

        <Controller
          control={control}
          name="destinationCaisseId"
          rules={{ required: t("err_dest_caisse_required") }}
          render={({ field }) => (
            <div className="w-full">
              <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {t("field_dest_caisse")} <span className="text-red-500">*</span>
              </label>
              <TextField
                select
                fullWidth
                variant="outlined"
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                inputRef={field.ref}
                disabled={!effectiveSourceId || destLoading}
                error={!!errors.destinationCaisseId}
                sx={DEST_FIELD_SX}
                SelectProps={{
                  displayEmpty: true,
                  IconComponent: destLoading
                    ? () => (
                        <CircularProgress
                          size={16}
                          sx={{ mr: 1.5, color: "#C86AAC" }}
                        />
                      )
                    : ChevronDown,
                  renderValue: (selected) => {
                    if (!selected) {
                      return (
                        <span style={{ opacity: 0.5 }}>
                          {t("placeholder_select_caisse")}
                        </span>
                      );
                    }
                    if (selectedDest) return walletLabel(selectedDest);
                    return selected;
                  },
                  MenuProps: {
                    PaperProps: { sx: { maxHeight: 420 } },
                    disableScrollLock: true,
                    sx: { zIndex: 10001 },
                  },
                }}
              >
                <MenuItem value="" disabled>
                  <span className="opacity-50">
                    {destLoading
                      ? t("btn_processing")
                      : t("placeholder_select_caisse")}
                  </span>
                </MenuItem>

                {!destLoading && destGroups.length === 0 && (
                  <MenuItem disabled sx={{ opacity: "1 !important" }}>
                    <span className="text-slate-400 italic">
                      {t("no_caisse_available")}
                    </span>
                  </MenuItem>
                )}

                {destGroups.map((group) => [
                  <ListSubheader
                    key={`h-${group.type}`}
                    sx={{
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      lineHeight: "32px",
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark" ? "#161616" : "#f8fafc",
                      color: (theme) =>
                        theme.palette.mode === "dark" ? "#a3a3a3" : "#64748b",
                    }}
                  >
                    {t(TYPE_LABEL_KEYS[group.type] || group.type, group.type)} (
                    {group.items.length})
                  </ListSubheader>,
                  ...group.items.map((c) => (
                    <MenuItem
                      key={c.id}
                      value={String(c.id)}
                      sx={{ fontSize: "14px", py: 1 }}
                    >
                      <div className="flex flex-col min-w-0 leading-tight">
                        <span className="font-medium text-slate-800 dark:text-slate-100 truncate">
                          {walletLabel(c)}
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                          {walletSubLabel(c)}
                        </span>
                      </div>
                    </MenuItem>
                  )),
                ])}
              </TextField>
              {errors.destinationCaisseId?.message && (
                <p className="text-xs font-medium mt-1.5 text-red-600 dark:text-red-400">
                  {errors.destinationCaisseId.message}
                </p>
              )}
            </div>
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
