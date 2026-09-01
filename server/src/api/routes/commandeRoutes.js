import { createSalesDocumentRouter } from "./salesDocumentRoutes.js";

export default createSalesDocumentRouter({
  type: "commande",
  hidePrices: true,
  requireClient: false,
  permPrefix: "commande",
});
