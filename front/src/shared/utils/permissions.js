// ─── Permission constants (mirror backend seed exactly) ───────────────────────
export const PERMISSIONS = {
  // ── Articles & Variants ──────────────────────────────────────────────────
  VIEW_ARTICLE: "view_article", // Voir les articles
  CREATE_ARTICLES: "create_articles", // Créer des articles
  UPDATE_ARTICLES: "update_articles", // Modifier des articles
  DELETE_ARTICLES: "delete_articles", // Supprimer des articles
  IMPORT_ARTICLES: "import_articles", // Importer des articles
  CREATE_VARIANTS: "create_variants", // Créer des variantes
  UPDATE_VARIANTS: "update_variants", // Modifier des variantes
  DELETE_VARIANTS: "delete_variants", // Supprimer des variantes

  // ── Clients ──────────────────────────────────────────────────────────────
  CREATE_CLIENTS: "create_clients", // Créer des clients
  UPDATE_CLIENTS: "update_clients", // Modifier des clients
  DELETE_CLIENTS: "delete_clients", // Supprimer des clients
  IMPORT_CLIENTS: "import_clients", // Importer des clients

  // ── Fournisseurs ─────────────────────────────────────────────────────────
  CREATE_FOURNISSEURS: "create_fournisseurs", // Créer des fournisseurs
  UPDATE_FOURNISSEURS: "update_fournisseurs", // Modifier des fournisseurs
  DELETE_FOURNISSEURS: "delete_fournisseurs", // Supprimer des fournisseurs
  IMPORT_FOURNISSEURS: "import_fournisseurs", // Importer des fournisseurs

  // ── Stock & Inventory ────────────────────────────────────────────────────
  MANAGE_STOCK: "manage_stock", // Gérer le stock
  VIEW_STOCK_MOVEMENTS: "view_stock_movements", // Voir les mouvements de stock
  CREATE_INVENTORY: "create_inventory", // Créer un inventaire
  CREATE_TRANSFER: "create_transfer", // Créer un transfert
  VALIDATE_TRANSFER: "validate_transfer", // Valider un transfert
  DELETE_TRANSFER: "delete_transfer", // Supprimer un transfert

  // ── Bon de Livraison ─────────────────────────────────────────────────────
  VIEW_BON_LIVRAISON: "view_bon_livraison", // Voir les bons de livraison
  CREATE_BON_LIVRAISON: "create_bon_livraison", // Créer un bon de livraison
  UPDATE_BON_LIVRAISON: "update_bon_livraison", // Modifier un bon de livraison
  DELETE_BON_LIVRAISON: "delete_bon_livraison", // Supprimer un bon de livraison
  VALIDATE_BON_LIVRAISON: "validate_bon_livraison", // Valider un bon de livraison

  // ── Bon de commande (ventes) ─────────────────────────────────────────────
  VIEW_COMMANDE: "view_commande",
  CREATE_COMMANDE: "create_commande",
  UPDATE_COMMANDE: "update_commande",
  DELETE_COMMANDE: "delete_commande",

  // ── Bon de commande fournisseur (achats) ─────────────────────────────────
  VIEW_COMMANDE_FOURNISSEUR: "view_commande_fournisseur",
  CREATE_COMMANDE_FOURNISSEUR: "create_commande_fournisseur",
  UPDATE_COMMANDE_FOURNISSEUR: "update_commande_fournisseur",
  DELETE_COMMANDE_FOURNISSEUR: "delete_commande_fournisseur",

  // ── Devis ────────────────────────────────────────────────────────────────
  VIEW_DEVIS: "view_devis",
  CREATE_DEVIS: "create_devis",
  UPDATE_DEVIS: "update_devis",
  DELETE_DEVIS: "delete_devis",

  // ── Facture ──────────────────────────────────────────────────────────────
  VIEW_FACTURE: "view_facture",
  CREATE_FACTURE: "create_facture",
  UPDATE_FACTURE: "update_facture",
  DELETE_FACTURE: "delete_facture",

  // ── Bon de Réception ─────────────────────────────────────────────────────
  VIEW_BON_RECEPTION: "view_bon_reception", // Voir les bons de réception
  CREATE_BON_RECEPTION: "create_bon_reception", // Créer un bon de réception
  UPDATE_BON_RECEPTION: "update_bon_reception", // Modifier un bon de réception
  DELETE_BON_RECEPTION: "delete_bon_reception", // Supprimer un bon de réception
  VALIDATE_BON_RECEPTION: "validate_bon_reception", // Valider un bon de réception

  // ── Bon de Retour Client ─────────────────────────────────────────────────
  VIEW_BON_RETOUR_CLIENT: "view_bon_retour_client", // Voir les bons de retour client
  CREATE_BON_RETOUR_CLIENT: "create_bon_retour_client", // Créer un bon de retour client
  UPDATE_BON_RETOUR_CLIENT: "update_bon_retour_client", // Modifier un bon de retour client
  DELETE_BON_RETOUR_CLIENT: "delete_bon_retour_client", // Supprimer un bon de retour client
  VALIDATE_BON_RETOUR_CLIENT: "validate_bon_retour_client", // Valider un bon de retour client

  // ── Bon de Retour Fournisseur ────────────────────────────────────────────
  VIEW_BON_RETOUR_FOURNISSEUR: "view_bon_retour_fournisseur",
  CREATE_BON_RETOUR_FOURNISSEUR: "create_bon_retour_fournisseur",
  UPDATE_BON_RETOUR_FOURNISSEUR: "update_bon_retour_fournisseur",
  DELETE_BON_RETOUR_FOURNISSEUR: "delete_bon_retour_fournisseur",
  VALIDATE_BON_RETOUR_FOURNISSEUR: "validate_bon_retour_fournisseur",

  // ── Advanced Bon de Livraison (Commandes) ────────────────────────────────
  VIEW_ADVANCED_BL: "view_advanced_bl", // Voir les commandes (BL avancé)
  CREATE_ADVANCED_BL: "create_advanced_bl", // Créer une commande (BL avancé)
  UPDATE_ADVANCED_BL: "update_advanced_bl", // Modifier une commande (BL avancé)
  DELETE_ADVANCED_BL: "delete_advanced_bl", // Supprimer une commande (BL avancé)
  UPDATE_STATUS_ADVANCED_BL: "update_status_advanced_bl", // Modifier le statut d'une commande (BL avancé)
  REPORT_ADVANCED_BL: "report_advanced_bl", // Générer un rapport des commandes (BL avancé)

  // ── Caisse & Labels ──────────────────────────────────────────────────────
  VIEW_CAISSE: "view_caisse", // Voir la caisse
  CREATE_CAISSE: "create_caisse", // Créer une caisse
  UPDATE_CAISSE: "update_caisse", // Modifier une caisse
  DELETE_CAISSE: "delete_caisse", // Supprimer une caisse
  CREATE_CAISSE_RETRAIT: "create_caisse_retrait", // Créer un retrait de caisse
  CREATE_CAISSE_DEPOT: "create_caisse_depot", // Créer un dépôt de caisse
  CREATE_CAISSE_LABEL: "create_caisse_label", // Créer une étiquette de caisse
  UPDATE_CAISSE_LABEL: "update_caisse_label", // Modifier une étiquette de caisse
  DELETE_CAISSE_LABEL: "delete_caisse_label", // Supprimer une étiquette de caisse

  // ── Règlements ───────────────────────────────────────────────────────────
  CREATE_REGLEMENTS: "create_reglements", // Créer un règlement (client)
  DELETE_REGLEMENTS: "delete_reglements", // Supprimer un règlement (client)
  CREATE_REGLEMENTS_FOURNISSEUR: "create_reglements_fournisseur", // Créer un règlement fournisseur
  DELETE_REGLEMENTS_FOURNISSEUR: "delete_reglements_fournisseur", // Supprimer un règlement fournisseur

  // ── Packs ────────────────────────────────────────────────────────────────
  VIEW_PACK: "view_pack", // Voir les packs
  CREATE_PACK: "create_pack", // Créer un pack
  UPDATE_PACK: "update_pack", // Modifier un pack
  DELETE_PACK: "delete_pack", // Supprimer un pack

  // ── Agences ──────────────────────────────────────────────────────────────
  VIEW_AGENCE: "view_agence", // Voir les agences
  CREATE_AGENCE: "create_agence", // Créer une agence
  UPDATE_AGENCE: "update_agence", // Modifier une agence
  DELETE_AGENCE: "delete_agence", // Supprimer une agence

  // ── Attendance (ZKTeco) ──────────────────────────────────────────────────
  VIEW_ATTENDANCE: "view_attendance",
  MANAGE_ATTENDANCE: "manage_attendance",

  // ── Banques ──────────────────────────────────────────────────────────────
  CREATE_BANQUES: "create_banques", // Créer une banque
  UPDATE_BANQUES: "update_banques", // Modifier une banque
  DELETE_BANQUES: "delete_banques", // Supprimer une banque

  // ── Livraisons (structure) ───────────────────────────────────────────────
  CREATE_DELIVERIES: "create_deliveries", // Créer une livraison
  UPDATE_DELIVERIES: "update_deliveries", // Modifier une livraison
  DELETE_DELIVERIES: "delete_deliveries", // Supprimer une livraison

  // ── Users & Settings ─────────────────────────────────────────────────────
  MANAGE_USERS: "manage_users", // Gérer les utilisateurs
  CREATE_USER: "create_user", // Créer un utilisateur
  MANAGE_SETTINGS: "manage_settings", // Gérer les paramètres
};

// ─── French labels for permission keys (frontend display only, backend keys unchanged) ─
export const PERMISSION_LABELS = {
  view_article: "Voir les articles",
  create_articles: "Créer des articles",
  update_articles: "Modifier des articles",
  delete_articles: "Supprimer des articles",
  import_articles: "Importer des articles",
  create_variants: "Créer des variantes",
  update_variants: "Modifier des variantes",
  delete_variants: "Supprimer des variantes",

  create_clients: "Créer des clients",
  update_clients: "Modifier des clients",
  delete_clients: "Supprimer des clients",
  import_clients: "Importer des clients",

  create_fournisseurs: "Créer des fournisseurs",
  update_fournisseurs: "Modifier des fournisseurs",
  delete_fournisseurs: "Supprimer des fournisseurs",
  import_fournisseurs: "Importer des fournisseurs",

  manage_stock: "Gérer le stock",
  view_stock_movements: "Voir les mouvements de stock",
  create_inventory: "Créer un inventaire",
  create_transfer: "Créer un transfert",
  validate_transfer: "Valider un transfert",
  delete_transfer: "Supprimer un transfert",

  view_bon_livraison: "Voir les bons de livraison",
  create_bon_livraison: "Créer un bon de livraison",
  update_bon_livraison: "Modifier un bon de livraison",
  delete_bon_livraison: "Supprimer un bon de livraison",
  validate_bon_livraison: "Valider un bon de livraison",

  view_commande: "Voir les bons de commande",
  create_commande: "Créer un bon de commande",
  update_commande: "Modifier un bon de commande",
  delete_commande: "Supprimer un bon de commande",

  view_commande_fournisseur: "Voir les bons de commande fournisseur",
  create_commande_fournisseur: "Créer un bon de commande fournisseur",
  update_commande_fournisseur: "Modifier un bon de commande fournisseur",
  delete_commande_fournisseur: "Supprimer un bon de commande fournisseur",

  view_devis: "Voir les devis",
  create_devis: "Créer un devis",
  update_devis: "Modifier un devis",
  delete_devis: "Supprimer un devis",

  view_facture: "Voir les factures",
  create_facture: "Créer une facture",
  update_facture: "Modifier une facture",
  delete_facture: "Supprimer une facture",

  view_bon_reception: "Voir les bons de réception",
  create_bon_reception: "Créer un bon de réception",
  update_bon_reception: "Modifier un bon de réception",
  delete_bon_reception: "Supprimer un bon de réception",
  validate_bon_reception: "Valider un bon de réception",

  view_bon_retour_client: "Voir les bons de retour client",
  create_bon_retour_client: "Créer un bon de retour client",
  update_bon_retour_client: "Modifier un bon de retour client",
  delete_bon_retour_client: "Supprimer un bon de retour client",
  validate_bon_retour_client: "Valider un bon de retour client",

  view_bon_retour_fournisseur: "Voir les bons de retour fournisseur",
  create_bon_retour_fournisseur: "Créer un bon de retour fournisseur",
  update_bon_retour_fournisseur: "Modifier un bon de retour fournisseur",
  delete_bon_retour_fournisseur: "Supprimer un bon de retour fournisseur",
  validate_bon_retour_fournisseur: "Valider un bon de retour fournisseur",

  view_advanced_bl: "Voir les commandes (BL avancé)",
  create_advanced_bl: "Créer une commande (BL avancé)",
  update_advanced_bl: "Modifier une commande (BL avancé)",
  delete_advanced_bl: "Supprimer une commande (BL avancé)",
  update_status_advanced_bl: "Modifier le statut d'une commande (BL avancé)",
  report_advanced_bl: "Générer un rapport des commandes (BL avancé)",

  view_caisse: "Voir la caisse",
  create_caisse: "Créer une caisse",
  update_caisse: "Modifier une caisse",
  delete_caisse: "Supprimer une caisse",
  create_caisse_retrait: "Créer un retrait de caisse",
  create_caisse_depot: "Créer un dépôt de caisse",
  create_caisse_label: "Créer une étiquette de caisse",
  update_caisse_label: "Modifier une étiquette de caisse",
  delete_caisse_label: "Supprimer une étiquette de caisse",

  create_reglements: "Créer un règlement (client)",
  delete_reglements: "Supprimer un règlement (client)",
  create_reglements_fournisseur: "Créer un règlement fournisseur",
  delete_reglements_fournisseur: "Supprimer un règlement fournisseur",

  view_pack: "Voir les packs",
  create_pack: "Créer un pack",
  update_pack: "Modifier un pack",
  delete_pack: "Supprimer un pack",

  view_agence: "Voir les agences",
  create_agence: "Créer une agence",
  update_agence: "Modifier une agence",
  delete_agence: "Supprimer une agence",

  view_attendance: "Voir le pointage",
  manage_attendance: "Gérer le pointage",

  create_banques: "Créer une banque",
  update_banques: "Modifier une banque",
  delete_banques: "Supprimer une banque",

  create_deliveries: "Créer une livraison",
  update_deliveries: "Modifier une livraison",
  delete_deliveries: "Supprimer une livraison",

  manage_users: "Gérer les utilisateurs",
  create_user: "Créer un utilisateur",
  manage_settings: "Gérer les paramètres",
};

// Returns the French label for a permission key, falling back to a formatted
// version of the raw name for permissions not in the static map (e.g. custom
// ones created via the "create permission" UI).
export const getPermissionLabel = (name) =>
  PERMISSION_LABELS[name] ??
  name?.replace(/[_.]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim() ??
  name;

// ─── Core permission checking functions ───────────────────────────────────────

export const isAuthenticated = (status, accessToken) =>
  status === "authenticated" && !!accessToken;

export const getUserRoleName = (user) => {
  if (!user) return "";
  if (user.roleName) return String(user.roleName);
  if (typeof user.role === "string") return user.role;
  return user.role?.name ?? "";
};

const roleKey = (user) =>
  getUserRoleName(user).trim().toLowerCase().replace(/[\s_-]+/g, "");

export const isSuperAdmin = (user) =>
  !!user?.isSuperAdmin || roleKey(user) === "superadmin";

export const isSocieteAdmin = (user) => roleKey(user) === "societeadmin";

export const isAdminUser = (user) => isSuperAdmin(user) || isSocieteAdmin(user);

export const getPermissions = (user) => user?.permissions || [];

export const hasPermission = (user, permission) => {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  if (user.permissions?.includes("*")) return true;
  return user.permissions?.includes(permission) || false;
};

export const hasAnyPermission = (user, permissions) =>
  permissions.some((perm) => hasPermission(user, perm));

export const hasAllPermissions = (user, permissions) =>
  permissions.every((perm) => hasPermission(user, perm));

export const hasResourcePermission = (user, resource, action, resourceId = null) => {
  if (resourceId && hasPermission(user, `${resource}:${resourceId}:${action}`)) return true;
  return hasPermission(user, `${resource}:${action}`);
};
