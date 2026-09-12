import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Tag,
  Tags,
  Puzzle,
  KeyRound,
  SlidersHorizontal,
  FileText,
  Clock,
} from "lucide-react";
import {
  PRICE_FIELD_OPTIONS,
  getActivePriceFields,
  setActivePriceFields,
} from "../shared/components/PriceFieldDropDown";
import { HeaderTable } from "../shared/components/HeaderTable";
import { AttributePage } from "../features/products/pages/attributes/AttributePage";
import { PermissionsPage } from "../features/settings/permissions/pages/PermissionsPage";
import { CaisseLabelsPage } from "../features/caisse";
import { SystemSettingsPage } from "../features/settings/systemSettings/pages/SystemSettingsPage";
import { DocumentHeaderSettingsPage } from "../features/settings/documentHeader/pages/DocumentHeaderSettingsPage";
import { AttendanceSettingsPage } from "../features/settings/attendance/pages/AttendanceSettingsPage";
import { useAuth } from "@/features/auth";
import {
  hasPermission,
  isSuperAdmin,
  isSocieteAdmin,
  PERMISSIONS,
} from "@/shared/utils/permissions";

const Toggle = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={onChange}
    disabled={disabled}
    className={`relative h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B12B89]/40 ${
      checked ? "bg-[#B12B89]" : "bg-slate-200 dark:bg-[#2e2e2e]"
    } ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
  >
    <span
      className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
        checked ? "translate-x-5" : "translate-x-0"
      }`}
    />
  </button>
);

const PriceGridSection = ({ active, toggle }) => {
  const { t } = useTranslation("settings");
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-[#2e2e2e]">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-[#2e2e2e]">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30">
          <Tag className="h-4 w-4 text-blue-500" />
        </div>
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {t("price_grid.title")}
        </h2>
      </div>
      <div className="divide-y divide-slate-50 dark:divide-[#2e2e2e]/60">
        {PRICE_FIELD_OPTIONS.map((opt, i) => {
          const isActive = active.includes(opt.value);
          const isOnly = active.length === 1 && isActive;
          const isDefault = i === 0;
          return (
            <div
              key={opt.value}
              className="flex items-center justify-between gap-4 px-5 py-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {opt.label}
                  </p>
                  {isDefault && (
                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-500 dark:bg-blue-900/30">
                      {t("price_grid.badge_default")}
                    </span>
                  )}
                  {!isActive && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 dark:bg-[#222222]">
                      {t("price_grid.badge_hidden")}
                    </span>
                  )}
                </div>
                {isOnly && (
                  <p className="mt-0.5 text-[11px] text-amber-500">
                    {t("price_grid.min_one_warning")}
                  </p>
                )}
              </div>
              <Toggle
                checked={isActive}
                onChange={() => toggle(opt.value)}
                disabled={isOnly}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ALL_TABS = [
  { id: "prices", tKey: "tabs.prices", icon: Tag, perm: null },
  {
    id: "documents",
    tKey: "tabs.documents",
    icon: FileText,
    superAdminOnly: true,
  },
  {
    id: "attributes",
    tKey: "tabs.attributes",
    icon: Puzzle,
    perm: PERMISSIONS.MANAGE_ATTRIBUTES,
  },
  {
    id: "labels",
    tKey: "tabs.labels",
    icon: Tags,
    perm: PERMISSIONS.VIEW_CAISSE,
  },
  {
    id: "permissions",
    tKey: "tabs.permissions",
    icon: KeyRound,
    superAdminOnly: true,
  },
  {
    id: "system",
    tKey: "tabs.system",
    icon: SlidersHorizontal,
    superAdminOnly: true,
  },
  {
    id: "attendance",
    tKey: "tabs.attendance",
    icon: Clock,
    show: (user) =>
      isSuperAdmin(user) ||
      isSocieteAdmin(user) ||
      hasPermission(user, PERMISSIONS.MANAGE_ATTENDANCE),
  },
];

export const SettingsPage = () => {
  const { t } = useTranslation("settings");
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(
    () => searchParams.get("tab") || "prices",
  );
  const [active, setActive] = useState(getActivePriceFields);

  const tabs = ALL_TABS.filter((tab) => {
    if (typeof tab.show === "function") return tab.show(user);
    if (tab.superAdminOnly) return isSuperAdmin(user);
    return !tab.perm || hasPermission(user, tab.perm);
  });

  const safeTab = tabs.find((tab) => tab.id === activeTab)
    ? activeTab
    : tabs[0]?.id ?? "prices";

  const toggle = (value) => {
    const next = active.includes(value)
      ? active.filter((v) => v !== value)
      : [...active, value];
    if (next.length === 0) return;
    setActive(next);
    setActivePriceFields(next);
  };

  return (
    <div className="space-y-4">
      <HeaderTable title={t("title")} />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
        <aside className="w-full shrink-0 lg:w-52">
          <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = safeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSearchParams(
                      tab.id === "prices" ? {} : { tab: tab.id },
                      { replace: true },
                    );
                  }}
                  className={`flex min-w-max items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] font-semibold transition-colors lg:min-w-0 ${
                    isActive
                      ? "bg-[#B12B89]/10 text-[#B12B89]"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-[#222222]/60 dark:hover:text-white"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? "text-[#B12B89]" : "text-slate-400"
                    }`}
                  />
                  <span className="truncate">{t(tab.tKey)}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          {safeTab === "prices" && (
            <PriceGridSection active={active} toggle={toggle} />
          )}
          {safeTab === "documents" && <DocumentHeaderSettingsPage />}
          {safeTab === "attributes" && <AttributePage />}
          {safeTab === "labels" && <CaisseLabelsPage />}
          {safeTab === "permissions" && <PermissionsPage />}
          {safeTab === "system" && <SystemSettingsPage />}
          {safeTab === "attendance" && <AttendanceSettingsPage />}
        </div>
      </div>
    </div>
  );
};
