import express from "express";
import globalError from "../api/middlewares/errorMiddleware.js";
import qs from "qs";
import cookieParser from "cookie-parser";

//routes
import userRoutes from "../api/routes/userRoutes.js";
import authRoutes from "../api/routes/authRoutes.js";
import adminPermissionRoutes from "../api/routes/adminPermissionRoutes.js";
import categoryRoutes from "../api/routes/categoryRoutes.js";
import familyRoutes from "../api/routes/familyRoutes.js";
import articleRoutes from "../api/routes/articleRoutes.js";
import articleVariantRoutes from "../api/routes/articleVariantRoutes.js";
import unitRoutes from "../api/routes/unitRoutes.js";
import attributeRoutes from "../api/routes/attributeRoutes.js";
import clientRoutes from "../api/routes/clientRoutes.js";
import fournisseurRoutes from "../api/routes/fournisseurRoutes.js";
import societeRoutes from "../api/routes/societeRoutes.js";
import depotRoutes from "../api/routes/depotRoutes.js";
import stockByDepotRoutes from "../api/routes/stockByDepotRoutes.js";
import inventoryRoutes from "../api/routes/inventoryRoutes.js";
import transferRoutes from "../api/routes/stockTransferRoutes.js";
import stockTransactionRoutes from "../api/routes/stockTransactionRoutes.js";
import bonLivraisonRoutes from "../api/routes/bonLivraisonRoutes.js";
import bonRetourClientRoutes from "../api/routes/bonRetourClientRoutes.js";
import bonReceptionRoutes from "../api/routes/bonReceptionRoutes.js";
import deliveryRoutes from "../api/routes/deliveryRoutes.js";
import reglementClientRoutes from "../api/routes/reglementClientRoutes.js";
import reglementFournisseurRoutes from "../api/routes/reglementFournisseurRoutes.js";
import banqueRoutes from "../api/routes/banqueRoutes.js";
import agenceRoutes from "../api/routes/agenceRoutes.js";
import packRoutes from "../api/routes/packRoutes.js";
import advancedBonLivraisonRoutes from "../api/routes/advancedBonLivraisonRoutes.js";
import colisTrackingRoutes from "../api/routes/colisTrackingRoutes.js";
import ameexWebhookRoutes from "../api/routes/ameexWebhookRoutes.js";
import deliveryProviderConfigRoutes from "../api/routes/deliveryProviderConfigRoutes.js";
import settingsRoutes from "../api/routes/settingsManagementRoutes.js";
import labelRoutes from "../api/routes/labelRoutes.js";
import caisseRoutes from "../api/routes/caisseRoutes.js";
import caisseLabelRoutes from "../api/routes/caisseLabelRoutes.js";
import commandeRoutes from "../api/routes/commandeRoutes.js";
import devisRoutes from "../api/routes/devisRoutes.js";
import factureRoutes from "../api/routes/factureRoutes.js";
import commandeFournisseurRoutes from "../api/routes/commandeFournisseurRoutes.js";
import bonRetourFournisseurRoutes from "../api/routes/bonRetourFournisseurRoutes.js";
import situationRoutes from "../api/routes/situationRoutes.js";

export default function expressLoader(app) {
  app.use(express.json());
  // query parser
  app.set("query parser", (str) => qs.parse(str));
  // cookies parser
  app.use(cookieParser());

  app.use("/api/users", userRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/families", familyRoutes);
  app.use("/api/admin", adminPermissionRoutes);
  app.use("/api/articles", articleRoutes);
  app.use("/api/article-variants", articleVariantRoutes);
  app.use("/api/units", unitRoutes);
  app.use("/api/attributes", attributeRoutes);
  app.use("/api/clients", clientRoutes);
  app.use("/api/fournisseurs", fournisseurRoutes);
  app.use("/api/societes", societeRoutes);
  app.use("/api/depots", depotRoutes);
  app.use("/api/stock", stockByDepotRoutes);
  app.use("/api/inventories", inventoryRoutes);
  app.use("/api/transfers", transferRoutes);
  app.use("/api/stock-transactions", stockTransactionRoutes);
  app.use("/api/bon-livraisons", bonLivraisonRoutes);
  app.use("/api/commandes", commandeRoutes);
  app.use("/api/devis", devisRoutes);
  app.use("/api/factures", factureRoutes);
  app.use("/api/bon-retour-clients", bonRetourClientRoutes);
  app.use("/api/bon-retour-fournisseurs", bonRetourFournisseurRoutes);
  app.use("/api/bon-receptions", bonReceptionRoutes);
  app.use("/api/commandes-fournisseur", commandeFournisseurRoutes);
  app.use("/api/deliveries", deliveryRoutes);
  app.use("/api/situation", situationRoutes);
  app.use("/api/reglements-client", reglementClientRoutes);
  app.use("/api/reglements-fournisseur", reglementFournisseurRoutes);
  app.use("/api/banques", banqueRoutes);
  app.use("/api/agences", agenceRoutes);
  app.use("/api/packs", packRoutes);
  app.use("/api/advanced-bon-livraisons", advancedBonLivraisonRoutes);
  app.use("/api/colis-tracking", colisTrackingRoutes);
  app.use("/api/webhooks", ameexWebhookRoutes);
  app.use("/api/delivery-provider-configs", deliveryProviderConfigRoutes);
  app.use("/api/settings", settingsRoutes);
  app.use("/api/labels", labelRoutes);
  app.use("/api/caisse", caisseRoutes);
  app.use("/api/caisse-labels", caisseLabelRoutes);

  //global Error Handler
  app.use(globalError);
}
