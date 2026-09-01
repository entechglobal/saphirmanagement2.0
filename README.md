# Saphir Management 2.0

Multi-tenant ERP and point-of-sale for Moroccan businesses: sales, purchases, stock, cash register, and delivery.

| Layer | Stack |
| --- | --- |
| Frontend | React 19, Vite 7, MUI, Tailwind, i18n (fr / ar / en), PWA |
| Backend | Node.js, Express 5, Prisma, MySQL 8, JWT |

## Repository layout

```
front/     React SPA (Vite)
server/    Express API + Prisma schema
```

## Prerequisites

- Node.js 20+
- MySQL 8
- npm

## Setup

1. Copy environment files and fill in real values (never commit `.env`):

```bash
copy server\.env.example server\.env
copy front\.env.example front\.env
```

2. Create the MySQL database (`saphirDB` by default), then set `DATABASE_URL` in `server/.env`.

3. Install dependencies:

```bash
npm install
npm run install:all
```

4. Generate Prisma client, run migrations, and seed:

```bash
cd server
npx prisma generate
npx prisma migrate dev
npm run seed
```

5. Start API and frontend together from the repo root:

```bash
npm run dev
```

- App: http://localhost:5173
- API: http://localhost:3000

On a local network, both processes bind to `0.0.0.0`. The frontend logs print a LAN URL and a QR code so phones on the same Wi-Fi can open the app.

## Scripts

| Command | Where | What it does |
| --- | --- | --- |
| `npm run dev` | root | Start API + frontend |
| `npm run install:all` | root | Install `server` and `front` deps |
| `npm run seed` | server | Seed base data |
| `npm run seed:demo` | server | Seed demo data |
| `npm run build` | front | Production frontend build |

## Environment

See `server/.env.example` and `front/.env.example`. Keep secrets (JWT keys, database password, Ameex keys) out of git.

## License

Private / proprietary — all rights reserved.
