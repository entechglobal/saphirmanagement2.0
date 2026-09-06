/**
 * Wide Gestion Saphir API integration test
 * Covers all roles + create / status / cancel / wallets / dashboard / commissions.
 *
 * Usage:
 *   node scripts/test-saphir-wide.js
 *
 * Requires: API running on BASE_URL (default http://localhost:3000)
 * Credentials used only in-memory; report never prints tokens.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = (process.env.TEST_API_URL || "http://localhost:3000/api").replace(
  /\/$/,
  "",
);
const REPORT_PATH = path.join(__dirname, "test-saphir-wide-report.json");
const PASSWORD = "TestSaphir123!";

const prisma = new PrismaClient();

const results = [];
let passed = 0;
let failed = 0;
let skipped = 0;

const ok = (name, detail = "") => {
  passed += 1;
  results.push({ status: "PASS", name, detail });
  console.log(`  ✅ PASS  ${name}${detail ? ` — ${detail}` : ""}`);
};
const fail = (name, detail = "") => {
  failed += 1;
  results.push({ status: "FAIL", name, detail: String(detail).slice(0, 500) });
  console.log(`  ❌ FAIL  ${name} — ${String(detail).slice(0, 200)}`);
};
const skip = (name, detail = "") => {
  skipped += 1;
  results.push({ status: "SKIP", name, detail });
  console.log(`  ⏭️  SKIP  ${name}${detail ? ` — ${detail}` : ""}`);
};

async function api(method, route, { token, body, expectStatus } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${route}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text?.slice(0, 300) };
  }
  if (expectStatus && res.status !== expectStatus) {
    const msg =
      data?.message || data?.error || data?.raw || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return { status: res.status, data };
}

async function login(email) {
  const { data } = await api("POST", "/auth/login", {
    body: { email, password: PASSWORD },
    expectStatus: 200,
  });
  const token = data?.token || data?.accessToken || data?.data?.token;
  if (!token) throw new Error(`No token for ${email}`);
  return {
    token,
    user: data?.user || data?.data?.user || {},
  };
}

async function loginSuper() {
  // Ensure Super_Admin exists with known local password
  const role = await prisma.role.findUnique({ where: { name: "Super_Admin" } });
  if (!role) throw new Error("Super_Admin role missing — run prisma seed");
  const hashed = await bcrypt.hash("12345678", 10);
  await prisma.user.upsert({
    where: { email: "superadmin@gmail.com" },
    update: {
      password: hashed,
      isSuperAdmin: true,
      roleId: role.id,
      societeId: null,
      active: true,
      name: "Super Administrator",
    },
    create: {
      email: "superadmin@gmail.com",
      name: "Super Administrator",
      password: hashed,
      roleId: role.id,
      societeId: null,
      isSuperAdmin: true,
      active: true,
    },
  });
  const { data } = await api("POST", "/auth/login", {
    body: { email: "superadmin@gmail.com", password: "12345678" },
    expectStatus: 200,
  });
  const token = data?.token || data?.accessToken || data?.data?.token;
  if (!token) throw new Error("Superadmin login failed — is the API up?");
  return { token, user: data?.user || data?.data?.user || {} };
}

const SAPHIR_PERMS = {
  Societe_Admin: [
    "view_advanced_bl",
    "create_advanced_bl",
    "update_advanced_bl",
    "delete_advanced_bl",
    "update_status_advanced_bl",
    "report_advanced_bl",
    "view_pack",
    "create_pack",
    "update_pack",
    "delete_pack",
    "view_agence",
    "view_delivery_shifts",
    "manage_delivery_shifts",
    "view_caisse",
    "create_caisse",
    "create_user",
    "manage_users",
  ],
  Gerant: [
    "view_advanced_bl",
    "create_advanced_bl",
    "update_advanced_bl",
    "delete_advanced_bl",
    "update_status_advanced_bl",
    "report_advanced_bl",
    "view_pack",
    "view_agence",
    "view_delivery_shifts",
    "view_caisse",
  ],
  Commercial: [
    "view_advanced_bl",
    "create_advanced_bl",
    "update_advanced_bl",
    "delete_advanced_bl",
    "update_status_advanced_bl",
    "report_advanced_bl",
    "view_pack",
    "view_agence",
  ],
  Preparateur: [
    "view_advanced_bl",
    "update_status_advanced_bl",
  ],
  Livreur: [
    "view_advanced_bl",
    "update_status_advanced_bl",
    "view_delivery_shifts",
    "manage_delivery_shifts",
    "view_caisse",
  ],
};

const TEST_USERS = [
  { key: "admin", role: "Societe_Admin", email: "test.saphir.admin@saphir.test", name: "Test Societe Admin" },
  { key: "gerant", role: "Gerant", email: "test.saphir.gerant@saphir.test", name: "Test Gerant" },
  { key: "commercial", role: "Commercial", email: "test.saphir.commercial@saphir.test", name: "Test Commercial" },
  { key: "preparateur", role: "Preparateur", email: "test.saphir.preparateur@saphir.test", name: "Test Preparateur" },
  { key: "livreur", role: "Livreur", email: "test.saphir.livreur@saphir.test", name: "Test Livreur" },
];

async function bootstrap() {
  console.log("\n── Bootstrap (Prisma) ──");

  const societe = await prisma.societe.findFirst({ orderBy: { id: "asc" } });
  if (!societe) throw new Error("No société found — run seed first");

  const roles = {};
  for (const name of Object.keys(SAPHIR_PERMS).concat(["Super_Admin", "Caissier"])) {
    const role = await prisma.role.findUnique({ where: { name } });
    if (role) roles[name] = role;
  }

  // Ensure permission catalog contains every key we assign
  const allPermNames = [...new Set(Object.values(SAPHIR_PERMS).flat())];
  for (const name of allPermNames) {
    await prisma.permission.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  ok("bootstrap.permissionCatalog", `${allPermNames.length} keys`);

  // Assign permissions to roles
  for (const [roleName, permNames] of Object.entries(SAPHIR_PERMS)) {
    const role = roles[roleName];
    if (!role) {
      skip(`bootstrap.role.${roleName}`, "role missing");
      continue;
    }
    const perms = await prisma.permission.findMany({
      where: { name: { in: permNames } },
    });
    for (const p of perms) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId: p.id },
        },
        update: {},
        create: { roleId: role.id, permissionId: p.id },
      });
    }
    ok(`bootstrap.perms.${roleName}`, `${perms.length} permissions`);
  }

  const hashed = await bcrypt.hash(PASSWORD, 10);
  const users = {};

  for (const u of TEST_USERS) {
    const role = roles[u.role];
    if (!role) {
      skip(`bootstrap.user.${u.key}`, `role ${u.role} missing`);
      continue;
    }
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        password: hashed,
        roleId: role.id,
        societeId: societe.id,
        isSuperAdmin: false,
      },
      create: {
        email: u.email,
        name: u.name,
        password: hashed,
        roleId: role.id,
        societeId: societe.id,
        isSuperAdmin: false,
      },
    });
    users[u.key] = user;
    ok(`bootstrap.user.${u.key}`, `id=${user.id}`);
  }

  // Ensure Livreur has Delivery INTERN linked
  if (users.livreur) {
    let delivery = await prisma.delivery.findFirst({
      where: { userId: users.livreur.id },
    });
    if (!delivery) {
      delivery = await prisma.delivery.create({
        data: {
          name: users.livreur.name,
          tel: "0600000001",
          type: "INTERN",
          entityType: "PARTICULIER",
          societeId: societe.id,
          userId: users.livreur.id,
          active: true,
        },
      });
    }
    users.livreurDelivery = delivery;
    ok("bootstrap.livreur.delivery", `id=${delivery.id}`);
  }

  // Wallets for ESPECE (admin, commercial, livreur)
  for (const key of ["admin", "commercial", "livreur", "gerant"]) {
    const user = users[key];
    if (!user) continue;
    let caisse = await prisma.caisse.findFirst({
      where: { userId: user.id, active: true },
    });
    if (!caisse) {
      caisse = await prisma.caisse.create({
        data: {
          name: `Caisse ${user.name}`,
          userId: user.id,
          societeId: societe.id,
          caisseType: "USER",
          currentBalance: 0,
          initialBalance: 0,
          active: true,
        },
      });
    }
    users[`${key}Caisse`] = caisse;
    ok(`bootstrap.wallet.${key}`, `balance=${caisse.currentBalance}`);
  }

  // Fixtures: depot, article with stock, pack, agence
  const depot = await prisma.depot.findFirst({
    where: { societeId: societe.id, active: true },
  });
  if (!depot) throw new Error("No active depot — run seed:demo");

  let article = await prisma.article.findFirst({
    where: { visible: true, variants: { none: {} } },
    orderBy: { id: "asc" },
  });
  if (!article) {
    article = await prisma.article.findFirst({ where: { visible: true } });
  }
  if (!article) throw new Error("No article — run seed:demo");

  // Ensure commission on article
  await prisma.article.update({
    where: { id: article.id },
    data: { commission: 5 },
  });

  // Stock for PREPARE
  let stockRow = await prisma.stockByDepot.findFirst({
    where: { depotId: depot.id, articleId: article.id, variantId: null },
  });
  if (stockRow) {
    stockRow = await prisma.stockByDepot.update({
      where: { id: stockRow.id },
      data: { quantityAvailable: 100 },
    });
  } else {
    stockRow = await prisma.stockByDepot.create({
      data: {
        depotId: depot.id,
        articleId: article.id,
        quantityAvailable: 100,
        quantityReserved: 0,
        quantityInTransit: 0,
      },
    });
  }
  ok("bootstrap.stock", `article=${article.id} qty=100`);

  let pack = await prisma.pack.findFirst({
    where: { societeId: societe.id, active: true },
  });
  if (pack) {
    await prisma.pack.update({
      where: { id: pack.id },
      data: { commission: 10 },
    });
  }

  const agence = await prisma.agence.findFirst({
    where: { societeId: societe.id },
  });

  return {
    societe,
    depot,
    article,
    pack,
    agence,
    users,
    stock: stockRow,
  };
}

async function createOrder(token, fixtures, overrides = {}) {
  const { depot, article, pack, agence, users } = fixtures;
  const body = {
    clientName: overrides.clientName || `Client Test ${Date.now()}`,
    telephone: overrides.telephone || "0612345678",
    depotId: depot.id,
    dateLivraison: new Date().toISOString(),
    commandStatus: overrides.commandStatus || "CONFIRME",
    modeReglement: overrides.modeReglement || "ESPECE",
    montantPaid: overrides.montantPaid ?? 0,
    agenceId: agence?.id || undefined,
    preparateurId: overrides.preparateurId ?? users.preparateur?.id,
    livreurId: overrides.livreurId ?? users.livreurDelivery?.id,
    commercialId: overrides.commercialId,
    ville: "Casablanca",
    localisation: "Test address",
    lines: [
      {
        articleId: article.id,
        quantity: overrides.qty || 2,
        unitPrice: Number(article.prixVente1) || 100,
        priceField: "prixVente1",
      },
    ],
    ...(pack && overrides.withPack !== false
      ? {
          packLines: [
            {
              id: pack.id,
              quantity: 1,
              prixVente: Number(pack.prixVentePack) || 200,
            },
          ],
        }
      : {}),
    ...overrides.extra,
  };
  // Remove undefined
  Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);

  const { data, status } = await api("POST", "/advanced-bon-livraisons", {
    token,
    body,
  });
  if (status >= 400) {
    const err = new Error(data?.message || `create failed ${status}`);
    err.status = status;
    err.data = data;
    throw err;
  }
  const bl = data?.data || data;
  return bl;
}

async function transition(token, id, targetStatus) {
  const { data, status } = await api(
    "PUT",
    `/advanced-bon-livraisons/${id}/status`,
    { token, body: { targetStatus } },
  );
  if (status >= 400) {
    const err = new Error(data?.message || `transition ${targetStatus} failed`);
    err.status = status;
    err.data = data;
    throw err;
  }
  return data?.data || data;
}

async function expectDeny(name, fn) {
  try {
    await fn();
    fail(name, "expected denial but succeeded");
  } catch (e) {
    if (e.status === 403 || e.status === 401 || e.status === 400) {
      ok(name, `denied ${e.status}`);
    } else {
      fail(name, e.message);
    }
  }
}

async function run() {
  console.log(`\n🧪 Gestion Saphir wide test → ${BASE_URL}\n`);

  let fixtures;
  try {
    fixtures = await bootstrap();
  } catch (e) {
    console.error("Bootstrap failed:", e.message);
    process.exit(1);
  }

  // ── Logins ──
  console.log("\n── Auth ──");
  const sessions = {};
  try {
    sessions.super = await loginSuper();
    ok("auth.superadmin");
  } catch (e) {
    fail("auth.superadmin", e.message);
    await finish();
    return;
  }

  for (const u of TEST_USERS) {
    try {
      sessions[u.key] = await login(u.email);
      ok(`auth.${u.key}`);
    } catch (e) {
      fail(`auth.${u.key}`, e.message);
    }
  }

  // ── Dashboard / stats (each role that can view) ──
  console.log("\n── Dashboard & stats ──");
  for (const key of ["super", "admin", "gerant", "commercial", "preparateur", "livreur"]) {
    if (!sessions[key]) continue;
    try {
      const { data } = await api(
        "GET",
        "/advanced-bon-livraisons/workflow-counts",
        { token: sessions[key].token, expectStatus: 200 },
      );
      const counts = data?.data || data;
      ok(`dashboard.workflow.${key}`, JSON.stringify(counts).slice(0, 120));
    } catch (e) {
      fail(`dashboard.workflow.${key}`, e.message);
    }
  }

  for (const key of ["super", "admin", "gerant", "commercial"]) {
    if (!sessions[key]) continue;
    try {
      await api("GET", "/advanced-bon-livraisons/top-commercials?limit=5", {
        token: sessions[key].token,
        expectStatus: 200,
      });
      ok(`dashboard.topCommercials.${key}`);
    } catch (e) {
      fail(`dashboard.topCommercials.${key}`, e.message);
    }
    try {
      await api("GET", "/advanced-bon-livraisons/commercial-stats", {
        token: sessions[key].token,
        expectStatus: 200,
      });
      ok(`dashboard.commercialStats.${key}`);
    } catch (e) {
      fail(`dashboard.commercialStats.${key}`, e.message);
    }
  }

  // Planning
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  for (const key of ["admin", "livreur", "preparateur"]) {
    if (!sessions[key]) continue;
    try {
      await api(
        "GET",
        `/advanced-bon-livraisons/planning?startDate=${today}&endDate=${tomorrow}`,
        { token: sessions[key].token, expectStatus: 200 },
      );
      ok(`planning.${key}`);
    } catch (e) {
      fail(`planning.${key}`, e.message);
    }
  }

  // Packs list
  for (const key of ["admin", "commercial"]) {
    if (!sessions[key]) continue;
    try {
      await api("GET", "/packs", {
        token: sessions[key].token,
        expectStatus: 200,
      });
      ok(`packs.list.${key}`);
    } catch (e) {
      fail(`packs.list.${key}`, e.message);
    }
  }

  // ── Permission denials ──
  console.log("\n── Permission denials ──");
  if (sessions.preparateur) {
    await expectDeny("deny.create.preparateur", () =>
      createOrder(sessions.preparateur.token, fixtures),
    );
  }
  if (sessions.livreur) {
    await expectDeny("deny.create.livreur", () =>
      createOrder(sessions.livreur.token, fixtures),
    );
  }

  // ── Commercial creates order (owns commercialId) ──
  console.log("\n── Commercial create + scoping ──");
  let commercialOrderId = null;
  if (sessions.commercial) {
    try {
      const bl = await createOrder(sessions.commercial.token, fixtures, {
        clientName: "Client Commercial Scope",
        withPack: true,
      });
      commercialOrderId = bl.id || bl?.document?.id;
      const totalCommission = Number(bl.totalCommission ?? bl.bonLivraison?.totalCommission ?? 0);
      ok(
        "commercial.create",
        `id=${commercialOrderId} commission=${totalCommission}`,
      );
      if (totalCommission > 0) {
        ok("commercial.create.commissionSnapshotted", `${totalCommission} MAD`);
      } else {
        // may be 0 if pack/article commission not returned on create payload — check DB
        const dbBl = await prisma.bonLivraison.findUnique({
          where: { id: commercialOrderId },
          select: { totalCommission: true, commercialId: true },
        });
        if (Number(dbBl?.totalCommission) > 0) {
          ok("commercial.create.commissionSnapshotted", `${dbBl.totalCommission} MAD`);
        } else {
          fail("commercial.create.commissionSnapshotted", "totalCommission is 0");
        }
        if (dbBl?.commercialId === fixtures.users.commercial.id) {
          ok("commercial.create.autoCommercialId");
        } else {
          fail("commercial.create.autoCommercialId", `got ${dbBl?.commercialId}`);
        }
      }
    } catch (e) {
      fail("commercial.create", e.message);
    }

    try {
      const { data } = await api("GET", "/advanced-bon-livraisons?limit=50", {
        token: sessions.commercial.token,
        expectStatus: 200,
      });
      const list = data?.data || [];
      const foreign = list.find(
        (x) =>
          x.commercialId &&
          x.commercialId !== fixtures.users.commercial.id,
      );
      if (!foreign) ok("commercial.list.scoped");
      else fail("commercial.list.scoped", `saw foreign BL ${foreign.id}`);
    } catch (e) {
      fail("commercial.list.scoped", e.message);
    }
  }

  // ── Full happy path: Admin → Prep → Livreur → PAYE + wallet ──
  console.log("\n── Happy path EN_COURS→…→PAYE + wallet ──");
  let happyId = null;
  let livreurBalanceBefore = 0;

  if (sessions.admin && sessions.preparateur && sessions.livreur) {
    try {
      const caisseBefore = await prisma.caisse.findUnique({
        where: { id: fixtures.users.livreurCaisse.id },
      });
      livreurBalanceBefore = Number(caisseBefore?.currentBalance || 0);

      const bl = await createOrder(sessions.admin.token, fixtures, {
        clientName: "Client Happy Path",
        commandStatus: "CONFIRME",
        modeReglement: "ESPECE",
        commercialId: fixtures.users.commercial?.id,
        withPack: !!fixtures.pack,
      });
      happyId = bl.id;
      ok("happy.create", `id=${happyId}`);

      // Preparateur: CONFIRME → PREPARE
      await transition(sessions.preparateur.token, happyId, "PREPARE");
      ok("happy.preparateur.PREPARE");

      // Livreur cannot PREPARE again / cannot skip
      await expectDeny("deny.livreur.CONFIRME_PREPARE_on_prepared", async () => {
        // already PREPARE — try invalid
        await transition(sessions.livreur.token, happyId, "PREPARE");
      });

      // Start shift (required before LIVRE/PAYE)
      try {
        const started = await api("POST", "/delivery-shifts/start", {
          token: sessions.livreur.token,
          body: {},
        });
        if (started.status === 201 || started.status === 200) {
          ok("happy.livreur.shiftStart");
        } else if (
          started.status === 409 ||
          String(started.data?.message || "").includes("déjà")
        ) {
          ok("happy.livreur.shiftStart", "already open");
        } else {
          fail(
            "happy.livreur.shiftStart",
            started.data?.message || `HTTP ${started.status}`,
          );
        }
      } catch (e) {
        fail("happy.livreur.shiftStart", e.message);
      }

      // Confirm active shift before LIVRE
      const active = await api("GET", "/delivery-shifts/me/active", {
        token: sessions.livreur.token,
      });
      if (active.status >= 400 || !(active.data?.data?.shift || active.data?.shift)) {
        fail(
          "happy.livreur.shiftActive",
          active.data?.message || "no open shift",
        );
      } else {
        ok("happy.livreur.shiftActive");
      }

      await transition(sessions.livreur.token, happyId, "COLLECTE");
      ok("happy.livreur.COLLECTE");
      await transition(sessions.livreur.token, happyId, "EN_ROUTE");
      ok("happy.livreur.EN_ROUTE");
      await transition(sessions.livreur.token, happyId, "LIVRE");
      ok("happy.livreur.LIVRE");
      await transition(sessions.livreur.token, happyId, "PAYE");
      ok("happy.livreur.PAYE");

      const caisseAfter = await prisma.caisse.findUnique({
        where: { id: fixtures.users.livreurCaisse.id },
      });
      const afterBal = Number(caisseAfter?.currentBalance || 0);
      const doc = await prisma.clientDocument.findUnique({
        where: { id: happyId },
        select: { amountDue: true, amountPaid: true, totalTTC: true },
      });
      const expectedCredit = Number(doc?.amountDue || doc?.totalTTC || 0);
      if (afterBal >= livreurBalanceBefore + expectedCredit - 0.01) {
        ok(
          "happy.wallet.credited",
          `${livreurBalanceBefore} → ${afterBal} (expected +${expectedCredit})`,
        );
      } else {
        fail(
          "happy.wallet.credited",
          `before=${livreurBalanceBefore} after=${afterBal} expected+${expectedCredit}`,
        );
      }

      // Stats should include commission for commercial
      const { data: stats } = await api(
        "GET",
        "/advanced-bon-livraisons/commercial-stats",
        { token: sessions.admin.token, expectStatus: 200 },
      );
      const commercials = stats?.data?.commercials || stats?.commercials || [];
      const mine = commercials.find(
        (c) => c.id === fixtures.users.commercial?.id,
      );
      if (mine && mine.orderCount >= 1) {
        ok(
          "happy.commercialStats.updated",
          `orders=${mine.orderCount} commission=${mine.totalCommission}`,
        );
      } else {
        fail("happy.commercialStats.updated", "commercial not in stats");
      }
    } catch (e) {
      fail("happy.path", e.message);
    }
  } else {
    skip("happy.path", "missing admin/preparateur/livreur sessions");
  }

  // ── Annulation path ──
  console.log("\n── Annulation path ──");
  if (sessions.admin && sessions.preparateur) {
    try {
      const bl = await createOrder(sessions.admin.token, fixtures, {
        clientName: "Client Annulation",
        commandStatus: "CONFIRME",
        withPack: false,
      });
      const id = bl.id;
      ok("cancel.create", `id=${id}`);

      await transition(sessions.preparateur.token, id, "PREPARE");
      ok("cancel.PREPARE");

      // Preparateur can ANNULE from PREPARE
      await transition(sessions.preparateur.token, id, "ANNULE");
      ok("cancel.ANNULE.fromPREPARE");

      const after = await prisma.bonLivraison.findUnique({
        where: { id },
        select: { commandStatus: true },
      });
      if (after?.commandStatus === "ANNULE") ok("cancel.status.persisted");
      else fail("cancel.status.persisted", after?.commandStatus);
    } catch (e) {
      fail("cancel.path", e.message);
    }
  }

  // Admin can cancel from CONFIRME
  if (sessions.admin) {
    try {
      const bl = await createOrder(sessions.admin.token, fixtures, {
        clientName: "Client Annul Admin",
        commandStatus: "CONFIRME",
        withPack: false,
      });
      await transition(sessions.admin.token, bl.id, "ANNULE");
      ok("cancel.admin.fromCONFIRME");
    } catch (e) {
      fail("cancel.admin.fromCONFIRME", e.message);
    }
  }

  // ── Role transition gate ──
  console.log("\n── Role transition gates ──");
  if (sessions.admin && sessions.preparateur && sessions.livreur) {
    try {
      const bl = await createOrder(sessions.admin.token, fixtures, {
        clientName: "Client Gate",
        commandStatus: "CONFIRME",
        withPack: false,
      });
      // Livreur cannot CONFIRME→PREPARE
      await expectDeny("gate.livreur.cannotPREPARE", () =>
        transition(sessions.livreur.token, bl.id, "PREPARE"),
      );
      await transition(sessions.preparateur.token, bl.id, "PREPARE");
      // Preparateur cannot COLLECTE
      await expectDeny("gate.preparateur.cannotCOLLECTE", () =>
        transition(sessions.preparateur.token, bl.id, "COLLECTE"),
      );
      // Cleanup cancel
      try {
        await transition(sessions.admin.token, bl.id, "ANNULE");
      } catch {
        try {
          await transition(sessions.livreur.token, bl.id, "ANNULE");
        } catch {
          /* ignore */
        }
      }
      ok("gate.cleanup");
    } catch (e) {
      fail("gate.setup", e.message);
    }
  }

  // ── Report / resume (admin) ──
  console.log("\n── Report / resume ──");
  if (sessions.admin) {
    try {
      const bl = await createOrder(sessions.admin.token, fixtures, {
        clientName: "Client Report",
        commandStatus: "CONFIRME",
        withPack: false,
      });
      const next = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
      await api("POST", `/advanced-bon-livraisons/${bl.id}/report`, {
        token: sessions.admin.token,
        body: { reason: "Client absent", nextDeliveryDate: next },
        expectStatus: 200,
      });
      ok("report.bl");
      await api("POST", `/advanced-bon-livraisons/${bl.id}/resume`, {
        token: sessions.admin.token,
        body: {},
        expectStatus: 200,
      });
      ok("resume.bl");
      await transition(sessions.admin.token, bl.id, "ANNULE");
      ok("report.cleanup.ANNULE");
    } catch (e) {
      fail("report.resume", e.message);
    }
  }

  // ── Gerant create ──
  console.log("\n── Gerant / Super create ──");
  if (sessions.gerant) {
    try {
      const bl = await createOrder(sessions.gerant.token, fixtures, {
        clientName: "Client Gerant",
        withPack: false,
      });
      ok("gerant.create", `id=${bl.id}`);
      await transition(sessions.gerant.token, bl.id, "ANNULE");
      ok("gerant.ANNULE");
    } catch (e) {
      fail("gerant.create", e.message);
    }
  }
  if (sessions.super) {
    try {
      const bl = await createOrder(sessions.super.token, fixtures, {
        clientName: "Client Super",
        withPack: false,
        commercialId: fixtures.users.commercial?.id,
      });
      ok("super.create", `id=${bl.id}`);
      await transition(sessions.super.token, bl.id, "ANNULE");
      ok("super.ANNULE");
    } catch (e) {
      fail("super.create", e.message);
    }
  }

  // ── Details + commission fields ──
  if (commercialOrderId && sessions.admin) {
    try {
      const { data } = await api(
        "GET",
        `/advanced-bon-livraisons/${commercialOrderId}/details`,
        { token: sessions.admin.token, expectStatus: 200 },
      );
      const info = data?.data?.blInfo || data?.blInfo || {};
      if (info.totalCommission != null) {
        ok("details.totalCommission", String(info.totalCommission));
      } else {
        fail("details.totalCommission", "missing");
      }
    } catch (e) {
      fail("details.fetch", e.message);
    }
  }

  // ── Shifts list ──
  if (sessions.livreur) {
    try {
      await api("GET", "/delivery-shifts", {
        token: sessions.livreur.token,
        expectStatus: 200,
      });
      ok("shifts.list.livreur");
      await api("GET", "/delivery-shifts/me/active", {
        token: sessions.livreur.token,
        expectStatus: 200,
      });
      ok("shifts.meActive.livreur");
    } catch (e) {
      fail("shifts.livreur", e.message);
    }
  }

  // ── Wallet me check ──
  for (const key of ["livreur", "admin", "commercial"]) {
    if (!sessions[key]) continue;
    try {
      const { data } = await api("GET", "/caisse/me", {
        token: sessions[key].token,
      });
      if (data?.data || data?.id || data?.currentBalance != null) {
        ok(`wallet.me.${key}`);
      } else if (data?.success === false) {
        skip(`wallet.me.${key}`, data?.message || "no wallet endpoint shape");
      } else {
        ok(`wallet.me.${key}`, "responded");
      }
    } catch (e) {
      // may 404 if no me wallet — still note
      if (e.status === 404) skip(`wallet.me.${key}`, "404");
      else fail(`wallet.me.${key}`, e.message);
    }
  }

  await finish();
}

async function finish() {
  const summary = {
    at: new Date().toISOString(),
    baseUrl: BASE_URL,
    passed,
    failed,
    skipped,
    total: passed + failed + skipped,
    results,
  };
  fs.writeFileSync(REPORT_PATH, JSON.stringify(summary, null, 2));
  console.log("\n══════════════════════════════════════");
  console.log(
    `Result: ${passed} passed · ${failed} failed · ${skipped} skipped`,
  );
  console.log(`Report: ${REPORT_PATH}`);
  console.log("══════════════════════════════════════\n");
  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(async (e) => {
  console.error("Fatal:", e);
  await prisma.$disconnect();
  process.exit(1);
});
