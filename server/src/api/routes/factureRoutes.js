import { createSalesDocumentRouter } from "./salesDocumentRoutes.js";

export default createSalesDocumentRouter({
  type: "facture",
  hidePrices: false,
  requireClient: true,
  permPrefix: "facture",
});
