# Prompt — SaphirCaisse Attendance Link (ZKTeco)

Copy this into a new agent chat to continue or rebuild the desktop attendance bridge.

---

## Original request (start of this work)

Build an Electron desktop app so I can:

1. See my **SaphirCaisse users** in the app.
2. **Select** one or more users and **transfer** them to the ZKTeco terminal on the LAN.
3. **Enroll fingerprints from the app** onto the device (not only from the device menu).
4. Use a **Node.js ZKTeco package** for connect / add user / enroll / attendance download.
5. Import punches into the SaphirCaisse web app (**Administration → Pointage**).

Later bugs that must stay fixed (same chat):

- Punch type always showed **Sortie**, then always **Début de pause**, even when switching Entrée/Sortie on the device.
- **Show users** sometimes failed or looked empty; after disconnect + reconnect, users appeared. The device itself showed **“no user is available”** while the app was connected.
- Enroll did **not** enroll the selected user. The terminal showed an **unknown character** as the ID instead of the SaphirCaisse user id.
- UID and User ID on the device must be the **same number** as `users.id` in the database (the id you type when creating a user on the keypad).

## Product

SaphirCaisse is an ERP (Express + Prisma + React). **Attendance Link** lives in `attendance-link/`. It is the only process that talks to the fingerprint terminal. The terminal is not on the internet.

- App: Electron (`attendance-link/`), UI in French.
- API: `http://localhost:3000/api` (or deployed). Login: Super Admin or Administrateur de société.
- Device used in live tests: **ZKTeco K40 Pro**, IP `192.168.1.201`, port `4370`, platform `ZLM60_TFT`, firmware `Ver 6.60 Apr 13 2022`, `~PIN2Width=9`, `~SSR=1`.
- Package: **`zkteco-js@1.7.2` only**. Do not switch back to `zklib-ts` (timeouts on `getUsers`, binary PIN `\x01`, process crash on `reply.subarray`).
- After `npm install`, `scripts/patch-zkteco.js` must patch `node_modules/zkteco-js/src/ztcp.js`: on timeout, `reject` then **`return`** so it never reads `reply.subarray` of null.

## Functional requirements

- List enrollable users from `GET /api/attendance/users` (fallback `GET /api/users` if needed). Super Admin can filter by société.
- Multi-select transfer to the device.
- Per-user: transfer, enroll finger (index 0–9), set RFID card, show whether they are already on the device.
- Preview attendance, then POST `/api/attendance/import`. Dedup key: société + device IP + device user id + punch time. Re-import **updates** `punchType` / `verifyMode` if they were stored wrong.
- Roles: Super Admin and Administrateur de société only (`src/auth-guard.js`).

## Device protocol rules (this firmware)

These are not optional. Breaking them reproduces the bugs above.

### 1. UID = PIN = database `users.id`

- `setUser` / `CMD_USER_WRQ`: 72-byte TFT record.
- UID uint16 at offset 0 = numeric `users.id` (1–3000).
- PIN2 ASCII at offset 48 (24 bytes, width 9) = the same id as a string (`"6"`).
- Also write that ASCII id at offset 35 when there is no card. A leftover `0x01` at offset 35 is what the LCD shows as an **unknown character**.
- If an existing device user has UID ≠ PIN, delete the old slot and rewrite at UID = PIN. Fingerprints on the old UID are lost; re-enroll.
- Delete ghost users (empty name + non-printable PIN such as `\x01` / `\x02`) before write/enroll.

### 2. Remote enroll (`CMD_STARTENROLL` = 61)

- Payload **must start with 2-byte UID little-endian**, then finger index, then flag `1`. Example for user 6, finger 0: `06 00 00 01` (or `06 00 00 00` for finger serial).
- **Do not send the 26-byte ASCII PIN first.** `"6"` is `0x36` → the device looks up UID **54** → “no user is available” and enrolls a junk id.
- Do **not** send empty `CMD_STARTVERIFY` right after start enroll (that restores verify mode with no user).
- Do **not** leave `disableDevice` on during enroll; the LCD then says users are unavailable.
- User places the finger **3 times** on the scanner.

### 3. Enable the device after every bulk command

`getUsers`, `getAttendances`, `setUser`, and connect must call `enableDevice` in a `finally`. A disabled terminal hides users until the app disconnects.

`getUsers` / `getAttendances` often take **20–30 seconds**. Timeout 30s. **Never treat a timeout as an empty user list** (that caused “no users” until reconnect). Retry once; if it still fails, keep the last good list and show a toast.

### 4. Punch type vs verify mode

40-byte attendance records:

- Offset 2: user id. Old logs: binary UID uint16. New logs: ASCII PIN (`"3"` → do not interpret as UID 51).
- Offset 26 `type`: **verify method** (1 = fingerprint, 2 = card). Never display this as Entrée/Sortie.
- Offset 31 `state`: **in/out**. Use this as `punchType`.

Map for this K40’s keys:

- 0 Entrée, 1 Sortie, 2 Début pause, 3 Fin pause, 4 Sortie, 5 Entrée.

Import payload must send `punchType` from `state`, and `verifyMode` from `type`.

## Implementation map

- `attendance-link/src/zk-device.js` — device bridge
- `attendance-link/src/main.js`, `preload.js`, `cloud-api.js`, `auth-guard.js`, `store.js`
- `attendance-link/renderer/{index.html,app.js,styles.css}`
- `attendance-link/scripts/patch-zkteco.js`
- `server/src/api/services/attendanceService.js`, `attendanceRoutes.js`
- `front/src/features/attendance/` + `front/public/locales/{fr,en,ar}/attendance.json`

## How to test

1. API running (`node src/server.js` in `server/`). Restart it after backend punch-type changes.
2. `cd attendance-link && npm start`
3. Login Super Admin, connect `192.168.1.201:4370`.
4. Users table loads SaphirCaisse users; device badge shows the same id (e.g. Amine = 6, Imane = 3).
5. Enroll: LCD shows **6** or **3**, not a glyph, not “no user is available”.
6. Punch Entrée then Sortie on the device; preview shows Entrée/Sortie, not always Sortie and not always Début de pause.
7. Import; web **Administration → Pointage** matches.

## Out of scope / do not do

- Do not use `zklib-ts` or raw exploit-style tooling.
- Do not invent a second id space (sequential UID 1,2,3 with PIN 6,3).
- Do not commit secrets. Do not force-push.
- Backend attendance changes need a **manual API restart** (no nodemon in the usual run).
