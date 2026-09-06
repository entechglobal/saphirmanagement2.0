import { useState, useMemo, useCallback, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Home,
  Store,
  FolderTree,
  Layers,
  Tag,
  PackagePlus,
  Users,
  Building2,
  Building,
  Archive,
  Truck,
  Briefcase,
  Landmark,
  Warehouse,
  ClipboardList,
  ArrowLeftRight,
  History,
  TrendingUp,
  FileText,
  Receipt,
  Undo2,
  CreditCard,
  BarChart3,
  Package,
  Wallet,
  Globe2,
  LayoutGrid,
  MapPin,
  ShoppingBag,
  Search,
  CalendarDays,
  Clock,
  ShieldCheck,
  Settings,
  Fingerprint,
  ChevronRight,
} from "lucide-react";

import { useAuth } from "@/features/auth";
import { PERMISSIONS, hasAnyPermission } from "@/shared/utils/permissions";
import { useTranslation } from "react-i18next";
import { SidebarSkeleton } from "@/shared/components/skeletons/SidebarSkeleton";
import { MobileBottomBar } from "./MobileBottomBar";
import { MobileNavSheet } from "./MobileNavSheet";

const RAIL_WIDTH = 60;
const FULL_WIDTH = 236;

const submenuVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: {
    opacity: 1,
    height: "auto",
    transition: { type: "spring", stiffness: 420, damping: 34, mass: 0.8 },
  },
  exit: { opacity: 0, height: 0, transition: { duration: 0.15, ease: "easeInOut" } },
};

const Tooltip = ({ label, children, enabled }) => {
  if (!enabled) return children;
  return (
    <div className="group/tip relative">
      {children}
      <div className="pointer-events-none absolute start-full top-1/2 z-[999] ms-2 -translate-y-1/2 scale-95 opacity-0 transition-all duration-150 group-hover/tip:scale-100 group-hover/tip:opacity-100">
        <div className="whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg dark:bg-[#2e2e2e]">
          {label}
        </div>
      </div>
    </div>
  );
};

export const Sidebar = ({ isOpen, isCollapsed = false, isDesktop = true, onClose, onOpen }) => {
  const location = useLocation();
  const { t, i18n } = useTranslation("sidebar");
  const isRTL = (i18n.dir?.() ?? "ltr") === "rtl";
  const shouldReduce = useReducedMotion();
  const { user, isLoading } = useAuth();

  const [openGroup, setOpenGroup] = useState(null);
  const [isHovered, setIsHovered] = useState(false);

  const showSkeleton = isLoading;
  const narrow = isDesktop && isCollapsed && !isHovered;

  const closeMobileMenu = useCallback(() => {
    onClose?.();
  }, [onClose]);

  const toggleMobileMenu = useCallback(() => {
    if (isOpen) onClose?.();
    else onOpen?.();
  }, [isOpen, onClose, onOpen]);

  const isActivePath = useCallback(
    (path) => {
      if (!path) return false;
      if (path === "/") {
        return (
          location.pathname === "/" ||
          location.pathname === "/dashboard" ||
          location.pathname.startsWith("/saphir-management-dashboard")
        );
      }
      const normalized = path.endsWith("/") ? path : `${path}/`;
      return location.pathname === path || location.pathname.startsWith(normalized);
    },
    [location.pathname]
  );

  const navSections = useMemo(
    () => [
      {
        key: "overview",
        items: [{ key: "dashboard", label: t("dashboard"), path: "/dashboard", icon: Home }],
      },
      {
        key: "catalogue",
        label: t("sections.catalogue", "Catalogue"),
        icon: Tag,
        items: [
          { key: "articles", label: t("structure.children.articles"), path: "/articles", icon: Tag, permission: PERMISSIONS.VIEW_ARTICLE },
          { key: "categories", label: t("structure.children.categories"), path: "/categories", icon: FolderTree, permission: PERMISSIONS.VIEW_ARTICLE },
          { key: "families", label: t("structure.children.families"), path: "/families", icon: Layers, permission: PERMISSIONS.VIEW_ARTICLE },
          { key: "packs", label: t("structure.children.packs"), path: "/packs", icon: PackagePlus, permission: PERMISSIONS.VIEW_PACK },
        ],
      },
      {
        key: "sales",
        label: t("sections.sales", "Ventes"),
        icon: TrendingUp,
        items: [
          { key: "bon-livraison", label: t("ventesManagement.bonLivraison"), path: "/bon-livraisons", icon: Receipt, permission: PERMISSIONS.VIEW_BON_LIVRAISON },
          { key: "bon-retour", label: t("ventesManagement.bonRetour"), path: "/bon-retour-clients", icon: Undo2, permission: PERMISSIONS.VIEW_BON_RETOUR_CLIENT },
          { key: "reglements-client", label: t("ventesManagement.reglementClient"), path: "/reglements-client", icon: CreditCard, permission: [PERMISSIONS.CREATE_REGLEMENTS, PERMISSIONS.DELETE_REGLEMENTS] },
          { key: "bons-commande-ventes", label: t("ventesManagement.bonsCommande"), path: "/bons-commande", icon: ClipboardList, permission: PERMISSIONS.VIEW_COMMANDE },
          { key: "devis", label: t("ventesManagement.devis"), path: "/devis", icon: FileText, permission: PERMISSIONS.VIEW_DEVIS },
          { key: "situation-client", label: t("ventesManagement.situationClient"), path: "/situation-client", icon: BarChart3, permission: PERMISSIONS.VIEW_BON_LIVRAISON },
          { key: "facture-ventes", label: t("ventesManagement.facture"), path: "/factures", icon: Receipt, permission: PERMISSIONS.VIEW_FACTURE },
        ],
      },
      {
        key: "purchases",
        label: t("sections.purchases", "Achats"),
        icon: Package,
        items: [
          { key: "bon-reception", label: t("achatsManagement.bonReception"), path: "/bon-receptions", icon: Package, permission: PERMISSIONS.VIEW_BON_RECEPTION },
          { key: "reglements-fournisseur", label: t("achatsManagement.reglementFournisseur"), path: "/reglements-fournisseur", icon: CreditCard, permission: [PERMISSIONS.CREATE_REGLEMENTS_FOURNISSEUR, PERMISSIONS.DELETE_REGLEMENTS_FOURNISSEUR] },
          { key: "bc-fournisseur", label: t("achatsManagement.bonCommande"), path: "/bons-commande-fournisseur", icon: ClipboardList, permission: PERMISSIONS.VIEW_COMMANDE_FOURNISSEUR },
          { key: "bon-retour-fournisseur", label: t("achatsManagement.bonRetourFournisseur"), path: "/bon-retour-fournisseurs", icon: Undo2, permission: PERMISSIONS.VIEW_BON_RETOUR_FOURNISSEUR },
          { key: "situation-fournisseur", label: t("achatsManagement.situationFournisseur"), path: "/situation-fournisseur", icon: BarChart3, permission: PERMISSIONS.VIEW_BON_RECEPTION },
        ],
      },
      {
        key: "stock",
        label: t("sections.stock", "Stock"),
        icon: Warehouse,
        items: [
          { key: "stock", label: t("stockManagement.situationStock"), path: "/stock", icon: Warehouse, permission: PERMISSIONS.MANAGE_STOCK },
          { key: "inventaires", label: t("inventaires"), path: "/inventaires", icon: ClipboardList, permission: PERMISSIONS.CREATE_INVENTORY },
          { key: "mouvements-stock", label: t("stockManagement.mouvements"), path: "/transactions", icon: History, permission: PERMISSIONS.VIEW_STOCK_MOVEMENTS },
          { key: "transferts", label: t("stockManagement.transfer"), path: "/transferts", icon: ArrowLeftRight, permission: [PERMISSIONS.CREATE_TRANSFER, PERMISSIONS.VALIDATE_TRANSFER, PERMISSIONS.DELETE_TRANSFER] },
        ],
      },
      {
        key: "cash",
        label: t("sections.cash", "Caisse"),
        icon: Wallet,
        items: [
          { key: "caisses", label: t("caisseManagement.caisses", "Etat Wallet"), path: "/caisse", icon: Wallet, permission: PERMISSIONS.VIEW_CAISSE },
          { key: "caisse-users", label: t("caisseManagement.caisseUsers", "Wallets Utilisateurs"), path: "/caisse-users", icon: Users, permission: PERMISSIONS.VIEW_CAISSE, adminOnly: true },
        ],
      },
      {
        key: "partners",
        label: t("sections.partners", "Partenaires"),
        icon: Users,
        items: [
          { key: "clients", label: t("structure.children.clients"), path: "/clients", icon: Users, permission: [PERMISSIONS.CREATE_CLIENTS, PERMISSIONS.UPDATE_CLIENTS, PERMISSIONS.DELETE_CLIENTS, PERMISSIONS.IMPORT_CLIENTS] },
          { key: "suppliers", label: t("structure.children.suppliers"), path: "/fournisseurs", icon: Store, permission: [PERMISSIONS.CREATE_FOURNISSEURS, PERMISSIONS.UPDATE_FOURNISSEURS, PERMISSIONS.DELETE_FOURNISSEURS, PERMISSIONS.IMPORT_FOURNISSEURS] },
          { key: "deliveries", label: t("structure.children.deliveries"), path: "/deliveries", icon: Truck, permission: [PERMISSIONS.CREATE_DELIVERIES, PERMISSIONS.UPDATE_DELIVERIES, PERMISSIONS.DELETE_DELIVERIES] },
          { key: "delivery-provider-configs", label: t("structure.children.deliveryProviderConfigs"), path: "/delivery-provider-configs", icon: Briefcase },
          { key: "banques", label: t("structure.children.banques"), path: "/banque", icon: Landmark, permission: [PERMISSIONS.CREATE_BANQUES, PERMISSIONS.UPDATE_BANQUES, PERMISSIONS.DELETE_BANQUES] },
        ],
      },
      {
        key: "saphir",
        label: t("saphirManagement.label"),
        icon: Globe2,
        items: [
          { key: "saphir-dashboard", label: t("saphirManagement.dashboard"), path: "/saphir-management-dashboard", icon: LayoutGrid, permission: [PERMISSIONS.VIEW_ADVANCED_BL, PERMISSIONS.VIEW_AGENCE, PERMISSIONS.VIEW_PACK] },
          { key: "commandes", label: t("saphirManagement.commandes"), path: "/commandes", icon: ShoppingBag, permission: PERMISSIONS.VIEW_ADVANCED_BL },
          { key: "statistiques-commerciaux", label: t("saphirManagement.commercialStats"), path: "/statistiques-commerciaux", icon: BarChart3, permission: PERMISSIONS.VIEW_ADVANCED_BL },
          { key: "colis-tracking", label: t("saphirManagement.colisTracking"), path: "/colis-tracking", icon: Search, permission: PERMISSIONS.VIEW_ADVANCED_BL },
          { key: "planning-livraison", label: t("saphirManagement.planningLivraison"), path: "/planning-livraison", icon: CalendarDays, permission: PERMISSIONS.VIEW_ADVANCED_BL },
          { key: "delivery-shifts", label: t("saphirManagement.deliveryShifts"), path: "/delivery-shifts", icon: Clock, permission: [PERMISSIONS.VIEW_DELIVERY_SHIFTS, PERMISSIONS.MANAGE_DELIVERY_SHIFTS] },
        ],
      },
      {
        key: "admin",
        label: t("sections.admin", "Administration"),
        icon: ShieldCheck,
        items: [
          { key: "users", label: t("users"), path: "/users", icon: Users, permission: [PERMISSIONS.MANAGE_USERS, PERMISSIONS.CREATE_USER] },
          { key: "attendance", label: t("attendance"), path: "/attendance", icon: Fingerprint, permission: [PERMISSIONS.VIEW_ATTENDANCE, PERMISSIONS.MANAGE_ATTENDANCE] },
          { key: "repositories", label: t("depots"), path: "/depots", icon: Archive },
          { key: "agences", label: t("saphirManagement.agences"), path: "/agences", icon: MapPin, permission: PERMISSIONS.VIEW_AGENCE },
          { key: "societes", label: t("companies"), path: "/societes", icon: Building2, superAdminOnly: true },
          { key: "societe-me", label: t("myCompany"), path: "/societes/me", icon: Building, hideForSuperAdmin: true },
          { key: "settings", label: t("settings"), path: "/settings", icon: Settings, hiddenForRoles: ["Preparateur", "Commercial", "Livreur"], permission: [PERMISSIONS.MANAGE_SETTINGS] },
        ],
      },
    ],
    [t]
  );

  const isItemVisible = useCallback(
    (item) => {
      if (item.permission) {
        const perms = Array.isArray(item.permission) ? item.permission : [item.permission];
        if (!hasAnyPermission(user, perms)) return false;
      }
      if (item.superAdminOnly && !user?.isSuperAdmin) return false;
      if (item.hideForSuperAdmin && user?.isSuperAdmin) return false;
      if (item.adminOnly) {
        const roleName = user?.roleName ?? user?.role ?? "";
        if (!user?.isSuperAdmin && roleName !== "Societe_Admin") return false;
      }
      if (item.hiddenForRoles) {
        const roleName = user?.roleName ?? user?.role ?? "";
        if (item.hiddenForRoles.includes(roleName)) return false;
      }
      return true;
    },
    [user]
  );

  const sections = useMemo(
    () =>
      navSections
        .map((section) => ({ ...section, items: section.items.filter(isItemVisible) }))
        .filter((section) => section.items.some((item) => item.path)),
    [navSections, isItemVisible]
  );

  useEffect(() => {
    const active = sections.find((section) => section.items.some((item) => isActivePath(item.path)));
    if (active?.label) setOpenGroup(active.key);
  }, [location.pathname, sections, isActivePath]);

  const handleNavClick = () => {
    if (!isDesktop) onClose?.();
  };

  const toggleGroup = (key) => setOpenGroup((prev) => (prev === key ? null : key));

  const renderLink = (item, { child = false } = {}) => {
    const Icon = item.icon;

    if (item.comingSoon) {
      return (
        <div
          key={item.key}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-gray-400/80 dark:text-gray-600"
        >
          <Icon size={child ? 15 : 17} strokeWidth={1.75} className="flex-shrink-0" />
          <span className="truncate">{item.label}</span>
          <span className="ms-auto rounded bg-amber-50 px-1 text-[9px] font-bold uppercase text-amber-600 dark:bg-amber-950/40 dark:text-amber-500">
            {t("comingSoon", "Bientôt")}
          </span>
        </div>
      );
    }

    const active = isActivePath(item.path);

    return (
      <Tooltip key={item.key} label={item.label} enabled={narrow}>
        <Link
          to={item.path}
          onClick={handleNavClick}
          className={`
            flex items-center rounded-md transition-colors duration-150
            ${narrow ? "justify-center px-0 py-1.5" : "gap-2 px-2 py-1.5"}
            ${
              active
                ? "bg-white font-semibold text-[#B12B89] shadow-sm ring-1 ring-black/[0.04] dark:bg-[#222222] dark:ring-white/10"
                : "text-gray-700 hover:bg-[#EAEAEB] dark:text-gray-300 dark:hover:bg-[#222222]/70"
            }
          `}
        >
          <Icon size={child ? 15 : 17} strokeWidth={1.75} className="flex-shrink-0" />
          {!narrow && <span className="truncate text-[13px]">{item.label}</span>}
        </Link>
      </Tooltip>
    );
  };

  const renderSection = (section) => {
    if (!section.label) {
      return (
        <div key={section.key} className="space-y-0.5">
          {section.items.map((item) => renderLink(item))}
        </div>
      );
    }

    const GroupIcon = section.icon;
    const hasActiveChild = section.items.some((item) => isActivePath(item.path));

    if (narrow) {
      const firstItem = section.items.find((item) => item.path);
      return (
        <Tooltip key={section.key} label={section.label} enabled>
          <Link
            to={firstItem.path}
            className={`flex items-center justify-center rounded-md py-1.5 transition-colors duration-150 ${
              hasActiveChild
                ? "bg-white text-[#B12B89] shadow-sm ring-1 ring-black/[0.04] dark:bg-[#222222] dark:ring-white/10"
                : "text-gray-700 hover:bg-[#EAEAEB] dark:text-gray-300 dark:hover:bg-[#222222]/70"
            }`}
          >
            <GroupIcon size={17} strokeWidth={1.75} />
          </Link>
        </Tooltip>
      );
    }

    const isGroupOpen = openGroup === section.key;

    return (
      <div key={section.key}>
        <button
          type="button"
          onClick={() => toggleGroup(section.key)}
          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 transition-colors duration-150 ${
            hasActiveChild
              ? "text-gray-900 dark:text-white"
              : "text-gray-700 hover:bg-[#EAEAEB] dark:text-gray-300 dark:hover:bg-[#222222]/70"
          }`}
        >
          <GroupIcon size={17} strokeWidth={1.75} className="flex-shrink-0" />
          <span className="flex-1 truncate text-start text-[13px] font-medium">{section.label}</span>
          <ChevronRight
            size={14}
            strokeWidth={2}
            className={`flex-shrink-0 text-gray-400 transition-transform duration-200 ${
              isGroupOpen ? "rotate-90" : isRTL ? "rotate-180" : ""
            }`}
          />
        </button>

        <AnimatePresence initial={false}>
          {isGroupOpen && (
            <motion.div
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={shouldReduce ? {} : submenuVariants}
              className="overflow-hidden"
            >
              <div className="ms-3.5 space-y-0.5 border-s border-[#DEDEDE] ps-2 pt-0.5 dark:border-[#2e2e2e]/70">
                {section.items.map((item) => renderLink(item, { child: true }))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  if (!isDesktop) {
    return (
      <>
        <MobileBottomBar
          user={user}
          menuOpen={isOpen}
          onOpenMenu={toggleMobileMenu}
          onCloseMenu={closeMobileMenu}
        />
        <MobileNavSheet
          open={isOpen}
          onClose={closeMobileMenu}
          sections={sections}
          isActivePath={isActivePath}
        />
      </>
    );
  }

  const panelWidth = narrow ? RAIL_WIDTH : FULL_WIDTH;

  return (
    <motion.aside
      initial={false}
      onMouseEnter={() => isCollapsed && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      animate={{ width: panelWidth }}
      transition={{ type: "spring", stiffness: 420, damping: 38, mass: 0.8 }}
      className="relative flex h-full flex-shrink-0 flex-col overflow-hidden border-e border-[#E3E3E3] bg-[#F6F6F7] dark:border-[#2e2e2e] dark:bg-[#161616]"
    >
      <nav
        className={`flex-1 space-y-2 overflow-y-auto overflow-x-hidden py-3 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-[#3a3a3a] ${
          narrow ? "px-1.5" : "px-2"
        }`}
      >
        {showSkeleton ? <SidebarSkeleton /> : sections.map(renderSection)}
      </nav>

      <div className="flex-shrink-0 border-t border-[#E3E3E3] px-2 py-2 dark:border-[#2e2e2e]">
        {narrow ? (
          <p className="text-center text-[10px] font-semibold text-gray-400">©</p>
        ) : (
          <p className="px-1 text-center text-[10px] font-medium leading-relaxed tracking-wide text-gray-400 dark:text-gray-500">
            {(() => {
              const start = 2025;
              const current = new Date().getFullYear();
              const range = current > start ? `${start}–${current}` : `${start}`;
              return `© ${range} SaphirCaisse — ${t("allRightsReserved")}`;
            })()}
          </p>
        )}
      </div>
    </motion.aside>
  );
};
