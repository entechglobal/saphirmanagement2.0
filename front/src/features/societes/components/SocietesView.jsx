import { useNavigate, Link, useParams } from "react-router-dom";
import {
    ArrowLeft, Edit, Globe, Mail, Phone, MapPin,
    Landmark, Building, Hash, Smartphone, ChevronLeft
} from "lucide-react";
import { CiImageOff } from "react-icons/ci";
import { useTranslation } from "react-i18next";
import { useSociete } from "../hooks/useSocietes";
import { SectionLoader } from "../../../shared/components/loadersCollections/SectionLoader";
import { NotFound } from "../../../shared/components/NotFound";
import { FormPageHeader } from "../../../shared/components/FormPageHeader";

const BRAND_COLOR = "#B12B89";

export const SocietesView = () => {
    const { t } = useTranslation("societes");
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: societeResponse, isLoading, isError } = useSociete(id);

    const societe = societeResponse?.data;

    if (isLoading) {
        return <SectionLoader text={t("view.loading")} />;
    }

    if (isError || !societe) {
        return (
            <NotFound
                onAction={() => navigate("/societes")}
            />
        );
    }

    return (
        <div className="min-h-screen pb-24 font-sans antialiased text-slate-900 dark:text-slate-100">
            {/* HEADER SECTION */}
            <FormPageHeader
                entityName={t("form.entity_name")}
                backPath="/societes"
                isView={true}
                data={societe}
                viewTitleMain={societe.raisonSocial}
                editTitleKey="raisonSocial"
                rightContent={
                    <button
                        type="button"
                        onClick={() => navigate(`/societes/${societe.id}/edit`)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#B12B89] px-3.5 text-[13px] font-semibold text-white transition-all hover:brightness-110"
                    >
                        <Edit className="h-4 w-4" strokeWidth={2.25} />
                        {t("form.edit_title", "Modifier")}
                    </button>
                }
            />

            <div className="max-w-6xl mx-auto px-4 grid grid-cols-12 gap-8">
                {/* LEFT COLUMN: IDENTITY & CONTACT */}
                <div className="col-span-12 lg:col-span-8 space-y-6">
                    <Card title={t("view.company_identity")}>
                        <Info 
                            label={t("view.corporate_name")} 
                            value={societe.raisonSocial} 
                            isBold 
                            icon={<Building className="w-4 h-4" />} 
                            t={t}
                        />
                        <Info 
                            label={t("view.official_email")} 
                            value={societe.email} 
                            icon={<Mail className="w-4 h-4" />} 
                            t={t}
                        />
                        <Info 
                            label={t("view.website")} 
                            value={societe.siteWeb} 
                            icon={<Globe className="w-4 h-4" />} 
                            color="text-blue-500" 
                            t={t}
                        />
                        <div className="pt-4 mt-2 border-t border-slate-100 dark:border-[#2e2e2e]">
                            <Info 
                                label={t("view.mobile_phone")} 
                                value={societe.phone} 
                                icon={<Smartphone className="w-4 h-4" />} 
                                t={t}
                            />
                        </div>
                    </Card>

                    <Card title={t("view.legal_tax_information")}>
                        <Info 
                            label={t("view.ice")} 
                            value={societe.ice} 
                            isCode 
                            icon={<Landmark className="w-4 h-4" />} 
                            t={t}
                        />
                        <Info 
                            label={t("view.rc")} 
                            value={societe.rc} 
                            isCode 
                            icon={<Hash className="w-4 h-4" />} 
                            t={t}
                        />
                        <Info 
                            label={t("view.if")} 
                            value={societe.if} 
                            isCode 
                            icon={<Hash className="w-4 h-4" />} 
                            t={t}
                        />
                        <Info 
                            label={t("view.tp")} 
                            value={societe.tp} 
                            isCode 
                            icon={<Hash className="w-4 h-4" />} 
                            t={t}
                        />
                    </Card>
                </div>

                {/* RIGHT COLUMN: LOGO & STRUCTURE */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                    {/* UPDATED LOGO CARD */}
                    <Card title={t("view.company_logo")}>
                        <div className="relative aspect-square w-full rounded-2xl border-2 border-dashed border-slate-200 dark:border-[#2e2e2e] bg-slate-50 dark:bg-[#111111] flex items-center justify-center overflow-hidden">
                            {societe.logo ? (
                                <img
                                    src={societe.logo}
                                    alt={societe.raisonSocial}
                                    className="w-full h-full object-contain p-4"
                                />
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <CiImageOff className="w-10 h-10 text-slate-300" />
                                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                        {t("view.no_logo")}
                                    </span>
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card title={t("view.headquarters_location")}>
                        <div className="flex gap-3 mb-2">
                            <MapPin className="w-5 h-5 text-slate-400 shrink-0 mt-1" />
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                                {societe.address || t("view.no_address")}
                            </p>
                        </div>
                    </Card>

                    <Card title={t("view.logistics_summary")}>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500 font-medium">{t("view.active_depots")}</span>
                                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg text-xs font-bold">
                                    {societe.depots?.length || 0}
                                </span>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-2">
                                {societe.depots?.map((depot) => {
                                    const isActive = depot.active;

                                    return (
                                        <span
                                            key={depot.id}
                                            className={`px-3 py-1 rounded-full text-[11px] font-bold border uppercase tracking-tight transition-colors ${isActive
                                                ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400"
                                                : "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-400"
                                                }`}
                                        >
                                            {depot.city} - {depot.code} {!isActive && `(${t("view.inactive")})`}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

/* ---------- UI HELPERS ---------- */

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

const Info = ({ label, value, color = "text-slate-900 dark:text-slate-100", isCode = false, isBold = false, icon = null, t }) => (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-[#2e2e2e]/50 last:border-0">
        <div className="flex items-center gap-2">
            {icon && <span className="text-slate-400">{icon}</span>}
            <span className="text-sm text-slate-500 font-medium">{label}</span>
        </div>
        <span
            className={`text-sm ${color} 
                ${isCode ? "font-mono bg-slate-100 dark:bg-[#222222] px-1.5 py-0.5 rounded text-xs" : ""} 
                ${isBold ? "font-bold" : "font-semibold"}
            `}
        >
            {value ?? "—"}
        </span>
    </div>
);