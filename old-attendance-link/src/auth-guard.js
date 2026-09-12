const ADMIN_ROLES = new Set(["Societe_Admin", "Société_Admin", "Societe Admin"]);

function isAttendanceAdmin(user) {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  const role = user.role?.name || user.role || user.roleName || "";
  return ADMIN_ROLES.has(role);
}

function roleLabel(user) {
  if (!user) return "";
  if (user.isSuperAdmin) return "Super Administrateur";
  if (isAttendanceAdmin(user)) return "Administrateur de société";
  return user.role || user.roleName || "Utilisateur";
}

const ADMIN_ONLY_MESSAGE =
  "Accès réservé au Super Administrateur ou à l'Administrateur de société.";

module.exports = { isAttendanceAdmin, roleLabel, ADMIN_ONLY_MESSAGE };
