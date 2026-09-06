import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Menu,
  Package,
  ShoppingBag,
  Tag,
  UserCircle,
  Users,
  Wallet,
  Warehouse,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { PERMISSIONS, hasAnyPermission } from "@/shared/utils/permissions";

/**
 * Fixed phone bottom bar.
 * Rightmost slot opens the full navigation sheet (all pages).
 */
export const MobileBottomBar = ({ user, onOpenMenu, onCloseMenu, menuOpen }) => {
  const { t } = useTranslation("sidebar");
  const location = useLocation();

  const can = (perm) => {
    if (!perm) return true;
    const list = Array.isArray(perm) ? perm : [perm];
    return hasAnyPermission(user, list);
  };

  const shortcuts = useMemo(() => {
    const catalogue =
      (can(PERMISSIONS.VIEW_ARTICLE) && {
        key: "articles",
        label: t("structure.children.articles"),
        path: "/articles",
        icon: Tag,
        match: (path) => path.startsWith("/articles"),
      }) ||
      (can(PERMISSIONS.VIEW_ADVANCED_BL) && {
        key: "commandes",
        label: t("saphirManagement.commandes"),
        path: "/commandes",
        icon: ShoppingBag,
        match: (path) => path.startsWith("/commandes"),
      }) ||
      (can(PERMISSIONS.MANAGE_STOCK) && {
        key: "stock",
        label: t("stock"),
        path: "/stock",
        icon: Warehouse,
        match: (path) => path.startsWith("/stock"),
      }) ||
      (can(PERMISSIONS.VIEW_BON_LIVRAISON) && {
        key: "bl",
        label: t("ventesManagement.bonLivraison"),
        path: "/bon-livraisons",
        icon: Package,
        match: (path) => path.startsWith("/bon-livraisons"),
      }) || {
        key: "home-extra",
        label: t("dashboard"),
        path: "/",
        icon: Home,
        match: (path) =>
          path === "/" ||
          path.startsWith("/dashboard") ||
          path.startsWith("/saphir-management-dashboard"),
      };

    const cash =
      (can(PERMISSIONS.VIEW_CAISSE) && {
        key: "caisse",
        label: t("sections.cash", "Caisse"),
        path: "/my-wallet",
        icon: Wallet,
        match: (path) =>
          path.startsWith("/my-wallet") || path.startsWith("/caisse"),
      }) ||
      (can([
        PERMISSIONS.CREATE_CLIENTS,
        PERMISSIONS.UPDATE_CLIENTS,
        PERMISSIONS.DELETE_CLIENTS,
        PERMISSIONS.IMPORT_CLIENTS,
      ]) && {
        key: "clients",
        label: t("structure.children.clients"),
        path: "/clients",
        icon: Users,
        match: (path) => path.startsWith("/clients"),
      }) ||
      null;

    const items = [
      {
        key: "home",
        label: t("dashboard"),
        path: "/",
        icon: Home,
        match: (path) =>
          path === "/" ||
          path.startsWith("/dashboard") ||
          path.startsWith("/saphir-management-dashboard"),
      },
      catalogue,
    ];

    if (cash) items.push(cash);

    items.push({
      key: "profile",
      label: t("profile", "Profil"),
      path: "/profile",
      icon: UserCircle,
      match: (path) => path.startsWith("/profile"),
    });

    return items;
  }, [t, user]);

  const itemClass = (active) =>
    `flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 transition-colors active:scale-[0.97] ${
      active
        ? "text-[#B12B89]"
        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
    }`;

  const handleShortcutClick = () => {
    if (menuOpen) onCloseMenu?.();
  };

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label={t("mainNavigation")}
    >
      <div className="border-t border-slate-200/90 bg-white/95 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-[#2e2e2e] dark:bg-[#161616]/95 dark:shadow-[0_-8px_24px_rgba(0,0,0,0.35)]">
        <div className="mx-auto flex h-[64px] max-w-lg items-stretch gap-0.5 px-1.5">
          {shortcuts.map((item) => {
            const Icon = item.icon;
            const active = item.match(location.pathname);
            return (
              <Link
                key={item.key}
                to={item.path}
                onClick={handleShortcutClick}
                className={itemClass(active)}
                aria-current={active ? "page" : undefined}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${
                    active ? "bg-[#B12B89]/12 dark:bg-[#B12B89]/15" : ""
                  }`}
                >
                  <Icon size={20} strokeWidth={active ? 2.25 : 1.75} />
                </span>
                <span className="max-w-full truncate text-[10px] font-semibold leading-none">
                  {item.label}
                </span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={onOpenMenu}
            className={itemClass(menuOpen)}
            aria-expanded={menuOpen}
            aria-label={t("menu")}
          >
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${
                menuOpen ? "bg-[#B12B89]/12 dark:bg-[#B12B89]/15" : ""
              }`}
            >
              <Menu size={20} strokeWidth={menuOpen ? 2.25 : 1.75} />
            </span>
            <span className="max-w-full truncate text-[10px] font-semibold leading-none">
              {t("menu")}
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
};
