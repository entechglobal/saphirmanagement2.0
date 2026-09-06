import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ClipboardList,
  Folder,
  Home,
  Menu,
  Package,
  Plus,
  Users,
  Warehouse,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { PERMISSIONS, hasAnyPermission } from "@/shared/utils/permissions";

const CREATE_ROLES = new Set(["super_admin", "societe_admin", "commercial", "gerant"]);

/**
 * Floating phone nav: pill (Dashboard + 2 pages + Menu) and a + FAB for a new order.
 */
export const MobileBottomBar = ({ user, onOpenMenu, onCloseMenu, menuOpen }) => {
  const { t } = useTranslation("sidebar");
  const location = useLocation();

  const can = (perm) => {
    if (!perm) return true;
    const list = Array.isArray(perm) ? perm : [perm];
    return hasAnyPermission(user, list);
  };

  const canCreateOrder = useMemo(() => {
    const roleName = String(user?.roleName ?? user?.role ?? "").trim().toLowerCase();
    return (
      can(PERMISSIONS.CREATE_ADVANCED_BL) ||
      CREATE_ROLES.has(roleName) ||
      !!user?.isSuperAdmin
    );
  }, [user]);

  const shortcuts = useMemo(() => {
    const orders =
      (can(PERMISSIONS.VIEW_ADVANCED_BL) && {
        key: "commandes",
        label: t("saphirManagement.commandes"),
        path: "/commandes",
        icon: ClipboardList,
        match: (path) => path.startsWith("/commandes"),
      }) ||
      (can(PERMISSIONS.VIEW_BON_LIVRAISON) && {
        key: "bl",
        label: t("ventesManagement.bonLivraison"),
        path: "/bon-livraisons",
        icon: Package,
        match: (path) => path.startsWith("/bon-livraisons"),
      }) ||
      (can(PERMISSIONS.VIEW_ARTICLE) && {
        key: "articles",
        label: t("structure.children.articles"),
        path: "/articles",
        icon: Folder,
        match: (path) => path.startsWith("/articles"),
      }) || {
        key: "stock-fallback",
        label: t("stock"),
        path: "/stock",
        icon: Warehouse,
        match: (path) => path.startsWith("/stock"),
      };

    const second =
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
      (can(PERMISSIONS.VIEW_ARTICLE) &&
        orders.key !== "articles" && {
          key: "articles",
          label: t("structure.children.articles"),
          path: "/articles",
          icon: Folder,
          match: (path) => path.startsWith("/articles"),
        }) ||
      (can(PERMISSIONS.MANAGE_STOCK) &&
        orders.key !== "stock-fallback" && {
          key: "stock",
          label: t("stock"),
          path: "/stock",
          icon: Warehouse,
          match: (path) => path.startsWith("/stock"),
        }) || {
        key: "profile",
        label: t("profile", "Profil"),
        path: "/profile",
        icon: Folder,
        match: (path) => path.startsWith("/profile"),
      };

    return [
      {
        key: "home",
        label: t("home", t("dashboard")),
        path: "/dashboard",
        icon: Home,
        match: (path) =>
          path === "/" ||
          path.startsWith("/dashboard") ||
          path.startsWith("/saphir-management-dashboard"),
      },
      orders,
      second,
    ];
  }, [t, user]);

  const handleShortcutClick = () => {
    if (menuOpen) onCloseMenu?.();
  };

  const renderItem = (active, { children, ...props }) => {
    const Tag = props.to ? Link : "button";
    return (
      <Tag
        {...props}
        className={`flex min-w-0 flex-1 items-center justify-center py-1 transition-transform active:scale-[0.97] ${
          active ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"
        }`}
      >
        <span
          className={`flex items-center justify-center gap-1.5 rounded-full transition-all duration-200 ${
            active
              ? "bg-white px-3 py-2 shadow-[0_2px_10px_rgba(15,23,42,0.10)] dark:bg-[#2a2a2a] dark:shadow-[0_2px_10px_rgba(0,0,0,0.35)]"
              : "h-10 w-10"
          }`}
        >
          {children}
        </span>
      </Tag>
    );
  };

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 md:hidden"
      style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 0px))" }}
      aria-label={t("mainNavigation")}
    >
      <div className="pointer-events-auto mx-auto flex max-w-lg items-center gap-2.5 px-4">
        <div className="flex h-[58px] min-w-0 flex-1 items-stretch rounded-full bg-[#EDEDED]/95 px-1 shadow-[0_10px_32px_rgba(15,23,42,0.14)] ring-1 ring-black/[0.05] backdrop-blur-xl dark:bg-[#222222]/95 dark:shadow-[0_10px_32px_rgba(0,0,0,0.45)] dark:ring-white/[0.06]">
          {shortcuts.map((item) => {
            const Icon = item.icon;
            const active = !menuOpen && item.match(location.pathname);
            return renderItem(active, {
              key: item.key,
              to: item.path,
              onClick: handleShortcutClick,
              "aria-label": item.label,
              "aria-current": active ? "page" : undefined,
              children: (
                <>
                  <Icon size={20} strokeWidth={active ? 2.15 : 1.75} className="shrink-0" />
                  {active && (
                    <span className="max-w-[5.5rem] truncate text-[13px] font-semibold leading-none">
                      {item.label}
                    </span>
                  )}
                </>
              ),
            });
          })}

          {renderItem(menuOpen, {
            type: "button",
            onClick: onOpenMenu,
            "aria-expanded": menuOpen,
            "aria-label": t("menu"),
            children: (
              <>
                <Menu size={20} strokeWidth={menuOpen ? 2.15 : 1.75} className="shrink-0" />
                {menuOpen && (
                  <span className="max-w-[5.5rem] truncate text-[13px] font-semibold leading-none">
                    {t("menu")}
                  </span>
                )}
              </>
            ),
          })}
        </div>

        {canCreateOrder && (
          <Link
            to="/commandes/create"
            onClick={handleShortcutClick}
            aria-label={t("newOrder")}
            className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#C53A98] to-[#B12B89] text-white shadow-[0_10px_28px_rgba(177,43,137,0.42)] ring-1 ring-black/[0.04] transition-transform active:scale-[0.94]"
          >
            <Plus size={26} strokeWidth={2.6} />
          </Link>
        )}
      </div>
    </nav>
  );
};
