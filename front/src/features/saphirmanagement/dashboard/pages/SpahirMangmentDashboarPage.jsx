import { useAuth } from "@/features/auth";
import { useCurrentUser } from "@/features/users/hooks/useUsers";
import { useTranslation } from "react-i18next";
import { SaphirWorkflowStats } from "../components/SaphirWorkflowStats";

const RESTRICTED_ROLES = ["Livreur", "Preparateur", "Commercial"];

export const SpahirMangmentDashboarPage = () => {
  const { t } = useTranslation("dashboard");
  const { user } = useAuth();
  const { data: currentUser } = useCurrentUser();
  const activeUser = currentUser?.data || {};
  const displayName = activeUser.name || user?.name || t("greeting.default_user");

  const isSuperAdmin = !!user?.isSuperAdmin;
  const isSocieteAdmin = user?.role === "Societe_Admin";
  const isAdmin = isSuperAdmin || isSocieteAdmin;
  const isRestrictedRole = RESTRICTED_ROLES.includes(user?.role);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? t("greeting.morning") : hour < 18 ? t("greeting.afternoon") : t("greeting.evening");

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start gap-4 border-s-4 border-primary ps-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {`${greeting}, ${displayName}`}
          </h1>
        </div>
      </div>

      <div className="space-y-3">
        <SaphirWorkflowStats roleName={user?.role} />
      </div>
    </div>
  );
};
