import { useTranslation } from "react-i18next";
import { InputToggle } from "../../../shared/components/InputToggle";

export const PREPARATEUR_ROLE_ID = 6;
export const LIVREUR_ROLE_ID = 7;

export const isPreparateurMainRole = (roleId, roleName) =>
  Number(roleId) === PREPARATEUR_ROLE_ID || roleName === "Preparateur";

export const isLivreurMainRole = (roleId, roleName) =>
  Number(roleId) === LIVREUR_ROLE_ID || roleName === "Livreur";

export const UserExtraRolesFields = ({
  canBePreparateur,
  canBeLivreur,
  onChangePreparateur,
  onChangeLivreur,
  roleId,
  roleName,
  hasSociete = true,
  className = "",
}) => {
  const { t } = useTranslation("users");
  const lockedPreparateur = isPreparateurMainRole(roleId, roleName);
  const lockedLivreur = isLivreurMainRole(roleId, roleName);
  const disableLivreur = lockedLivreur || !hasSociete;

  return (
    <div className={`space-y-4 ${className}`}>
      <InputToggle
        label={t("extra_roles.preparateur")}
        description={
          lockedPreparateur
            ? t("extra_roles.locked_main_role")
            : t("extra_roles.preparateur_desc")
        }
        checked={lockedPreparateur || !!canBePreparateur}
        disabled={lockedPreparateur}
        onChange={(e) => onChangePreparateur(e.target.checked)}
      />
      <InputToggle
        label={t("extra_roles.livreur")}
        description={
          !hasSociete
            ? t("extra_roles.needs_societe")
            : lockedLivreur
              ? t("extra_roles.locked_main_role")
              : t("extra_roles.livreur_desc")
        }
        checked={lockedLivreur || !!canBeLivreur}
        disabled={disableLivreur}
        onChange={(e) => onChangeLivreur(e.target.checked)}
      />
    </div>
  );
};
