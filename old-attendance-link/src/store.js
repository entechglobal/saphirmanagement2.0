const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const DEFAULTS = {
  deviceIp: "192.168.1.201",
  devicePort: 4370,
  commKey: "",
  timeoutMs: 10000,
  apiUrl: "http://localhost:3000/api",
  email: "",
  token: "",
  user: null,
};

function filePath() {
  return path.join(app.getPath("userData"), "attendance-link.json");
}

function read() {
  try {
    const raw = fs.readFileSync(filePath(), "utf8");
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

function write(partial) {
  const next = { ...read(), ...partial };
  fs.mkdirSync(path.dirname(filePath()), { recursive: true });
  fs.writeFileSync(filePath(), JSON.stringify(next, null, 2), "utf8");
  return next;
}

module.exports = { read, write, DEFAULTS };
