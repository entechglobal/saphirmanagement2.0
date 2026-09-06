import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@/shared/utils/toast";
import {
  Camera, KeyRound, X, Lock, Wallet, Package
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { getApiError } from "../../../shared/utils/apiError";
import { FormPageHeader } from "../../../shared/components/FormPageHeader";
import { FormCard, FormFieldGrid } from "../../../shared/components/FormCard";
import { FormActions } from "../../../shared/components/FormActions";
import { Input } from "../../../shared/components/Input";
import { InputToggle } from "../../../shared/components/InputToggle";
import { SelectDropDown } from "../../../shared/components/SelectDropDown";
import {
  useCreateUser, useUpdateUser, useUser, useUpdatePassword, useCurrentUser,
} from "../hooks/useUsers";
import { useSocietes } from "../../societes/hooks/useSocietes";
import { createUserSchemas } from "../schemas/userFormSchema";
import avatar from "../../../assets/avatar.png";
import avatarDark from "../../../assets/avatar_dark.png";
import { useAuth } from "../../auth/hooks/useAuth";
import { SectionLoader } from "../../../shared/components/loadersCollections/SectionLoader";
import { NotFound } from "../../../shared/components/NotFound";
import { useCreateCaisse } from "../../caisse/hooks/useCaisse";
import { CreateUserStepper } from "./CreateUserStepper";
import {
  UserExtraRolesFields,
  isPreparateurMainRole,
  isLivreurMainRole,
} from "./UserExtraRolesFields";

const ALL_ROLES = [
  { id: 1, name: "Super_Admin" },
  { id: 2, name: "Societe_Admin" },
  { id: 3, name: "Caissier" },
  { id: 4, name: "Gerant" },
  { id: 5, name: "Commercial" },
  { id: 6, name: "Preparateur" },
  { id: 7, name: "livreur" }
];

// Non-super-admins can only assign roles within their own société
const ROLES_FOR_NON_SUPER = [2, 3, 4, 5, 6, 7];

export const UserFormPage = () => {
  const { t } = useTranslation("users");
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const { user } = useAuth();
  const isSuperAdmin = !!user?.isSuperAdmin;

  const { data: userData, isLoading: isLoadingUser } = useUser(id);
  const { data: currentUserData } = useCurrentUser();
  const { data: societesResponse } = useSocietes({ pageSize: 100, enabled: isSuperAdmin });
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const updatePassword = useUpdatePassword();
  const createCaisse = useCreateCaisse();

  const [imagePreview, setImagePreview] = useState(null);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [createdUser, setCreatedUser] = useState(null);
  const [walletBalance, setWalletBalance] = useState("");
  const [canBePreparateur, setCanBePreparateur] = useState(false);
  const [canBeLivreur, setCanBeLivreur] = useState(false);

  // ── Derived flags ──────────────────────────────────────────────
  const isSelfEdit = isEditMode && currentUserData?.data?.id === userData?.data?.id;
  const visibleRoles = isSuperAdmin
    ? ALL_ROLES
    : ALL_ROLES.filter((r) => ROLES_FOR_NON_SUPER.includes(r.id));

  // ── Build translated schemas ───────────────────────────────────
  const schemas = useMemo(() => createUserSchemas(t), [t]);

  // ── Pick the right main schema based on role & mode ───────────
  const mainSchema = isEditMode
    ? (isSuperAdmin ? schemas.editUserSchema : schemas.editUserSchemaNonSuper)
    : (isSuperAdmin ? schemas.createUserSchema : schemas.createUserSchemaNonSuper);

  // ── Password schema ────────────────────────────────────────────
  const pwdSchema = isSelfEdit ? schemas.selfChangePasswordSchema : schemas.adminChangePasswordSchema;
  const pwdDefaults = isSelfEdit
    ? { currentPassword: "", newPassword: "", confirmPassword: "" }
    : { newPassword: "", confirmPassword: "" };

  // ── Main form ──────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(mainSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      societeId: "",
      roleId: "",
      active: true,
      profile: null,
    },
  });

  const roleId = watch("roleId");

  // ── Password modal form ────────────────────────────────────────
  const {
    register: registerPwd,
    handleSubmit: handleSubmitPwd,
    formState: { errors: pwdErrors, isSubmitting: isPwdSubmitting },
    reset: resetPwd,
  } = useForm({
    resolver: zodResolver(pwdSchema),
    defaultValues: pwdDefaults,
  });

  // ── Populate form on edit ──────────────────────────────────────
  useEffect(() => {
    if (isEditMode && userData?.data) {
      const u = userData.data;
      reset({
        name: u.name || "",
        email: u.email || "",
        societeId: u.societeId || "",
        roleId: u.roleId || "",
        active: u.active ?? true,
        profile: null,
      });
      setCanBePreparateur(!!u.canBePreparateur);
      setCanBeLivreur(!!u.canBeLivreur);
      if (u.profile) setImagePreview(u.profile);
    }
  }, [isEditMode, userData, reset]);

  // ── Re-sync pwd form when isSelfEdit resolves ──────────────────
  useEffect(() => {
    resetPwd(pwdDefaults);
  }, [isSelfEdit]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── File handler ───────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setValue("profile", file, { shouldValidate: true });
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  // ── Submit ─────────────────────────────────────────────────────
  const onSubmit = (data) => {
    const roleIdNum = Number(data.roleId);
    const isRoleSuperAdmin = roleIdNum === 1;
    const payload = {
      name: data.name,
      email: data.email,
      roleId: roleIdNum,
      isSuperAdmin: isRoleSuperAdmin,
      societeId: isRoleSuperAdmin
        ? null
        : isSuperAdmin
          ? Number(data.societeId)
          : user?.societeId ?? null,
      active: data.active,
      ...(data.profile instanceof File && { profile: data.profile }),
      ...(!isEditMode && data.password && { password: data.password }),
      ...(isEditMode && {
        canBePreparateur: isPreparateurMainRole(roleIdNum) || canBePreparateur,
        canBeLivreur: isLivreurMainRole(roleIdNum) || canBeLivreur,
      }),
    };

    if (isEditMode) {
      updateUser.mutate(
        { id, payload },
        {
          onSuccess: () => { toast.success(t("toast.update_success")); navigate("/users"); },
          onError: (err) => toast.error(getApiError(err, t("toast.update_error"))),
        }
      );
    } else {
      createUser.mutate(payload, {
        onSuccess: (res) => {
          const created = res?.data;
          toast.success(t("toast.create_success"));
          setCreatedUser(created);
          setCanBePreparateur(!!created?.canBePreparateur);
          setCanBeLivreur(!!created?.canBeLivreur);
          setWizardStep(2);
        },
        onError: (err) => toast.error(getApiError(err, t("toast.create_error"))),
      });
    }
  };

  // ── Password update ────────────────────────────────────────────
  const onPasswordSubmit = (data) => {
    updatePassword.mutate(
      { id, ...data },
      {
        onSuccess: () => {
          toast.success(t("toast.password_update_success"));
          setShowPwdModal(false);
          resetPwd(pwdDefaults);
        },
        onError: (err) => toast.error(getApiError(err, t("toast.password_update_error"))),
      }
    );
  };

  const handleClosePwdModal = () => {
    setShowPwdModal(false);
    resetPwd(pwdDefaults);
  };

  const finishWizard = () => navigate("/users");

  const handleCreateWallet = () => {
    if (!createdUser?.id) return;
    createCaisse.mutate(
      {
        userId: createdUser.id,
        initialBalance: walletBalance !== "" ? Number(walletBalance) : 0,
      },
      {
        onSuccess: () => {
          toast.success(t("wizard.wallet_created"));
          setWizardStep(3);
        },
        onError: (err) => toast.error(getApiError(err, t("wizard.wallet_error"))),
      }
    );
  };

  const handleSaveExtraRoles = () => {
    if (!createdUser?.id) return;
    const mainRoleId = createdUser.roleId;
    updateUser.mutate(
      {
        id: createdUser.id,
        payload: {
          canBePreparateur: isPreparateurMainRole(mainRoleId, createdUser.role?.name) || canBePreparateur,
          canBeLivreur: isLivreurMainRole(mainRoleId, createdUser.role?.name) || canBeLivreur,
        },
      },
      {
        onSuccess: () => {
          toast.success(t("wizard.roles_saved"));
          finishWizard();
        },
        onError: (err) => toast.error(getApiError(err, t("wizard.roles_error"))),
      }
    );
  };

  const extraRolesHasSociete = isEditMode
    ? !!userData?.data?.societeId
    : createdUser
      ? !!createdUser.societeId
      : Number(roleId) !== 1 && (!!watch("societeId") || !isSuperAdmin);

  // ── Société options ────────────────────────────────────────────
  const societeOptions = (societesResponse?.data ?? []).map((s) => ({
    value: s.id,
    label: s.raisonSocial,
  }));

  // ── Loading & Not Found states ─────────────────────────────────
  if (isEditMode && isLoadingUser) {
    return <SectionLoader text={t("form.loading")} />;
  }

  if (isEditMode && !userData?.data) {
    return (
      <NotFound
        onAction={() => navigate("/users")}
      />
    );
  }

  return (
    <div className="-m-4 lg:-m-6 px-3 pt-3">
      <FormPageHeader
        entityName={isEditMode ? t("form.edit_title") : t("form.create_title")}
        backPath="/users"
        isEdit={isEditMode}
        data={userData?.data}
        createTitle={t("form.register_user")}
        editTitle={t("form.save_changes")}
        backLabel={t("form.back_label")}
      />

      <div className="w-full mt-3">
        {!isEditMode && <CreateUserStepper step={wizardStep} />}

        {!isEditMode && wizardStep === 2 && createdUser && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-[#2e2e2e] dark:bg-[#1c1c1c]">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-[#2e2e2e]">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20">
                <Wallet className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {t("wizard.wallet_title")}
                </h2>
                <p className="text-xs text-slate-500">
                  {t("wizard.user_created", { name: createdUser.name })}
                </p>
              </div>
            </div>
            <div className="space-y-4 px-5 py-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {t("wizard.wallet_description")}
              </p>
              <Input
                label={t("wizard.initial_balance")}
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={walletBalance}
                onChange={(e) => setWalletBalance(e.target.value)}
                hint={t("wizard.initial_balance_hint")}
              />
              <FormActions
                onCancel={() => setWizardStep(3)}
                cancelLabel={t("wizard.wallet_skip")}
                submitType="button"
                onSubmit={handleCreateWallet}
                isLoading={createCaisse.isPending}
                submitLabel={t("wizard.wallet_yes")}
              />
            </div>
          </div>
        )}

        {!isEditMode && wizardStep === 3 && createdUser && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-[#2e2e2e] dark:bg-[#1c1c1c]">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-[#2e2e2e]">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-900/20">
                <Package className="h-4 w-4 text-violet-500" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {t("wizard.roles_title")}
                </h2>
                <p className="text-xs text-slate-500">{t("wizard.roles_description")}</p>
              </div>
            </div>
            <div className="space-y-4 px-5 py-4">
              <UserExtraRolesFields
                canBePreparateur={canBePreparateur}
                canBeLivreur={canBeLivreur}
                onChangePreparateur={setCanBePreparateur}
                onChangeLivreur={setCanBeLivreur}
                roleId={createdUser.roleId}
                roleName={createdUser.role?.name}
                hasSociete={extraRolesHasSociete}
              />
              <FormActions
                onCancel={finishWizard}
                cancelLabel={t("wizard.roles_skip")}
                submitType="button"
                onSubmit={handleSaveExtraRoles}
                isLoading={updateUser.isPending}
                submitLabel={t("wizard.roles_save")}
              />
            </div>
          </div>
        )}

        {(isEditMode || wizardStep === 1) && (
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-12 gap-5">

          {/* ── LEFT SIDEBAR ──────────────────────────────────── */}
          <div className="col-span-12 lg:col-span-4 space-y-5">
            <FormCard className="text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-blue-500/10 to-transparent" />

              {/* Avatar */}
              <div className="relative mt-2 inline-block">
                <div className="w-32 h-32 rounded-xl flex items-center justify-center overflow-hidden ring-4 ring-white dark:ring-[#2e2e2e] shadow-lg mx-auto bg-slate-100 dark:bg-[#222222]">
                  {imagePreview ? (
                    <img src={imagePreview} alt="User" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <img src={avatar} alt="Profile Light" className="w-full h-full object-cover block dark:hidden" />
                      <img src={avatarDark} alt="Profile Dark" className="w-full h-full object-cover hidden dark:block" />
                    </>
                  )}
                </div>
                <label className="absolute -bottom-2 -right-2 p-2.5 bg-white dark:bg-[#222222] text-[#B12B89] rounded-md shadow-lg border border-slate-100 dark:border-[#2e2e2e] cursor-pointer hover:scale-110 transition-transform">
                  <Camera size={18} />
                  <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                </label>
              </div>
              {errors.profile && (
                <p className="text-[10px] font-bold text-red-500 mt-2">{errors.profile.message}</p>
              )}

              {/* Name & role preview */}
              <div className="mt-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {watch("name") || t("form.new_member")}
                </h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                  {ALL_ROLES.find((r) => r.id === Number(roleId))?.name?.replace("_", " ") || t("form.no_role_assigned")}
                </p>
              </div>

              {/* Active toggle */}
              <div className="mt-8 pt-8 border-t border-slate-50 dark:border-[#2e2e2e] space-y-3 text-left">
                <Controller
                  name="active"
                  control={control}
                  render={({ field }) => (
                    <InputToggle
                      label={t("form.account_active")}
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                  )}
                />
              </div>

              {/* Change password (edit only) */}
              {isEditMode && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setShowPwdModal(true)}
                    className="w-full flex items-center justify-center gap-2 h-10 rounded-md border border-slate-200 dark:border-[#2e2e2e] text-sm font-medium text-slate-500 hover:border-[#B12B89] hover:text-[#B12B89] transition-all"
                  >
                    <KeyRound size={14} />
                    {t("form.change_password")}
                  </button>
                </div>
              )}
            </FormCard>
          </div>

          {/* ── RIGHT CONTENT ─────────────────────────────────── */}
          <div className="col-span-12 lg:col-span-8 space-y-5">
            <FormCard title={t("form.member_information")}>
              <FormFieldGrid>
                <div className="md:col-span-2">
                  <Input
                    label={t("form.full_name")}
                    placeholder={t("form.full_name_placeholder")}
                    required
                    error={errors.name?.message}
                    {...register("name")}
                  />
                </div>
                <Input
                  label={t("form.work_email")}
                  type="email"
                  placeholder={t("form.email_placeholder")}
                  required
                  error={errors.email?.message}
                  {...register("email")}
                />
                {!isEditMode && (
                  <Input
                    label={t("form.password")}
                    type="password"
                    placeholder={t("form.password_placeholder")}
                    required
                    error={errors.password?.message}
                    {...register("password")}
                  />
                )}
              </FormFieldGrid>
            </FormCard>

            <FormCard title={t("form.organization_role")}>
              <FormFieldGrid>

                {/* Société selector — super admins only ──────── */}
                {isSuperAdmin && (
                  <div className={`w-full transition-opacity duration-300 ${Number(roleId) === 1 ? "opacity-50" : "opacity-100"}`}>
                    <Controller
                      name="societeId"
                      control={control}
                      render={({ field }) => (
                        <SelectDropDown
                          label={t("form.assigned_societe")}
                          required={Number(roleId) !== 1}
                          placeholder={Number(roleId) === 1 ? t("form.global_access") : t("form.select_societe")}
                          options={Number(roleId) === 1 ? [] : societeOptions}
                          disabled={Number(roleId) === 1}
                          error={errors.societeId?.message}
                          value={Number(roleId) === 1 ? "" : (field.value ?? "")}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      )}
                    />
                  </div>
                )}

                {/* Role dropdown ─────────────────────────────── */}
                <div className={`w-full ${!isSuperAdmin ? "md:col-span-2" : ""}`}>
                  {isSelfEdit && (
                    <span className="flex items-center gap-1 text-[9px] font-black text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 normal-case tracking-normal mb-3 w-fit">
                      <Lock size={9} /> {t("form.cannot_change_own_role")}
                    </span>
                  )}
                  <Controller
                    name="roleId"
                    control={control}
                    render={({ field }) => (
                      <SelectDropDown
                        label={t("form.access_level")}
                        placeholder={t("form.select_role")}
                        required={!isSelfEdit}
                        disabled={isSelfEdit}
                        options={visibleRoles.map((role) => ({
                          value: role.id,
                          label: role.name.replace("_", " "),
                        }))}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value)}
                        error={errors.roleId?.message}
                      />
                    )}
                  />
                </div>
              </FormFieldGrid>
            </FormCard>

            {isEditMode && (
              <FormCard>
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {t("extra_roles.title")}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {t("wizard.roles_description")}
                  </p>
                </div>
                <UserExtraRolesFields
                  canBePreparateur={canBePreparateur}
                  canBeLivreur={canBeLivreur}
                  onChangePreparateur={setCanBePreparateur}
                  onChangeLivreur={setCanBeLivreur}
                  roleId={roleId}
                  roleName={userData?.data?.role?.name}
                  hasSociete={extraRolesHasSociete}
                />
              </FormCard>
            )}

            <FormActions
              onCancel={() => navigate(-1)}
              cancelLabel={t("form.cancel")}
              submitType="submit"
              isLoading={isSubmitting || createUser.isPending || updateUser.isPending}
              submitLabel={isEditMode ? t("form.save_changes") : t("form.create_member")}
            />
          </div>
        </form>
        )}
      </div>

      {/* ── CHANGE PASSWORD MODAL ───────────────────────────────── */}
      {showPwdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4">
          <div className="bg-white dark:bg-[#1c1c1c] rounded-lg shadow-2xl w-full max-w-md p-8 relative">
            <button
              onClick={handleClosePwdModal}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <KeyRound size={20} className="text-[#B12B89]" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {isSelfEdit ? t("form.change_your_password") : t("form.reset_user_password")}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isSelfEdit
                    ? t("form.verify_current_password")
                    : t("form.min_8_characters")}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitPwd(onPasswordSubmit)} className="space-y-4">
              {isSelfEdit && (
                <Input
                  label={t("form.current_password")}
                  type="password"
                  placeholder="••••••••"
                  required
                  error={pwdErrors.currentPassword?.message}
                  {...registerPwd("currentPassword")}
                />
              )}
              <Input
                label={t("form.new_password")}
                type="password"
                placeholder="••••••••"
                error={pwdErrors.newPassword?.message}
                {...registerPwd("newPassword")}
              />
              <Input
                label={t("form.confirm_new_password")}
                type="password"
                placeholder="••••••••"
                error={pwdErrors.confirmPassword?.message}
                {...registerPwd("confirmPassword")}
              />

              <FormActions
                placement="inline"
                bordered={false}
                onCancel={handleClosePwdModal}
                cancelLabel={t("form.cancel")}
                submitType="submit"
                isLoading={isPwdSubmitting || updatePassword.isPending}
                submitLabel={updatePassword.isPending ? t("form.updating") : t("form.update_password")}
              />
            </form>
          </div>
        </div>
      )}
    </div>
  );
};