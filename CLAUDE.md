# Attendly

Telegram mini-app for attendance tracking. Stack: React + Vite (frontend), Fastify + Prisma + PostgreSQL (backend), Telegraf bot. Deployed to Railway via auto-deploy on push to `main` (repo: github.com:Muhammadislom/attendly.git).

## Hard requirements

### 1. Production is live — never break or delete data

Attendly is already running in production with real users and real attendance records. Two non-negotiable rules follow from this:

- **Backward compatibility always.** API request/response shapes must stay compatible with older frontend bundles. When changing routes, prefer adding new fields over renaming/removing existing ones. Never break the contract that already-deployed clients rely on.
- **Never delete data accidentally.** Migrations must be additive (add nullable column → backfill → only later consider removing). Forbidden without explicit user approval:
  - `prisma migrate reset`
  - `prisma db push --accept-data-loss`
  - Migrations that drop tables/columns or rename columns destructively
  - Any script that deletes records as a side effect
  - Manual `DELETE` / `DROP` statements against the live DB

If a destructive change seems unavoidable, **stop and ask first**. Treat every `git push origin main` as a production deployment — verify both `frontend` and `backend` build cleanly before pushing.

## Project layout

- `frontend/` — React + Vite + Tailwind, Telegram WebApp SDK. Build: `npm run build` (runs `tsc -b && vite build`).
- `backend/` — Fastify + Prisma + Telegraf. Build: `npm run build` (runs `tsc`). NodeNext ES modules.
- `backend/prisma/schema.prisma` — Prisma schema. Migrations live in `backend/prisma/migrations/`.

## i18n

Both frontend and backend support Russian and Uzbek. The user is in Uzbekistan; default UI language is Russian, with Uzbek as the alternative. **Never use 12-hour AM/PM time format** — Uzbekistan uses 24-hour time. When formatting times via `Intl.DateTimeFormat` / `toLocaleTimeString`, always pass `hour12: false`.

- Frontend dictionary: `frontend/src/lib/i18n.tsx` (`LangProvider`, `useT()` hook, `t()` with `{0}`, `{1}` positional params)
- Bot dictionary: `backend/src/bot/i18n.ts` (`pickLang(code)`, `t(lang, key, ...params)`)
- Bot picks per-user language from `ctx.from.language_code`; frontend picks from `Telegram.WebApp.initDataUnsafe.user.language_code` and persists to localStorage.

When adding any user-facing string, add **both** RU and UZ keys to the relevant dictionary — never hardcode user-visible text.

## Roles

- `SUPER_ADMIN` — manages users only, **does not** create or edit organizations.
- `MANAGER` — creates and manages organizations, staff, assistants.
- `ASSISTANT` — marks attendance during the configured window.

## Validation conventions

- Backend uses Zod schemas in `backend/src/api/routes.ts` for request validation.
- Cross-field validation (e.g. mark window: `end > start`) lives in helper functions in the same file. When updating an existing record, **merge body fields with the existing DB row** before validating, so partial updates are checked correctly.
- Mirror critical validations in the frontend so the user gets immediate feedback (don't rely on the backend alone).

## Commit conventions

- Conventional-commit-style prefixes: `feat(scope):`, `fix(scope):`, etc.
- **Do not add `Co-Authored-By` trailers or any AI self-attribution to commits.**
- Commit messages explain *why*, not *what* — the diff already shows what changed.
