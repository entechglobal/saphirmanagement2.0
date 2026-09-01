import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth";
import { ROLE_DEFAULT_ROUTES } from "../../shared/config/roleDefaultRoutes";

export const DefaultRedirect = () => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  const role = user.role;

  const redirectPath =
    ROLE_DEFAULT_ROUTES[role] || "/dashboard";

  return <Navigate to={redirectPath} replace />;
};