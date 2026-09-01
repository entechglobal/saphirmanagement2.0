import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "@/shared/utils/toast";
import { Wallet } from "lucide-react";
import { BaseModal } from "../../../shared/components/BaseModal";
import { Input } from "../../../shared/components/Input";
import { SelectDropDown } from "../../../shared/components/SelectDropDown";
import { useCreateCaisse } from "../hooks/useCaisse";
import { useUsersBySociete } from "../../users/hooks/useUsers";
import { useSocietes } from "../../societes/hooks/useSocietes";
import { useAuth } from "../../auth/hooks/useAuth";

const getCaisseNamePreview = (selectedUser) => {
  if (!selectedUser) return null;
  const roleName = selectedUser.role?.name ?? "";
  if (selectedUser.isSuperAdmin) return "Caisse Centrale";
  if (roleName === "Societe_Admin")
    return `Wallet Société - ${selectedUser.societe?.raisonSocial ?? selectedUser.name}`;
  return `Wallet Utilisateur - ${selectedUser.name}`;
};

export const CreateCaisseModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation("caisse");
  const { user } = useAuth();
  const isSuperAdmin = !!user?.isSuperAdmin;
  const createMutation = useCreateCaisse();

  // Societes list (Super Admin only)
  const { data: societesData } = useSocietes({ pageIndex: 0, pageSize: 200, keyword: "", enabled: isOpen });
  const societes = societesData?.data ?? [];

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm({
    defaultValues: { societeId: "", userId: "", initialBalance: "" },
  });

  useEffect(() => {
    if (!isOpen) reset({ societeId: "", userId: "", initialBalance: "" });
  }, [isOpen, reset]);

  const selectedSocieteId = watch("societeId");
  const selectedUserId = watch("userId");

  // Reset userId when société changes
  useEffect(() => {
    setValue("userId", "");
  }, [selectedSocieteId, setValue]);

  // Users scoped to selected société (Super Admin) or own société (Societe Admin)
  const { data: societeUsersData } = useUsersBySociete(
    isOpen ? (isSuperAdmin ? (selectedSocieteId || null) : user?.societeId) : null
  );

  const usersRaw = societeUsersData?.data ?? [];

  const selectedUser = usersRaw.find((u) => String(u.id) === String(selectedUserId));
  const namePreview = getCaisseNamePreview(selectedUser);

  const onSubmit = (values) => {
    if (!values.userId) {
      setError("userId", { type: "manual", message: t("err_user_required") });
      return;
    }
    createMutation.mutate(
      {
        userId: Number(values.userId),
        initialBalance: values.initialBalance !== "" ? Number(values.initialBalance) : 0,
      },
      {
        onSuccess: (res) => {
          toast.success(res?.message || t("success_caisse_created"));
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
    () => societes.map((s) => ({ label: s.raisonSocial, subLabel: s.ice ?? undefined, value: s.id })),
    [societes]
  );

  const userOptions = useMemo(
    () => usersRaw.map((u) => ({ label: u.name, subLabel: `${u.role?.name ?? ""} · ${u.email}`, value: u.id })),
    [usersRaw]
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      disableClose={createMutation.isPending}
      title={t("modal_create_caisse_title")}
      subtitle={t("modal_create_caisse_subtitle")}
      icon={<Wallet size={18} className="text-blue-500" />}
      iconBg="bg-blue-50 dark:bg-blue-900/20"
      maxWidth="max-w-md"
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={createMutation.isPending}
            className="px-5 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 transition disabled:opacity-50"
          >
            {t("btn_cancel")}
          </button>
          <button
            type="submit"
            form="create-caisse-form"
            disabled={createMutation.isPending}
            className="px-6 py-2 text-sm font-bold rounded-xl text-white shadow-lg shadow-blue-500/25 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: "#B12B89" }}
          >
            {createMutation.isPending ? t("btn_creating") : t("modal_create_caisse_title")}
          </button>
        </div>
      }
    >
      <form id="create-caisse-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Société selector — Super Admin only */}
        {isSuperAdmin && (
          <Controller
            control={control}
            name="societeId"
            rules={{ required: t("err_societe_required") }}
            render={({ field }) => (
              <SelectDropDown
                label={t("field_societe")}
                {...field}
                options={societeOptions}
                error={errors.societeId?.message}
                required
                placeholder={t("placeholder_select_societe")}
                emptyMessage={t("no_societe_available")}
              />
            )}
          />
        )}

        {/* User selector — enabled only after société is selected for Super Admin */}
        <Controller
          control={control}
          name="userId"
          rules={{ required: t("err_user_required") }}
          render={({ field }) => (
            <SelectDropDown
              label={t("field_user")}
              {...field}
              options={userOptions}
              error={errors.userId?.message}
              required
              placeholder={t("placeholder_select_user")}
              emptyMessage={t("no_user_available")}
              disabled={isSuperAdmin && !selectedSocieteId}
            />
          )}
        />

        {namePreview && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/15 border border-blue-100 dark:border-blue-800/40">
            <Wallet className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-0.5">
                {t("name_preview_label")}
              </p>
              <p className="text-sm font-bold text-blue-700 dark:text-blue-300">{namePreview}</p>
            </div>
          </div>
        )}

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
