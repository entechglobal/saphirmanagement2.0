const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const store = require("./store");
const cloud = require("./cloud-api");
const { DeviceBridge, asErrorMessage } = require("./zk-device");
const { isAttendanceAdmin, roleLabel, ADMIN_ONLY_MESSAGE } = require("./auth-guard");

const device = new DeviceBridge();
const SESSION_EXPIRED_MESSAGE = "Session expirée. Veuillez vous reconnecter.";

function decodeJwtExp(token) {
  try {
    const part = String(token || "").split(".")[1];
    if (!part) return null;
    const padded = part.replace(/-/g, "+").replace(/_/g, "/") + "==".slice(0, (4 - (part.length % 4)) % 4);
    const payload = JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
    return Number(payload?.exp) || null;
  } catch {
    return null;
  }
}

function isTokenExpired(token) {
  const exp = decodeJwtExp(token);
  if (!exp) return false;
  return exp * 1000 <= Date.now() + 5000;
}

function notifySessionExpired(message = SESSION_EXPIRED_MESSAGE) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send("session:expired", { message });
  }
}

async function clearSession() {
  store.write({ token: "", user: null });
  try {
    await device.disconnect();
  } catch {
    /* ignore */
  }
}

function requireAdmin() {
  const cfg = store.read();
  if (!cfg.token || !isAttendanceAdmin(cfg.user)) {
    throw new Error(ADMIN_ONLY_MESSAGE);
  }
  if (isTokenExpired(cfg.token)) {
    const err = new Error(SESSION_EXPIRED_MESSAGE);
    err.code = "TOKEN_EXPIRED";
    err.status = 401;
    throw err;
  }
  return cfg;
}

function iconPath() {
  const ico = path.join(__dirname, "../build/icon.ico");
  const png = path.join(__dirname, "../build/icon.png");
  return require("fs").existsSync(ico) ? ico : png;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1220,
    height: 800,
    minWidth: 980,
    minHeight: 680,
    title: "Saphir Attendance Link",
    backgroundColor: "#f4f6f8",
    autoHideMenuBar: true,
    icon: iconPath(),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, "../renderer/index.html"));
}

if (process.platform === "win32") {
  app.setAppUserModelId("com.saphir.attendance-link");
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", async () => {
  await device.disconnect();
  if (process.platform !== "darwin") app.quit();
});

function wrap(fn) {
  return async (_event, ...args) => {
    try {
      return { ok: true, data: await fn(...args) };
    } catch (err) {
      if (cloud.isExpiredAuthError(err)) {
        await clearSession();
        notifySessionExpired(SESSION_EXPIRED_MESSAGE);
        return {
          ok: false,
          error: SESSION_EXPIRED_MESSAGE,
          code: "TOKEN_EXPIRED",
        };
      }
      return { ok: false, error: asErrorMessage(err, err?.message || String(err)) };
    }
  };
}

ipcMain.handle("config:get", wrap(async () => {
  const cfg = store.read();
  const expired = cfg.token && isTokenExpired(cfg.token);
  if ((cfg.token && !isAttendanceAdmin(cfg.user)) || expired) {
    if (expired) await clearSession();
    else store.write({ token: "", user: null });
    return {
      deviceIp: cfg.deviceIp,
      devicePort: cfg.devicePort,
      commKey: cfg.commKey,
      timeoutMs: cfg.timeoutMs,
      apiUrl: cfg.apiUrl,
      email: cfg.email,
      societeId: cfg.societeId || "",
      user: null,
      hasToken: false,
      roleLabel: "",
    };
  }
  return {
    deviceIp: cfg.deviceIp,
    devicePort: cfg.devicePort,
    commKey: cfg.commKey,
    timeoutMs: cfg.timeoutMs,
    apiUrl: cfg.apiUrl,
    email: cfg.email,
    societeId: cfg.societeId || "",
    user: cfg.user,
    hasToken: Boolean(cfg.token) && isAttendanceAdmin(cfg.user),
    roleLabel: roleLabel(cfg.user),
  };
}));

ipcMain.handle("config:set", wrap(async (partial) => {
  const cfg = store.write(partial || {});
  return {
    deviceIp: cfg.deviceIp,
    devicePort: cfg.devicePort,
    commKey: cfg.commKey,
    timeoutMs: cfg.timeoutMs,
    apiUrl: cfg.apiUrl,
    email: cfg.email,
    user: cfg.user,
    hasToken: Boolean(cfg.token),
  };
}));

ipcMain.handle("cloud:login", wrap(async ({ apiUrl, email, password }) => {
  const result = await cloud.login(apiUrl, email, password);
  const user = result.user;
  if (!isAttendanceAdmin(user)) {
    store.write({ apiUrl, email, token: "", user: null });
    throw new Error(ADMIN_ONLY_MESSAGE);
  }
  store.write({ apiUrl, email, token: result.token, user });
  return { user, roleLabel: roleLabel(user) };
}));

ipcMain.handle("cloud:logout", wrap(async () => {
  await device.disconnect();
  store.write({ token: "", user: null });
  return { user: null };
}));

ipcMain.handle("cloud:users", wrap(async (opts) => {
  const cfg = requireAdmin();
  const societeId = opts?.societeId || cfg.societeId || null;
  if (opts?.societeId !== undefined) {
    store.write({ societeId: opts.societeId || "" });
  }
  return cloud.getUsers(cfg.apiUrl, cfg.token, societeId || undefined);
}));

ipcMain.handle("cloud:societes", wrap(async () => {
  const cfg = requireAdmin();
  if (!cfg.user?.isSuperAdmin) return [];
  return cloud.getSocietes(cfg.apiUrl, cfg.token);
}));

ipcMain.handle("device:connect", wrap(async (opts) => {
  requireAdmin();
  const cfg = store.read();
  const ip = opts?.ip || cfg.deviceIp;
  const port = opts?.port || cfg.devicePort;
  store.write({
    deviceIp: ip,
    devicePort: Number(port) || 4370,
    commKey: opts?.commKey != null ? String(opts.commKey) : cfg.commKey,
  });
  return device.connect({
    ip,
    port,
    timeoutMs: cfg.timeoutMs || 30000,
  });
}));

ipcMain.handle("device:disconnect", wrap(async () => device.disconnect()));

ipcMain.handle("device:status", wrap(async () => device.status()));

ipcMain.handle("device:users", wrap(async () => {
  requireAdmin();
  return device.getUsers();
}));

ipcMain.handle("device:addUser", wrap(async (payload) => {
  requireAdmin();
  return device.setUserOnDevice(payload);
}));

ipcMain.handle("device:addUsers", wrap(async (payload) => {
  requireAdmin();
  const users = Array.isArray(payload) ? payload : payload?.users || [];
  if (!users.length) throw new Error("Aucun utilisateur sélectionné");
  return device.addUsers(users);
}));

ipcMain.handle("device:setCard", wrap(async (payload) => {
  requireAdmin();
  return device.setCard(payload);
}));

ipcMain.handle("device:enroll", wrap(async (payload) => {
  requireAdmin();
  return device.enrollFinger(payload);
}));

ipcMain.handle("device:deleteUser", wrap(async (appUserId) => {
  requireAdmin();
  return device.deleteUser(appUserId);
}));

ipcMain.handle("attendance:fetch", wrap(async () => {
  requireAdmin();
  return device.getAttendances();
}));

ipcMain.handle("attendance:import", wrap(async (opts) => {
  const cfg = requireAdmin();
  let logs = await device.getAttendances();
  const from = opts?.dateFrom ? new Date(`${opts.dateFrom}T00:00:00`) : null;
  const to = opts?.dateTo ? new Date(`${opts.dateTo}T23:59:59.999`) : null;
  if (from || to) {
    logs = logs.filter((log) => {
      const t = new Date(log.punchTime).getTime();
      if (Number.isNaN(t)) return false;
      if (from && t < from.getTime()) return false;
      if (to && t > to.getTime()) return false;
      return true;
    });
  }
  if (!logs.length) {
    return { imported: 0, skippedDuplicates: 0, unmatchedUsers: 0, invalid: 0, updated: 0, totalOnDevice: 0 };
  }

  const batchSize = 500;
  const summary = {
    imported: 0,
    skippedDuplicates: 0,
    unmatchedUsers: 0,
    invalid: 0,
    updated: 0,
    unmatchedSamples: [],
    totalOnDevice: logs.length,
  };

  for (let i = 0; i < logs.length; i += batchSize) {
    const chunk = logs.slice(i, i + batchSize);
    const result = await cloud.importAttendance(cfg.apiUrl, cfg.token, {
      deviceIp: device.ip,
      records: chunk,
    });
    const data = result?.data || result;
    summary.imported += data.imported || 0;
    summary.skippedDuplicates += data.skippedDuplicates || 0;
    summary.unmatchedUsers += data.unmatchedUsers || 0;
    summary.invalid += data.invalid || 0;
    summary.updated += data.updated || 0;
    if (data.unmatchedSamples) {
      summary.unmatchedSamples.push(...data.unmatchedSamples);
    }
  }

  summary.unmatchedSamples = [...new Set(summary.unmatchedSamples)].slice(0, 10);
  return summary;
}));
