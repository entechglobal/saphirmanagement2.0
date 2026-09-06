import { useNavigate, useParams, Link } from "react-router-dom";
import {
    ArrowLeft,
    Edit,
    Globe,
    Mail,
    Phone,
    MapPin,
    Landmark,
    Calendar,
    Clock,
    User,
    Building2,
    CreditCard,
    Truck,
    ChevronLeft
} from "lucide-react";
import { useAuth } from "../../auth/hooks/useAuth";
import { useFournisseur } from "../hooks/useSuppliers";
import { FormPageHeader } from "../../../shared/components/FormPageHeader";
import { SectionLoader } from "../../../shared/components/loadersCollections/SectionLoader";
import { NotFound } from "../../../shared/components/NotFound";


const BRAND_COLOR = "#B12B89";

export const SuppliersView = () => {

    const { user, isAuthenticated, } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: fournisseurResponse, isLoading, isError } =
        useFournisseur(id);

    const fournisseur = fournisseurResponse?.data;

    if (isLoading) {
        return (
          <SectionLoader />
        );
    }

         if (!fournisseur || isError) {
             return (
                 <NotFound
                   
                     onAction={() => navigate("/fournisseurs")}
                 />
             );
         } 

    return (
        <div className="min-h-screen pb-24 font-sans antialiased text-slate-900 dark:text-slate-100">
            {/* HEADER */}
       

             <FormPageHeader
                    entityName="Fournisseurs"
                    backPath="/clients"
                    isView={true}
              
                    data={fournisseur}
            
                    viewTitle= "View Fournisseur"
                    viewTitleMain="Details Fournisseur"
                    backLabel="Back to List"
                  />
            

            <div className="max-w-6xl mx-auto px-4 grid grid-cols-12 gap-8">
                {/* LEFT */}
                <div className="col-span-12 lg:col-span-8 space-y-6">
                    <Card title="Identification Details">
                        <Info
                            label="Company / Full Name"
                            value={fournisseur.name}
                            isBold
                            icon={<Building2 className="w-4 h-4" />}
                        />
                        <Info label="Type" value={fournisseur.type} color="text-[#B12B89]" />
                        <Info
                            label="Email"
                            value={fournisseur.email}
                            icon={<Mail className="w-4 h-4" />}
                        />
                        <Info
                            label="Phone"
                            value={fournisseur.phone}
                            icon={<Phone className="w-4 h-4" />}
                        />

                        <div className="pt-4 mt-2 border-t border-slate-100 dark:border-[#2e2e2e]">
                            <Info
                                label="Address"
                                value={fournisseur.address}
                                icon={<MapPin className="w-4 h-4" />}
                            />
                            <Info label="Region / City" value={fournisseur.region} />
                            <Info
                                label="Website"
                                value={fournisseur.website}
                                icon={<Globe className="w-4 h-4" />}
                                color="text-[#B12B89]"
                            />
                        </div>
                    </Card>

                    {fournisseur.type === "SOCIETE" && (
                        <Card title="Legal & Fiscal Information">
                            <Info
                                label="ICE"
                                value={fournisseur.ice}
                                isCode
                                icon={<Landmark className="w-4 h-4" />}
                            />
                            <Info label="IF" value={fournisseur.if} isCode />
                            <Info label="RC" value={fournisseur.rc} isCode />
                            <Info label="TP" value={fournisseur.tp} isCode />
                        </Card>
                    )}
                </div>

                {/* RIGHT */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                    <Card title="Payment & Banking">
                        <Info
                            label="Payment Deadline"
                            value={fournisseur.paymentDeadline}
                            suffix="Days"
                            isNumber
                        />
                        <Info
                            label="Bank"
                            value={fournisseur.bankName}
                            icon={<Landmark className="w-4 h-4" />}
                        />
                        <Info
                            label="Bank Account"
                            value={fournisseur.bankAccount}
                            isCode
                            icon={<CreditCard className="w-4 h-4" />}
                        />
                    </Card>


                    {user.isSuperAdmin && (<Card title="Société Rattachement">
                        <div className="flex items-center gap-4 mb-4 p-3 bg-slate-50 dark:bg-[#222222]/50 rounded-2xl border border-slate-100 dark:border-[#2e2e2e]">
                            {/* Visual Icon Box */}
                            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <Landmark className="w-6 h-6 text-[#B12B89]" />
                            </div>

                            <div className="overflow-hidden">
                                <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">
                                    Structure Affiliée
                                </p>
                                <h4 className="text-base font-bold text-slate-900 dark:text-white truncate">
                                    {fournisseur.societe.raisonSocial}
                                </h4>
                            </div>
                        </div>

                        <div className="space-y-3 px-1">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500 font-medium">Référence Interne</span>
                                <span className="font-mono bg-white dark:bg-[#111111] border border-slate-200 dark:border-[#2e2e2e] px-2 py-1 rounded-md text-slate-600 dark:text-slate-400">
                                    ID-{fournisseur.societe.id.toString().padStart(4, '0')}
                                </span>
                            </div>

                            {/* Optional: Add a "Quick Link" if you have a Societe view page */}
                            <button
                                onClick={() => navigate(`/societes/${fournisseur.societe.id}`)}
                                className="w-full mt-2 py-2 text-xs font-bold text-[#B12B89] hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors border border-transparent hover:border-blue-100 dark:hover:border-blue-800"
                            >
                                Voir la fiche société
                            </button>
                        </div>
                    </Card>
                    )}
                    <Card title="Operational Status">
                        <StatusBadge
                            label="Account Status"
                            value={fournisseur.active}
                            yes="Active Fournisseur"
                            no="Inactive"
                        />
                    </Card>

                    <Card title="System Metadata">
                        <div className="space-y-4">
                            <Meta
                                icon={<Calendar className="w-4 h-4" />}
                                label="Created On"
                                value={new Date(
                                    fournisseur.createdAt
                                ).toLocaleString()}
                            />
                            <Meta
                                icon={<Clock className="w-4 h-4" />}
                                label="Last Updated"
                                value={new Date(
                                    fournisseur.updatedAt
                                ).toLocaleString()}
                            />
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

const Info = ({
    label,
    value,
    suffix = "",
    color = "text-slate-900 dark:text-slate-100",
    isCode = false,
    isBold = false,
    isNumber = false,
    icon = null
}) => (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-[#2e2e2e]/50 last:border-0">
        <div className="flex items-center gap-2">
            {icon && <span className="text-slate-400">{icon}</span>}
            <span className="text-sm text-slate-500">{label}</span>
        </div>
        <span
            className={`text-sm ${color} 
          ${isCode ? "font-mono bg-slate-100 dark:bg-[#222222] px-1.5 py-0.5 rounded text-xs" : ""} 
          ${isBold ? "font-bold" : "font-semibold"}
          ${isNumber ? "font-mono" : ""}
        `}
        >
            {value ?? "—"} {value && suffix}
        </span>
    </div>
);

const StatusBadge = ({ label, value, yes, no }) => (
    <div className="flex items-center justify-between py-2">
        <span className="text-sm text-slate-500">{label}</span>
        <span
            className={`px-3 py-1 rounded-full text-[11px] font-bold border uppercase tracking-tight ${value
                ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400"
                : "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-400"
                }`}
        >
            {value ? yes : no}
        </span>
    </div>
);

const Meta = ({ icon, label, value }) => (
    <div className="flex items-start gap-3">
        <span className="text-slate-400 mt-1">{icon}</span>
        <div>
            <p className="text-[10px] uppercase text-slate-400 font-bold">
                {label}
            </p>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {value}
            </p>
        </div>
    </div>
);
