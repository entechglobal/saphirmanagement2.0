import { createSalesDocumentRouter } from "./salesDocumentRoutes.js";

export default createSalesDocumentRouter({
  type: "devis",
  hidePrices: false,
  requireClient: true,
  permPrefix: "devis",
});
