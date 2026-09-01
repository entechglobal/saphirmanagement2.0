import { createPurchaseDocumentRouter } from "./purchaseDocumentRoutes.js";

export default createPurchaseDocumentRouter({
  type: "commandeFournisseur",
  hidePrices: true,
  requireFournisseur: true,
  permPrefix: "commande_fournisseur",
});
