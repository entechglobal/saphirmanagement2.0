import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Mail, Building2, UserCircle, ShieldCheck,
  CalendarDays, Clock, CheckCircle2, XCircle,
  Pencil, Trash2, ChevronLeft
} from "lucide-react";
import { toast } from "@/shared/utils/toast";
import { useTranslation } from "react-i18next";

import { FormPageHeader } from "../../../shared/components/FormPageHeader";
import { useUser, useDeleteUser, useUpdateUser } from "../hooks/useUsers";
import { useAuth } from "../../auth/hooks/useAuth";
import { SectionLoader } from "../../../shared/components/loadersCollections/SectionLoader";
import avatar from "../../../assets/avatar.png";
import avatarDark from "../../../assets/avatar_dark.png";
import { NotFound } from "../../../shared/components/NotFound";
import { getApiError } from "../../../shared/utils/apiError";

const ALL_ROLES = [
  { id: 1, name: "Super_Admin" },
  { id: 2, name: "Societe_Admin" },
  { id: 3, name: "Caissier" },
  { id: 4, name: "Gerant" },
  { id: 6, name: "Commercial" },
  { id: 7, name: "Preparateur" },
  { id: 8, name: "livreur" }
];

const fmt = (dateStr, t) => {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat(t("locale", { returnObjects: true }) === "ar" ? "ar-EG" : "fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(dateStr));
};

const fmtDate = (dateStr, t) => {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat(t("locale", { returnObjects: true }) === "ar" ? "ar-EG" : "fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  }).format(new Date(dateStr));
};

export const UserDetailsPage = () => {
  const { t } = useTranslation("users");
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const isSuperAdmin = !!authUser?.isSuperAdmin;

  const { data: userData, isLoading, isError } = useUser(id);
  const deleteUser = useDeleteUser();
  const updateUser = useUpdateUser();

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const u = userData?.data;

  if (isLoading) {
    return <SectionLoader text={t("details.loading")} />;
  }

  if (!userData?.data || isError) {
    return (
      <NotFound
        onAction={() => navigate("/users")}
      />
    );
  }

  const role = ALL_ROLES.find((r) => r.id === Number(u.roleId));
  const isSelf = authUser?.id === u.id;

  const handleToggleActive = () => {
    const payload = {
      name: u.name,
      email: u.email,
      roleId: u.roleId,
      isSuperAdmin: u.isSuperAdmin,
      societeId: u.societeId,
      active: !u.active,
    };
    updateUser.mutate(
      { id, payload },
      {
        onSuccess: () => toast.success(
          u.active
            ? t("toast.deactivate_success")
            : t("toast.activate_success")
        ),
        onError: (err) => toast.error(getApiError(err, t("toast.update_error"))),
      }
    );
  };

  const handleDelete = () => {
    deleteUser.mutate(id, {
      onSuccess: () => { toast.success(t("toast.delete_success")); navigate("/users"); },
      onError: (err) => toast.error(getApiError(err, t("toast.delete_error"))),
    });
  };

  return (
    <div className="min-h-screen pb-20">
      <FormPageHeader
        entityName={t("details.entity_name")}
        backPath="/users"
        data={u}
        createTitle={t("details.title")}
      />

      <div className="max-w-6xl mx-auto px-4 md:px-6 mt-8">
        <div className="grid grid-cols-12 gap-8">

          {/* ── LEFT SIDEBAR ──────────────────────────────────── */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-sm text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-blue-500/10 to-transparent" />

              {/* Avatar */}
              <div className="relative mt-4 inline-block">
                <div className="w-32 h-32 rounded-[2.5rem] flex items-center justify-center overflow-hidden ring-4 ring-white dark:ring-slate-800 shadow-2xl mx-auto bg-slate-100 dark:bg-slate-800">
                  {u.profile ? (
                    <img src={u.profile} alt={u.name} className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <img src={avatar} alt="Light" className="w-full h-full object-cover block dark:hidden" />
                      <img src={avatarDark} alt="Dark" className="w-full h-full object-cover hidden dark:block" />
                    </>
                  )}
                </div>
                {/* Active dot */}
                <span className={`absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${u.active ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />
              </div>

              {/* Name & role */}
              <div className="mt-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{u.name}</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                  {role?.name?.replace("_", " ") || t("details.no_role")}
                </p>
              </div>

              {/* Status */}
              <div className="mt-8 pt-8 border-t border-slate-50 dark:border-slate-800 space-y-3">
                <ToggleActiveRow
                  label={t("details.status.account_active")}
                  active={u.active}
                  disabled={isSelf || updateUser.isPending}
                  onChange={handleToggleActive}
                />
              </div>

              {/* Actions */}
              <div className="mt-4 space-y-2">
                <button
                  onClick={() => navigate(`/users/${id}/edit`)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-black uppercase tracking-widest text-slate-500 hover:border-[#B12B89] hover:text-[#B12B89] transition-all"
                >
                  <Pencil size={13} /> {t("details.edit_profile")}
                </button>

                {isSuperAdmin && !isSelf && (
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-black uppercase tracking-widest text-slate-400 hover:border-red-300 hover:text-red-500 dark:hover:border-red-800 transition-all"
                  >
                    <Trash2 size={13} /> {t("details.delete")}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT CONTENT ─────────────────────────────────── */}
          <div className="col-span-12 lg:col-span-8 space-y-6">

            <DetailSection title={t("details.personal_information")} icon={<UserCircle size={14} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoCard label={t("details.full_name")} value={u.name} icon={<UserCircle size={14} />} span={2} />
                <InfoCard label={t("details.email_address")} value={u.email} icon={<Mail size={14} />} />
                <InfoCard
                  label={t("details.account_status")}
                  icon={<ShieldCheck size={14} />}
                  value={
                    <span className={`font-bold ${u.active ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
                      {u.active ? t("details.status.active") : t("details.status.inactive")}
                    </span>
                  }
                />
              </div>
            </DetailSection>

            <DetailSection title={t("details.organization_role")} icon={<Building2 size={14} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoCard label={t("details.access_level")} value={role?.name?.replace("_", " ") || t("details.no_role")} icon={<ShieldCheck size={14} />} />
                <InfoCard
                  label={t("details.assigned_societe")}
                  icon={<Building2 size={14} />}
                  value={u.societe?.raisonSocial || (u.isSuperAdmin ? t("details.global_access") : "—")}
                />
              </div>
            </DetailSection>

            <DetailSection title={t("details.account_dates")} icon={<CalendarDays size={14} />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoCard label={t("details.member_since")} value={fmtDate(u.createdAt, t)} icon={<CalendarDays size={14} />} />
                <InfoCard label={t("details.last_updated")} value={fmt(u.updatedAt, t)} icon={<Clock size={14} />} />
              </div>
            </DetailSection>

          </div>
        </div>
      </div>

      {/* ── DELETE CONFIRM MODAL ────────────────────────────────── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-sm p-8 relative text-center">
            <div className="w-14 h-14 rounded-[1.5rem] bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-5">
              <Trash2 size={20} className="text-slate-500" />
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">{t("details.delete_modal.title")}</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              {t("details.delete_modal.message", { name: u.name })}
            </p>
            <div className="flex gap-3 mt-8">
              <button
                onClick={handleDelete}
                disabled={deleteUser.isPending}
                className="flex-1 bg-red-600 dark:bg-red-500 text-white dark:text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest disabled:opacity-50 transition-all"
              >
                {deleteUser.isPending ? t("details.delete_modal.deleting") : t("details.delete_modal.confirm")}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-500 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                {t("details.delete_modal.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── UI HELPERS ─────────────────────────────────────────────────── */
const DetailSection = ({ title, icon, children }) => (
  <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
    <div className="px-8 py-6 border-b border-slate-50 dark:border-slate-800 flex items-center gap-3">
      {icon && <div className="text-slate-400">{icon}</div>}
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</h3>
    </div>
    <div className="p-8">{children}</div>
  </div>
);

const InfoCard = ({ label, value, icon, span = 1 }) => (
  <div
    className={`p-4 rounded-2xl border border-slate-100 dark:border-slate-800 ${span === 2 ? "md:col-span-2" : ""}`}
    ref={(el) => {
      if (!el) return;
      const apply = () => {
        el.style.backgroundColor = document.documentElement.classList.contains("dark")
          ? "#1B2234"
          : "#f8fafc";
      };
      apply();
      if (el._obs) return;
      el._obs = new MutationObserver(apply);
      el._obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    }}
  >
    <p className="text-[10px] text-slate-400 uppercase font-black mb-1.5 flex items-center gap-1.5">
      {icon && <span className="text-slate-300 dark:text-slate-600">{icon}</span>}
      {label}
    </p>
    <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
      {value || <span className="text-slate-300 dark:text-slate-600 italic font-medium">—</span>}
    </div>
  </div>
);

const ToggleActiveRow = ({ label, active, disabled, onChange }) => (
  <div className="flex items-center justify-between px-2 py-1">
    <span className="text-xs font-black text-slate-500 uppercase tracking-tighter">{label}</span>
    <label className={`relative inline-flex items-center ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
      <input
        type="checkbox"
        className="sr-only peer"
        checked={active}
        disabled={disabled}
        onChange={onChange}
      />
      <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#B12B89]" />
    </label>
  </div>
);