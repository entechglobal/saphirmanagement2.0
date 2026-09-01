import { PERMISSIONS } from "../../shared/utils/permissions";

export const PURCHASE_DOC_CONFIG = {
  commandeFournisseur: {
    key: "commandeFournisseur",
    apiBase: "/commandes-fournisseur",
    path: "/bons-commande-fournisseur",
    title: "Bons de commande fournisseur",
    singular: "Bon de commande fournisseur",
    createLabel: "Nouveau bon de commande",
    hidePrices: true,
    requireFournisseur: true,
    hideStatus: false,
    editable: true,
    permissions: {
      view: PERMISSIONS.VIEW_COMMANDE_FOURNISSEUR,
      create: PERMISSIONS.CREATE_COMMANDE_FOURNISSEUR,
      update: PERMISSIONS.UPDATE_COMMANDE_FOURNISSEUR,
      delete: PERMISSIONS.DELETE_COMMANDE_FOURNISSEUR,
    },
  },
};
