import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BiUserCircle, BiLogOutCircle } from "react-icons/bi";
import { Maximize2, Minimize2, Search, Wallet } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  UserCircleIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

import { useAuth, useLogout } from "@/features/auth";
import { PERMISSIONS, hasAnyPermission } from "@/shared/utils/permissions";
import { useSocieteMe } from "../../../features/societes/hooks/useSociete";
import { useCurrentUser } from "../../../features/users/hooks/useUsers";
import { useMyCaisse } from "../../../features/caisse/hooks/useCaisse";
import { ConfirmationModal } from "../ConfirmationModal";
import { PreferencesModal } from "./PreferencesModal";
import { NotificationDropdown } from "../notification-dropdown";
import { Logo } from "../Logo";

import {
  LayoutDashboard,
  FileText,
  Warehouse,
  Settings,
  Users,
  ReceiptText,
  Layers,
  FolderTree,
  Handshake,
  ClipboardPen,
  ArrowLeftRight,
  Building2,
  Archive,
  ShoppingCart,
  MapPin,
  Building,
  CreditCard,
  PackagePlus,
  Package,
  Truck,
  History,
  Undo2,
  Landmark,
  SearchCheck,
  CalendarRange,
  LayoutGrid,
  Globe2,
  Briefcase,
} from "lucide-react";
import { BuildingStorefrontIcon } from "@heroicons/react/24/outline";

const Tooltip = ({ label, children }) => (
  <div className="relative group/tooltip">
    {children}
    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-[999] pointer-events-none opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 scale-90 group-hover/tooltip:scale-100 origin-top">
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-b-gray-900 dark:border-b-[#1c1c1c]" />
      <div className="bg-gray-900 dark:bg-[#1c1c1c] text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap ring-1 ring-white/10 dark:ring-[#2e2e2e]">
        {label}
      </div>
    </div>
  </div>
);

// ─── Command Palette ──────────────────────────────────────────────────────────

const SETTINGS_RESTRICTED_ROLES = ["Preparateur", "Commercial", "Livreur"];

const CommandPalette = ({ isOpen, onClose, isSuperAdmin, roleName, user }) => {
  const navigate = useNavigate();
  const shouldReduce = useReducedMotion();
  const { t: tSidebar } = useTranslation("sidebar");
  const { t: tHeader } = useTranslation("header");
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const paletteItems = useMemo(() => {
    const cat = (key) => tHeader(`palette.categories.${key}`);
    const canSee = (permission) => {
      if (!permission) return true;
      const perms = Array.isArray(permission) ? permission : [permission];
      return hasAnyPermission(user, perms);
    };

    const allItems = [
      // Navigation
      { label: tSidebar("dashboard"),                          path: "/dashboard",                    icon: LayoutDashboard,       category: cat("navigation") },
      // Catalogue
      { label: tSidebar("structure.children.articles"),        path: "/articles",                     icon: FileText,              category: cat("catalogue"),  permission: PERMISSIONS.VIEW_ARTICLE },
      { label: tSidebar("structure.children.categories"),      path: "/categories",                   icon: FolderTree,            category: cat("catalogue"),  permission: PERMISSIONS.VIEW_ARTICLE },
      { label: tSidebar("structure.children.families"),        path: "/families",                     icon: Layers,                category: cat("catalogue"),  permission: PERMISSIONS.VIEW_ARTICLE },
      { label: tSidebar("structure.children.packs"),           path: "/packs",                        icon: PackagePlus,           category: cat("catalogue"),  permission: PERMISSIONS.VIEW_PACK },
      // Contacts
      { label: tSidebar("structure.children.clients"),         path: "/clients",                      icon: Handshake,             category: cat("contacts"),   permission: [PERMISSIONS.CREATE_CLIENTS, PERMISSIONS.UPDATE_CLIENTS, PERMISSIONS.DELETE_CLIENTS, PERMISSIONS.IMPORT_CLIENTS] },
      { label: tSidebar("structure.children.suppliers"),       path: "/fournisseurs",                 icon: BuildingStorefrontIcon,category: cat("contacts"),   permission: [PERMISSIONS.CREATE_FOURNISSEURS, PERMISSIONS.UPDATE_FOURNISSEURS, PERMISSIONS.DELETE_FOURNISSEURS, PERMISSIONS.IMPORT_FOURNISSEURS] },
      { label: tSidebar("structure.children.deliveries"),      path: "/deliveries",                   icon: Truck,                 category: cat("contacts"),   permission: [PERMISSIONS.CREATE_DELIVERIES, PERMISSIONS.UPDATE_DELIVERIES, PERMISSIONS.DELETE_DELIVERIES] },
      { label: tSidebar("structure.children.deliveryProviderConfigs"), path: "/delivery-provider-configs", icon: Briefcase,        category: cat("contacts") },
      // Stock
      { label: tSidebar("stock"),                              path: "/stock",                        icon: Warehouse,             category: cat("stock"),      permission: PERMISSIONS.MANAGE_STOCK },
      { label: tSidebar("inventaires"),                        path: "/inventaires",                  icon: ClipboardPen,          category: cat("stock"),      permission: PERMISSIONS.CREATE_INVENTORY },
      { label: tSidebar("stockManagement.transfer"),           path: "/transferts",                   icon: ArrowLeftRight,        category: cat("stock"),      permission: [PERMISSIONS.CREATE_TRANSFER, PERMISSIONS.VALIDATE_TRANSFER, PERMISSIONS.DELETE_TRANSFER] },
      { label: tSidebar("stockManagement.transactions"),       path: "/transactions",                 icon: History,               category: cat("stock"),      permission: PERMISSIONS.VIEW_STOCK_MOVEMENTS },
      { label: tSidebar("stockManagement.deliveryNotes"),      path: "/bon-livraisons",               icon: ReceiptText,           category: cat("stock"),      permission: PERMISSIONS.VIEW_BON_LIVRAISON },
      { label: tSidebar("stockManagement.clientPayments"),     path: "/reglements-client",            icon: CreditCard,            category: cat("stock"),      permission: [PERMISSIONS.CREATE_REGLEMENTS, PERMISSIONS.DELETE_REGLEMENTS] },
      { label: tSidebar("stockManagement.bonRetour"),          path: "/bon-retour-clients",           icon: Undo2,                 category: cat("stock"),      permission: PERMISSIONS.VIEW_BON_RETOUR_CLIENT },
      // Achats
      { label: tSidebar("achatsManagement.bonReception"),      path: "/bon-receptions",               icon: Package,               category: cat("achats"),     permission: PERMISSIONS.VIEW_BON_RECEPTION },
      { label: tSidebar("achatsManagement.reglementFournisseur"), path: "/reglements-fournisseur",   icon: CreditCard,            category: cat("achats"),     permission: [PERMISSIONS.CREATE_REGLEMENTS_FOURNISSEUR, PERMISSIONS.DELETE_REGLEMENTS_FOURNISSEUR] },
      // Saphir
      { label: tSidebar("saphirManagement.label"),             path: "/saphir-management-dashboard",  icon: Globe2,                category: cat("saphir"),     permission: [PERMISSIONS.VIEW_ADVANCED_BL, PERMISSIONS.VIEW_AGENCE, PERMISSIONS.VIEW_PACK] },
      { label: tSidebar("saphirManagement.agences"),           path: "/agences",                      icon: MapPin,                category: cat("saphir"),     permission: PERMISSIONS.VIEW_AGENCE },
      { label: tSidebar("saphirManagement.commandes"),         path: "/commandes",                    icon: ShoppingCart,          category: cat("saphir"),     permission: PERMISSIONS.VIEW_ADVANCED_BL },
      { label: tSidebar("saphirManagement.colisTracking"),     path: "/colis-tracking",               icon: SearchCheck,           category: cat("saphir"),     permission: PERMISSIONS.VIEW_ADVANCED_BL },
      { label: tSidebar("saphirManagement.planningLivraison"), path: "/planning-livraison",           icon: CalendarRange,         category: cat("saphir"),     permission: PERMISSIONS.VIEW_ADVANCED_BL },
      // Admin
      { label: tSidebar("users"),                              path: "/users",                        icon: Users,                 category: cat("admin"),      permission: [PERMISSIONS.MANAGE_USERS, PERMISSIONS.CREATE_USER] },
      ...(isSuperAdmin ? [{ label: tSidebar("companies"), path: "/societes", icon: Building2, category: cat("admin") }] : []),
      { label: tSidebar("depots"),                             path: "/depots",                       icon: Archive,               category: cat("admin") },
      { label: tSidebar("structure.children.banques"),         path: "/banque",                       icon: Landmark,              category: cat("admin"),      permission: [PERMISSIONS.CREATE_BANQUES, PERMISSIONS.UPDATE_BANQUES, PERMISSIONS.DELETE_BANQUES] },
      // Système
    
      ...(!SETTINGS_RESTRICTED_ROLES.includes(roleName) ? [{ label: tSidebar("settings"), path: "/settings", icon: Settings, category: cat("system"), permission: [PERMISSIONS.MANAGE_SETTINGS] }] : []),
      // Compte
      ...(!isSuperAdmin ? [{ label: tSidebar("myCompany"), path: "/societes/me", icon: Building, category: cat("account") }] : []),
      { label: tHeader("profile.my_profile"),                  path: "/profile",                      icon: UserCircleIcon,        category: cat("account") },
      { label: tHeader("wallet.my_wallet"),                    path: "/my-wallet",                    icon: Wallet,                category: cat("account") },
    ];

    return allItems.filter((item) => canSee(item.permission));
  }, [tSidebar, tHeader, isSuperAdmin, roleName, user]);

  const filtered = useMemo(() => {
    if (!query.trim()) return paletteItems;
    const q = query.toLowerCase();
    return paletteItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.path.toLowerCase().includes(q)
    );
  }, [query, paletteItems]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.children[selectedIndex];
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          navigate(filtered[selectedIndex].path);
          onClose();
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [filtered, selectedIndex, navigate, onClose]
  );

  const modalVariants = shouldReduce
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        hidden: { opacity: 0, scale: 0.96, y: -12 },
        visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 380, damping: 28 } },
        exit: { opacity: 0, scale: 0.96, y: -8, transition: { duration: 0.15 } },
      };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed inset-0 modal-backdrop z-[100]"
            onClick={onClose}
          />

          <div className="fixed inset-0 z-[101] flex items-start justify-center pt-[12vh] px-4 pointer-events-none">
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full max-w-lg pointer-events-auto"
            >
              <div className="bg-white dark:bg-[#1c1c1c] rounded-2xl shadow-2xl ring-1 ring-gray-200/80 dark:ring-[#2e2e2e] overflow-hidden">
                {/* Search input */}
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-[#2e2e2e]">
                  <Search className="w-4.5 h-4.5 text-gray-400 flex-shrink-0" style={{ width: 18, height: 18 }} />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder={tHeader("palette.placeholder")}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-transparent text-[14px] text-gray-900 dark:text-white placeholder-gray-400 outline-none"
                  />
                  <kbd className="hidden sm:flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-gray-400 bg-gray-100 dark:bg-[#222] rounded border border-gray-200 dark:border-[#2e2e2e] tracking-wide">
                    {tHeader("palette.escape_key")}
                  </kbd>
                </div>

                {/* Results */}
                <div
                  ref={listRef}
                  className="
                    max-h-[360px] overflow-y-auto py-1.5
                    [&::-webkit-scrollbar]:w-1
                    [&::-webkit-scrollbar-thumb]:bg-gray-200
                    dark:[&::-webkit-scrollbar-thumb]:bg-[#3a3a3a]
                    [&::-webkit-scrollbar-thumb]:rounded-full
                  "
                >
                  {filtered.length === 0 ? (
                    <div className="px-4 py-10 text-center text-sm text-gray-400">
                      {tHeader("palette.no_results")} «&nbsp;{query}&nbsp;»
                    </div>
                  ) : (
                    filtered.map((item, i) => {
                      const Icon = item.icon;
                      const isSelected = i === selectedIndex;
                      return (
                        <button
                          key={item.path}
                          onClick={() => {
                            navigate(item.path);
                            onClose();
                          }}
                          onMouseEnter={() => setSelectedIndex(i)}
                          className={`
                            w-full flex items-center gap-3 px-3 py-2 text-left
                            transition-colors duration-100 mx-1.5 rounded-xl
                            ${
                              isSelected
                                ? "bg-[#B12B89] text-white"
                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#222]"
                            }
                          `}
                          style={{ width: "calc(100% - 12px)" }}
                        >
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              isSelected ? "bg-white/20" : "bg-gray-100 dark:bg-[#222]"
                            }`}
                          >
                            <Icon
                              className={`w-4 h-4 ${
                                isSelected ? "text-white" : "text-gray-500 dark:text-gray-400"
                              }`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13.5px] font-semibold truncate">{item.label}</p>
                            <p className={`text-[11px] ${isSelected ? "text-white/65" : "text-gray-400"}`}>
                              {item.category}
                            </p>
                          </div>
                          {isSelected && (
                            <kbd className="text-[10px] font-semibold text-white/60 bg-white/15 px-1.5 py-0.5 rounded flex-shrink-0">
                              ↵
                            </kbd>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Footer hints */}
                <div className="px-4 py-2 border-t border-gray-100 dark:border-[#2e2e2e] flex items-center gap-5 text-[11px] text-gray-400">
                  <span>
                    <kbd className="font-bold text-gray-500">↑↓</kbd> {tHeader("palette.hint_navigate")}
                  </span>
                  <span>
                    <kbd className="font-bold text-gray-500">↵</kbd> {tHeader("palette.hint_open")}
                  </span>
                  <span>
                    <kbd className="font-bold text-gray-500">{tHeader("palette.escape_key")}</kbd> {tHeader("palette.hint_close")}
                  </span>
                  {filtered.length > 0 && (
                    <span className="ml-auto">
                      {filtered.length}&nbsp;{filtered.length > 1 ? tHeader("palette.results") : tHeader("palette.result")}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

// ─── Main Header ──────────────────────────────────────────────────────────────

export const Header = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: currentUser } = useCurrentUser();
  const activeUser = currentUser?.data || "";
  const shouldReduce = useReducedMotion();

  const { mutate: logout, isLoading } = useLogout();
  const { i18n, t } = useTranslation("header");

  const isSuperAdmin = user?.role === "SUPERADMIN" || user?.isSuperAdmin;
  const roleName = user?.roleName ?? user?.role ?? "";
  const displayRole = isSuperAdmin
    ? t("profile.super_admin")
    : (user?.roleName || user?.role || "").replaceAll("_", " ");
  const { data: societeResponse } = useSocieteMe({
    enabled: !isSuperAdmin && !!user,
  });
  const societe = societeResponse?.data;

  const { data: myCaisseResponse } = useMyCaisse({ enabled: !!user });
  const myWallet = myCaisseResponse?.data;
  const walletBalance = myWallet
    ? Number(myWallet.currentBalance ?? 0)
    : null;
  const formattedWalletBalance =
    walletBalance == null
      ? null
      : walletBalance.toLocaleString("fr-MA", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  const walletClassName =
    "flex h-9 max-w-[160px] items-center gap-1.5 rounded-lg border border-emerald-200/80 bg-emerald-50 px-2.5 text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-300 sm:max-w-none";

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);

  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("fullscreenchange", handleFs);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("fullscreenchange", handleFs);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isMeta = e.metaKey || e.ctrlKey;
      if (isMeta && e.key === "k") {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setShowProfileMenu(false);
        setIsCommandOpen(false);
        setShowPreferencesModal(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  };

  const isRTL = i18n.language === "ar";

  const dropdownVariants = shouldReduce
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        hidden: { opacity: 0, scale: 0.95, y: -6 },
        visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 28 } },
        exit: { opacity: 0, scale: 0.95, y: -4, transition: { duration: 0.13 } },
      };

  return (
    <>
      <header className="relative z-40 grid h-16 w-full flex-shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-gray-200/80 bg-white px-3 dark:border-[#2e2e2e] dark:bg-[#161616] lg:px-5">

        {/* Logo */}
        <Link to="/" className="-mt-1 flex flex-shrink-0 items-center justify-self-start self-center">
          <Logo className="h-8 w-auto max-w-[140px] sm:h-9 sm:max-w-[160px] text-[#B12B89]" />
        </Link>

        {/* Search — centered */}
        <div className="w-full min-w-0 justify-self-center px-2 sm:w-[520px] lg:w-[580px]">
          <motion.button
            whileHover={!shouldReduce ? { scale: 1.01 } : {}}
            whileTap={!shouldReduce ? { scale: 0.98 } : {}}
            onClick={() => setIsCommandOpen(true)}
            className="flex w-full items-center gap-2.5 rounded-lg border border-gray-200/90 bg-gray-50/80 px-3.5 py-2 text-sm text-gray-400 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-150 hover:border-gray-300 hover:bg-white dark:border-[#2e2e2e] dark:bg-[#1c1c1c] dark:text-gray-500 dark:hover:border-[#3a3a3a] dark:hover:bg-[#222]"
          >
            <Search className="h-4 w-4 flex-shrink-0 text-gray-400" strokeWidth={2} />
            <span className="truncate text-[13px] text-gray-500 dark:text-gray-400">
              {t("palette.placeholder")}
            </span>
          </motion.button>
        </div>

        {/* Actions */}
        <div className="flex flex-shrink-0 items-center justify-self-end gap-1.5 sm:gap-2">
          {formattedWalletBalance != null && (
            <Tooltip label={t("wallet.tooltip")}>
              <Link
                to="/my-wallet"
                className={`${walletClassName} transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-900/40`}
              >
                <Wallet className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={2.25} />
                <span className="truncate text-[12.5px] font-semibold tabular-nums">
                  {formattedWalletBalance}
                  <span className="ms-1 hidden font-medium opacity-80 sm:inline">MAD</span>
                </span>
              </Link>
            </Tooltip>
          )}

          <NotificationDropdown />

          <div className="relative" ref={profileRef}>
            <motion.button
              whileHover={!shouldReduce ? { scale: 1.01 } : {}}
              whileTap={!shouldReduce ? { scale: 0.98 } : {}}
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              aria-expanded={showProfileMenu}
              aria-haspopup="menu"
              className={`
                flex items-center gap-2 rounded-lg py-1 pe-1 ps-1 transition-all
                sm:gap-2.5 sm:pe-2
                ${
                  showProfileMenu
                    ? "bg-gray-100 dark:bg-white/10"
                    : "hover:bg-gray-50 dark:hover:bg-white/5"
                }
              `}
            >
              <div className="relative flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-slate-100 ring-1 ring-gray-200/80 dark:bg-[#1c1c1c] dark:ring-[#2e2e2e] sm:h-9 sm:w-9">
                  {activeUser?.profile ? (
                    <img
                      src={activeUser.profile}
                      alt={activeUser.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserCircleIcon className="h-5 w-5 text-slate-400 sm:h-6 sm:w-6" />
                  )}
                </div>
                <span className="absolute bottom-0 end-0 h-2 w-2 rounded-full border-2 border-white bg-emerald-500 dark:border-[#161616]" />
              </div>

              <div className={`hidden min-w-0 text-start sm:block ${isRTL ? "" : ""}`}>
                <p className="max-w-[120px] truncate text-[13px] font-semibold leading-tight text-slate-900 dark:text-slate-100 lg:max-w-[150px]">
                  {activeUser?.name || user?.name}
                </p>
                <p className="max-w-[120px] truncate text-[11px] leading-tight text-slate-500 dark:text-slate-400 lg:max-w-[150px]">
                  {displayRole}
                </p>
              </div>

              <motion.span
                animate={{ rotate: showProfileMenu ? 180 : 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="hidden text-slate-400 sm:block"
              >
                <ChevronDownIcon className="h-4 w-4" />
              </motion.span>
            </motion.button>

            {/* Profile dropdown */}
            <AnimatePresence>
              {showProfileMenu && (
                <motion.div
                  variants={dropdownVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  role="menu"
                  className={`
                    absolute top-[calc(100%+6px)] z-50 w-72 overflow-hidden rounded-xl
                    border border-gray-200/80 bg-white shadow-xl shadow-gray-200/40
                    dark:border-[#2e2e2e] dark:bg-[#1c1c1c] dark:shadow-black/40
                    ${isRTL ? "left-0" : "right-0"}
                  `}
                >
                  {/* User card */}
                  <div className="border-b border-gray-100 px-4 py-4 dark:border-[#2e2e2e]">
                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-slate-100 ring-1 ring-gray-200 dark:bg-[#222] dark:ring-[#2e2e2e]">
                          {activeUser?.profile ? (
                            <img
                              src={activeUser.profile}
                              alt={activeUser.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <UserCircleIcon className="h-7 w-7 text-slate-400" />
                          )}
                        </div>
                        <span className="absolute bottom-0 end-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-[#1c1c1c]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {activeUser?.name || user?.name}
                        </p>
                        {activeUser?.email && (
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {activeUser.email}
                          </p>
                        )}
                        <span className="mt-1.5 inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-[#222] dark:text-slate-300">
                          {displayRole}
                        </span>
                      </div>
                    </div>

                    {!isSuperAdmin && societe?.raisonSocial && (
                      <p className="mt-3 truncate text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-medium text-slate-600 dark:text-slate-300">
                          {t("profile.connected_to")}:
                        </span>{" "}
                        {societe.raisonSocial}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="p-1.5">
                    <button
                      role="menuitem"
                      onClick={() => {
                        navigate("/profile");
                        setShowProfileMenu(false);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-slate-700 transition-colors hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-white/5"
                    >
                      <BiUserCircle className="h-[18px] w-[18px] text-slate-400" />
                      {t("profile.my_profile")}
                    </button>

                    <button
                      role="menuitem"
                      onClick={() => {
                        setShowPreferencesModal(true);
                        setShowProfileMenu(false);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-slate-700 transition-colors hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-white/5"
                    >
                      <Cog6ToothIcon className="h-[18px] w-[18px] text-slate-400" />
                      {t("preferences.title")}
                    </button>

                    <button
                      role="menuitem"
                      onClick={() => {
                        toggleFullscreen();
                        setShowProfileMenu(false);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-slate-700 transition-colors hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-white/5"
                    >
                      {isFullscreen ? (
                        <Minimize2 className="h-[18px] w-[18px] text-slate-400" />
                      ) : (
                        <Maximize2 className="h-[18px] w-[18px] text-slate-400" />
                      )}
                      {isFullscreen
                        ? t("fullscreen_exit", "Quitter plein écran")
                        : t("fullscreen", "Plein écran")}
                    </button>

                    <div className="my-1 h-px bg-gray-100 dark:bg-[#2e2e2e]" />

                    <button
                      role="menuitem"
                      onClick={() => {
                        setShowLogoutConfirm(true);
                        setShowProfileMenu(false);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                    >
                      <BiLogOutCircle className="h-[18px] w-[18px]" />
                      {t("profile.logout")}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <CommandPalette isOpen={isCommandOpen} onClose={() => setIsCommandOpen(false)} isSuperAdmin={isSuperAdmin} roleName={roleName} user={user} />

      <PreferencesModal
        isOpen={showPreferencesModal}
        onClose={() => setShowPreferencesModal(false)}
      />

      <ConfirmationModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={() => {
          logout();
          setShowLogoutConfirm(false);
        }}
        title={t("confirmation.logout_title")}
        message={t("confirmation.logout_message")}
        confirmText={t("confirmation.logout_confirm")}
        cancelText={t("confirmation.logout_cancel")}
        isLoading={isLoading}
        variant="danger"
      />
    </>
  );
};
