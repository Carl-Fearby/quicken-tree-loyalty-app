# Pace API

**Role:** the public HTTP API — content delivery, member accounts, bookings, order-ahead,
loyalty and rewards.
**Port:** 4000 (Swagger UI at `/docs`) · **Package:** `pace-backend`

Part of the Pace platform; see the [root README](../README.md) for how the six surfaces
fit together.

## Role

A single Fastify service (`src/index.ts`) over PostgreSQL. It is portable Node: no
platform-specific hosting APIs, so it runs on any VM, container or Node-compatible host.
The full contract is published at `/docs` and checked in as `../app/api/openapi.yaml`.

Two storage styles meet here:

- **Versioned datasets** in `content_datasets` — menus, availability, events, rewards and
  other configuration, each independently versioned and served through a manifest so
  clients only download what changed.
- **Operational tables** — members, credentials, refresh sessions, preferences, loyalty
  accounts and ledger, reward redemptions, bookings, guests, orders, lines, assignments,
  payment-method references and audit events.

Content is stored relationally (`src/content-model.ts`); JSON is the API format only and
is never a storage column.

## Local development

```sh
cd backend
npm ci
cp .env.example .env   # then set DATABASE_URL
npm run dev
```

Apply migrations in order, stopping at the first failure:

```sh
for migration in migrations/*.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration" || break
done
```

There are 28 migrations, numbered `001`–`028`. Later ones depend on earlier ones
(`012_reward_tokens.sql` defines `claim_reward_token`, `017_management_users.sql` backs
back-office sign-in, `020`–`028` add CRM, waitlist, cancellation, deposits, permissions,
no-shows and the communications centre).

Then seed and start:

```sh
npm run seed          # content + operational demo data
npm run seed:dish-images
npm run dev
```

## Configuration

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 15+ connection string |
| `PORT` | Listen port, default `4000` |
| `CORS_ORIGIN` | Comma-separated allowed origins (guest app, marketing site, account web) |
| `API_ADMIN_TOKEN` | Bearer token for content publishing endpoints (24+ characters) |
| `AUTH_JWT_SECRET` | Access-token signing secret, 32+ characters in production |
| `MAILTRAP_API_KEY` / `MAIL_FROM_ADDRESS` / `MAIL_TO_ADDRESS` | Email delivery |

Set `NEXT_PUBLIC_CONTENT_API_URL=http://localhost:4000` for the guest app when the two run
separately.

## Endpoints

- `POST /contact` — public marketing enquiry (when email is configured).
- `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`,
  `/auth/forgot-password`, `/auth/reset-password` — member accounts.
- `GET /content/manifest`, `GET /content/:key` — cacheable versioned datasets;
  `PUT /admin/content/:key` publishes a new version with the admin token.
- `/me/profile`, `/me/loyalty`, `/me/loyalty/ledger` — the signed-in member.
- `GET /rewards`, `GET /me/rewards`, `POST /me/rewards/:code/redeem`,
  `POST /me/rewards/:id/mark-redeemed` — catalogue and voucher redemption.
- Bookings: create, read, update, cancel (policy-checked) and named guests.
- Order-ahead: `/bookings/:id/order`, `/orders/:id/lines`, per-serving guest assignment,
  `/orders/:id/checkout`.
- Tokenised payment-method references — never card numbers.

Feature flags (for example `rewards`) gate optional capability per deployment.

## Authentication

Guests only. A short-lived access JWT goes in `Authorization: Bearer`; the frontend keeps
it in memory rather than browser storage. Sessions renew through a rotating, HttpOnly
`qt_refresh` cookie that lives for 30 days and is revoked on logout or reuse. Back-office
staff authenticate separately, in `management/` — a guest token grants nothing there.

## Tests

`npm run typecheck` is the available check; there is no test script in this project.
Database-level behaviour (rewards claiming, kitchen hours, CRUD) is covered by the
integration suites in `management/test/`, which run against a real database.

## Deploy

`api.pacevenues.com` behind nginx, run as the `pace-api` systemd unit from `deploy/systemd/`.
`./deploy.sh` from the repository root builds and restarts the stack.

## Known limits

- `claim_reward_token(token, member_id)` exists and is tested, but **nothing calls it**:
  there is no public claim endpoint yet. When added, the member ID must come from the
  session, never from the request body.
- Emails use Mailtrap settings locally; the VPS sends marketing enquiries through local
  Postfix, so those two paths behave differently.
