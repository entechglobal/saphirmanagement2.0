import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@/shared/utils/toast";
import { useTranslation } from "react-i18next";
import {
  Camera, Building2, UserCircle, KeyRound, X,
  Pencil, Check, Ban, Mail, Lock,
} from "lucide-react";

import { FormPageHeader } from "../../../../shared/components/FormPageHeader";
import { FormCard, FormFieldGrid } from "../../../../shared/components/FormCard";
import { FormActions } from "../../../../shared/components/FormActions";
import { Input } from "../../../../shared/components/Input";
import { useUpdateUser, useCurrentUser, useUpdatePassword } from "../../hooks/useUsers";
import { useLogout } from "@/features/auth";
import { createProfileInfoSchema, createProfileChangePasswordSchema } from "../../schemas/profileSchema";
import avatar from "../../../../assets/avatar.png";
import avatarDark from "../../../../assets/avatar_dark.png";
import { SectionLoader } from "../../../../shared/components/loadersCollections/SectionLoader";
import { ConfirmationModal } from "../../../../shared/components/ConfirmationModal";
import { BiLogOutCircle } from "react-icons/bi";
import { getApiError } from "../../../../shared/utils/apiError";
const STATIC_ROLES = [
  { id: 1, name: "Super_Admin" },
  { id: 2, name: "Societe_Admin" },
  { id: 3, name: "Gerant" },
  { id: 4, name: "Caissier" },
];

export const ProfilePage = () => {
  const { t } = useTranslation("profile");
  const { t: tHeader } = useTranslation("header");
  const navigate = useNavigate();

  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const updateUser = useUpdateUser();
  const updatePassword = useUpdatePassword();
  const { mutate: logout, isLoading: isLoggingOut } = useLogout();

  const [imagePreview, setImagePreview] = useState(null);
  const [savedImagePreview, setSavedImagePreview] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // ── Profile info form ───────────────────────────────────────────
  const profileInfoSchema = useMemo(() => createProfileInfoSchema(t), [t]);
  const profileChangePasswordSchema = useMemo(() => createProfileChangePasswordSchema(t), [t]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(profileInfoSchema),
    defaultValues: { name: "", email: "", profile: null },
  });

  // ── Password modal form ─────────────────────────────────────────
  const {
    register: registerPwd,
    handleSubmit: handleSubmitPwd,
    reset: resetPwd,
    formState: { errors: pwdErrors, isSubmitting: isPwdSubmitting },
  } = useForm({
    resolver: zodResolver(profileChangePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  // ── Populate on load (only when not in edit mode) ───────────────
  useEffect(() => {
    if (currentUser?.data && !isEditing) {
      const u = currentUser.data;
      reset({ name: u.name || "", email: u.email || "", profile: null });
      const img = u.profile || null;
      setImagePreview(img);
      setSavedImagePreview(img);
    }
  }, [currentUser, isEditing, reset]);

  // ── File handler ────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setValue("profile", file, { shouldValidate: true });
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  // ── Cancel edit — restore snapshot ─────────────────────────────
  const handleCancelEdit = () => {
    const u = currentUser?.data;
    if (u) reset({ name: u.name || "", email: u.email || "", profile: null });
    setImagePreview(savedImagePreview);
    setIsEditing(false);
  };

  // ── Submit profile update ───────────────────────────────────────
  const onSubmit = (data) => {
    const userId = currentUser?.data?.id;
    if (!userId) return;

    const u = currentUser.data;
    const isSuperAdmin = Number(u.roleId) === 1;
    const payload = {
      name: data.name,
      email: data.email,
      roleId: Number(u.roleId),
      isSuperAdmin,
      societeId: isSuperAdmin ? null : Number(u.societeId),
      active: u.active,
      ...(data.profile instanceof File && { profile: data.profile }),
    };

    updateUser.mutate(
      { id: userId, payload },
      {
        onSuccess: () => {
          toast.success(t("toast.update_success"));
          setSavedImagePreview(imagePreview);
          setIsEditing(false);
        },
        onError: (err) => toast.error(getApiError(err, t("toast.update_error"))),
      }
    );
  };

  // ── Submit password change ──────────────────────────────────────
  const onPasswordSubmit = (data) => {
    const userId = currentUser?.data?.id;
    if (!userId) return;

    updatePassword.mutate(
      { id: userId, ...data },
      {
        onSuccess: () => {
          toast.success(t("toast.password_success"));
          setShowPwdModal(false);
          resetPwd();
        },
        onError: (err) => toast.error(getApiError(err, t("toast.password_error"))),
      }
    );
  };

  if (isLoadingUser) return <SectionLoader />;

  const u = currentUser?.data;
  const roleName = STATIC_ROLES.find((r) => r.id === Number(u?.roleId))?.name;
  const hasCustomImage = u?.profile || watch("profile") instanceof File;

  return (
    <div className="min-h-screen pb-20">
      <FormPageHeader
        entityName={t("entity_name")}
        onBack={() => navigate(-1)}
        data={u}
        createTitle={t("page_title")}
      />

      <div className="max-w-6xl mx-auto px-4 md:px-6 mt-8">
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-12 gap-4 lg:gap-8">

          {/* ── LEFT SIDEBAR ──────────────────────────────────── */}
          <div className="col-span-12 lg:col-span-4 space-y-5">
            <FormCard className="text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-blue-500/10 to-transparent" />

              {/* Avatar */}
              <div className="relative mt-2 inline-block">
                <div className="w-32 h-32 rounded-xl flex items-center justify-center overflow-hidden ring-4 ring-white dark:ring-slate-800 shadow-lg mx-auto bg-slate-100 dark:bg-slate-800">
                  {hasCustomImage ? (
                    <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <img src={avatar} alt="Profile Light" className="w-full h-full object-cover block dark:hidden" />
                      <img src={avatarDark} alt="Profile Dark" className="w-full h-full object-cover hidden dark:block" />
                    </>
                  )}
                </div>
                {isEditing && (
                  <label className="absolute -bottom-2 -right-2 p-2.5 bg-white dark:bg-slate-800 text-[#B12B89] rounded-md shadow-lg border border-slate-100 dark:border-slate-700 cursor-pointer hover:scale-110 transition-transform">
                    <Camera size={18} />
                    <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                  </label>
                )}
              </div>
              {errors.profile && (
                <p className="text-[10px] font-bold text-red-500 mt-2">{errors.profile.message}</p>
              )}

              {/* Name & role preview */}
              <div className="mt-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {watch("name") || t("user_name_placeholder")}
                </h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                  {roleName || t("member_fallback")}
                </p>
              </div>

              {/* Change password button */}
              <div className="mt-4 space-y-3">
                <button
                  type="button"
                  onClick={() => setShowPwdModal(true)}
                  className="w-full flex items-center justify-center gap-2 h-10 rounded-md border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-500 hover:border-[#B12B89] hover:text-[#B12B89] transition-all"
                >
                  <KeyRound size={14} />
                  {t("sidebar.change_password")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 px-3 h-10 rounded-md
             text-sm font-medium text-red-600
             hover:bg-red-50 transition-colors
             dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <BiLogOutCircle className="h-5 w-5 opacity-70" />
                  {t("sidebar.logout")}
                </button>
              </div>
            </FormCard>
          </div>

          {/* ── RIGHT CONTENT ─────────────────────────────────── */}
          <div className="col-span-12 lg:col-span-8 space-y-5">

            {/* Personal Information — editable section */}
            <FormCard
              title={t("personal_info.section_title")}
              icon={<UserCircle size={14} />}
              action={
                !isEditing ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-1.5 px-3 h-10 rounded-md text-sm font-medium text-[#B12B89] border border-[#B12B89]/30 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                  >
                    <Pencil size={12} /> {t("personal_info.edit")}
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={isSubmitting || updateUser.isPending}
                      className="inline-flex items-center gap-1.5 px-3 h-10 rounded-md text-sm font-medium text-white bg-[#B12B89] hover:bg-[#9A2478] transition-colors disabled:opacity-50"
                    >
                      <Check size={12} />
                      {updateUser.isPending ? t("personal_info.saving") : t("personal_info.save")}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="inline-flex items-center gap-1.5 px-3 h-10 rounded-md text-sm font-medium text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                    >
                      <Ban size={12} /> {t("personal_info.cancel")}
                    </button>
                  </div>
                )
              }
            >
              <FormFieldGrid>
                {/* Full Name */}
                <div className="md:col-span-2">
                  {isEditing ? (
                    <Input
                      label={t("personal_info.full_name_label")}
                      placeholder={t("personal_info.full_name_placeholder")}
                      error={errors.name?.message}
                      {...register("name")}
                    />
                  ) : (
                    <InfoRow label={t("personal_info.full_name_label")} value={watch("name")} icon={<UserCircle size={15} />} />
                  )}
                </div>

                {/* Email */}
                {isEditing ? (
                  <Input
                    label={t("personal_info.email_label")}
                    type="email"
                    placeholder={t("personal_info.email_placeholder")}
                    error={errors.email?.message}
                    {...register("email")}
                  />
                ) : (
                  <InfoRow label={t("personal_info.email_label")} value={watch("email")} icon={<Mail size={15} />} />
                )}
              </FormFieldGrid>

              {!isEditing && (
                <p className="mt-4 text-[10px] text-slate-400 font-medium flex items-center gap-1.5">
                  <Pencil size={10} />
                  {t("personal_info.edit_hint")}
                </p>
              )}
            </FormCard>

            {/* Account Details — always read-only */}
            <FormCard title={t("account_details.section_title")} icon={<Building2 size={14} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] text-slate-400 uppercase font-black mb-1">{t("account_details.company_role")}</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    {roleName?.replace("_", " ") || "—"}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] text-slate-400 uppercase font-black mb-1">{t("account_details.account_status")}</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${u?.active ? "bg-green-500" : "bg-slate-400"}`} />
                    {u?.active ? t("account_details.active") : t("account_details.inactive")}
                  </p>
                </div>
              </div>
            </FormCard>
          </div>
        </form>
      </div>

      {/* ── CHANGE PASSWORD MODAL ───────────────────────────────── */}
      {showPwdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-2xl w-full max-w-md p-8 relative">
            <button
              onClick={() => { setShowPwdModal(false); resetPwd(); }}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <KeyRound size={20} className="text-[#B12B89]" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">{t("change_password.modal_title")}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{t("change_password.modal_subtitle")}</p>
              </div>
            </div>

            <form onSubmit={handleSubmitPwd(onPasswordSubmit)} className="space-y-4">
              <Input
                label={t("change_password.current_password")}
                type="password"
                placeholder="••••••••"
                required
                error={pwdErrors.currentPassword?.message}
                {...registerPwd("currentPassword")}
              />
              <Input
                label={t("change_password.new_password")}
                type="password"
                placeholder="••••••••"
                error={pwdErrors.newPassword?.message}
                {...registerPwd("newPassword")}
              />
              <Input
                label={t("change_password.confirm_password")}
                type="password"
                placeholder="••••••••"
                error={pwdErrors.confirmPassword?.message}
                {...registerPwd("confirmPassword")}
              />

              <FormActions
                placement="inline"
                bordered={false}
                onCancel={() => { setShowPwdModal(false); resetPwd(); }}
                cancelLabel={t("change_password.cancel")}
                submitType="submit"
                isLoading={isPwdSubmitting || updatePassword.isPending}
                submitLabel={updatePassword.isPending ? t("change_password.updating") : t("change_password.update")}
              />
            </form>
          </div>
        </div>
      )}

      {/* ── LOGOUT CONFIRMATION MODAL ───────────────────────────── */}
      <ConfirmationModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={() => {
          logout();
          setShowLogoutConfirm(false);
        }}
        title={tHeader("confirmation.logout_title")}
        message={tHeader("confirmation.logout_message")}
        confirmText={tHeader("confirmation.logout_confirm")}
        cancelText={tHeader("confirmation.logout_cancel")}
        isLoading={isLoggingOut}
        variant="danger"
      />
    </div>
  );
};

/* ── UI HELPERS ─────────────────────────────────────────────────── */
const InfoRow = ({ label, value, icon }) => (
  <div className="w-full">
    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 ml-1 flex items-center gap-2">
      {icon && <span className="text-slate-400">{icon}</span>}
      {label}
    </p>
    <div className="w-full px-4 py-3 text-sm rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-medium">
      {value || <span className="text-slate-400 italic">—</span>}
    </div>
  </div>
);