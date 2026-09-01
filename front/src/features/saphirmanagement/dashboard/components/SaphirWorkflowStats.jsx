import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ClipboardDocumentCheckIcon,
  ArchiveBoxArrowDownIcon,
  TruckIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/outline";
import { StatCard } from "@/features/dashboard";
import { useWorkflowCounts } from "../../commandes/hooks/useCommands";

const ADMIN_ROLES = new Set(["super_admin", "societe_admin", "commercial"]);
const PREPARATEUR_ROLES = new Set(["preparateur"]);
const LIVREUR_ROLES = new Set(["livreur"]);

const normalizeRole = (roleName) => String(roleName ?? "").trim().toLowerCase();

const CARD_TO_STATUS = {
  aPreparer: "CONFIRME",
  aCollecter: "PREPARE",
  enRoute: "COLLECTE",
  aLivrer: "EN_ROUTE",
  aPayer: "LIVRE",
};

const COLOR_MAPS = {
  aPreparer: "border-l-[#1F72FF] dark:border-l-[#3D8BFF]",
  aCollecter: "border-l-[#6B44FF] dark:border-l-[#8B6FFF]",
  enRoute: "border-l-[#FF3D8A] dark:border-l-[#FF5EA0]",
  aLivrer: "border-l-[#F5BC00] dark:border-l-[#FFCC00]",
  aPayer: "border-l-[#38C41A] dark:border-l-[#4ECC2A]",
};

export const SaphirWorkflowStats = ({ roleName }) => {
  const navigate = useNavigate();
  const { t } = useTranslation("dashboard");
  const { data, isLoading } = useWorkflowCounts();
  const counts = data?.data ?? {};
  const normalizedRole = normalizeRole(roleName);

  const isAdminRole = ADMIN_ROLES.has(normalizedRole);
  const isPreparateur = PREPARATEUR_ROLES.has(normalizedRole);
  const isLivreur = LIVREUR_ROLES.has(normalizedRole);

  const cards = [
    { key: "aPreparer", title: t("stat_confirme"), value: Number(counts.aPreparer ?? 0), icon: CheckBadgeIcon, iconColor: "#1F72FF" },
    { key: "aCollecter", title: t("stat_prepare"), value: Number(counts.aCollecter ?? 0), icon: ClipboardDocumentCheckIcon, iconColor: "#6B44FF" },
    { key: "enRoute", title: t("stat_collecte"), value: Number(counts.enRoute ?? 0), icon: ArchiveBoxArrowDownIcon, iconColor: "#FF3D8A" },
    { key: "aLivrer", title: t("stat_en_route"), value: Number(counts.aLivrer ?? 0), icon: TruckIcon, iconColor: "#F5BC00" },
    { key: "aPayer", title: t("stat_livre"), value: Number(counts.aPayer ?? 0), icon: MapPinIcon, iconColor: "#38C41A" },
  ];

  const visibleCards = isAdminRole
    ? cards
    : isPreparateur
      ? cards.filter((c) => c.key === "aPreparer")
      : isLivreur
        ? cards.filter((c) => ["aCollecter", "enRoute", "aLivrer", "aPayer"].includes(c.key))
        : [];

  const handleCardClick = (cardKey) => {
    const status = CARD_TO_STATUS[cardKey];
    if (status) navigate(`/saphir-management-dashboard/commandes-par-statut?status=${status}`);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-28 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {visibleCards.map(({ key, ...cardProps }) => (
        <div
          key={key}
          onClick={() => handleCardClick(key)}
          className={`
                group relative cursor-pointer overflow-hidden
                transition-all duration-200
                bg-white dark:bg-slate-800
                rounded-2xl border border-slate-200 dark:border-slate-700
                border-l-[6px] shadow-sm
                hover:shadow-lg hover:bg-slate-50 dark:hover:bg-slate-900/80
                hover:border-slate-300 dark:hover:border-slate-600
                hover:-translate-y-0.5
                active:scale-[0.97] active:translate-y-0
                ${COLOR_MAPS[key]}
              `}
        >
          <StatCard {...cardProps} />
        </div>
      ))}
    </div>
  );
};