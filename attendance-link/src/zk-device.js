const ZKLib = require("zkteco-js");

const CMD_STARTENROLL = 61;
const CMD_USER_WRQ = 8;
const CMD_ACK_ERROR = 2001;
const CMD_REFRESHDATA = 1013;

// K40 Pro F-keys: 0/5 Entrée, 1/4 Sortie, 2 pause start, 3 pause end.
// Offset 26 is verify method (fingerprint/card). Offset 31 is in/out.
const PUNCH_TYPE_LABELS = {
  0: "Fin de pause",
  1: "Début de pause",
  4: "Sortie",
  5: "Entrée",
};

function asArray(result) {
  if (!result) return [];
  if (Array.isArray(result)) return result;
  if (Array.isArray(result.data)) return result.data;
  return [];
}

function asErrorMessage(err, fallback = "Erreur terminal") {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (typeof err.toast === "function") {
    try {
      const text = err.toast();
      if (text) return text;
    } catch {
      /* ignore */
    }
  }
  const nested = err.err || err.error || err.cause;
  return (
    err.message ||
    nested?.message ||
    (typeof nested === "string" ? nested : null) ||
    fallback
  );
}

function normalizeUser(raw) {
  const uid = Number(raw.uid ?? raw.userSn ?? raw.user_sn ?? 0);
  const userId = String(
    raw.userId ?? raw.userid ?? raw.user_id ?? raw.uid ?? "",
  ).replace(/\0/g, "");
  if (!isPrintableId(userId) && !String(raw.name || "").trim()) {
    return null;
  }
  const pin = isPrintableId(userId) ? userId.trim() : String(uid);
  let cardno = Number(raw.cardno ?? raw.card ?? raw.cardNo ?? 0);
  if (cardno) {
    const asText = Buffer.from([
      cardno & 0xff,
      (cardno >> 8) & 0xff,
      (cardno >> 16) & 0xff,
      (cardno >> 24) & 0xff,
    ])
      .toString("ascii")
      .replace(/\0/g, "");
    if (asText === pin) cardno = 0;
  }
  return {
    uid,
    userId: pin,
    name: raw.name || "",
    role: Number(raw.role ?? raw.privilege ?? 0),
    password: raw.password || "",
    cardno,
  };
}

function toIso(value) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function isPrintableId(value) {
  const text = String(value || "").replace(/\0/g, "").trim();
  return /^[0-9A-Za-z_-]+$/.test(text);
}

function uidFromRecord(raw) {
  const pin = String(raw.user_id ?? raw.userId ?? raw.userid ?? "");
  if (pin && [...pin].some((ch) => ch.charCodeAt(0) < 32)) {
    let uid = 0;
    for (let i = 0; i < Math.min(pin.length, 2); i += 1) {
      uid += pin.charCodeAt(i) << (8 * i);
    }
    if (uid > 0) return uid;
  }
  const n = Number(raw.sn ?? raw.uid ?? raw.userSn ?? raw.user_sn);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizePunchType(raw) {
  // zkteco-js decodeRecordData40: type = offset 26 (verify), state = offset 31 (in/out).
  // Never treat verify method as Entrée/Sortie (fingerprint=1 looks like Sortie).
  const inOut = raw.state ?? raw.status ?? raw.punchType;
  const n = Number(inOut);
  if (Number.isInteger(n) && n >= 0 && n <= 15) return n;
  return 0;
}

function normalizeVerifyMode(raw) {
  const verify = raw.verifyMode ?? raw.verify ?? raw.type;
  if (verify == null || verify === "") return null;
  const n = Number(verify);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

function normalizeLog(raw, deviceIp) {
  const punchTime =
    raw.recordTime || raw.record_time || raw.attTime || raw.timestamp || raw.punchTime;
  const pin = raw.user_id ?? raw.userId ?? raw.userid ?? raw.deviceUserId ?? "";
  return {
    deviceUserId: isPrintableId(pin) ? String(pin).trim() : "",
    deviceUid: uidFromRecord(raw),
    punchTime: toIso(punchTime),
    punchType: normalizePunchType(raw),
    verifyMode: normalizeVerifyMode(raw),
    deviceIp,
  };
}

function pinToUid(pin) {
  const n = Number.parseInt(String(pin), 10);
  if (!Number.isFinite(n) || n < 1 || n > 3000) {
    throw new Error("L’ID utilisateur doit être un nombre entre 1 et 3000 (UID = ID)");
  }
  return n;
}

function isAckError(reply) {
  if (!reply || reply.length < 2) return false;
  const cmd = reply.readUInt16LE(0);
  return cmd === CMD_ACK_ERROR || cmd === 65535 || cmd === 65533;
}

function isFakeAsciiCard(cardno, pin) {
  const n = Number(cardno);
  if (!n) return false;
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(n >>> 0, 0);
  const asText = buf.toString("ascii").replace(/\0/g, "");
  return asText === String(pin);
}

function packUser72({ uid, pin, name, password = "", role = 0, card = 0 }) {
  const buf = Buffer.alloc(72);
  const pinStr = String(pin).replace(/\0/g, "").trim().slice(0, 9);
  buf.writeUInt16LE(uid, 0);
  buf.writeUInt8(role & 0xff, 2);
  buf.write(String(password || "").slice(0, 8), 3, "ascii");
  buf.write(String(name || "").slice(0, 24), 11, "ascii");
  // Offset 35 is the RFID card (uint32). Writing ASCII PIN here made
  // user 5 show card 53 ('5'), user 6 card 54, and a leftover 0x01 shows
  // as an unknown character. PIN / LCD id lives only at offset 48.
  buf.writeUInt32LE(Number(card) || 0, 35);
  buf.writeUInt32LE(0, 40);
  buf.write(pinStr, 48, "ascii");
  return buf;
}

function enrollPayloads(uid, fingerIndex, pin) {
  const pinStr = String(pin || uid).replace(/\0/g, "").trim().slice(0, 24);
  const fid = Math.max(0, Math.min(9, Number(fingerIndex) || 0));
  // TFT / SSR StartEnrollEx (zk-protocol): 26 bytes
  //   ASCII user id at offset 0 (PIN2Width=9, padded with zeros)
  //   finger index at offset 24
  //   flag 1 (valid fp) at offset 25
  // BW StartEnroll is 4-byte UID (05 00 00 01). On this K40 that string is
  // shown as a control character and a NEW user is created.
  const pin24 = Buffer.alloc(26);
  pin24.write(pinStr, 0, "ascii");
  pin24.writeUInt8(fid, 24);
  pin24.writeUInt8(1, 25);
  const pin9 = Buffer.alloc(11);
  pin9.write(pinStr.slice(0, 9), 0, "ascii");
  pin9.writeUInt8(fid, 9);
  pin9.writeUInt8(1, 10);
  return [pin24, pin9];
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
    this.timeoutMs = 30000;
    this.info = null;
    this.lastUsers = [];
    this.purgedGhosts = false;
  }

  async connect({ ip, port = 4370, timeoutMs = 30000 }) {
    await this.disconnect();
    const inport = 4000 + Math.floor(Math.random() * 1000);
    this.timeoutMs = Number(timeoutMs) || 30000;
    this.device = new ZKLib(ip, Number(port) || 4370, this.timeoutMs, inport);
    await this.device.createSocket();
    this.connected = true;
    this.ip = ip;
    this.port = Number(port) || 4370;
    try {
      this.info = await this.device.getInfo();
    } catch {
      this.info = null;
    }
    await this.enableDeviceSafe();
    return this.status();
  }

  async enableDeviceSafe() {
    try {
      if (this.device) await this.device.enableDevice();
    } catch {
      /* ignore */
    }
  }

  hardClose() {
    try {
      this.device?.ztcp?.socket?.destroy?.();
    } catch {
      /* ignore */
    }
    try {
      this.device?.zudp?.socket?.close?.();
    } catch {
      /* ignore */
    }
    this.device = null;
    this.connected = false;
  }

  async disconnect() {
    if (this.device) {
      await this.enableDeviceSafe();
      try {
        await Promise.race([
          this.device.disconnect(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("disconnect timeout")), 2500),
          ),
        ]);
      } catch {
        this.hardClose();
      }
    }
    this.device = null;
    this.connected = false;
    this.info = null;
    this.purgedGhosts = false;
    return this.status();
  }

  async recover() {
    if (!this.ip) throw new Error("Le terminal n’est pas connecté");
    return this.connect({
      ip: this.ip,
      port: this.port,
      timeoutMs: this.timeoutMs,
    });
  }

  ensure() {
    if (!this.connected || !this.device) {
      throw new Error("Le terminal n’est pas connecté");
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

  async getRawUsers() {
    const load = async () => asArray(await this.ensure().getUsers());
    try {
      const rows = await load();
      await this.enableDeviceSafe();
      return rows;
    } catch (err) {
      try {
        await this.recover();
        const rows = await load();
        await this.enableDeviceSafe();
        return rows;
      } catch (retryErr) {
        await this.enableDeviceSafe();
        throw new Error(asErrorMessage(retryErr, asErrorMessage(err)));
      }
    }
  }

  async getUsers() {
    try {
      const users = (await this.getRawUsers()).map(normalizeUser).filter(Boolean);
      this.lastUsers = users;
      return users;
    } catch (err) {
      await this.enableDeviceSafe();
      if (this.lastUsers?.length) return this.lastUsers;
      throw new Error(asErrorMessage(err));
    }
  }

  async purgeGhostUsers() {
    if (this.purgedGhosts) return;
    const raw = await this.getRawUsers();
    for (const row of raw) {
      if (normalizeUser(row)) continue;
      const uid = Number(row.uid);
      if (!(uid > 0)) continue;
      try {
        await this.ensure().deleteUser(uid);
      } catch {
        try {
          await this.recover();
          await this.ensure().deleteUser(uid);
        } catch {
          /* continue */
        }
      }
    }
    this.purgedGhosts = true;
  }

  async getInfo() {
    const zk = this.ensure();
    this.info = await zk.getInfo();
    return this.info;
  }

  findUser(users, appUserId) {
    const pin = String(appUserId);
    const uid = Number.parseInt(pin, 10);
    return (
      users.find((u) => String(u.userId) === pin) ||
      users.find(
        (u) => Number(u.uid) === uid && (!u.userId || String(u.userId) === pin),
      ) ||
      null
    );
  }

  async deleteUid(uid) {
    const n = Number(uid);
    if (!(n > 0)) return;
    try {
      await this.ensure().deleteUser(n);
    } catch {
      try {
        await this.recover();
        await this.ensure().deleteUser(n);
      } catch {
        /* ignore */
      }
    }
  }

  async writeUser(uid, pin, displayName, pwd, card) {
    const payload = packUser72({
      uid,
      pin,
      name: displayName,
      password: pwd,
      card,
    });
    const send = async () => {
      const zk = this.ensure();
      try {
        await zk.disableDevice();
      } catch {
        /* ignore */
      }
      try {
        const reply = await zk.executeCmd(CMD_USER_WRQ, payload);
        if (isAckError(reply)) {
          throw new Error("Le terminal a refusé l’écriture de l’utilisateur");
        }
        try {
          await zk.executeCmd(CMD_REFRESHDATA, "");
        } catch {
          /* optional */
        }
      } finally {
        await this.enableDeviceSafe();
      }
    };
    try {
      await send();
    } catch {
      await this.recover();
      await send();
    }
  }

  async setUserOnDevice({
    appUserId,
    name,
    cardno = 0,
    password = "",
    skipRefresh = false,
    forceWrite = false,
  }) {
    const pin = String(appUserId).replace(/\0/g, "").trim().slice(0, 9);
    if (!isPrintableId(pin)) {
      throw new Error("Identifiant utilisateur invalide pour le terminal");
    }
    const uid = pinToUid(pin);
    const displayName = String(name || `User ${appUserId}`).slice(0, 24);
    const card = parseCard(cardno);
    const pwd = String(password || "").slice(0, 8);

    try {
      await this.purgeGhostUsers();
    } catch {
      /* continue with a clean-enough list */
    }

    let users;
    try {
      users = await this.getUsers();
    } catch {
      await this.recover();
      users = await this.getUsers();
    }

    const existing = this.findUser(users, pin);
    const occupant = users.find((u) => Number(u.uid) === uid) || null;

    if (occupant && String(occupant.userId) !== pin) {
      await this.deleteUid(occupant.uid);
    }
    if (existing && Number(existing.uid) !== uid) {
      await this.deleteUid(existing.uid);
    }

    const alreadyOk =
      existing &&
      Number(existing.uid) === uid &&
      String(existing.userId) === pin &&
      !isFakeAsciiCard(existing.cardno, pin) &&
      (!card || Number(existing.cardno) === card);

    if (!alreadyOk || forceWrite) {
      await this.writeUser(uid, pin, displayName, pwd, card);
    }

    await this.enableDeviceSafe();

    if (skipRefresh) {
      return { uid, userId: pin, name: displayName, role: 0, password: pwd, cardno: card };
    }

    const refreshed = await this.getUsers();
    const saved = this.findUser(refreshed, pin);
    if (!saved || Number(saved.uid) !== uid || String(saved.userId) !== pin) {
      throw new Error(
        `L’utilisateur ${pin} n’a pas été enregistré sur le terminal (UID ${uid}). Réessayez.`,
      );
    }
    return { ...saved, uid, userId: pin };
  }

  async addUsers(users) {
    const results = [];
    for (const user of users || []) {
      try {
        const data = await this.setUserOnDevice({
          appUserId: user.appUserId ?? user.id,
          name: user.name,
          cardno: user.cardno,
        });
        results.push({
          id: user.appUserId ?? user.id,
          name: user.name,
          ok: true,
          data,
        });
      } catch (err) {
        try {
          await this.recover();
        } catch {
          /* continue */
        }
        results.push({
          id: user.appUserId ?? user.id,
          name: user.name,
          ok: false,
          error: asErrorMessage(err),
        });
      }
    }
    return {
      transferred: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    };
  }

  async setCard({ appUserId, cardno, name }) {
    return this.setUserOnDevice({ appUserId, name, cardno });
  }

  async deleteUser(appUserId) {
    const users = await this.getUsers();
    const existing = this.findUser(users, appUserId);
    if (!existing) return { deleted: false };
    const zk = this.ensure();
    if (typeof zk.deleteUser !== "function") {
      throw new Error("Cette bibliothèque ne peut pas supprimer d’utilisateur sur le terminal");
    }
    await zk.deleteUser(existing.uid);
    return { deleted: true, uid: existing.uid };
  }

  async enrollFinger({ appUserId, name, fingerIndex = 0 }) {
    const pin = String(appUserId).replace(/\0/g, "").trim();
    if (!isPrintableId(pin)) {
      throw new Error("Identifiant utilisateur invalide pour l’enrôlement");
    }
    const uid = pinToUid(pin);

    let user = this.findUser(this.lastUsers || [], pin);
    if (!user || Number(user.uid) !== uid || String(user.userId) !== pin) {
      user = await this.setUserOnDevice({ appUserId, name });
    }
    if (!user || Number(user.uid) !== uid || !isPrintableId(user.userId)) {
      throw new Error("Transférez d’abord l’utilisateur sur le terminal, puis enrôlez l’empreinte.");
    }

    const fid = Math.max(0, Math.min(9, Number(fingerIndex) || 0));
    await this.enableDeviceSafe();
    await this.startEnroll(uid, fid, pin);
    await this.enableDeviceSafe();

    return {
      uid,
      userId: pin,
      fingerIndex: fid,
      started: "startEnrollEx",
      message: `Enrôlement de l’ID ${pin}. Le terminal doit afficher ${pin}. Posez le doigt 3 fois, puis fermez cette fenêtre.`,
    };
  }

  async startEnroll(uid, fingerIndex, pin) {
    const zk = this.ensure();
    if (typeof zk.executeCmd !== "function") {
      throw new Error("Le terminal ne prend pas en charge l’enrôlement à distance.");
    }
    if (!isPrintableId(pin) || pinToUid(uid) !== pinToUid(pin)) {
      throw new Error("UID et ID utilisateur doivent être identiques pour l’enrôlement");
    }

    await this.enableDeviceSafe();

    let lastError = null;
    for (const payload of enrollPayloads(uid, fingerIndex, pin)) {
      try {
        const reply = await zk.executeCmd(CMD_STARTENROLL, payload);
        if (isAckError(reply)) {
          lastError = new Error("Le terminal a rejeté l’enrôlement");
          continue;
        }
        return true;
      } catch (err) {
        lastError = err;
      }
    }
    throw new Error(asErrorMessage(lastError, "Impossible de démarrer l’enrôlement"));
  }

  async resolveLogUsers(logs) {
    let users = this.lastUsers;
    try {
      users = await this.getUsers();
    } catch {
      users = this.lastUsers || [];
    }
    const byUid = new Map(users.map((u) => [Number(u.uid), u]));
    const byPin = new Map(users.map((u) => [String(u.userId), u]));
    return logs.map((log) => {
      const byId = log.deviceUserId ? byPin.get(String(log.deviceUserId)) : null;
      const byDeviceUid = log.deviceUid != null ? byUid.get(Number(log.deviceUid)) : null;
      const user = byId || byDeviceUid;
      if (user) {
        return { ...log, deviceUserId: user.userId, deviceUid: user.uid };
      }
      return log;
    });
  }

  async getAttendances() {
    let rows;
    try {
      rows = asArray(await this.ensure().getAttendances());
    } catch (err) {
      try {
        await this.recover();
        rows = asArray(await this.ensure().getAttendances());
      } catch {
        await this.enableDeviceSafe();
        if (/timeout/i.test(asErrorMessage(err))) return [];
        return [];
      }
    }
    await this.enableDeviceSafe();
    return this.resolveLogUsers(rows.map((row) => normalizeLog(row, this.ip)));
  }
}

module.exports = {
  DeviceBridge,
  parseCard,
  asErrorMessage,
  PUNCH_TYPE_LABELS,
  packUser72,
  enrollPayloads,
  normalizeLog,
  isFakeAsciiCard,
};
