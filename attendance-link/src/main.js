const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const store = require("./store");
const cloud = require("./cloud-api");
const { DeviceBridge } = require("./zk-device");
const { isAttendanceAdmin, roleLabel, ADMIN_ONLY_MESSAGE } = require("./auth-guard");

const device = new DeviceBridge();

function requireAdmin() {
  const cfg = store.read();
  if (!cfg.token || !isAttendanceAdmin(cfg.user)) {
    throw new Error(ADMIN_ONLY_MESSAGE);
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
      return { ok: false, error: err.message || String(err) };
    }
  };
}

ipcMain.handle("config:get", wrap(async () => {
  const cfg = store.read();
  if (cfg.token && !isAttendanceAdmin(cfg.user)) {
    store.write({ token: "", user: null });
    return {
      deviceIp: cfg.deviceIp,
      devicePort: cfg.devicePort,
      commKey: cfg.commKey,
      timeoutMs: cfg.timeoutMs,
      apiUrl: cfg.apiUrl,
      email: cfg.email,
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

ipcMain.handle("cloud:users", wrap(async () => {
  const cfg = requireAdmin();
  return cloud.getUsers(cfg.apiUrl, cfg.token);
}));

ipcMain.handle("device:connect", wrap(async (opts) => {
  requireAdmin();
  const cfg = store.read();
  const ip = opts?.ip || cfg.deviceIp;
  const port = opts?.port || cfg.devicePort;
  store.write({ deviceIp: ip, devicePort: Number(port) || 4370 });
  return device.connect({
    ip,
    port,
    timeoutMs: cfg.timeoutMs,
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

ipcMain.handle("attendance:import", wrap(async () => {
  const cfg = requireAdmin();
  const logs = await device.getAttendances();
  if (!logs.length) {
    return { imported: 0, skippedDuplicates: 0, unmatchedUsers: 0, invalid: 0, totalOnDevice: 0 };
  }

  const batchSize = 500;
  const summary = {
    imported: 0,
    skippedDuplicates: 0,
    unmatchedUsers: 0,
    invalid: 0,
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
    if (data.unmatchedSamples) {
      summary.unmatchedSamples.push(...data.unmatchedSamples);
    }
  }

  summary.unmatchedSamples = [...new Set(summary.unmatchedSamples)].slice(0, 10);
  return summary;
}));
