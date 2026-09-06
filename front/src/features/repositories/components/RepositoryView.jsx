import { useNavigate, Link, useParams } from "react-router-dom";
import {
    ArrowLeft, Building, Hash, MapPin, Phone, Mail, Edit, Warehouse, ChevronLeft,
    User, Box, Activity, Calendar, ShieldCheck, ShieldAlert
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDepot } from "../hooks/useRepositories";
import { SectionLoader } from "../../../shared/components/loadersCollections/SectionLoader";
import { NotFound } from "../../../shared/components/NotFound";
import { FormPageHeader } from "../../../shared/components/FormPageHeader";

const BRAND_COLOR = "#B12B89";

export const RepositoryView = () => {
    const { t } = useTranslation("repositories");
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: depotResponse, isLoading, isError } = useDepot(id);

    const depot = depotResponse?.data;

    if (isLoading) {
        return <SectionLoader text={t("view.loading")} />;
    }

    if (!depot || isError) {
        return (
            <NotFound
                onAction={() => navigate("/depots")}
            />
        );
    }

    const typeMap = {
        "PRINCIPAL": t("primary"),
        "SECONDARY": t("secondary"),
        "OUTLET": t("outlet"),
    };

    return (
        <div className="min-h-screen pb-24 font-sans antialiased text-slate-900 dark:text-slate-100">
            {/* HEADER SECTION */}
            <FormPageHeader
                entityName={t("form.entity_name")}
                backPath="/depots"
                isView={true}
                data={depot}
            />

            <div className="max-w-6xl mx-auto px-4 grid grid-cols-12 gap-8">
                {/* LEFT COLUMN: PRIMARY INFO */}
                <div className="col-span-12 lg:col-span-8 space-y-6">
                    <Card title={t("view.depot_information")}>
                        <Info label={t("view.name")} value={depot.name} isBold />
                        <Info label={t("view.internal_code")} value={depot.code} isCode />
                        <Info label={t("view.manager_in_charge")} value={depot.manager} />
                        <Info label={t("view.storage_classification")} value={typeMap[depot.type] || depot.type} color="text-[#B12B89]" />
                    </Card>

                    <Card title={t("view.location_contact")}>
                        <div className="flex gap-4 mb-4 p-4 bg-slate-50 dark:bg-[#222222]/50 rounded-2xl border border-slate-100 dark:border-[#2e2e2e]">
                            <MapPin className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-sm text-slate-900 dark:text-slate-100 font-bold leading-none">
                                    {depot.address || t("view.no_address")}
                                </p>
                                <p className="text-xs text-slate-500 font-medium italic">
                                    {[depot.city, depot.region].filter(Boolean).join(", ") || t("view.no_location_details")}
                                </p>
                            </div>
                        </div>
                        <Info label={t("view.contact_phone")} value={depot.phone} isNumber />
                        <Info label={t("view.official_email")} value={depot.email} />
                    </Card>
                </div>

                {/* RIGHT COLUMN: STATS & STATUS */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                    <Card title={t("view.operational_status")}>
                        <StatusBadge
                            label={t("view.registry_status")}
                            value={depot.active}
                            yes={t("view.active_depot")}
                            no={t("view.inactive_closed")}
                        />
                    </Card>

                    <Card title={t("view.parent_company")}>
                        <div className="flex items-center gap-4">
                            {depot.societe?.logo ? (
                                <img
                                    src={depot.societe.logo}
                                    alt="logo"
                                    className="w-12 h-12 rounded-xl object-contain border border-slate-100 bg-white"
                                />
                            ) : (
                                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-[#222222] flex items-center justify-center">
                                    <Building className="w-6 h-6 text-slate-400" />
                                </div>
                            )}
                            <div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                    {depot.societe?.raisonSocial || t("view.independent")}
                                </p>
                                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">
                                    {t("view.id_label")}: {depot.societeId || "N/A"}
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card title={t("view.capacity_metrics")}>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/50">
                                <p className="text-[10px] uppercase font-bold text-blue-500 mb-1">{t("view.surface")}</p>
                                <p className="text-lg font-black text-blue-700">{depot.surface} <span className="text-xs font-normal">m²</span></p>
                            </div>
                            <div className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/50">
                                <p className="text-[10px] uppercase font-bold text-indigo-500 mb-1">{t("view.capacity")}</p>
                                <p className="text-lg font-black text-indigo-700">{depot.capacity}</p>
                            </div>
                        </div>
                    </Card>

                    <Card title={t("view.system_metadata")}>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <Calendar className="w-4 h-4 text-slate-400 mt-1" />
                                <div>
                                    <p className="text-[10px] uppercase text-slate-400 font-bold">{t("view.created_on")}</p>
                                    <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                                        {depot.createdAt ? new Date(depot.createdAt).toLocaleDateString() : "—"}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Activity className="w-4 h-4 text-slate-400 mt-1" />
                                <div>
                                    <p className="text-[10px] uppercase text-slate-400 font-bold">{t("view.last_activity")}</p>
                                    <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                                        {depot.updatedAt ? new Date(depot.updatedAt).toLocaleDateString() : "—"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

/* ---------- REUSABLE UI COMPONENTS (Shared Logic) ---------- */

const Card = ({ title, children }) => (
    <div className="bg-white dark:bg-[#1c1c1c] rounded-3xl border border-slate-200 dark:border-[#2e2e2e] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50 dark:border-[#2e2e2e] bg-slate-50/50 dark:bg-[#222222]/30">
            <h3 className="font-bold text-[11px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                {title}
            </h3>
        </div>
        <div className="p-6 space-y-3">{children}</div>
    </div>
);

const Info = ({ label, value, suffix = "", color = "text-slate-900 dark:text-slate-100", isCode = false, isBold = false, isNumber = false }) => (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-[#2e2e2e]/50 last:border-0">
        <span className="text-sm text-slate-500">{label}</span>
        <span className={`text-sm ${color} 
            ${isCode ? "font-mono bg-slate-100 dark:bg-[#222222] px-1.5 py-0.5 rounded text-xs" : ""} 
            ${isBold ? "font-bold" : "font-semibold"}
            ${isNumber ? "font-mono" : ""}
        `}>
            {value ?? "—"} {value && suffix}
        </span>
    </div>
);

const StatusBadge = ({ label, value, yes, no }) => (
    <div className="flex items-center justify-between py-2">
        <span className="text-sm text-slate-500">{label}</span>
        <span className={`px-3 py-1 rounded-full text-[11px] font-bold border uppercase tracking-tight ${value
                ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400"
                : "bg-slate-50 border-slate-200 text-slate-500 dark:bg-[#222222] dark:border-[#2e2e2e]"
            }`}>
            {value ? yes : no}
        </span>
    </div>
);