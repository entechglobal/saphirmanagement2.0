const ADMIN_ROLES = new Set(["Societe_Admin", "Société_Admin", "Societe Admin"]);

function roleNameOf(user) {
  if (!user) return "";
  if (typeof user.role === "string") return user.role;
  if (user.role?.name) return user.role.name;
  return user.roleName || "";
}

function isAttendanceAdmin(user) {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  return ADMIN_ROLES.has(roleNameOf(user));
}

function roleLabel(user) {
  if (!user) return "";
  if (user.isSuperAdmin) return "Super Administrateur";
  if (isAttendanceAdmin(user)) return "Administrateur de société";
  return roleNameOf(user) || "Utilisateur";
}

const ADMIN_ONLY_MESSAGE =
  "Accès réservé au Super Administrateur ou à l'Administrateur de société.";

module.exports = { isAttendanceAdmin, roleLabel, ADMIN_ONLY_MESSAGE };
