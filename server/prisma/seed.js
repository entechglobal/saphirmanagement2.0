import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log(
    "🌱 Seed: Settings, Units, Roles, Super Admin, Société & Permissions...\n",
  );

  // ============================================
  // 1. SYSTEM SETTINGS
  // ============================================
  console.log("⚙️  Upserting System Settings...");
  await prisma.systemSettings.upsert({
    where: { id: 1 },
    update: {
      allowNegativeStock: false,
      systemStartHour: 0,
      systemEndHour: 0,
    },
    create: {
      id: 1,
      allowNegativeStock: false,
      systemStartHour: 0, // 0 to 0 = 24/7
      systemEndHour: 0,
    },
  });

  // ============================================
  // 2. UNITS
  // ============================================
  console.log("📏 Upserting Units...");
  const units = [
    { name: "Piece", symbol: "pc", allowsFractional: false },
    { name: "Pair", symbol: "pair", allowsFractional: false },
    { name: "Box", symbol: "box", allowsFractional: false },
  ];

  for (const unit of units) {
    await prisma.unit.upsert({
      where: { name: unit.name },
      update: { symbol: unit.symbol, allowsFractional: unit.allowsFractional },
      create: unit,
    });
  }

  // ============================================
  // 3. ROLES
  // ============================================
  console.log("📝 Upserting Roles...");
  const roleNames = [
    "Super_Admin",
    "Societe_Admin",
    "Caissier",
    "Gerant",
    "Commercial",
    "Preparateur",
    "Livreur",
  ];

  const roles = {};
  for (const name of roleNames) {
    roles[name] = await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // ============================================
  // 4. SOCIÉTÉ
  // ============================================
  console.log("🏢 Upserting Société...");
  const societe = await prisma.societe.upsert({
    where: { ice: "001234567890123" },
    update: {},
    create: {
      raisonSocial: "TechDistrib Morocco SARL",
      address: "Zone Industrielle Ain Sebaa, Lot 45",
      tel: "+212522345678",
      phone: "+212661234567",
      email: "contact@techdistrib.ma",
      siteWeb: "www.techdistrib.ma",
      ice: "001234567890123",
      rc: "123456",
      tp: "12345678",
      if: "98765432",
    },
  });

  // ============================================
  // 5. SUPER ADMIN USER
  // ============================================
  console.log("👤 Upserting Super Admin user...");
  const hashedPassword = await bcrypt.hash("12345678", 10);

  await prisma.user.upsert({
    where: { email: "superadmin@gmail.com" },
    update: {
      name: "Super Administrator",
      roleId: roles["Super_Admin"].id,
      societeId: null,
      isSuperAdmin: true,
    },
    create: {
      email: "superadmin@gmail.com",
      name: "Super Administrator",
      password: hashedPassword,
      roleId: roles["Super_Admin"].id,
      societeId: null,
      isSuperAdmin: true,
    },
  });

  // ============================================
  // 6. SYSTEM CLIENT  (default walk-in / passager client)
  // ============================================
  console.log("🧑‍🤝‍🧑 Upserting System Client...");
  const existingSystemClient = await prisma.client.findFirst({
    where: { societeId: societe.id, isSystem: true },
  });

  if (!existingSystemClient) {
    await prisma.client.create({
      data: {
        societeId: societe.id,
        name: "Client Système (Passager)",
        type: "PARTICULIER",
        isSystem: true,
        active: true,
      },
    });
  }

  // ============================================
  // 7. PERMISSIONS
  // ============================================
  console.log("🔐 Seeding Permissions...");
  const permissions = [
    // ── Articles & Variants ──────────────────────────────
    "view_article",
    "create_articles",
    "update_articles",
    "delete_articles",
    "import_articles",
    "create_variants",
    "update_variants",
    "delete_variants",
    // ── Clients & Fournisseurs ───────────────────────────
    "create_clients",
    "update_clients",
    "delete_clients",
    "import_clients",
    "create_fournisseurs",
    "update_fournisseurs",
    "delete_fournisseurs",
    "import_fournisseurs",
    // ── Stock & Inventory ────────────────────────────────
    "manage_stock",
    "view_stock_movements",
    "create_inventory",
    "create_transfer",
    "validate_transfer",
    "delete_transfer",
    // ── Bon de Livraison ─────────────────────────────────
    "view_bon_livraison",
    "create_bon_livraison",
    "update_bon_livraison",
    "delete_bon_livraison",
    "validate_bon_livraison",
    // ── Bon de commande (ventes) ─────────────────────────
    "view_commande",
    "create_commande",
    "update_commande",
    "delete_commande",
    // ── Bon de commande fournisseur (achats) ─────────────
    "view_commande_fournisseur",
    "create_commande_fournisseur",
    "update_commande_fournisseur",
    "delete_commande_fournisseur",
    // ── Devis ────────────────────────────────────────────
    "view_devis",
    "create_devis",
    "update_devis",
    "delete_devis",
    // ── Facture ──────────────────────────────────────────
    "view_facture",
    "create_facture",
    "update_facture",
    "delete_facture",
    // ── Bon de Réception ─────────────────────────────────
    "view_bon_reception",
    "create_bon_reception",
    "update_bon_reception",
    "delete_bon_reception",
    "validate_bon_reception",
    // ── Bon de Retour Client ─────────────────────────────
    "view_bon_retour_client",
    "create_bon_retour_client",
    "update_bon_retour_client",
    "delete_bon_retour_client",
    "validate_bon_retour_client",
    // ── Bon de Retour Fournisseur ────────────────────────
    "view_bon_retour_fournisseur",
    "create_bon_retour_fournisseur",
    "update_bon_retour_fournisseur",
    "delete_bon_retour_fournisseur",
    "validate_bon_retour_fournisseur",
    // ── Advanced Bon de Livraison ────────────────────────
    "view_advanced_bl",
    "create_advanced_bl",
    "update_advanced_bl",
    "delete_advanced_bl",
    "update_status_advanced_bl",
    "report_advanced_bl",
    // ── Caisse & Caisse Labels ───────────────────────────
    "view_caisse",
    "create_caisse",
    "update_caisse",
    "delete_caisse",
    "create_caisse_retrait",
    "create_caisse_depot",
    "create_caisse_label",
    "update_caisse_label",
    "delete_caisse_label",
    // ── Règlements ───────────────────────────────────────
    "create_reglements",
    "delete_reglements",
    "create_reglements_fournisseur",
    "delete_reglements_fournisseur",
    // ── Packs & Agences ──────────────────────────────────
    "view_pack",
    "create_pack",
    "update_pack",
    "delete_pack",
    "view_agence",
    "create_agence",
    "update_agence",
    "delete_agence",
    // ── Banques & Deliveries ─────────────────────────────
    "create_banques",
    "update_banques",
    "delete_banques",
    "create_deliveries",
    "update_deliveries",
    "delete_deliveries",
    // ── Delivery shifts ──────────────────────────────────
    "view_delivery_shifts",
    "manage_delivery_shifts",
    // ── Attendance (ZKTeco) ──────────────────────────────
    "view_attendance",
    "manage_attendance",
    // ── Users & Settings ─────────────────────────────────
    "manage_users",
    "create_user",
    "manage_settings",
  ];

  for (const permName of permissions) {
    await prisma.permission.upsert({
      where: { name: permName },
      update: {},
      create: { name: permName },
    });
  }

  // ============================================
  // SUMMARY
  // ============================================
  console.log("\n✅ Seed completed successfully!");
  console.log("\n📊 ========== SUMMARY ==========");
  console.log("⚙️  SystemSettings : 1  (24/7 mode, negative stock disabled)");
  console.log("📏 Units           : 3  (Piece, Pair, Box)");
  console.log(
    `📝 Roles           : ${roleNames.length}  (${roleNames.join(", ")})`,
  );
  console.log("🏢 Sociétés        : 1  (TechDistrib Morocco SARL)");
  console.log("🧑‍🤝‍🧑 System Client    : 1  (Client Système / Passager)");
  console.log("👤 Users           : 1  (Super Administrator)");
  console.log(`🔐 Permissions     : ${permissions.length}`);
  console.log("\n🔑 TEST CREDENTIAL (password: 12345678):");
  console.log("   superadmin@gmail.com  → Super_Admin");
  console.log("================================\n");
}

main()
  .catch((e) => {
    console.error("❌ Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
