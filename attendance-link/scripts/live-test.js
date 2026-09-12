const cloud = require("../src/cloud-api");
const { DeviceBridge, asErrorMessage } = require("../src/zk-device");
const { isAttendanceAdmin, roleLabel } = require("../src/auth-guard");

const API = "http://localhost:3000/api";
const EMAIL = "superadmin@gmail.com";
const PASSWORD = "12345678";
const DEVICE_IP = "192.168.1.201";
const DEVICE_PORT = 4370;

function log(step, data) {
  console.log(`\n=== ${step} ===`);
  console.log(typeof data === "string" ? data : JSON.stringify(data, null, 2));
}

(async () => {
  const report = { ok: [], fail: [] };
  const device = new DeviceBridge();

  try {
    try {
      const login = await cloud.login(API, EMAIL, PASSWORD);
      const admin = isAttendanceAdmin(login.user);
      log("LOGIN", {
        id: login.user.id,
        name: login.user.name,
        role: login.user.role,
        isSuperAdmin: login.user.isSuperAdmin,
        societeId: login.user.societeId,
        admin,
        roleLabel: roleLabel(login.user),
        tokenLen: login.token?.length,
      });
      if (!admin) throw new Error("isAttendanceAdmin returned false for superadmin");
      report.ok.push("login");
      globalThis._login = login;
    } catch (err) {
      report.fail.push({ step: "login", error: asErrorMessage(err) });
      throw err;
    }

    try {
      const users = await cloud.getUsers(API, globalThis._login.token);
      log("CLOUD USERS", {
        count: users.length,
        sample: users.slice(0, 5).map((u) => ({
          id: u.id,
          name: u.name,
          role: u.role,
          societe: u.societe,
        })),
      });
      if (!users.length) throw new Error("No SaphirCaisse users returned");
      globalThis._users = users;
      report.ok.push("cloudUsers");
    } catch (err) {
      report.fail.push({ step: "cloudUsers", error: asErrorMessage(err) });
      throw err;
    }

    try {
      const societes = await cloud.getSocietes(API, globalThis._login.token);
      log("SOCIETES", societes);
      report.ok.push("societes");
    } catch (err) {
      report.fail.push({ step: "societes", error: asErrorMessage(err) });
    }

    try {
      const status = await device.connect({
        ip: DEVICE_IP,
        port: DEVICE_PORT,
        timeoutMs: 30000,
      });
      log("DEVICE CONNECT", status);
      report.ok.push("connect");
    } catch (err) {
      report.fail.push({ step: "connect", error: asErrorMessage(err), stack: err.stack });
      throw err;
    }

    try {
      const deviceUsers = await device.getUsers();
      log("DEVICE USERS", {
        count: deviceUsers.length,
        sample: deviceUsers.slice(0, 8),
      });
      report.ok.push("deviceUsers");
    } catch (err) {
      report.fail.push({ step: "deviceUsers", error: asErrorMessage(err), stack: err.stack });
    }

    try {
      const target = globalThis._users.find((u) => !u.isSuperAdmin) || globalThis._users[0];
      log("ADD USER TARGET", { id: target.id, name: target.name });
      const saved = await device.setUserOnDevice({
        appUserId: target.id,
        name: target.name,
      });
      log("ADD USER RESULT", saved);
      report.ok.push("setUser");
      globalThis._target = target;
    } catch (err) {
      report.fail.push({ step: "setUser", error: asErrorMessage(err), stack: err.stack });
    }

    try {
      const logs = await device.getAttendances();
      log("ATTENDANCE", { count: logs.length, sample: logs.slice(0, 3) });
      report.ok.push("attendance");
    } catch (err) {
      report.fail.push({ step: "attendance", error: asErrorMessage(err), stack: err.stack });
    }

    try {
      const target = globalThis._target || globalThis._users[0];
      const enroll = await device.enrollFinger({
        appUserId: target.id,
        name: target.name,
        fingerIndex: 0,
      });
      log("ENROLL START", enroll);
      report.ok.push("enroll");
    } catch (err) {
      report.fail.push({ step: "enroll", error: asErrorMessage(err), stack: err.stack });
    }
  } finally {
    try {
      await device.disconnect();
    } catch {
      /* ignore */
    }
    log("REPORT", report);
    if (report.fail.length) process.exitCode = 1;
  }
})().catch((err) => {
  console.error("FATAL", asErrorMessage(err));
  console.error(err);
  process.exit(1);
});
