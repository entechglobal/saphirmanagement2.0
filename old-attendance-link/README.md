# Attendance Link

Desktop bridge between **SaphirCaisse** and a **ZKTeco** fingerprint / RFID terminal.

The terminal stays on the local network. This app talks to it over IP + port, then pushes punches to the online API. Already imported punches are skipped.

## What it does

- Connect to a ZKTeco device (`IP` + port, default `4370`)
- Sign in to SaphirCaisse and load company users
- Add a user on the device using the **app user id** as the device PIN
- Enroll a fingerprint (finger index 0–9)
- Assign an RFID card number
- Preview device logs and import them into `/attendance` without duplicates

## Setup

1. In the main repo, apply the attendance migration and permissions:

```bash
cd server
npx prisma generate
npx prisma migrate deploy
node prisma/seedAttendancePermissions.js
```

2. Install and start this app:

```bash
cd attendance-link
npm install
npm start
```

3. In the window:
   - Sign in as **Super Administrateur** or **Administrateur de société**
   - API URL: `http://localhost:3000/api` (or your deployed API)
   - Connect the terminal (IP + port `4370`)
   - Add users, enroll finger / card, then import attendance

Punches appear in the web app at **Administration → Pointage**.

## Mapping

| SaphirCaisse | ZKTeco |
| --- | --- |
| `users.id` | Device PIN / `userid` |

A punch is unique per société + device IP + device user id + punch time. Re-importing the same log does nothing.

## Notes

- The PC running this app must reach the terminal on the LAN.
- Only one software connection to the device is usually allowed at a time. Close the official ZKTeco tool first.
- Some firmware cannot start remote enroll. In that case the user is still created on the device; complete the fingerprint on the keypad.
