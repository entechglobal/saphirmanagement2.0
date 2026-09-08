import { createBrowserRouter, Navigate, useSearchParams } from "react-router-dom";
import { RouterSetup } from "./RouterSetup";
import { ProtectedRoute, PermissionGate } from "@/features/auth";
import { useAuth } from "@/features/auth";
import { MainLayout } from "@/shared/components/layout";
import { LoginPage } from "@/features/auth";
import { DashboardPage } from "@/features/dashboard";
import { CategoriesPage } from "@/features/products";
import { CategoryCreatePage } from "@/features/products";
import { CategoryEditPage } from "@/features/products";
import { FamilyCreatePage } from "@/features/products";
import { FamilyEditPage } from "@/features/products";
import { ArticlesPage } from "@/features/products";
import { ArticleCreateMode } from "@/features/products";
import { ArticleEditPage } from "@/features/products";
import { StockPage } from "@/features/products";
import {
  ArticleViewPage,
  AttributePage,
  SimpleArticleForm,
  VariantsManager,
  StockArticleForm,
  ArticleCreateSimple,
} from "../../features/products";
import { VariantsFlow } from "../../features/products";
import { FamiliesPage } from "@/features/products";

import { ProfilePage, UserDetailsPage, UserFormPage } from "../../features/users";
import { UsersPage } from "../../features/users";
import { SettingsPage } from "@/pages/SettingsPage";
import { POSPage } from "@/pages/POSPage";
import { AchatsPage } from "@/pages/AchatsPage";
import { VentesPage } from "@/pages/VentesPage";
import { SituationClientPage, SituationFournisseurPage } from "../../features/situation";
import { PERMISSIONS } from "@/shared/utils/permissions";
import { ErrorPage } from "../../pages/ErrorPage";
import { ClientsPage } from "@/features/partners";
import {
  ClientsForm,
  SuppliersForm,
  SuppliersView,
} from "../../features/partners";
import { ClientsView } from "../../features/partners";
import { SuppliersPage } from "../../features/partners";
import { SocietesPage, SocietesForm, SocietesView } from "@/features/societes";
import { SocieteUpdate, SocieteView } from "@/features/societes";
import { RepositoriesPage } from "@/features/repositories";
import { RepositoryForm } from "@/features/repositories";
import { RepositoryView } from "@/features/repositories";
import { PermissionsPage } from "../../features/settings/permissions";
import { InventoryPage, InventoryForm, InventoryEditForm } from "../../features/inventories";
import { TransferEditForm, TransferStockPage } from "../../features/transfertStock";
import { TransferForm } from "../../features/transfertStock/components/TransferForm";
import { TransactionsPage } from "../../features/transactions/pages/TransactionsPage";
import { BonLivraisonEditForm, BonLivraisonForm, BonLivraisonsPage, BonLivraisonPreviewPage } from "../../features/bonlivraison";
import { CommandesPage, CommandeForm, CommandePreviewPage } from "../../features/commande";
import {
  CommandesFournisseurPage,
  CommandeFournisseurForm,
  CommandeFournisseurPreviewPage,
} from "../../features/commandeFournisseur";
import { DevisPage, DevisForm, DevisPreviewPage } from "../../features/devis";
import { FacturesPage, FactureForm, FacturePreviewPage } from "../../features/facture";
import { BonRetourClientForm, BonRetourClientsPage, BonRetourClientEditForm, BonRetourClientPreviewPage } from "../../features/bonretour";
import {
  BonRetourFournisseurForm,
  BonRetourFournisseursPage,
  BonRetourFournisseurEditForm,
  BonRetourFournisseurPreviewPage,
} from "../../features/bonretourfournisseur";
import { BonReceptionForm, BonReceptionsPage, BonReceptionEditForm, BonReceptionPreviewPage } from "../../features/bonreception";
import { ReglementClientForm, ReglementClientsPage } from "../../features/reglement";
import { ReglementFournisseurForm, ReglementFournisseursPage } from "../../features/reglementfournisseur";
import { BanqueForm, BanquesPage } from "../../features/stracture/banques";
import { DeliveriesPage, DeliveryForm } from "../../features/stracture/delivries";
import {
  AgenceForm,
  AgencesPage,
  AgenceFormEdit,
  PacksPage,
  AdvancedBonLivraisonForm,
  AdvancedBonLivraisonEditForm,
  CommandsPage,
  CommandDetailsPage,
  PackForm,
  PlanningLivraisonPage,
  CommercialStatsPage,
  ColisTrackingPage,
} from "../../features/saphirmanagement";
import { DeliveryProviderConfigsPage, DeliveryProviderConfigForm } from "../../features/stracture/deliveryProviderConfigs";
import { DefaultRedirect } from "./DefaultRedirect";
import { GestionCaissePage, CaissesUsersPage, MyWalletPage } from "../../features/caisse";
import { NotificationsPage } from "@/pages/NotificationsPage";
import { AttendancePage } from "../../features/attendance";

// Convenience alias — reduces JSX verbosity in route definitions
const PG = ({ p, children }) => (
  <PermissionGate permission={p}>{children}</PermissionGate>
);


// Only Super Admin can access
const SuperAdminRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user?.isSuperAdmin) return <Navigate to="/unauthorized" replace />;
  return children;
};

// Only Super Admin or Société Admin can access
const CaisseAdminRoute = ({ children }) => {
  const { user } = useAuth();
  const roleName = user?.roleName ?? user?.role ?? "";
  const isAdmin = !!user?.isSuperAdmin || roleName === "Societe_Admin";
  if (!isAdmin) return <Navigate to="/unauthorized" replace />;
  return children;
};

const RedirectToCommandesWithStatus = () => {
  const [params] = useSearchParams();
  const status = params.get("status");
  return (
    <Navigate
      to={status ? `/commandes?status=${encodeURIComponent(status)}` : "/commandes"}
      replace
    />
  );
};

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },

  {
    element: <RouterSetup />,
    children: [
      {
        path: "/",
        element: (
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        ),
        errorElement: <ErrorPage />,

        children: [
          { index: true, element: <DefaultRedirect /> },

          // ── Dashboard ────────────────────────────────────────────────────
          {
            path: "dashboard",
            element: <DashboardPage />,
          },

          // ── Categories ───────────────────────────────────────────────────
          {
            path: "categories",
            element: <PG p={PERMISSIONS.VIEW_ARTICLE}><CategoriesPage /></PG>,
          },
          {
            path: "categories/create",
            element: <PG p={PERMISSIONS.VIEW_ARTICLE}><CategoryCreatePage /></PG>,
          },
          {
            path: "categories/:id/edit",
            element: <PG p={PERMISSIONS.VIEW_ARTICLE}><CategoryEditPage /></PG>,
          },

          // ── Families ─────────────────────────────────────────────────────
          {
            path: "families",
            element: <PG p={PERMISSIONS.VIEW_ARTICLE}><FamiliesPage /></PG>,
          },
          {
            path: "families/create",
            element: <PG p={PERMISSIONS.VIEW_ARTICLE}><FamilyCreatePage /></PG>,
          },
          {
            path: "families/:id/edit",
            element: <PG p={PERMISSIONS.VIEW_ARTICLE}><FamilyEditPage /></PG>,
          },

          // ── Articles ─────────────────────────────────────────────────────
          {
            path: "articles",
            element: <PG p={PERMISSIONS.VIEW_ARTICLE}><ArticlesPage /></PG>,
          },
          {
            path: "articles/create",
            element: <PG p={PERMISSIONS.CREATE_ARTICLES}><ArticleCreateMode /></PG>,
          },
          {
            path: "articles/create/simple",
            element: <PG p={PERMISSIONS.CREATE_ARTICLES}><ArticleCreateSimple /></PG>,
          },
          {
            path: "articles/create/variants",
            element: <PG p={PERMISSIONS.CREATE_ARTICLES}><VariantsFlow /></PG>,
          },
          {
            path: "articles/:id/edit",
            element: <PG p={PERMISSIONS.UPDATE_ARTICLES}><ArticleEditPage /></PG>,
          },
          {
            path: "articles/:id",
            element: <PG p={PERMISSIONS.VIEW_ARTICLE}><ArticleViewPage /></PG>,
          },

          // ── Clients ──────────────────────────────────────────────────────
          {
            path: "clients",
            element: (
              <PG p={[PERMISSIONS.CREATE_CLIENTS, PERMISSIONS.UPDATE_CLIENTS, PERMISSIONS.DELETE_CLIENTS, PERMISSIONS.IMPORT_CLIENTS]}>
                <ClientsPage />
              </PG>
            ),
          },
          {
            path: "clients/create",
            element: <PG p={PERMISSIONS.CREATE_CLIENTS}><ClientsForm /></PG>,
          },
          {
            path: "clients/:id/edit",
            element: <PG p={PERMISSIONS.UPDATE_CLIENTS}><ClientsForm /></PG>,
          },
          {
            path: "clients/:id",
            element: (
              <PG p={[PERMISSIONS.CREATE_CLIENTS, PERMISSIONS.UPDATE_CLIENTS, PERMISSIONS.DELETE_CLIENTS]}>
                <ClientsView />
              </PG>
            ),
          },

          // ── Fournisseurs ──────────────────────────────────────────────────
          {
            path: "fournisseurs",
            element: (
              <PG p={[PERMISSIONS.CREATE_FOURNISSEURS, PERMISSIONS.UPDATE_FOURNISSEURS, PERMISSIONS.DELETE_FOURNISSEURS, PERMISSIONS.IMPORT_FOURNISSEURS]}>
                <SuppliersPage />
              </PG>
            ),
          },
          {
            path: "fournisseurs/create",
            element: <PG p={PERMISSIONS.CREATE_FOURNISSEURS}><SuppliersForm /></PG>,
          },
          {
            path: "fournisseurs/:id/edit",
            element: <PG p={PERMISSIONS.UPDATE_FOURNISSEURS}><SuppliersForm /></PG>,
          },
          {
            path: "fournisseurs/:id",
            element: (
              <PG p={[PERMISSIONS.CREATE_FOURNISSEURS, PERMISSIONS.UPDATE_FOURNISSEURS, PERMISSIONS.DELETE_FOURNISSEURS]}>
                <SuppliersView />
              </PG>
            ),
          },

          // ── Sociétés (super admin only) ───────────────────────────────────
          {
            path: "societes",
            element: <SuperAdminRoute><SocietesPage /></SuperAdminRoute>,
          },
          {
            path: "societes/create",
            element: <SuperAdminRoute><SocietesForm /></SuperAdminRoute>,
          },
          {
            path: "societes/me",
            element: <SocieteView />,
          },
          {
            path: "societes/:id/edit",
            element: <SuperAdminRoute><SocietesForm /></SuperAdminRoute>,
          },
          {
            path: "societes/:id",
            element: <SuperAdminRoute><SocietesView /></SuperAdminRoute>,
          },

          // ── Dépôts (super admin managed) ─────────────────────────────────
          {
            path: "depots",
            element: <RepositoriesPage />,
          },
          {
            path: "depots/create",
            element: <RepositoryForm />,
          },
          {
            path: "depots/:id/edit",
            element: <RepositoryForm />,
          },
          {
            path: "depots/:id",
            element: <RepositoryView />,
          },

          // ── Stock ─────────────────────────────────────────────────────────
          {
            path: "stock",
            element: <PG p={PERMISSIONS.MANAGE_STOCK}><StockPage /></PG>,
          },

          // ── Inventaires ──────────────────────────────────────────────────
          {
            path: "inventaires",
            element: <PG p={PERMISSIONS.CREATE_INVENTORY}><InventoryPage /></PG>,
          },
          {
            path: "inventaires/create",
            element: <PG p={PERMISSIONS.CREATE_INVENTORY}><InventoryForm /></PG>,
          },
          {
            path: "inventaires/:id/edit",
            element: <PG p={PERMISSIONS.CREATE_INVENTORY}><InventoryEditForm /></PG>,
          },

          // ── Transferts ────────────────────────────────────────────────────
          {
            path: "transferts",
            element: (
              <PG p={[PERMISSIONS.CREATE_TRANSFER, PERMISSIONS.VALIDATE_TRANSFER, PERMISSIONS.DELETE_TRANSFER]}>
                <TransferStockPage />
              </PG>
            ),
          },
          {
            path: "transferts/create",
            element: <PG p={PERMISSIONS.CREATE_TRANSFER}><TransferForm /></PG>,
          },
          {
            path: "transferts/:id/edit",
            element: <PG p={PERMISSIONS.CREATE_TRANSFER}><TransferEditForm /></PG>,
          },

          // ── Mouvements de stock ───────────────────────────────────────────
          {
            path: "transactions",
            element: <PG p={PERMISSIONS.VIEW_STOCK_MOVEMENTS}><TransactionsPage /></PG>,
          },

          // ── Bons de Livraison ─────────────────────────────────────────────
          {
            path: "bon-livraisons",
            element: <PG p={PERMISSIONS.VIEW_BON_LIVRAISON}><BonLivraisonsPage /></PG>,
          },
          {
            path: "bon-livraisons/create",
            element: <PG p={PERMISSIONS.CREATE_BON_LIVRAISON}><BonLivraisonForm /></PG>,
          },
          {
            path: "bon-livraisons/:id/edit",
            element: <PG p={PERMISSIONS.UPDATE_BON_LIVRAISON}><BonLivraisonEditForm /></PG>,
          },
          {
            path: "bon-livraisons/:id/preview",
            element: <PG p={PERMISSIONS.VIEW_BON_LIVRAISON}><BonLivraisonPreviewPage /></PG>,
          },

          // ── Bons de commande (ventes) ─────────────────────────────────────
          {
            path: "bons-commande",
            element: <PG p={PERMISSIONS.VIEW_COMMANDE}><CommandesPage /></PG>,
          },
          {
            path: "bons-commande/create",
            element: <PG p={PERMISSIONS.CREATE_COMMANDE}><CommandeForm /></PG>,
          },
          {
            path: "bons-commande/:id/edit",
            element: <PG p={PERMISSIONS.UPDATE_COMMANDE}><CommandeForm /></PG>,
          },
          {
            path: "bons-commande/:id/preview",
            element: <PG p={PERMISSIONS.VIEW_COMMANDE}><CommandePreviewPage /></PG>,
          },

          // ── Bons de commande fournisseur ──────────────────────────────────
          {
            path: "bons-commande-fournisseur",
            element: <PG p={PERMISSIONS.VIEW_COMMANDE_FOURNISSEUR}><CommandesFournisseurPage /></PG>,
          },
          {
            path: "bons-commande-fournisseur/create",
            element: <PG p={PERMISSIONS.CREATE_COMMANDE_FOURNISSEUR}><CommandeFournisseurForm /></PG>,
          },
          {
            path: "bons-commande-fournisseur/:id/edit",
            element: <PG p={PERMISSIONS.UPDATE_COMMANDE_FOURNISSEUR}><CommandeFournisseurForm /></PG>,
          },
          {
            path: "bons-commande-fournisseur/:id/preview",
            element: <PG p={PERMISSIONS.VIEW_COMMANDE_FOURNISSEUR}><CommandeFournisseurPreviewPage /></PG>,
          },

          // ── Devis ─────────────────────────────────────────────────────────
          {
            path: "devis",
            element: <PG p={PERMISSIONS.VIEW_DEVIS}><DevisPage /></PG>,
          },
          {
            path: "devis/create",
            element: <PG p={PERMISSIONS.CREATE_DEVIS}><DevisForm /></PG>,
          },
          {
            path: "devis/:id/edit",
            element: <PG p={PERMISSIONS.UPDATE_DEVIS}><DevisForm /></PG>,
          },
          {
            path: "devis/:id/preview",
            element: <PG p={PERMISSIONS.VIEW_DEVIS}><DevisPreviewPage /></PG>,
          },

          // ── Factures ──────────────────────────────────────────────────────
          {
            path: "factures",
            element: <PG p={PERMISSIONS.VIEW_FACTURE}><FacturesPage /></PG>,
          },
          {
            path: "factures/create",
            element: <PG p={PERMISSIONS.CREATE_FACTURE}><FactureForm /></PG>,
          },
          {
            path: "factures/:id/preview",
            element: <PG p={PERMISSIONS.VIEW_FACTURE}><FacturePreviewPage /></PG>,
          },

          // ── Bons de Retour Clients ────────────────────────────────────────
          {
            path: "bon-retour-clients",
            element: <PG p={PERMISSIONS.VIEW_BON_RETOUR_CLIENT}><BonRetourClientsPage /></PG>,
          },
          {
            path: "bon-retour-clients/create",
            element: <PG p={PERMISSIONS.CREATE_BON_RETOUR_CLIENT}><BonRetourClientForm /></PG>,
          },
          {
            path: "bon-retour-clients/:id/edit",
            element: <PG p={PERMISSIONS.UPDATE_BON_RETOUR_CLIENT}><BonRetourClientEditForm /></PG>,
          },
          {
            path: "bon-retour-clients/:id/preview",
            element: <PG p={PERMISSIONS.VIEW_BON_RETOUR_CLIENT}><BonRetourClientPreviewPage /></PG>,
          },

          // ── Bons de Retour Fournisseurs ───────────────────────────────────
          {
            path: "bon-retour-fournisseurs",
            element: <PG p={PERMISSIONS.VIEW_BON_RETOUR_FOURNISSEUR}><BonRetourFournisseursPage /></PG>,
          },
          {
            path: "bon-retour-fournisseurs/create",
            element: <PG p={PERMISSIONS.CREATE_BON_RETOUR_FOURNISSEUR}><BonRetourFournisseurForm /></PG>,
          },
          {
            path: "bon-retour-fournisseurs/:id/edit",
            element: <PG p={PERMISSIONS.UPDATE_BON_RETOUR_FOURNISSEUR}><BonRetourFournisseurEditForm /></PG>,
          },
          {
            path: "bon-retour-fournisseurs/:id/preview",
            element: <PG p={PERMISSIONS.VIEW_BON_RETOUR_FOURNISSEUR}><BonRetourFournisseurPreviewPage /></PG>,
          },

          // ── Bons de Réception ─────────────────────────────────────────────
          {
            path: "bon-receptions",
            element: <PG p={PERMISSIONS.VIEW_BON_RECEPTION}><BonReceptionsPage /></PG>,
          },
          {
            path: "bon-receptions/create",
            element: <PG p={PERMISSIONS.CREATE_BON_RECEPTION}><BonReceptionForm /></PG>,
          },
          {
            path: "bon-receptions/:id/edit",
            element: <PG p={PERMISSIONS.UPDATE_BON_RECEPTION}><BonReceptionEditForm /></PG>,
          },
          {
            path: "bon-receptions/:id/preview",
            element: <PG p={PERMISSIONS.VIEW_BON_RECEPTION}><BonReceptionPreviewPage /></PG>,
          },

          // ── Règlements Clients ────────────────────────────────────────────
          {
            path: "reglements-client",
            element: (
              <PG p={[PERMISSIONS.CREATE_REGLEMENTS, PERMISSIONS.DELETE_REGLEMENTS]}>
                <ReglementClientsPage />
              </PG>
            ),
          },
          {
            path: "reglements-client/create",
            element: <PG p={PERMISSIONS.CREATE_REGLEMENTS}><ReglementClientForm /></PG>,
          },

          // ── Règlements Fournisseurs ───────────────────────────────────────
          {
            path: "reglements-fournisseur",
            element: (
              <PG p={[PERMISSIONS.CREATE_REGLEMENTS_FOURNISSEUR, PERMISSIONS.DELETE_REGLEMENTS_FOURNISSEUR]}>
                <ReglementFournisseursPage />
              </PG>
            ),
          },
          {
            path: "reglements-fournisseur/create",
            element: <PG p={PERMISSIONS.CREATE_REGLEMENTS_FOURNISSEUR}><ReglementFournisseurForm /></PG>,
          },

          // ── Banques ───────────────────────────────────────────────────────
          {
            path: "banque",
            element: (
              <PG p={[PERMISSIONS.CREATE_BANQUES, PERMISSIONS.UPDATE_BANQUES, PERMISSIONS.DELETE_BANQUES]}>
                <BanquesPage />
              </PG>
            ),
          },
          {
            path: "banque/create",
            element: <PG p={PERMISSIONS.CREATE_BANQUES}><BanqueForm /></PG>,
          },
          {
            path: "banque/:id/edit",
            element: <PG p={PERMISSIONS.UPDATE_BANQUES}><BanqueForm mode="edit" /></PG>,
          },

          // ── Livraisons (structure) ────────────────────────────────────────
          {
            path: "deliveries",
            element: (
              <PG p={[PERMISSIONS.CREATE_DELIVERIES, PERMISSIONS.UPDATE_DELIVERIES, PERMISSIONS.DELETE_DELIVERIES]}>
                <DeliveriesPage />
              </PG>
            ),
          },
          {
            path: "deliveries/create",
            element: <PG p={PERMISSIONS.CREATE_DELIVERIES}><DeliveryForm /></PG>,
          },
          {
            path: "deliveries/:id/edit",
            element: <PG p={PERMISSIONS.UPDATE_DELIVERIES}><DeliveryForm mode="edit" /></PG>,
          },

          // ── Delivery Provider Configs (no backend permission) ─────────────
          {
            path: "delivery-provider-configs",
            element: <DeliveryProviderConfigsPage />,
          },
          {
            path: "delivery-provider-configs/create",
            element: <DeliveryProviderConfigForm />,
          },
          {
            path: "delivery-provider-configs/:id/edit",
            element: <DeliveryProviderConfigForm mode="edit" />,
          },

          // ── Achats / Ventes / Situation ───────────────────────────────────
          {
            path: "achats",
            element: <AchatsPage />,
          },
          {
            path: "ventes",
            element: <VentesPage />,
          },
          {
            path: "situation-client",
            element: <PG p={PERMISSIONS.VIEW_BON_LIVRAISON}><SituationClientPage /></PG>,
          },
          {
            path: "situation-fournisseur",
            element: <PG p={PERMISSIONS.VIEW_BON_RECEPTION}><SituationFournisseurPage /></PG>,
          },

          // ── Saphir Management — Dashboard ─────────────────────────────────
          {
            path: "saphir-management-dashboard",
            element: <Navigate to="/dashboard" replace />,
          },
          {
            path: "/saphir-management-dashboard/commandes-par-statut",
            element: <RedirectToCommandesWithStatus />,
          },
          {
            path: "statistiques-commerciaux",
            element: (
              <PG p={PERMISSIONS.VIEW_ADVANCED_BL}>
                <CommercialStatsPage />
              </PG>
            ),
          },

          // ── Saphir Management — Agences ───────────────────────────────────
          {
            path: "agences",
            element: <PG p={PERMISSIONS.VIEW_AGENCE}><AgencesPage /></PG>,
          },
          {
            path: "agences/create",
            element: <PG p={PERMISSIONS.CREATE_AGENCE}><AgenceForm /></PG>,
          },
          {
            path: "agences/:id/edit",
            element: <PG p={PERMISSIONS.UPDATE_AGENCE}><AgenceFormEdit /></PG>,
          },

          // ── Saphir Management — Packs ─────────────────────────────────────
          {
            path: "packs",
            element: <PG p={PERMISSIONS.VIEW_PACK}><PacksPage /></PG>,
          },
          {
            path: "packs/create",
            element: <PG p={PERMISSIONS.CREATE_PACK}><PackForm /></PG>,
          },
          {
            path: "packs/:id/edit",
            element: <PG p={PERMISSIONS.UPDATE_PACK}><PackForm /></PG>,
          },

          // ── Saphir Management — Commandes (Advanced BL) ───────────────────
          {
            path: "commandes",
            element: <PG p={PERMISSIONS.VIEW_ADVANCED_BL}><CommandsPage /></PG>,
          },
          {
            path: "commandes/create",
            element: <PG p={PERMISSIONS.CREATE_ADVANCED_BL}><AdvancedBonLivraisonForm /></PG>,
          },
          {
            path: "commandes/:id/edit",
            element: <PG p={PERMISSIONS.UPDATE_ADVANCED_BL}><AdvancedBonLivraisonEditForm /></PG>,
          },
          {
            path: "commandes/:id",
            element: <PG p={PERMISSIONS.VIEW_ADVANCED_BL}><CommandDetailsPage /></PG>,
          },

          // ── Saphir Management — Colis Tracking ───────────────────────────
          {
            path: "colis-tracking",
            element: <PG p={PERMISSIONS.VIEW_ADVANCED_BL}><ColisTrackingPage /></PG>,
          },

          // ── Saphir Management — Planning Livraison ────────────────────────
          {
            path: "planning-livraison",
            element: <PG p={PERMISSIONS.VIEW_ADVANCED_BL}><PlanningLivraisonPage /></PG>,
          },

          // ── Attendance (ZKTeco imports) ──────────────────────────────────
          {
            path: "attendance",
            element: (
              <PG p={[PERMISSIONS.VIEW_ATTENDANCE, PERMISSIONS.MANAGE_ATTENDANCE]}>
                <AttendancePage />
              </PG>
            ),
          },

          // ── POS (open to all authenticated — role redirect handles Caissier) ─
          {
            path: "pos",
            element: <POSPage />,
          },

          // ── Profile (open to all authenticated) ──────────────────────────
          {
            path: "profile",
            element: <ProfilePage />,
          },

          // ── Users ─────────────────────────────────────────────────────────
          {
            path: "users",
            element: (
              <PG p={[PERMISSIONS.MANAGE_USERS, PERMISSIONS.CREATE_USER]}>
                <UsersPage />
              </PG>
            ),
          },
          {
            path: "users/create",
            element: <PG p={PERMISSIONS.CREATE_USER}><UserFormPage /></PG>,
          },
          {
            path: "users/:id/edit",
            element: <PG p={PERMISSIONS.MANAGE_USERS}><UserFormPage /></PG>,
          },
          {
            path: "users/:id",
            element: (
              <PG p={[PERMISSIONS.MANAGE_USERS, PERMISSIONS.CREATE_USER]}>
                <UserDetailsPage />
              </PG>
            ),
          },

          // ── Notifications ─────────────────────────────────────────────────
          {
            path: "notifications",
            element: <NotificationsPage />,
          },

          // ── Gestion de Caisse ─────────────────────────────────────────────
          {
            path: "my-wallet",
            element: <MyWalletPage />,
          },
          {
            path: "caisse",
            element: <PG p={PERMISSIONS.VIEW_CAISSE}><GestionCaissePage /></PG>,
          },
          {
            path: "caisse-users",
            element: <CaisseAdminRoute><PG p={PERMISSIONS.VIEW_CAISSE}><CaissesUsersPage /></PG></CaisseAdminRoute>,
          },

          // ── Attributes (no dedicated backend permission) ──────────────────
          {
            path: "attributes",
            element: <AttributePage />,
          },

          // ── Permissions & Settings ────────────────────────────────────────
          {
            path: "permissions",
            element: <PG p={PERMISSIONS.MANAGE_SETTINGS}><PermissionsPage /></PG>,
          },
          {
            path: "settings",
            element: <PG p={PERMISSIONS.MANAGE_SETTINGS}><SettingsPage /></PG>,
          },

          {
            path: "*",
            element: <ErrorPage />,
          },
        ],
      },
    ],
  },
]);
