const ZKLib = require("zkteco-js");

const CMD_STARTENROLL = 61;

function asArray(result) {
  if (!result) return [];
  if (Array.isArray(result)) return result;
  if (Array.isArray(result.data)) return result.data;
  return [];
}

function normalizeUser(raw) {
  const uid = Number(raw.uid ?? raw.userSn ?? raw.user_sn ?? 0);
  const userId = String(raw.userid ?? raw.userId ?? raw.user_id ?? raw.uid ?? "");
  return {
    uid,
    userId,
    name: raw.name || "",
    role: Number(raw.role ?? 0),
    password: raw.password || "",
    cardno: Number(raw.cardno ?? raw.cardNo ?? raw.card ?? 0),
  };
}

function toIso(value) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function normalizeLog(raw, deviceIp) {
  const punchTime =
    raw.recordTime || raw.record_time || raw.attTime || raw.timestamp || raw.punchTime;
  return {
    deviceUserId: String(
      raw.deviceUserId ?? raw.userId ?? raw.userid ?? raw.user_id ?? raw.uid ?? "",
    ),
    deviceUid: raw.userSn ?? raw.sn ?? raw.uid ?? null,
    punchTime: toIso(punchTime),
    punchType: Number(raw.type ?? raw.state ?? raw.punchType ?? 0),
    verifyMode: raw.verify != null ? Number(raw.verify) : null,
    deviceIp,
  };
}

function nextFreeUid(users, preferred) {
  const used = new Set(users.map((u) => Number(u.uid)).filter((n) => n > 0));
  if (preferred > 0 && preferred <= 3000 && !used.has(preferred)) return preferred;
  for (let i = 1; i <= 3000; i += 1) {
    if (!used.has(i)) return i;
  }
  throw new Error("No free device UID available (1–3000)");
}

function parseCard(value) {
  if (value == null || value === "") return 0;
  const raw = String(value).trim();
  if (/^0x/i.test(raw) || /[a-f]/i.test(raw)) {
    const n = Number.parseInt(raw.replace(/^0x/i, ""), 16);
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : 0;
}

class DeviceBridge {
  constructor() {
    this.device = null;
    this.connected = false;
    this.ip = "";
    this.port = 4370;
    this.info = null;
  }

  async connect({ ip, port = 4370, timeoutMs = 10000 }) {
    await this.disconnect();
    const inport = 4000 + Math.floor(Math.random() * 1000);
    this.device = new ZKLib(ip, Number(port) || 4370, Number(timeoutMs) || 10000, inport);
    await this.device.createSocket();
    this.connected = true;
    this.ip = ip;
    this.port = Number(port) || 4370;
    try {
      this.info = await this.device.getInfo();
    } catch {
      this.info = null;
    }
    return this.status();
  }

  async disconnect() {
    if (this.device) {
      try {
        await this.device.disconnect();
      } catch {
        /* ignore */
      }
    }
    this.device = null;
    this.connected = false;
    this.info = null;
    return this.status();
  }

  ensure() {
    if (!this.connected || !this.device) {
      throw new Error("Device is not connected");
    }
    return this.device;
  }

  status() {
    return {
      connected: this.connected,
      ip: this.ip,
      port: this.port,
      info: this.info,
    };
  }

  async getUsers() {
    const zk = this.ensure();
    const users = asArray(await zk.getUsers()).map(normalizeUser);
    return users;
  }

  async getInfo() {
    const zk = this.ensure();
    this.info = await zk.getInfo();
    return this.info;
  }

  findUser(users, appUserId) {
    const pin = String(appUserId);
    return users.find((u) => String(u.userId) === pin) || null;
  }

  async setUserOnDevice({ appUserId, name, cardno = 0, password = "" }) {
    const zk = this.ensure();
    const users = await this.getUsers();
    const existing = this.findUser(users, appUserId);
    const uid = existing ? existing.uid : nextFreeUid(users, Number(appUserId));
    const card = parseCard(cardno) || existing?.cardno || 0;
    const displayName = String(name || `User ${appUserId}`).slice(0, 24);
    const pin = String(appUserId).slice(0, 9);
    try {
      await zk.setUser(uid, pin, displayName, password || "", 0, card);
    } catch (err) {
      if (card > 65535 && typeof zk.executeCmd === "function") {
        await this.writeUser(uid, pin, displayName, password || "", card);
      } else {
        throw err;
      }
    }
    const refreshed = await this.getUsers();
    return this.findUser(refreshed, appUserId);
  }

  async writeUser(uid, userid, name, password, cardno) {
    const zk = this.ensure();
    const buf = Buffer.alloc(72);
    buf.writeUInt16LE(Number(uid), 0);
    buf.writeUInt16LE(0, 2);
    buf.write(String(password).padEnd(8, "\0"), 3, 8);
    buf.write(String(name).padEnd(24, "\0"), 11, 24);
    buf.writeUInt32LE(Number(cardno) || 0, 35);
    buf.writeUInt32LE(0, 40);
    buf.write(String(userid).padEnd(9, "\0"), 48, 9);
    await zk.executeCmd(8, buf);
  }

  async setCard({ appUserId, cardno, name }) {
    const users = await this.getUsers();
    const existing = this.findUser(users, appUserId);
    if (!existing) {
      return this.setUserOnDevice({ appUserId, name, cardno });
    }
    return this.setUserOnDevice({
      appUserId,
      name: name || existing.name,
      cardno,
    });
  }

  async deleteUser(appUserId) {
    const zk = this.ensure();
    const users = await this.getUsers();
    const existing = this.findUser(users, appUserId);
    if (!existing) return { deleted: false };
    if (typeof zk.deleteUser === "function") {
      await zk.deleteUser(existing.uid);
    } else {
      throw new Error("This device library build cannot delete users");
    }
    return { deleted: true, uid: existing.uid };
  }

  async enrollFinger({ appUserId, name, fingerIndex = 0, timeoutMs = 60000 }) {
    const zk = this.ensure();
    const user = await this.setUserOnDevice({ appUserId, name });
    if (!user) throw new Error("Could not create or find the user on the device");

    const fid = Math.max(0, Math.min(9, Number(fingerIndex) || 0));
    const started = await this.startEnroll(user.uid, fid);
    return {
      uid: user.uid,
      userId: user.userId,
      fingerIndex: fid,
      started,
      timeoutMs,
      message:
        "Place the finger on the terminal (usually 3 times). The device confirms when enrollment is done.",
    };
  }

  async startEnroll(uid, fingerIndex) {
    const zk = this.ensure();
    if (typeof zk.enrollUser === "function") {
      await zk.enrollUser(uid, fingerIndex);
      return "enrollUser";
    }
    if (typeof zk.startEnroll === "function") {
      await zk.startEnroll(uid, fingerIndex);
      return "startEnroll";
    }

    const payloads = [
      (() => {
        const buf = Buffer.alloc(4);
        buf.writeUInt16LE(Number(uid), 0);
        buf.writeUInt8(fingerIndex, 2);
        buf.writeUInt8(1, 3);
        return buf;
      })(),
      (() => {
        const buf = Buffer.alloc(5);
        buf.writeUInt32LE(Number(uid), 0);
        buf.writeInt8(fingerIndex, 4);
        return buf;
      })(),
    ];

    if (typeof zk.executeCmd !== "function") {
      throw new Error(
        "User is on the device, but this firmware/library cannot start remote enroll. Enroll the finger on the terminal keypad.",
      );
    }

    let lastError = null;
    for (const payload of payloads) {
      try {
        await zk.executeCmd(CMD_STARTENROLL, payload);
        return "executeCmd";
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error("STARTENROLL failed");
  }

  async getAttendances() {
    const zk = this.ensure();
    const logs = asArray(await zk.getAttendances()).map((row) =>
      normalizeLog(row, this.ip),
    );
    return logs;
  }
}

module.exports = { DeviceBridge, parseCard };
