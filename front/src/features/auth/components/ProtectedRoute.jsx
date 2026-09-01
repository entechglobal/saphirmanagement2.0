import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { LoaderPage } from "@/shared/components/loadersCollections/LoaderPage";
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
} from "../../../shared/utils/permissions";

export const ProtectedRoute = ({
  children,
  requiredPermission = null,
  requireAll = false,
  redirectTo = "/login",
  fallback = null,
}) => {
  const location = useLocation();

  const { user, isAuthenticated, isLoading } = useAuth();

  // Loading state
  if (isLoading) {
    return (
      <LoaderPage />
    );
  }

  // Not logged in
  if (!isAuthenticated) {
    return (
      <Navigate
        to={redirectTo}
        state={{ from: location }}
        replace
      />
    );
  }

  // Permission check
  if (requiredPermission) {
    const permissions = Array.isArray(requiredPermission)
      ? requiredPermission
      : [requiredPermission];

    let hasAccess = false;

    if (requireAll) {
      hasAccess = hasAllPermissions(user, permissions);
    } else if (permissions.length === 1) {
      hasAccess = hasPermission(user, permissions[0]);
    } else {
      hasAccess = hasAnyPermission(user, permissions);
    }

    if (!hasAccess) {
      if (fallback) return fallback;

      return (
        <Navigate
          to="/unauthorized"
          state={{ from: location }}
          replace
        />
      );
    }
  }

  return children;
};
