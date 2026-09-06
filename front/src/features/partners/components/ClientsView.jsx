import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Edit, Globe, Mail, Phone, MapPin, Landmark, Calendar, Clock, User, Handshake, ChevronLeft } from "lucide-react";
import { useClient } from "../hooks/useClients";
import { useAuth } from "../../auth/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { FormPageHeader } from "../../../shared/components/FormPageHeader";
import { SectionLoader } from "../../../shared/components/loadersCollections/SectionLoader";
import { NotFound } from "../../../shared/components/NotFound";

const BRAND_COLOR = "#B12B89";

export const ClientsView = () => {

  const { t } = useTranslation("clients");

  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: clientResponse, isLoading, isError } = useClient(id);

  const client = clientResponse?.data;

  if (isLoading) {
    return (
      <SectionLoader />
    );
  }

  if (!client || isError) {
    return (
      <NotFound
        onAction={() => navigate("/clients")}
      />
    );
  }

  return (
    <div className="min-h-screen pb-24 font-sans antialiased text-slate-900 dark:text-slate-100">


      <FormPageHeader
        entityName={t("breadcrumb.list")}
        backPath="/clients"
        isView={true}

        data={client}

        viewTitle={t("breadcrumb.details")}
        viewTitleMain={t("breadcrumb.details")}
        backLabel={t("header.back")}
      />


      <div className="max-w-6xl mx-auto px-4 grid grid-cols-12 gap-8">
        {/* LEFT COLUMN */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <Card title={t("sections.identification")}>
            <Info label={t("fields.name.label")} value={client.name} isBold icon={<User className="w-4 h-4" />} />
            <Info label={t("fields.type.label")} value={t(`types.${client.type.toLowerCase()}`)} color="text-[#B12B89]" />
            <Info label={t("fields.email.label")} value={client.email} icon={<Mail className="w-4 h-4" />} />
            <Info label={t("fields.phone.label")} value={client.phone} icon={<Phone className="w-4 h-4" />} />

            <div className="pt-4 mt-2 border-t border-slate-100 dark:border-[#2e2e2e]">
              <Info label={t("fields.address.label")} value={client.address} icon={<MapPin className="w-4 h-4" />} />
              <Info label={t("fields.city.label")} value={client.city} icon={<MapPin className="w-4 h-4" />} />
              <Info label={t("fields.region.label")} value={client.region} />
              <Info label={t("fields.website.label")} value={client.website} icon={<Globe className="w-4 h-4" />} color="text-blue-500" />
            </div>
          </Card>

          {client.type === "SOCIETE" && (
            <Card title={t("sections.fiscal")}>
              <Info label={t("fields.ice.label")} value={client.ice} isCode icon={<Landmark className="w-4 h-4" />} />
              <Info label={t("fields.if.label")} value={client.if} isCode />
              <Info label={t("fields.rc.label")} value={client.rc} isCode />
              <Info label={t("fields.tp.label")} value={client.tp} isCode />
            </Card>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <Card title={t("sections.financial")}>
            <Info label={t("fields.creditLimit.label")} value={client.creditLimit} suffix="DH" isNumber isBold color="text-slate-900 dark:text-white" />
            <Info label={t("fields.paymentDeadline.label")} value={client.paymentDeadline} suffix={t("fields.days")} isNumber />
            <Info label={t("fields.discount.label")} value={client.discount ? `${client.discount}%` : "0%"} color="text-emerald-600" isBold />
          </Card>

          {user.isSuperAdmin && client.societe && (
            <Card title={t("sections.affiliation")}>
              <div className="flex items-center gap-4 mb-4 p-3 bg-slate-50 dark:bg-[#222222]/50 rounded-2xl border border-slate-100 dark:border-[#2e2e2e]">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Landmark className="w-6 h-6 text-[#B12B89]" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">{t("fields.structure")}</p>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white truncate">{client.societe.raisonSocial}</h4>
                </div>
              </div>
              <div className="space-y-3 px-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">{t("fields.reference")}</span>
                  <span className="font-mono bg-white dark:bg-[#111111] border border-slate-200 dark:border-[#2e2e2e] px-2 py-1 rounded-md text-slate-600 dark:text-slate-400">
                    ID-{client.societe.id.toString().padStart(4, '0')}
                  </span>
                </div>
                <button
                  onClick={() => navigate(`/societes/${client.societe.id}`)}
                  className="w-full mt-2 py-2 text-xs font-bold text-[#B12B89] hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors border border-transparent hover:border-blue-100 dark:hover:border-blue-800"
                >
                  {t("fields.view_societe")}
                </button>
              </div>
            </Card>
          )}

          <Card title={t("sections.operational")}>
            <StatusBadge
              label={t("fields.account_status")}
              value={client.active}
              yes={t("status.active")}
              no={t("status.inactive")}
            />
          </Card>

          <Card title={t("sections.system")}>
            <div className="space-y-4">
              <MetadataInfo icon={<Calendar className="w-4 h-4" />} label={t("fields.created_at")} value={client.createdAt} />
              <MetadataInfo icon={<Clock className="w-4 h-4" />} label={t("fields.updated_at")} value={client.updatedAt} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

/* ---------- SUB-COMPONENTS ---------- */

const Card = ({ title, children }) => (
  <div className="bg-white dark:bg-[#1c1c1c] rounded-3xl border border-slate-200 dark:border-[#2e2e2e] shadow-sm overflow-hidden">
    <div className="px-6 py-4 border-b border-slate-50 dark:border-[#2e2e2e] bg-slate-50/50 dark:bg-[#222222]/30">
      <h3 className="font-bold text-[11px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">{title}</h3>
    </div>
    <div className="p-6 space-y-3">{children}</div>
  </div>
);

const Info = ({ label, value, suffix = "", color = "text-slate-900 dark:text-slate-100", isCode = false, isBold = false, isNumber = false, icon = null }) => (
  <div className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-[#2e2e2e]/50 last:border-0">
    <div className="flex items-center gap-2">
      {icon && <span className="text-slate-400">{icon}</span>}
      <span className="text-sm text-slate-500">{label}</span>
    </div>
    <span className={`text-sm ${color} ${isCode ? "font-mono bg-slate-100 dark:bg-[#222222] px-1.5 py-0.5 rounded text-xs" : ""} ${isBold ? "font-bold" : "font-semibold"} ${isNumber ? "font-mono" : ""}`}>
      {value ?? "—"} {value && suffix}
    </span>
  </div>
);

const MetadataInfo = ({ icon, label, value }) => (
  <div className="flex items-start gap-3">
    <div className="text-slate-400 mt-1">{icon}</div>
    <div>
      <p className="text-[10px] uppercase text-slate-400 font-bold">{label}</p>
      <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
        {new Date(value).toLocaleString()}
      </p>
    </div>
  </div>
);

const StatusBadge = ({ label, value, yes, no }) => (
  <div className="flex items-center justify-between py-2">
    <span className="text-sm text-slate-500">{label}</span>
    <span className={`px-3 py-1 rounded-full text-[11px] font-bold border uppercase tracking-tight ${value
      ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400"
      : "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-400"
      }`}>
      {value ? yes : no}
    </span>
  </div>
);