const $ = (id) => document.getElementById(id);

const state = {
  user: null,
  roleLabel: "",
  cloudUsers: [],
  deviceUsers: [],
  societes: [],
  societeId: "",
  logs: [],
  selectedUser: null,
  selectedIds: new Set(),
  usersError: "",
};

function toast(message, isError = false) {
  const el = $("toast");
  el.textContent = message;
  el.classList.toggle("error", isError);
  el.classList.remove("hidden");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add("hidden"), 4200);
}

function unwrap(res) {
  if (res?.code === "TOKEN_EXPIRED") {
    handleSessionExpired(res.error, { toastIt: false });
    throw new Error(res.error || "Session expirée. Veuillez vous reconnecter.");
  }
  if (!res?.ok) throw new Error(res?.error || "L’action a échoué");
  return res.data;
}

function handleSessionExpired(message, { toastIt = true } = {}) {
  state.user = null;
  state.cloudUsers = [];
  state.deviceUsers = [];
  state.societes = [];
  state.logs = [];
  state.selectedIds = new Set();
  if ($("password")) $("password").value = "";
  if ($("login-error")) {
    $("login-error").textContent = message || "Session expirée. Veuillez vous reconnecter.";
    $("login-error").classList.remove("hidden");
  }
  showPage("login");
  if (toastIt) toast(message || "Session expirée. Veuillez vous reconnecter.", true);
}

function setBusy(ids, busy) {
  ids.forEach((id) => {
    const el = $(id);
    if (el) el.disabled = busy;
  });
}

function showPage(name) {
  ["login", "device", "workspace"].forEach((page) => {
    $(`page-${page}`).classList.toggle("hidden", page !== name);
  });
}

function roleText(user, fallback) {
  if (fallback) return fallback;
  if (!user) return "";
  if (user.isSuperAdmin) return "Super Administrateur";
  const role = user.role?.name || user.role || user.roleName || "";
  if (role === "Societe_Admin") return "Administrateur de société";
  return role;
}

function fillIdentity(prefix, user, roleLabel) {
  const name = user?.name || user?.email || "";
  const role = roleText(user, roleLabel);
  if ($(`${prefix}-user-name`)) $(`${prefix}-user-name`).textContent = name;
  if ($(`${prefix}-user-role`)) $(`${prefix}-user-role`).textContent = role;
}

function deviceByAppId(appUserId) {
  return state.deviceUsers.find((u) => String(u.userId) === String(appUserId));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function punchLabel(type) {
  const n = Number(type);
  return (
    {
      0: "Entrée",
      1: "Sortie",
      2: "Début de pause",
      3: "Fin de pause",
      4: "Sortie",
      5: "Entrée",
    }[n] || `Type ${type}`
  );
}

function logUserName(log) {
  const id = String(log.deviceUserId ?? log.deviceUid ?? "");
  const cloud = state.cloudUsers.find((u) => String(u.id) === id);
  if (cloud?.name) return cloud.name;
  const device = state.deviceUsers.find(
    (u) => String(u.userId) === id || String(u.uid) === id,
  );
  return device?.name || "—";
}

function dateBounds() {
  const fromVal = $("log-from")?.value || "";
  const toVal = $("log-to")?.value || "";
  const from = fromVal ? new Date(`${fromVal}T00:00:00`) : null;
  const to = toVal ? new Date(`${toVal}T23:59:59.999`) : null;
  return { from, to, fromVal, toVal };
}

function filteredLogs() {
  const { from, to } = dateBounds();
  return state.logs.filter((log) => {
    if (!from && !to) return true;
    const t = new Date(log.punchTime).getTime();
    if (Number.isNaN(t)) return false;
    if (from && t < from.getTime()) return false;
    if (to && t > to.getTime()) return false;
    return true;
  });
}

function formatTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("fr-FR");
}

function userRoleName(user) {
  return user?.role?.name || user?.role || "";
}

function filteredCloudUsers() {
  const q = ($("user-search").value || "").toLowerCase().trim();
  return state.cloudUsers.filter((u) => {
    if (!q) return true;
    const societe = u.societe?.raisonSocial || "";
    return `${u.id} ${u.name} ${u.email} ${userRoleName(u)} ${societe}`
      .toLowerCase()
      .includes(q);
  });
}

function renderSelectionBar(rows) {
  const bar = $("selection-bar");
  const count = state.selectedIds.size;
  bar.classList.toggle("hidden", !rows.length);
  $("selection-count").textContent = `${count} sélectionné(s)`;
  const allVisibleSelected =
    rows.length > 0 && rows.every((u) => state.selectedIds.has(String(u.id)));
  $("select-all-users").checked = allVisibleSelected;
  $("btn-transfer-selected").disabled = count === 0;
}

function renderUsers() {
  const errorEl = $("users-error");
  if (state.usersError) {
    errorEl.textContent = state.usersError;
    errorEl.classList.remove("hidden");
  } else {
    errorEl.classList.add("hidden");
    errorEl.textContent = "";
  }

  const rows = filteredCloudUsers();
  const body = $("users-body");
  renderSelectionBar(rows);

  if (!rows.length) {
    const message = state.usersError
      ? "Impossible d’afficher les utilisateurs."
      : "Aucun utilisateur SaphirCaisse.";
    body.innerHTML = `<tr><td colspan="7" class="empty">${message}</td></tr>`;
    return;
  }

  const showSociete = Boolean(state.user?.isSuperAdmin);
  body.innerHTML = rows
    .map((u) => {
      const onDevice = deviceByAppId(u.id);
      const badge = onDevice
        ? `<span class="badge ok">Sur le terminal · ID ${onDevice.userId || onDevice.uid}</span>`
        : `<span class="badge off">Pas encore transféré</span>`;
      const card = onDevice?.cardno ? onDevice.cardno : "—";
      const checked = state.selectedIds.has(String(u.id)) ? "checked" : "";
      const societe = showSociete
        ? `<div class="muted">${escapeHtml(u.societe?.raisonSocial || "")}</div>`
        : "";
      return `<tr>
        <td class="col-check"><input type="checkbox" data-select="${u.id}" ${checked} /></td>
        <td>${u.id}</td>
        <td>${escapeHtml(u.name)}${societe}<div class="muted">${escapeHtml(u.email || "")}</div></td>
        <td>${escapeHtml(userRoleName(u) || "—")}</td>
        <td>${badge}</td>
        <td>${card}</td>
        <td><div class="actions">
          <button class="btn-tiny" data-act="enroll" data-id="${u.id}">Empreinte</button>
          <button class="btn-tiny" data-act="card" data-id="${u.id}">Carte</button>
        </div></td>
      </tr>`;
    })
    .join("");
}

function renderLogs() {
  const body = $("logs-body");
  const rows = filteredLogs();
  if (!state.logs.length) {
    body.innerHTML = `<tr><td colspan="4" class="empty">Aucun pointage chargé.</td></tr>`;
    return;
  }
  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="4" class="empty">Aucun pointage sur cette période.</td></tr>`;
    return;
  }
  body.innerHTML = rows
    .slice()
    .reverse()
    .slice(0, 500)
    .map(
      (log) => `<tr>
        <td>${escapeHtml(logUserName(log))}</td>
        <td>${escapeHtml(log.deviceUserId || "—")}</td>
        <td>${escapeHtml(formatTime(log.punchTime))}</td>
        <td>${escapeHtml(punchLabel(log.punchType))}</td>
      </tr>`,
    )
    .join("");
}

function renderSocieteFilter() {
  const select = $("societe-filter");
  const isSuper = Boolean(state.user?.isSuperAdmin);
  select.classList.toggle("hidden", !isSuper);
  if (!isSuper) return;
  const options = [`<option value="">Toutes les sociétés</option>`].concat(
    state.societes.map(
      (s) =>
        `<option value="${s.id}" ${String(s.id) === String(state.societeId) ? "selected" : ""}>${escapeHtml(s.name)}</option>`,
    ),
  );
  select.innerHTML = options.join("");
}

async function loadSocietes() {
  if (!state.user?.isSuperAdmin) {
    state.societes = [];
    renderSocieteFilter();
    return;
  }
  try {
    state.societes = unwrap(await window.attendance.societes());
  } catch {
    state.societes = [];
  }
  renderSocieteFilter();
}

async function refreshUsers() {
  setBusy(["btn-refresh-users", "btn-transfer-selected"], true);
  state.usersError = "";
  $("users-body").innerHTML = `<tr><td colspan="7" class="empty">Chargement…</td></tr>`;
  let cloudFailed = false;
  try {
    const cloudRes = await window.attendance.cloudUsers({ societeId: state.societeId || "" });
    state.cloudUsers = unwrap(cloudRes);
  } catch (err) {
    cloudFailed = true;
    state.usersError = err.message;
    toast(err.message, true);
  }

  try {
    state.deviceUsers = unwrap(await window.attendance.deviceUsers());
  } catch {
    try {
      await new Promise((r) => setTimeout(r, 1500));
      state.deviceUsers = unwrap(await window.attendance.deviceUsers());
    } catch {
      state.deviceUsers = state.deviceUsers || [];
      if (!cloudFailed) {
        toast(
          "Utilisateurs SaphirCaisse chargés. Le terminal a mis du temps à répondre — cliquez sur Actualiser.",
          true,
        );
      }
    }
  }

  const valid = new Set(state.cloudUsers.map((u) => String(u.id)));
  state.selectedIds = new Set([...state.selectedIds].filter((id) => valid.has(id)));
  renderUsers();
  if (!cloudFailed && !state.cloudUsers.length) {
    toast("Aucun utilisateur actif trouvé pour cette société", true);
  }
  setBusy(["btn-refresh-users", "btn-transfer-selected"], false);
}

function findCloudUser(id) {
  return state.cloudUsers.find((u) => String(u.id) === String(id));
}

function openDevicePage() {
  fillIdentity("device", state.user, state.roleLabel);
  showPage("device");
}

function openWorkspace(status) {
  fillIdentity("ws", state.user, state.roleLabel);
  const pill = $("ws-device-pill");
  if (status?.connected) {
    pill.textContent = `Terminal · ${status.ip}:${status.port}`;
    pill.classList.add("ok");
  }
  showPage("workspace");
  loadSocietes().then(refreshUsers);
}

async function logout() {
  await window.attendance.logout();
  state.user = null;
  state.cloudUsers = [];
  state.deviceUsers = [];
  state.societes = [];
  state.logs = [];
  state.selectedIds = new Set();
  $("password").value = "";
  $("login-error").classList.add("hidden");
  showPage("login");
}

async function transferUsers(users) {
  if (!users.length) {
    toast("Sélectionnez au moins un utilisateur", true);
    return;
  }
  setBusy(["btn-transfer-selected", "btn-refresh-users"], true);
  try {
    const result = unwrap(
      await window.attendance.addUsers(
        users.map((user) => ({ appUserId: user.id, name: user.name })),
      ),
    );
    const failed = (result.results || []).filter((row) => !row.ok);
    if (failed.length) {
      toast(
        `${result.transferred} transféré(s), ${result.failed} échec(s) : ${failed[0].error}`,
        true,
      );
    } else {
      toast(`${result.transferred} utilisateur(s) transféré(s) sur le terminal`);
      state.selectedIds = new Set();
    }
    await refreshUsers();
  } catch (err) {
    toast(err.message, true);
  } finally {
    setBusy(["btn-transfer-selected", "btn-refresh-users"], false);
  }
}

$("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const errorEl = $("login-error");
  errorEl.classList.add("hidden");
  setBusy(["btn-login"], true);
  try {
    await window.attendance.setConfig({ apiUrl: $("api-url").value.trim() });
    const result = unwrap(
      await window.attendance.login({
        apiUrl: $("api-url").value.trim(),
        email: $("email").value.trim(),
        password: $("password").value,
      }),
    );
    $("password").value = "";
    state.user = result.user;
    state.roleLabel = result.roleLabel;
    toast("Connexion réussie");
    openDevicePage();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove("hidden");
  } finally {
    setBusy(["btn-login"], false);
  }
});

$("btn-connect").addEventListener("click", async () => {
  const errorEl = $("device-error");
  errorEl.classList.add("hidden");
  setBusy(["btn-connect"], true);
  try {
    await window.attendance.setConfig({
      commKey: $("device-commkey").value.trim(),
    });
    const status = unwrap(
      await window.attendance.connectDevice({
        ip: $("device-ip").value.trim(),
        port: Number($("device-port").value) || 4370,
        commKey: $("device-commkey").value.trim(),
      }),
    );
    toast("Terminal connecté");
    openWorkspace(status);
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove("hidden");
  } finally {
    setBusy(["btn-connect"], false);
  }
});

$("btn-logout-device").addEventListener("click", logout);
$("btn-logout-ws").addEventListener("click", logout);
$("btn-change-device").addEventListener("click", async () => {
  await window.attendance.disconnectDevice();
  openDevicePage();
});

$("btn-refresh-users").addEventListener("click", refreshUsers);
$("user-search").addEventListener("input", renderUsers);
$("societe-filter").addEventListener("change", () => {
  state.societeId = $("societe-filter").value;
  window.attendance.setConfig({ societeId: state.societeId });
  refreshUsers();
});

$("select-all-users").addEventListener("change", (event) => {
  const rows = filteredCloudUsers();
  if (event.target.checked) {
    rows.forEach((u) => state.selectedIds.add(String(u.id)));
  } else {
    rows.forEach((u) => state.selectedIds.delete(String(u.id)));
  }
  renderUsers();
});

$("btn-transfer-selected").addEventListener("click", () => {
  const users = state.cloudUsers.filter((u) => state.selectedIds.has(String(u.id)));
  transferUsers(users);
});

document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b === btn));
    $("tab-users").classList.toggle("hidden", btn.dataset.tab !== "users");
    $("tab-attendance").classList.toggle("hidden", btn.dataset.tab !== "attendance");
  });
});

$("users-body").addEventListener("change", (event) => {
  const box = event.target.closest("input[data-select]");
  if (!box) return;
  const id = String(box.dataset.select);
  if (box.checked) state.selectedIds.add(id);
  else state.selectedIds.delete(id);
  renderSelectionBar(filteredCloudUsers());
});

$("users-body").addEventListener("click", async (event) => {
  const btn = event.target.closest("button[data-act]");
  if (!btn) return;
  const user = findCloudUser(btn.dataset.id);
  if (!user) return;
  state.selectedUser = user;

  if (btn.dataset.act === "card") {
    $("card-user").textContent = `${user.name} · ID ${user.id}`;
    $("card-number").value = deviceByAppId(user.id)?.cardno || "";
    $("card-dialog").showModal();
    return;
  }

  if (btn.dataset.act === "enroll") {
    $("enroll-user").textContent = `${user.name} · ID ${user.id}`;
    $("enroll-status").textContent =
      "L’utilisateur est envoyé sur le terminal si besoin. Cliquez sur Démarrer — le pointeuse doit afficher cet ID, pas un caractère inconnu. Posez le doigt 3 fois, puis fermez.";
    $("enroll-dialog").showModal();
  }
});

$("card-form").addEventListener("submit", async (event) => {
  if (event.submitter?.id !== "card-save") return;
  event.preventDefault();
  const user = state.selectedUser;
  if (!user) return;
  try {
    unwrap(
      await window.attendance.setCard({
        appUserId: user.id,
        name: user.name,
        cardno: $("card-number").value,
      }),
    );
    $("card-dialog").close();
    toast("Carte enregistrée sur le terminal");
    await refreshUsers();
  } catch (err) {
    toast(err.message, true);
  }
});

$("enroll-form").addEventListener("submit", async (event) => {
  if (event.submitter?.id !== "enroll-start") return;
  event.preventDefault();
  const user = state.selectedUser;
  if (!user) return;
  $("enroll-start").disabled = true;
  $("enroll-status").textContent =
    "Préparation du terminal… attendez que l’ID s’affiche, puis posez le doigt 3 fois. N’actualisez pas la liste pendant l’enrôlement.";
  try {
    const result = unwrap(
      await window.attendance.enroll({
        appUserId: user.id,
        name: user.name,
        fingerIndex: Number($("finger-index").value) || 0,
      }),
    );
    $("enroll-status").textContent =
      result.message || `Empreinte en cours pour l’ID ${result.userId || user.id}.`;
    toast(`${user.name} : enrôlement ID ${result.userId || user.id} — posez le doigt 3 fois`);
  } catch (err) {
    $("enroll-status").textContent = err.message;
    toast(err.message, true);
  } finally {
    $("enroll-start").disabled = false;
  }
});

$("btn-preview").addEventListener("click", async () => {
  setBusy(["btn-preview"], true);
  try {
    if (!state.cloudUsers.length) {
      try {
        state.cloudUsers = unwrap(await window.attendance.cloudUsers({ societeId: state.societeId || "" }));
      } catch {
        /* names may stay empty */
      }
    }
    state.logs = unwrap(await window.attendance.fetchAttendance());
    renderLogs();
    const shown = filteredLogs().length;
    toast(
      shown === state.logs.length
        ? `${shown} pointage(s) sur le terminal`
        : `${shown} pointage(s) sur la période (${state.logs.length} au total)`,
    );
  } catch (err) {
    toast(err.message, true);
  } finally {
    setBusy(["btn-preview"], false);
  }
});

$("log-from").addEventListener("change", renderLogs);
$("log-to").addEventListener("change", renderLogs);

$("btn-import").addEventListener("click", async () => {
  setBusy(["btn-import"], true);
  const box = $("import-result");
  box.classList.add("hidden");
  try {
    const result = unwrap(
      await window.attendance.importAttendance({
        dateFrom: $("log-from").value || "",
        dateTo: $("log-to").value || "",
      }),
    );
    box.classList.remove("hidden", "error");
    box.innerHTML = `
      <strong>Import terminé</strong><br />
      Nouveaux : ${result.imported} ·
      Déjà importés (ignorés) : ${result.skippedDuplicates} ·
      Utilisateur inconnu : ${result.unmatchedUsers} ·
      Total affiché : ${result.totalOnDevice}
    `;
    if (result.unmatchedSamples?.length) {
      box.innerHTML += `<div class="muted">IDs inconnus : ${result.unmatchedSamples.join(", ")}</div>`;
    }
    if (result.updated) {
      box.innerHTML += `<div class="muted">Types mis à jour : ${result.updated}</div>`;
    }
    toast("Import envoyé à SaphirCaisse");
    try {
      state.logs = unwrap(await window.attendance.fetchAttendance());
      renderLogs();
    } catch {
      /* optional */
    }
  } catch (err) {
    box.classList.remove("hidden");
    box.classList.add("error");
    box.textContent = err.message;
    toast(err.message, true);
  } finally {
    setBusy(["btn-import"], false);
  }
});

async function boot() {
  if (typeof window.attendance.onSessionExpired === "function") {
    window.attendance.onSessionExpired((data) => {
      handleSessionExpired(data?.message);
    });
  }

  const cfg = unwrap(await window.attendance.getConfig());
  $("api-url").value = cfg.apiUrl || "";
  $("email").value = cfg.email || "";
  $("device-ip").value = cfg.deviceIp || "";
  $("device-port").value = cfg.devicePort || 4370;
  $("device-commkey").value = cfg.commKey || "";
  state.societeId = cfg.societeId || "";

  if (cfg.hasToken && cfg.user) {
    state.user = cfg.user;
    state.roleLabel = cfg.roleLabel;
    const status = unwrap(await window.attendance.deviceStatus());
    if (status.connected) openWorkspace(status);
    else openDevicePage();
    return;
  }
  showPage("login");
}

boot().catch((err) => toast(err.message, true));
