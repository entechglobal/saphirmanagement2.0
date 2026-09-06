import ApiError from "../utils/apiError.js";

const ADMIN_ROLES = new Set(["Societe_Admin"]);

export const attendanceAdminOnly = (req, res, next) => {
  const user = req.user;
  if (!user) {
    throw new ApiError("Non autorisé. Veuillez vous connecter.", 401);
  }
  if (user.isSuperAdmin || ADMIN_ROLES.has(user.roleName)) {
    return next();
  }
  throw new ApiError(
    "Accès réservé au Super Administrateur ou à l'Administrateur de société.",
    403,
  );
};

export default attendanceAdminOnly;
