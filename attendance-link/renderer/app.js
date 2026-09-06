const $ = (id) => document.getElementById(id);

const state = {
  user: null,
  roleLabel: "",
  cloudUsers: [],
  deviceUsers: [],
  logs: [],
  selectedUser: null,
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
  if (!res?.ok) throw new Error(res?.error || "L’action a échoué");
  return res.data;
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
  const role = user.role || user.roleName || "";
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
  return (
    { 0: "Entrée", 1: "Sortie", 2: "Début de pause", 3: "Fin de pause", 4: "Début HS", 5: "Fin HS" }[
      type
    ] || type
  );
}

function formatTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("fr-FR");
}

function renderUsers() {
  const q = ($("user-search").value || "").toLowerCase().trim();
  const rows = state.cloudUsers.filter((u) => {
    if (!q) return true;
    return `${u.id} ${u.name} ${u.email} ${u.role?.name || ""}`.toLowerCase().includes(q);
  });

  const body = $("users-body");
  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="6" class="empty">Aucun utilisateur.</td></tr>`;
    return;
  }

  body.innerHTML = rows
    .map((u) => {
      const onDevice = deviceByAppId(u.id);
      const badge = onDevice
        ? `<span class="badge ok">UID ${onDevice.uid}</span>`
        : `<span class="badge off">Absent</span>`;
      const card = onDevice?.cardno ? onDevice.cardno : "—";
      return `<tr>
        <td>${u.id}</td>
        <td>${escapeHtml(u.name)}<div class="muted">${escapeHtml(u.email || "")}</div></td>
        <td>${escapeHtml(u.role?.name || "—")}</td>
        <td>${badge}</td>
        <td>${card}</td>
        <td><div class="actions">
          <button class="btn-tiny" data-act="add" data-id="${u.id}">Ajouter</button>
          <button class="btn-tiny" data-act="enroll" data-id="${u.id}">Empreinte</button>
          <button class="btn-tiny" data-act="card" data-id="${u.id}">Carte</button>
        </div></td>
      </tr>`;
    })
    .join("");
}

function renderLogs() {
  const body = $("logs-body");
  if (!state.logs.length) {
    body.innerHTML = `<tr><td colspan="3" class="empty">Aucun pointage chargé.</td></tr>`;
    return;
  }
  body.innerHTML = state.logs
    .slice()
    .reverse()
    .slice(0, 300)
    .map(
      (log) => `<tr>
        <td>${escapeHtml(log.deviceUserId)}</td>
        <td>${escapeHtml(formatTime(log.punchTime))}</td>
        <td>${escapeHtml(punchLabel(log.punchType))}</td>
      </tr>`,
    )
    .join("");
}

async function refreshUsers() {
  setBusy(["btn-refresh-users"], true);
  try {
    const [cloudUsers, deviceUsers] = await Promise.all([
      window.attendance.cloudUsers().then(unwrap).catch(() => []),
      window.attendance.deviceUsers().then(unwrap).catch(() => []),
    ]);
    state.cloudUsers = cloudUsers;
    state.deviceUsers = deviceUsers;
    renderUsers();
  } catch (err) {
    toast(err.message, true);
  } finally {
    setBusy(["btn-refresh-users"], false);
  }
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
  refreshUsers();
}

async function logout() {
  await window.attendance.logout();
  state.user = null;
  state.cloudUsers = [];
  state.deviceUsers = [];
  state.logs = [];
  $("password").value = "";
  $("login-error").classList.add("hidden");
  showPage("login");
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
    const status = unwrap(
      await window.attendance.connectDevice({
        ip: $("device-ip").value.trim(),
        port: Number($("device-port").value) || 4370,
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

document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b === btn));
    $("tab-users").classList.toggle("hidden", btn.dataset.tab !== "users");
    $("tab-attendance").classList.toggle("hidden", btn.dataset.tab !== "attendance");
  });
});

$("users-body").addEventListener("click", async (event) => {
  const btn = event.target.closest("button[data-act]");
  if (!btn) return;
  const user = findCloudUser(btn.dataset.id);
  if (!user) return;
  state.selectedUser = user;

  if (btn.dataset.act === "add") {
    btn.disabled = true;
    try {
      unwrap(await window.attendance.addUser({ appUserId: user.id, name: user.name }));
      toast(`${user.name} a été ajouté sur le terminal (ID ${user.id})`);
      await refreshUsers();
    } catch (err) {
      toast(err.message, true);
    } finally {
      btn.disabled = false;
    }
    return;
  }

  if (btn.dataset.act === "card") {
    $("card-user").textContent = `${user.name} · ID ${user.id}`;
    $("card-number").value = deviceByAppId(user.id)?.cardno || "";
    $("card-dialog").showModal();
    return;
  }

  if (btn.dataset.act === "enroll") {
    $("enroll-user").textContent = `${user.name} · ID ${user.id}`;
    $("enroll-status").textContent =
      "Le terminal passe en mode enrôlement. Posez le doigt plusieurs fois jusqu’à confirmation.";
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
  $("enroll-status").textContent = "Enrôlement lancé… posez le doigt sur le terminal.";
  try {
    const result = unwrap(
      await window.attendance.enroll({
        appUserId: user.id,
        name: user.name,
        fingerIndex: Number($("finger-index").value) || 0,
      }),
    );
    $("enroll-status").textContent =
      result.message || "Enrôlement demandé. Suivez les instructions sur le terminal.";
    toast("Enrôlement lancé sur le terminal");
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
    state.logs = unwrap(await window.attendance.fetchAttendance());
    renderLogs();
    toast(`${state.logs.length} pointage(s) sur le terminal`);
  } catch (err) {
    toast(err.message, true);
  } finally {
    setBusy(["btn-preview"], false);
  }
});

$("btn-import").addEventListener("click", async () => {
  setBusy(["btn-import"], true);
  const box = $("import-result");
  box.classList.add("hidden");
  try {
    const result = unwrap(await window.attendance.importAttendance());
    box.classList.remove("hidden", "error");
    box.innerHTML = `
      <strong>Import terminé</strong><br />
      Nouveaux : ${result.imported} ·
      Déjà importés (ignorés) : ${result.skippedDuplicates} ·
      Utilisateur inconnu : ${result.unmatchedUsers} ·
      Total terminal : ${result.totalOnDevice}
    `;
    if (result.unmatchedSamples?.length) {
      box.innerHTML += `<div class="muted">IDs inconnus : ${result.unmatchedSamples.join(", ")}</div>`;
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
  const cfg = unwrap(await window.attendance.getConfig());
  $("api-url").value = cfg.apiUrl || "";
  $("email").value = cfg.email || "";
  $("device-ip").value = cfg.deviceIp || "";
  $("device-port").value = cfg.devicePort || 4370;

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
