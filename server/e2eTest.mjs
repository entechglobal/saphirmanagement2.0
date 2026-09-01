/* E2E smoke test: achat (BR) + vente (BL) + stock integrity.
   Run: node e2eTest.mjs  (server must be running on :3000) */

const BASE = "http://localhost:3000/api";
let TOKEN = "";

const results = [];
const pass = (name, detail = "") => results.push({ ok: true, name, detail });
const fail = (name, detail = "") => results.push({ ok: false, name, detail });

const req = async (method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON response */
  }
  return { status: res.status, json };
};

const num = (v) => Math.round(Number(v) * 1000) / 1000;

const getStock = async (depotId, articleIds) => {
  const { status, json } = await req(
    "GET",
    `/stock/by-depot/${depotId}?limit=500`,
  );
  if (status !== 200) throw new Error(`stock/by-depot -> ${status}: ${JSON.stringify(json)}`);
  const rows = json.data ?? json.stocks ?? [];
  const map = {};
  for (const id of articleIds) map[id] = 0;
  for (const row of rows) {
    const aId = row.articleId ?? row.article?.id;
    if (aId && articleIds.includes(aId)) {
      map[aId] = num(row.quantityAvailable);
    }
  }
  return map;
};

async function main() {
  // ── 0. Login ────────────────────────────────────────────
  const login = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "e2e@test.local", password: "e2etest1234" }),
  });
  const loginJson = await login.json();
  if (login.status !== 200 || !loginJson.token) {
    fail("Login", `status ${login.status}: ${JSON.stringify(loginJson)}`);
    return;
  }
  TOKEN = loginJson.token;
  pass("Login superadmin");

  // ── 1. Resolve entities ─────────────────────────────────
  const depots = await req("GET", "/depots?limit=50");
  const depotList = depots.json?.data ?? depots.json?.depots ?? [];
  const depot = depotList.find((d) => d.code === "DEP-CASA");
  if (!depot) {
    fail("Find depot DEP-CASA", JSON.stringify(depots.json).slice(0, 300));
    return;
  }
  pass("Find depot DEP-CASA", `id=${depot.id}`);
  const societeId = depot.societeId;

  const clients = await req("GET", "/clients?keyword=Atlas");
  const client = (clients.json?.data ?? []).find((c) => c.name?.includes("Atlas Soft"));
  client ? pass("Find client Atlas Soft", `id=${client.id}`) : fail("Find client Atlas Soft", JSON.stringify(clients.json).slice(0, 300));

  const frs = await req("GET", "/fournisseurs?keyword=Dell");
  const fournisseur = (frs.json?.data ?? []).find((f) => f.name?.includes("Dell"));
  fournisseur ? pass("Find fournisseur Dell", `id=${fournisseur.id}`) : fail("Find fournisseur Dell", JSON.stringify(frs.json).slice(0, 300));
  if (!client || !fournisseur) return;

  const prodSearch = async (search) => {
    const r = await req(
      "GET",
      `/bon-livraisons/products?depotId=${depot.id}&search=${encodeURIComponent(search)}`,
    );
    return (r.json?.data ?? []).find((p) => p.barcode === search);
  };
  const souris = await prodSearch("DEMO-PER-001");
  const iphone = await prodSearch("DEMO-PH-002");
  if (!souris || !iphone) {
    fail("Products lookup", `souris=${!!souris} iphone=${!!iphone}`);
    return;
  }
  const sourisId = souris.articleId ?? souris.id;
  const iphoneId = iphone.articleId ?? iphone.id;
  pass("Products lookup", `souris id=${sourisId} stock=${souris.stock ?? souris.quantityAvailable}, iphone id=${iphoneId}`);

  const ids = [sourisId, iphoneId];
  const stock0 = await getStock(depot.id, ids);
  pass("Initial stock snapshot", `souris=${stock0[sourisId]}, iphone=${stock0[iphoneId]}`);

  // ── 2. ACHAT: bon de réception ──────────────────────────
  const ref = `TEST-BR-${Date.now()}`;
  const brCreate = await req("POST", "/bon-receptions", {
    frsId: fournisseur.id,
    depotId: depot.id,
    documentReference: ref,
    dateReception: new Date().toISOString(),
    status: "DRAFT",
    note: "E2E test BR",
    lines: [
      { articleId: sourisId, quantity: 10 },
      { articleId: iphoneId, quantity: 3, remise: 0.05 },
    ],
  });
  const brId = brCreate.json?.data?.id;
  brCreate.status === 201 && brId
    ? pass("BR create DRAFT", `id=${brId} ref=${ref}`)
    : fail("BR create DRAFT", `status ${brCreate.status}: ${JSON.stringify(brCreate.json).slice(0, 400)}`);
  if (!brId) return;

  let s = await getStock(depot.id, ids);
  s[sourisId] === stock0[sourisId] && s[iphoneId] === stock0[iphoneId]
    ? pass("BR DRAFT does not move stock")
    : fail("BR DRAFT does not move stock", `souris ${stock0[sourisId]}→${s[sourisId]}, iphone ${stock0[iphoneId]}→${s[iphoneId]}`);

  const brVal = await req("PUT", `/bon-receptions/${brId}/validate`, { targetStatus: "COMPLETED" });
  brVal.status === 200 ? pass("BR validate → COMPLETED") : fail("BR validate → COMPLETED", `status ${brVal.status}: ${JSON.stringify(brVal.json).slice(0, 400)}`);

  s = await getStock(depot.id, ids);
  s[sourisId] === num(stock0[sourisId] + 10) && s[iphoneId] === num(stock0[iphoneId] + 3)
    ? pass("Stock increased after BR (+10 / +3)", `souris=${s[sourisId]}, iphone=${s[iphoneId]}`)
    : fail("Stock increased after BR (+10 / +3)", `souris ${stock0[sourisId]}→${s[sourisId]} (want ${stock0[sourisId] + 10}), iphone ${stock0[iphoneId]}→${s[iphoneId]} (want ${stock0[iphoneId] + 3})`);

  // Reversal: COMPLETED → DRAFT should restore stock
  const brRevert = await req("PUT", `/bon-receptions/${brId}/validate`, { targetStatus: "DRAFT" });
  brRevert.status === 200 ? pass("BR revert → DRAFT") : fail("BR revert → DRAFT", `status ${brRevert.status}: ${JSON.stringify(brRevert.json).slice(0, 300)}`);

  s = await getStock(depot.id, ids);
  s[sourisId] === stock0[sourisId] && s[iphoneId] === stock0[iphoneId]
    ? pass("Stock restored after BR revert")
    : fail("Stock restored after BR revert", `souris=${s[sourisId]} want ${stock0[sourisId]}, iphone=${s[iphoneId]} want ${stock0[iphoneId]}`);

  // Re-validate to leave goods in stock for the vente test
  const brVal2 = await req("PUT", `/bon-receptions/${brId}/validate`, { targetStatus: "COMPLETED" });
  brVal2.status === 200 ? pass("BR re-validate → COMPLETED") : fail("BR re-validate → COMPLETED", JSON.stringify(brVal2.json).slice(0, 300));
  const afterBR = await getStock(depot.id, ids);

  // Duplicate reference must be rejected
  const brDup = await req("POST", "/bon-receptions", {
    frsId: fournisseur.id,
    depotId: depot.id,
    documentReference: ref,
    dateReception: new Date().toISOString(),
    status: "DRAFT",
    lines: [{ articleId: sourisId, quantity: 1 }],
  });
  brDup.status >= 400
    ? pass("BR duplicate reference rejected", `status ${brDup.status}`)
    : fail("BR duplicate reference rejected", `expected 4xx, got ${brDup.status} (duplicate created id=${brDup.json?.data?.id})`);

  // ── 3. VENTE: bon de livraison ──────────────────────────
  const blCreate = await req("POST", "/bon-livraisons", {
    clientId: client.id,
    depotId: depot.id,
    status: "DRAFT",
    notes: "E2E test BL",
    lines: [
      { articleId: sourisId, quantity: 2, unitPrice: 799, priceField: "prixVente1" },
      { articleId: iphoneId, quantity: 1, unitPrice: 9990, priceField: "prixVente1" },
    ],
  });
  const blData = blCreate.json?.data;
  const blId = blData?.id;
  blCreate.status === 201 && blId
    ? pass("BL create DRAFT", `id=${blId} n°=${blData?.document?.documentNumber ?? blData?.documentNumber ?? "?"}`)
    : fail("BL create DRAFT", `status ${blCreate.status}: ${JSON.stringify(blCreate.json).slice(0, 400)}`);
  if (!blId) return;

  // Totals: TTC = 2*799 + 9990 = 11588 ; HT = TTC / 1.2 (TVA 20%)
  const doc = blData.document ?? blData;
  const ttc = num(doc.totalTTC);
  const ht = num(doc.totalHT);
  const expTTC = 11588;
  const expHT = num(expTTC / 1.2);
  Math.abs(ttc - expTTC) < 0.02 && Math.abs(ht - expHT) < 0.02
    ? pass("BL totals math (TTC 11588, HT back-calc 20%)", `TTC=${ttc}, HT=${ht}`)
    : fail("BL totals math", `TTC=${ttc} want ${expTTC}, HT=${ht} want ${expHT}`);

  const blVal = await req("PUT", `/bon-livraisons/${blId}/validate`, { targetStatus: "COMPLETED" });
  blVal.status === 200 ? pass("BL validate → COMPLETED") : fail("BL validate → COMPLETED", `status ${blVal.status}: ${JSON.stringify(blVal.json).slice(0, 400)}`);

  s = await getStock(depot.id, ids);
  s[sourisId] === num(afterBR[sourisId] - 2) && s[iphoneId] === num(afterBR[iphoneId] - 1)
    ? pass("Stock decreased after BL (−2 / −1)", `souris=${s[sourisId]}, iphone=${s[iphoneId]}`)
    : fail("Stock decreased after BL (−2 / −1)", `souris ${afterBR[sourisId]}→${s[sourisId]}, iphone ${afterBR[iphoneId]}→${s[iphoneId]}`);

  // Over-stock sale must be rejected (negative stock disabled in settings)
  const blOver = await req("POST", "/bon-livraisons", {
    clientId: client.id,
    depotId: depot.id,
    status: "COMPLETED",
    lines: [{ articleId: iphoneId, quantity: 99999, unitPrice: 9990, priceField: "prixVente1" }],
  });
  blOver.status >= 400
    ? pass("BL over-stock rejected", `status ${blOver.status}: ${(blOver.json?.message ?? "").slice(0, 120)}`)
    : fail("BL over-stock rejected", `expected 4xx, got ${blOver.status} — NEGATIVE STOCK ALLOWED! id=${blOver.json?.data?.id}`);

  // Reversal: COMPLETED → DRAFT restores stock
  const blRevert = await req("PUT", `/bon-livraisons/${blId}/validate`, { targetStatus: "DRAFT" });
  blRevert.status === 200 ? pass("BL revert → DRAFT") : fail("BL revert → DRAFT", JSON.stringify(blRevert.json).slice(0, 300));

  s = await getStock(depot.id, ids);
  s[sourisId] === afterBR[sourisId] && s[iphoneId] === afterBR[iphoneId]
    ? pass("Stock restored after BL revert")
    : fail("Stock restored after BL revert", `souris=${s[sourisId]} want ${afterBR[sourisId]}, iphone=${s[iphoneId]} want ${afterBR[iphoneId]}`);

  const blVal2 = await req("PUT", `/bon-livraisons/${blId}/validate`, { targetStatus: "COMPLETED" });
  blVal2.status === 200 ? pass("BL re-validate → COMPLETED") : fail("BL re-validate → COMPLETED", JSON.stringify(blVal2.json).slice(0, 300));

  // ── 4. Situation client / fournisseur ───────────────────
  const sitC = await req("GET", `/situation/client?societeId=${societeId}&limit=100`);
  if (sitC.status === 200) {
    const rows = sitC.json?.data ?? [];
    const mine = rows.find((r) => r.documentId === (doc.id ?? blId) || r.id === blId);
    mine
      ? pass("Situation client shows unpaid BL", `reste=${mine.reste}`)
      : fail("Situation client shows unpaid BL", `BL not in ${rows.length} rows`);
  } else {
    fail("Situation client endpoint", `status ${sitC.status}: ${JSON.stringify(sitC.json).slice(0, 300)}`);
  }

  const sitF = await req("GET", `/situation/fournisseur?societeId=${societeId}&limit=100`);
  sitF.status === 200
    ? pass("Situation fournisseur endpoint", `${(sitF.json?.data ?? []).length} rows`)
    : fail("Situation fournisseur endpoint", `status ${sitF.status}: ${JSON.stringify(sitF.json).slice(0, 300)}`);

  // Date-filtered situation (regression for the is/isNot Prisma fix)
  const start = new Date(Date.now() - 30 * 86400000).toISOString();
  const end = new Date(Date.now() + 86400000).toISOString();
  const sitD = await req(
    "GET",
    `/situation/client?societeId=${societeId}&startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`,
  );
  sitD.status === 200
    ? pass("Situation client with date range (Prisma fix)", `${(sitD.json?.data ?? []).length} rows`)
    : fail("Situation client with date range (Prisma fix)", `status ${sitD.status}: ${JSON.stringify(sitD.json).slice(0, 300)}`);

  // ── 5. Stock transactions audit trail ───────────────────
  const tx = await req("GET", `/stock-transactions?depotId=${depot.id}&limit=100`);
  if (tx.status === 200) {
    const txRows = tx.json?.data ?? tx.json?.transactions ?? [];
    const types = [...new Set(txRows.map((t) => t.type))];
    txRows.length > 0
      ? pass("Stock transactions logged", `${txRows.length} rows, types: ${types.join(", ")}`)
      : fail("Stock transactions logged", "no transactions found");
  } else {
    fail("Stock transactions endpoint", `status ${tx.status}: ${JSON.stringify(tx.json).slice(0, 200)}`);
  }

  // ── 6. PDF print endpoints ──────────────────────────────
  for (const [name, url] of [
    ["BL print PDF", `${BASE}/bon-livraisons/${blId}/print?view=inline`],
    ["BR print PDF", `${BASE}/bon-receptions/${brId}/print?view=inline`],
  ]) {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
    const ct = r.headers.get("content-type") ?? "";
    r.status === 200 && ct.includes("pdf")
      ? pass(name)
      : fail(name, `status ${r.status}, content-type ${ct}`);
  }

  // ── 7. Cleanup: delete test documents (reverses stock) ──
  const delBL = await req("DELETE", `/bon-livraisons/${blId}`);
  delBL.status === 200 ? pass("Cleanup: delete test BL (stock reversed)") : fail("Cleanup: delete test BL", `status ${delBL.status}: ${JSON.stringify(delBL.json).slice(0, 200)}`);

  const delBR = await req("DELETE", `/bon-receptions/${brId}`);
  delBR.status === 200 ? pass("Cleanup: delete test BR (stock reversed)") : fail("Cleanup: delete test BR", `status ${delBR.status}: ${JSON.stringify(delBR.json).slice(0, 200)}`);

  // Sweep leftovers from previous partial runs
  let swept = 0;
  const oldBRs = await req("GET", "/bon-receptions?search=TEST-BR&limit=100");
  for (const row of oldBRs.json?.data ?? []) {
    const d = await req("DELETE", `/bon-receptions/${row.id}`);
    if (d.status === 200) swept++;
  }
  const oldBLs = await req("GET", `/bon-livraisons?clientId=${client.id}&limit=100`);
  for (const row of oldBLs.json?.data ?? []) {
    const detail = await req("GET", `/bon-livraisons/${row.id}`);
    const notes = detail.json?.data?.document?.notes ?? detail.json?.data?.notes;
    if (notes === "E2E test BL") {
      const d = await req("DELETE", `/bon-livraisons/${row.id}`);
      if (d.status === 200) swept++;
    }
  }
  pass("Cleanup: swept leftover test docs", `${swept} removed`);

  const finalStock = await getStock(depot.id, ids);
  pass("Final stock", `souris=${finalStock[sourisId]}, iphone=${finalStock[iphoneId]} (seed baseline: 40 / 6)`);
}

main()
  .catch((e) => fail("UNCAUGHT", e.stack ?? String(e)))
  .finally(() => {
    console.log("\n========== E2E RESULTS ==========");
    let okCount = 0;
    for (const r of results) {
      console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
      if (r.ok) okCount++;
    }
    console.log(`\n${okCount}/${results.length} passed`);
    process.exit(results.every((r) => r.ok) ? 0 : 1);
  });
