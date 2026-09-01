import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SOCIETE_ICE = "001234567890123";

const findOrCreate = async (model, where, data) => {
  const existing = await prisma[model].findFirst({ where });
  if (existing) return existing;
  return prisma[model].create({ data });
};

async function main() {
  console.log("🌱 Demo seed: clients, articles, fournisseurs, stock…\n");

  const societe = await prisma.societe.findUnique({
    where: { ice: SOCIETE_ICE },
  });
  if (!societe) {
    throw new Error(
      "Société TechDistrib introuvable. Lancez d'abord `npm run seed` dans /server.",
    );
  }

  const piece = await prisma.unit.findUnique({ where: { name: "Piece" } });
  const box = await prisma.unit.findUnique({ where: { name: "Box" } });
  if (!piece) {
    throw new Error("Unité Piece introuvable. Lancez d'abord `npm run seed`.");
  }

  // ── Depots ──────────────────────────────────────────────
  console.log("🏬 Depots…");
  const depotCasa = await findOrCreate(
    "depot",
    { societeId: societe.id, code: "DEP-CASA" },
    {
      societeId: societe.id,
      code: "DEP-CASA",
      name: "Dépôt Principal Casablanca",
      address: "Zone Industrielle Ain Sebaa, Lot 45",
      city: "Casablanca",
      region: "Casablanca-Settat",
      phone: "+212522345678",
      type: "PRINCIPAL",
      active: true,
    },
  );
  const depotRabat = await findOrCreate(
    "depot",
    { societeId: societe.id, code: "DEP-RAB" },
    {
      societeId: societe.id,
      code: "DEP-RAB",
      name: "Dépôt Rabat",
      address: "Hay Riad, Avenue Annakhil",
      city: "Rabat",
      region: "Rabat-Salé-Kénitra",
      phone: "+212537654321",
      type: "SECONDARY",
      active: true,
    },
  );

  // ── Categories & families ───────────────────────────────
  console.log("📁 Categories & families…");
  // TVA and remise are decimal fractions app-wide (0.20 = 20%)
  const catDefs = [
    {
      name: "Informatique",
      families: [
        { name: "Ordinateurs", tva: 0.2, remise: 0.1 },
        { name: "Périphériques", tva: 0.2, remise: 0.15 },
      ],
    },
    {
      name: "Téléphonie",
      families: [
        { name: "Smartphones", tva: 0.2, remise: 0.05 },
        { name: "Tablettes", tva: 0.2, remise: 0.08 },
      ],
    },
    {
      name: "Accessoires",
      families: [{ name: "Câbles & Chargeurs", tva: 0.2, remise: 0.2 }],
    },
    {
      name: "Consommables",
      families: [{ name: "Papeterie", tva: 0.2, remise: 0.1 }],
    },
  ];

  const families = {};
  for (const cat of catDefs) {
    const category = await findOrCreate(
      "category",
      { name: cat.name },
      { name: cat.name, visible: true },
    );
    for (const fam of cat.families) {
      families[fam.name] = await findOrCreate(
        "family",
        { name: fam.name },
        {
          categoryId: category.id,
          name: fam.name,
          manageInStock: true,
          TVA: fam.tva,
          remise: fam.remise,
          visible: true,
        },
      );
    }
  }

  // ── Attributes (for variants) ───────────────────────────
  console.log("🎨 Attributes…");
  const attrColor = await findOrCreate(
    "attribute",
    { name: "Couleur" },
    { name: "Couleur" },
  );
  const colorValues = {};
  for (const value of ["Noir", "Blanc", "Bleu"]) {
    colorValues[value] = await findOrCreate(
      "attributeValue",
      { attributeId: attrColor.id, value },
      { attributeId: attrColor.id, value },
    );
  }

  // ── Articles ────────────────────────────────────────────
  console.log("📦 Articles…");
  const articleDefs = [
    {
      barcode: "DEMO-PC-001",
      name: "Dell Latitude 5540 i5 16Go",
      family: "Ordinateurs",
      prixAchat: 7200,
      prixVente1: 8990,
      prixVente2: 8690,
      prixVente3: 8490,
      stockCasa: 12,
      stockRabat: 4,
    },
    {
      barcode: "DEMO-PC-002",
      name: "HP EliteBook 840 G10",
      family: "Ordinateurs",
      prixAchat: 8100,
      prixVente1: 9990,
      prixVente2: 9690,
      prixVente3: 9390,
      stockCasa: 8,
      stockRabat: 2,
    },
    {
      barcode: "DEMO-PC-003",
      name: "Lenovo ThinkPad E14 Gen 5",
      family: "Ordinateurs",
      prixAchat: 6500,
      prixVente1: 7990,
      prixVente2: 7790,
      prixVente3: 7590,
      stockCasa: 15,
      stockRabat: 5,
    },
    {
      barcode: "DEMO-PER-001",
      name: "Souris Logitech MX Master 3S",
      family: "Périphériques",
      prixAchat: 480,
      prixVente1: 799,
      prixVente2: 749,
      prixVente3: 699,
      stockCasa: 40,
      stockRabat: 15,
    },
    {
      barcode: "DEMO-PER-002",
      name: "Clavier mécanique Keychron K2",
      family: "Périphériques",
      prixAchat: 620,
      prixVente1: 990,
      prixVente2: 940,
      prixVente3: 890,
      stockCasa: 25,
      stockRabat: 8,
    },
    {
      barcode: "DEMO-PER-003",
      name: "Écran Dell 27\" USB-C P2723DE",
      family: "Périphériques",
      prixAchat: 2100,
      prixVente1: 2790,
      prixVente2: 2690,
      prixVente3: 2590,
      stockCasa: 10,
      stockRabat: 3,
    },
    {
      barcode: "DEMO-PH-001",
      name: "Samsung Galaxy A55 128Go",
      family: "Smartphones",
      prixAchat: 2800,
      prixVente1: 3590,
      prixVente2: 3490,
      prixVente3: 3390,
      stockCasa: 20,
      stockRabat: 6,
    },
    {
      barcode: "DEMO-PH-002",
      name: "iPhone 15 128Go",
      family: "Smartphones",
      prixAchat: 8200,
      prixVente1: 9990,
      prixVente2: 9790,
      prixVente3: 9590,
      stockCasa: 6,
      stockRabat: 2,
    },
    {
      barcode: "DEMO-TAB-001",
      name: "iPad 10e génération 64Go",
      family: "Tablettes",
      prixAchat: 3400,
      prixVente1: 4290,
      prixVente2: 4190,
      prixVente3: 4090,
      stockCasa: 9,
      stockRabat: 3,
    },
    {
      barcode: "DEMO-ACC-001",
      name: "Câble USB-C 2m Anker",
      family: "Câbles & Chargeurs",
      prixAchat: 45,
      prixVente1: 89,
      prixVente2: 79,
      prixVente3: 69,
      stockCasa: 80,
      stockRabat: 30,
    },
    {
      barcode: "DEMO-ACC-002",
      name: "Chargeur 65W GaN",
      family: "Câbles & Chargeurs",
      prixAchat: 95,
      prixVente1: 179,
      prixVente2: 159,
      prixVente3: 149,
      stockCasa: 50,
      stockRabat: 18,
    },
    {
      barcode: "DEMO-PAP-001",
      name: "Ramette papier A4 80g (500 feuilles)",
      family: "Papeterie",
      prixAchat: 38,
      prixVente1: 59,
      prixVente2: 54,
      prixVente3: 49,
      stockCasa: 120,
      stockRabat: 40,
      unitId: box?.id,
    },
    {
      barcode: "DEMO-COQ-001",
      name: "Coque iPhone 15 silicone",
      family: "Câbles & Chargeurs",
      prixAchat: 25,
      prixVente1: 79,
      prixVente2: 69,
      prixVente3: 59,
      stockCasa: 0,
      stockRabat: 0,
      withVariants: true,
    },
  ];

  const articles = {};
  for (const def of articleDefs) {
    const article = await findOrCreate(
      "article",
      { barcode: def.barcode },
      {
        familyId: families[def.family].id,
        barcode: def.barcode,
        name: def.name,
        visible: true,
        gereEnStock: true,
        unitePrincipaleId: def.unitId ?? piece.id,
        prixAchat: def.prixAchat,
        prixVente1: def.prixVente1,
        prixVente2: def.prixVente2,
        prixVente3: def.prixVente3,
      },
    );
    articles[def.barcode] = article;

    for (const [depot, qty] of [
      [depotCasa, def.stockCasa],
      [depotRabat, def.stockRabat],
    ]) {
      if (!qty) continue;
      await findOrCreate(
        "stockByDepot",
        { depotId: depot.id, articleId: article.id },
        {
          depotId: depot.id,
          articleId: article.id,
          quantityAvailable: qty,
          alertThreshold: 3,
        },
      );
    }
  }

  // Variants for coque
  console.log("🧩 Variants…");
  const coque = articles["DEMO-COQ-001"];
  const variantDefs = [
    { barcode: "DEMO-COQ-001-N", name: "Coque iPhone 15 — Noir", color: "Noir", qty: 30 },
    { barcode: "DEMO-COQ-001-B", name: "Coque iPhone 15 — Blanc", color: "Blanc", qty: 22 },
    { barcode: "DEMO-COQ-001-L", name: "Coque iPhone 15 — Bleu", color: "Bleu", qty: 18 },
  ];
  const variants = {};
  for (const v of variantDefs) {
    const variant = await findOrCreate(
      "articleVariant",
      { barcode: v.barcode },
      { articleId: coque.id, barcode: v.barcode, name: v.name },
    );
    variants[v.barcode] = variant;
    await findOrCreate(
      "variantAttribute",
      { variantId: variant.id, attributeId: attrColor.id },
      {
        variantId: variant.id,
        attributeId: attrColor.id,
        attributeValueId: colorValues[v.color].id,
      },
    );
    await findOrCreate(
      "stockByDepot",
      { depotId: depotCasa.id, variantId: variant.id },
      {
        depotId: depotCasa.id,
        variantId: variant.id,
        quantityAvailable: v.qty,
        alertThreshold: 5,
      },
    );
  }

  // ── Clients ─────────────────────────────────────────────
  console.log("👥 Clients…");
  const clientDefs = [
    {
      name: "Karim Benali",
      type: "PARTICULIER",
      phone: "0661122334",
      email: "karim.benali@gmail.com",
      address: "Résidence Al Andalous, Maarif",
      region: "Casablanca-Settat",
    },
    {
      name: "Fatima Zahra El Amrani",
      type: "PARTICULIER",
      phone: "0661987654",
      email: "fz.elamrani@gmail.com",
      address: "Hay Riad, Secteur 13",
      region: "Rabat-Salé-Kénitra",
    },
    {
      name: "Youssef Tahiri",
      type: "PARTICULIER",
      phone: "0661456789",
      email: "youssef.tahiri@outlook.com",
      address: "Guéliz, Avenue Mohammed V",
      region: "Marrakech-Safi",
    },
    {
      name: "Sara Idrissi",
      type: "PARTICULIER",
      phone: "0661789012",
      email: "sara.idrissi@gmail.com",
      address: "Malabata, Boulevard Mohammed VI",
      region: "Tanger-Tétouan-Al Hoceima",
    },
    {
      name: "Omar Chraibi",
      type: "PARTICULIER",
      phone: "0661345678",
      email: "omar.chraibi@yahoo.fr",
      address: "Agdal, Rue de Fès",
      region: "Rabat-Salé-Kénitra",
      creditLimit: 15000,
      paymentDeadline: 30,
    },
    {
      name: "Atlas Soft SARL",
      type: "SOCIETE",
      phone: "0522345678",
      email: "achat@atlassoft.ma",
      website: "www.atlassoft.ma",
      address: "Twin Center, Tour Ouest, Casablanca",
      region: "Casablanca-Settat",
      ice: "001111111111111",
      if: "11111111",
      rc: "CAS-88991",
      tp: "TP11111",
      creditLimit: 80000,
      paymentDeadline: 45,
      discount: 0.05,
    },
    {
      name: "Maroc Logistic SA",
      type: "SOCIETE",
      phone: "0537765432",
      email: "commande@maroclogistic.ma",
      website: "www.maroclogistic.ma",
      address: "Zone Franche Tanger Med",
      region: "Tanger-Tétouan-Al Hoceima",
      ice: "002222222222222",
      if: "22222222",
      rc: "TNG-44012",
      tp: "TP22222",
      creditLimit: 120000,
      paymentDeadline: 60,
      discount: 0.08,
    },
    {
      name: "Café Digital SPRL",
      type: "SOCIETE",
      phone: "0524889900",
      email: "hello@cafedigital.ma",
      address: "Guéliz, Rue Ibn Aicha, Marrakech",
      region: "Marrakech-Safi",
      ice: "003333333333333",
      if: "33333333",
      rc: "MAR-12045",
      creditLimit: 25000,
      paymentDeadline: 30,
    },
    {
      name: "École Al Amal",
      type: "SOCIETE",
      phone: "0537201122",
      email: "direction@alamal.ma",
      address: "Agdal, Avenue de France, Rabat",
      region: "Rabat-Salé-Kénitra",
      ice: "004444444444444",
      if: "44444444",
      rc: "RAB-33021",
      creditLimit: 40000,
      paymentDeadline: 30,
      discount: 0.1,
    },
    {
      name: "Nada Bennis",
      type: "PARTICULIER",
      phone: "0661678901",
      email: "nada.bennis@gmail.com",
      address: "Californie, Casablanca",
      region: "Casablanca-Settat",
    },
  ];

  for (const c of clientDefs) {
    await findOrCreate(
      "client",
      { societeId: societe.id, phone: c.phone },
      { ...c, societeId: societe.id, active: true },
    );
  }

  // ── Fournisseurs ────────────────────────────────────────
  console.log("🏭 Fournisseurs…");
  const frsDefs = [
    {
      name: "Dell Maroc Distribution",
      phone: "0522112233",
      email: "ventes@dell-maroc.ma",
      website: "www.dell.com",
      address: "Sidi Maarouf, Casablanca",
      region: "Casablanca-Settat",
      ice: "005555555555555",
      if: "55555555",
      rc: "CAS-DEL01",
      paymentDeadline: 45,
      bankName: "Attijariwafa Bank",
      bankAccount: "007780000012345678901234",
    },
    {
      name: "HP Maghreb",
      phone: "0522445566",
      email: "commandes@hp-maghreb.ma",
      website: "www.hp.com",
      address: "Casa Nearshore Park",
      region: "Casablanca-Settat",
      ice: "006666666666666",
      if: "66666666",
      rc: "CAS-HP002",
      paymentDeadline: 30,
      bankName: "BMCE Bank",
      bankAccount: "011780000098765432109876",
    },
    {
      name: "Samsung Electronics Maroc",
      phone: "0522778899",
      email: "b2b@samsung.ma",
      address: "Ain Sebaa, Casablanca",
      region: "Casablanca-Settat",
      ice: "007777777777777",
      if: "77777777",
      rc: "CAS-SAM03",
      paymentDeadline: 60,
      bankName: "CIH Bank",
      bankAccount: "230780000011223344556677",
    },
    {
      name: "Anker Official Store MA",
      phone: "0522990011",
      email: "wholesale@anker.ma",
      address: "Derb Omar, Casablanca",
      region: "Casablanca-Settat",
      ice: "008888888888888",
      if: "88888888",
      rc: "CAS-ANK04",
      paymentDeadline: 15,
    },
    {
      name: "Papeterie Atlas Gros",
      phone: "0537556677",
      email: "gros@atlas-papier.ma",
      address: "Takaddoum, Rabat",
      region: "Rabat-Salé-Kénitra",
      ice: "009999999999999",
      if: "99999999",
      rc: "RAB-PAP05",
      paymentDeadline: 30,
    },
    {
      name: "Lenovo Partner Maroc",
      phone: "0522334455",
      email: "partner@lenovo.ma",
      address: "Bouskoura, Casablanca",
      region: "Casablanca-Settat",
      ice: "001010101010101",
      if: "10101010",
      rc: "CAS-LEN06",
      paymentDeadline: 45,
    },
  ];

  for (const f of frsDefs) {
    await findOrCreate(
      "fournisseur",
      { societeId: societe.id, phone: f.phone },
      { ...f, societeId: societe.id, type: "SOCIETE", active: true },
    );
  }

  // ── Banques ─────────────────────────────────────────────
  console.log("🏦 Banques…");
  const banqueDefs = [
    { name: "Attijariwafa Bank — Casa Centre", RIB: "007780000012345678901234", ville: "Casablanca" },
    { name: "BMCE Bank — Rabat Agdal", RIB: "011780000098765432109876", ville: "Rabat" },
    { name: "CIH Bank — Maarif", RIB: "230780000011223344556677", ville: "Casablanca" },
  ];
  for (const b of banqueDefs) {
    await findOrCreate("banque", { name: b.name }, b);
  }

  // ── Deliveries ──────────────────────────────────────────
  console.log("🚚 Livreurs…");
  const deliveryDefs = [
    {
      name: "Hassan Livreur Casa",
      type: "INTERN",
      entityType: "PARTICULIER",
      tel: "0662001122",
      address: "Ain Sebaa, Casablanca",
    },
    {
      name: "Amana Express",
      type: "EXTERN",
      entityType: "SOCIETE",
      tel: "0522113344",
      address: "Sidi Bernoussi, Casablanca",
    },
  ];
  for (const d of deliveryDefs) {
    await findOrCreate(
      "delivery",
      { societeId: societe.id, name: d.name },
      { ...d, societeId: societe.id, active: true },
    );
  }

  // ── Agences ─────────────────────────────────────────────
  console.log("🏪 Agences…");
  for (const a of [
    { name: "Agence Casablanca", localisation: "Maarif", responsable: "Rachid Alaoui" },
    { name: "Agence Rabat", localisation: "Agdal", responsable: "Imane Senhaji" },
  ]) {
    await findOrCreate(
      "agence",
      { societeId: societe.id, name: a.name },
      { ...a, societeId: societe.id, active: true },
    );
  }

  // ── Pack ────────────────────────────────────────────────
  console.log("🎁 Pack…");
  const souris = articles["DEMO-PER-001"];
  const clavier = articles["DEMO-PER-002"];
  const papier = articles["DEMO-PAP-001"];
  const pack = await findOrCreate(
    "pack",
    { barcode: "DEMO-PACK-001" },
    {
      societeId: societe.id,
      barcode: "DEMO-PACK-001",
      name: "Pack Bureau Starter",
      coutRevient: 1138,
      tauxMarge: 25,
      montantVenteArticles: 1848,
      remise: 10,
      prixVentePack: 1663,
      purchasePrice: 1138,
      active: true,
    },
  );
  for (const [article, qty] of [
    [souris, 1],
    [clavier, 1],
    [papier, 2],
  ]) {
    await findOrCreate(
      "packComponent",
      { packId: pack.id, articleId: article.id },
      {
        packId: pack.id,
        articleId: article.id,
        quantity: qty,
        priceField: "prixVente1",
      },
    );
  }

  // ── Caisse labels ───────────────────────────────────────
  console.log("🏷️  Libellés caisse…");
  for (const name of ["Loyer", "Essence / Déplacement", "Fournitures bureau", "Charges diverses"]) {
    await findOrCreate("caisseLabel", { name }, { name, active: true });
  }

  console.log("\n✅ Demo seed completed.\n");
  console.log("📊 ========== DEMO DATA ==========");
  console.log("🏬 Depots         : 2  (Casa principal, Rabat)");
  console.log("📁 Categories     : 4");
  console.log("📂 Families       : 6");
  console.log("📦 Articles       : 13  (barcodes DEMO-*)");
  console.log("🧩 Variants       : 3  (coques couleur)");
  console.log("👥 Clients        : 10  (6 particuliers, 4 sociétés)");
  console.log("🏭 Fournisseurs   : 6");
  console.log("🏦 Banques        : 3");
  console.log("🚚 Livreurs       : 2");
  console.log("🏪 Agences        : 2");
  console.log("🎁 Packs          : 1  (Pack Bureau Starter)");
  console.log("🏷️  Libellés caisse: 4");
  console.log("================================\n");
  console.log("Astuce: cherchez les articles avec le préfixe DEMO-");
}

main()
  .catch((e) => {
    console.error("❌ Error during demo seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
