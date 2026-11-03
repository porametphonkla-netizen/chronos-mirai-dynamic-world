# CHRONOS × MIRAI

Browser-first prototype for a Thai-language, top-down business simulation. The current vertical slice uses React + Phaser, a TypeScript/Fastify modular backend, PostgreSQL persistence, immutable world revisions, and a small server-authoritative shop economy.

## Requirements

- Node.js 22 or newer
- pnpm 10.6.5 (Corepack can provide the pinned version)
- PostgreSQL 15 or newer

## Local setup

1. Create a local PostgreSQL database and user, then copy `.env.example` to `.env` and set `DATABASE_URL`.
2. Install dependencies with `corepack pnpm@10.6.5 install` (or `pnpm install` if pnpm is already available).
3. Run the initial migration with `corepack pnpm@10.6.5 db:migrate`.
4. Start API and client with `corepack pnpm@10.6.5 dev`.
5. Open `http://localhost:5173`. The API listens at `http://localhost:3001` and exposes `GET /health`.

The local prototype creates a random owner credential for each world and stores it in browser local storage so the same browser can reopen that private world. This is a development access mechanism, not production authentication. Do not expose this prototype to untrusted users. Email OTP, account identity, support workflows, staff access controls, WebSockets, full NPC simulation, employees/payroll, and MIRAI scenario execution are not implemented in this first slice.

Worlds pause when no player commands are submitted. Each accepted command is processed synchronously as one logical world tick and creates one immutable revision. World state is persisted in PostgreSQL; snapshots are recorded at revision 0 and every tenth revision. Money is represented as integer satang (THB minor units).

## Checks

- `corepack pnpm@10.6.5 build`
- `corepack pnpm@10.6.5 typecheck`
- `corepack pnpm@10.6.5 test`

The server domain tests run without a database. Migration and API persistence checks require a running PostgreSQL instance.
