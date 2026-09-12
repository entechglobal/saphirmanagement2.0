# Attendance Link

Desktop bridge between **SaphirCaisse** and a **ZKTeco** fingerprint / RFID terminal (Electron + [`zkteco-js`](https://www.npmjs.com/package/zkteco-js)).

The terminal stays on the LAN. This app talks to it over IP (default port `4370`), maps SaphirCaisse users onto the device, enrolls fingerprints from the PC, then imports punches into the online API. Duplicate punches are skipped.

Verified on a **ZKTeco K40 Pro** (`ZLM60_TFT`, firmware `Ver 6.60`, `~PIN2Width=9`).

## What it does

1. Sign in to SaphirCaisse (Super Admin or Administrateur de société).
2. Load company users (`GET /api/attendance/users`). Super Admin can filter by société.
3. Connect the terminal (IP + port, optional comm key).
4. Select users and **transfer** them to the device.
5. **Enroll** a fingerprint from the app (place the finger 3 times on the scanner).
6. Optionally assign an RFID card.
7. Preview punches, then import them into **Administration → Pointage**.

## ID mapping (required)

On this firmware, three numbers must be the **same**:

| SaphirCaisse | Device field | Example |
| --- | --- | --- |
| `users.id` | Internal UID (2-byte serial) | `6` |
| `users.id` | PIN / User ID shown on the LCD | `6` |

If UID ≠ PIN, the screen shows a glyph, enroll targets the wrong person, and the LCD says **“no user is available”**.

Do **not** use `zklib-ts` on this device: `getUsers` times out, `setUser` writes a binary PIN (`\x01`), and the process can crash.

## Punch types

The log stores two different bytes. **Do not use `type` as the punch type** — that is the verify method (fingerprint = `1`, card = `2`). Card punches would all look like “Début de pause”.

Use **`state`** (offset 31) as in/out:

| `state` | Label in the app |
| --- | --- |
| 0 | Entrée |
| 1 | Sortie |
| 2 | Début de pause |
| 3 | Fin de pause |
| 4 | Sortie (this K40 F-key) |
| 5 | Entrée (this K40 F-key) |

A punch is unique per société + device IP + device user id + punch time. Re-import updates type if it was stored wrong.

## Setup

```bash
cd server
npx prisma generate
npx prisma migrate deploy
node prisma/seedAttendancePermissions.js
```

```bash
cd attendance-link
npm install
npm start
```

`postinstall` patches `zkteco-js` so a timeout cannot crash the process (`reply.subarray` on null).

In the window:

- API URL: `http://localhost:3000/api` (or the deployed API)
- Super Admin / Administrateur de société
- Terminal IP + port `4370`
- Close the official ZKTeco tool first (one TCP session at a time)

Portable build: `npm run dist` → `AttendanceLink.exe`.

## Device notes (K40 Pro)

- User records are **72-byte TFT**. PIN2 is a 9-character ASCII id at offset 48. The LCD also reads the id as ASCII at offset 35 (a `0x01` flag there shows as an unknown character).
- `CMD_STARTENROLL` uses the **2-byte UID**, not the ASCII PIN string. Sending `"6"` looks up user `0x0036` = 51 → “no user is available”.
- After `getUsers` / `setUser` / attendance download, the device must be **enabled** again. Leaving it disabled hides users on the terminal until you disconnect.
- `getUsers` / `getAttendances` often take 20–30s. Timeout is 30s. Do not treat a timeout as an empty user list.
- Only one PC/app should hold the socket. Disconnect Attendance Link when you need the keypad.

## Project layout

| Path | Role |
| --- | --- |
| `src/main.js` | Electron main process, IPC |
| `src/zk-device.js` | ZKTeco bridge (connect, users, enroll, logs) |
| `src/cloud-api.js` | SaphirCaisse HTTP API |
| `src/auth-guard.js` | Super Admin / société admin only |
| `renderer/` | UI |
| `scripts/patch-zkteco.js` | postinstall crash patch |

Server: `server/src/api/services/attendanceService.js` + `attendanceRoutes.js`.  
Web UI: `front/src/features/attendance/` and `front/public/locales/*/attendance.json`.
