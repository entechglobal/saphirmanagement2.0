import { useNavigate, Link } from "react-router-dom";
import {
    ArrowLeft, Edit, Globe, Mail, Phone, MapPin,
    Landmark, Building, Hash, Smartphone
} from "lucide-react";
import { CiImageOff } from "react-icons/ci"; // Added for the image placeholder
import { useSocieteMe } from "../../hooks/useSociete";

const BRAND_COLOR = "#B12B89";

export const SocieteView = () => {
    const navigate = useNavigate();
    const { data: societeResponse, isLoading, isError } = useSocieteMe();

    const societe = societeResponse?.data;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div
                    className="animate-spin h-10 w-10 rounded-full border-t-2 border-b-2"
                    style={{ borderColor: BRAND_COLOR }}
                />
            </div>
        );
    }

    if (isError || !societe) {
        return (
            <div className="text-center text-red-500 mt-20 font-medium">
                Failed to load company details
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#161616] pb-24 font-sans antialiased text-slate-900 dark:text-slate-100">
            {/* HEADER SECTION */}
            <header className="max-w-6xl mx-auto px-4 md:px-6 pt-8 mb-10">
                <nav className="flex items-center space-x-2 text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4">
                    <Link to="/" className="hover:text-[#B12B89] transition-colors">Dashboard</Link>
                    <span className="text-slate-300 dark:text-slate-700">/</span>
                    <span className="text-slate-900 dark:text-slate-200 cursor-default">My Company</span>
                </nav>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-black font-serif text-slate-900 dark:text-white tracking-tight leading-tight">
                            {societe.raisonSocial}
                        </h1>
                        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-sm">
                            <span className="flex items-center gap-1.5 font-mono text-xs font-bold bg-slate-100 dark:bg-[#222222] px-1.5 py-0.5 rounded">
                                Societe ID: {societe.id}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* <button
              onClick={() => navigate(`/societes/${societe.id}/edit`)}
              className="flex items-center w-fit gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:opacity-90"
              style={{ backgroundColor: BRAND_COLOR }}
            >
              <Edit className="h-4 w-4" />
              Edit Company
            </button> */}
                    </div>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-4 grid grid-cols-12 gap-8">
                {/* LEFT COLUMN: IDENTITY & CONTACT */}
                <div className="col-span-12 lg:col-span-8 space-y-6">
                    <Card title="Company Identity">
                        <Info label="Corporate Name" value={societe.raisonSocial} isBold icon={<Building className="w-4 h-4" />} />
                        <Info label="Official Email" value={societe.email} icon={<Mail className="w-4 h-4" />} />
                        <Info label="Website" value={societe.siteWeb} icon={<Globe className="w-4 h-4" />} color="text-blue-500" />
                        <div className="pt-4 mt-2 border-t border-slate-100 dark:border-[#2e2e2e]">
                            {/* <Info label="Primary Phone" value={societe.tel} icon={<Phone className="w-4 h-4" />} /> */}
                            <Info label="Mobile Phone" value={societe.phone} icon={<Smartphone className="w-4 h-4" />} />
                        </div>
                    </Card>

                    <Card title="Legal & Tax Information">
                        <Info label="ICE (Identifiant Commun)" value={societe.ice} isCode icon={<Landmark className="w-4 h-4" />} />
                        <Info label="RC (Registre de Commerce)" value={societe.rc} isCode icon={<Hash className="w-4 h-4" />} />
                        <Info label="IF (Identifiant Fiscal)" value={societe.if} isCode icon={<Hash className="w-4 h-4" />} />
                        <Info label="TP (Taxe Professionnelle)" value={societe.tp} isCode icon={<Hash className="w-4 h-4" />} />
                    </Card>
                </div>

                {/* RIGHT COLUMN: LOGO & STRUCTURE */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                    {/* UPDATED LOGO CARD */}
                    <Card title="Company Logo">
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
                                        No Logo
                                    </span>
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card title="Headquarters Location">
                        <div className="flex gap-3 mb-2">
                            <MapPin className="w-5 h-5 text-slate-400 shrink-0 mt-1" />
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                                {societe.address || "No address provided"}
                            </p>
                        </div>
                    </Card>

                    <Card title="Logistics Summary">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500 font-medium">Active Depots</span>
                                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg text-xs font-bold">
                                    {societe.depots?.length || 0}
                                </span>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-2">
                                {societe.depots?.map((depot) => {
                                    const isActive = depot.active; // Check the active status from your JSON

                                    return (
                                        <span
                                            key={depot.id}
                                            className={`px-3 py-1 rounded-full text-[11px] font-bold border uppercase tracking-tight transition-colors ${isActive
                                                ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400"
                                                : "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-400"
                                                }`}
                                        >
                                            {depot.city} - {depot.code} {!isActive && "(Inactive)"}
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

const Info = ({ label, value, color = "text-slate-900 dark:text-slate-100", isCode = false, isBold = false, icon = null }) => (
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