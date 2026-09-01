// src/features/auth/components/PermissionGate.jsx
import { useAuth } from "../hooks/useAuth";
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  isSuperAdmin,
} from "../../../shared/utils/permissions";


/**
 * Permission Gate Component
 * Conditionally renders children based on user permissions
 * 
 * Usage Examples:
 * 
 * // Single permission
 * <PermissionGate permission="user:create">
 *   <CreateUserButton />
 * </PermissionGate>
 * 
 * // Multiple permissions (ANY)
 * <PermissionGate permission={["user:edit", "user:delete"]}>
 *   <UserActions />
 * </PermissionGate>
 * 
 * // Multiple permissions (ALL required)
 * <PermissionGate permission={["user:edit", "user:view"]} requireAll>
 *   <EditUserForm />
 * </PermissionGate>
 * 
 * // With fallback
 * <PermissionGate permission="admin:access" fallback={<RestrictedMessage />}>
 *   <AdminPanel />
 * </PermissionGate>
 * 
 * @param {Object} props
 * @param {string|string[]} props.permission - Required permission(s)
 * @param {boolean} props.requireAll - If true, user must have ALL permissions
 * @param {React.ReactNode} props.children - Content to show if authorized
 * @param {React.ReactNode} props.fallback - Content to show if not authorized
 * @param {boolean} props.hideIfUnauthorized - If true, renders null instead of fallback
 */
export const PermissionGate = ({
  permission,
  requireAll = false,
  children,
  fallback = null,
  hideIfUnauthorized = false,
}) => {
  const { user } = useAuth();


  // No user (not logged in)
  if (!user) return hideIfUnauthorized ? null : fallback;

  // Super admin bypass
  if (isSuperAdmin(user)) {
    return children;
  }

  // Deny by default when permission prop is undefined/null (fail-safe)
  if (!permission) {
    return hideIfUnauthorized ? null : fallback;
  }

  const permissions = Array.isArray(permission)
    ? permission
    : [permission];

  let hasAccess = false;

  if (requireAll) {
    hasAccess = hasAllPermissions(user, permissions);
  } else if (permissions.length === 1) {
    hasAccess = hasPermission(user, permissions[0]);
  } else {
    hasAccess = hasAnyPermission(user, permissions);
  }

  if (!hasAccess) {
    return hideIfUnauthorized ? null : fallback;
  }

  return children;
};


export const InversePermissionGate = ({
  permission,
  children,
  fallback = null,
}) => {
  const { user } = useAuth();
  // No user (not logged in)
  if (!user) return children;

  if (isSuperAdmin(user)) {
    return fallback;
  }

  const allowed = hasPermission(user, permission);

  return allowed ? fallback : children;
};
