# Pace hospitality platform

Pace is hospitality software for restaurants, cafés and pubs: table bookings, table
plans, menus, customers, loyalty, rewards and order-ahead. This repository is the
product monorepo: a customer PWA, a public API, a staff back office and the
`pacevenues.com` marketing site.

## Services

| Directory | Package | What it is | Local port |
| --- | --- | --- | --- |
| [`app/`](app/README.md) | `pace-customer-app` | Guest mobile PWA, exported as static files | 3000 |
| [`backend/`](backend/README.md) | `pace-backend` | Public API (Fastify) with Swagger at `/docs` | 4000 |
| [`management/`](management/README.md) | `pace-management` | Back office UI | 4100 |
| [`management/`](management/README.md) | — | Back office API (`server.js`) | 4101 |
| [`frontend-management/`](frontend-management/README.md) | `pace-account-web` | Account web: sign in, forgot/reset password | 4200 |
| [`marketing/`](marketing/README.md) | `pace-marketing` | Marketing site, static export | 4300 |

Each directory has its own README covering that surface's setup, configuration,
dependencies, tests, deploy path and known limits. This file is the source of truth for
how they fit together.

## Running locally

Install dependencies in each project, then start the whole stack from this directory:

```sh
for project in app backend management frontend-management marketing; do
  (cd "$project" && npm ci)
done
./start.sh
```

`start.sh` frees ports 3000, 4000, 4100, 4101, 4200 and 4300 before starting, so it can
be re-run safely; Ctrl+C stops every service it started. Each project's own README covers
its environment files and setup. `backend/` and `management/` need a
PostgreSQL connection string, and the back office also reads `MANAGEMENT_*` values — see
`management/.env.example`.

Local credentials, `.env` files, database backups and `node_modules` are excluded from
Git.

## Next.js version

Every app pins Next.js `16.3.4`, which contains breaking changes relative to earlier
releases. Each project has an `AGENTS.md` that points at `node_modules/next/dist/docs/`;
read the relevant page there before changing app code instead of relying on older Next
conventions. Those `AGENTS.md` files are generated and re-added by `next dev`, so edit the
code, not that block.

## Authentication

There are two deliberately separate systems, and neither grants access to the other:

| | Guest (app) | Staff (back office) |
| --- | --- | --- |
| Owned by | `backend/` | `management/server.js` |
| Accounts | `members` + `member_credentials` | `management_users`, roles and per-area permissions |
| Password hashing | scrypt | scrypt |
| Session | short-lived JWT access token held in memory, plus a rotating `qt_refresh` HttpOnly cookie (30 days) | `pace_management_session` HttpOnly cookie (12 hours) |
| Scope | member-only `/me/*` routes | `configuration.*` permission checks per area |

A guest token is useless in the back office and a staff session is useless on the
member API. Anything that needs to serve both has to authenticate twice.

Members also reach their account through `frontend-management/` on 4200, which talks to
the same `/auth/*` endpoints as the app and has no database access of its own.

## Rewards

The back office issues reward vouchers as QR codes carrying
`quicken-tree:reward:v1:<token>` (codes are `QT` plus 12 characters). Members can spend
points on catalogue items and mark vouchers redeemed through the member API
(`POST /me/rewards/:code/redeem` and `POST /me/rewards/:id/mark-redeemed`).

Scanning a reward QR is **not implemented yet**. The single-use, expiry-checked
`claim_reward_token(token, member_id)` function already exists in the database
(`backend/migrations/012_reward_tokens.sql`) and is covered by tests, but nothing calls
it: there is no public claim endpoint and no scanner in the app. When that is built, the
endpoint must take the member ID from the signed-in session, never from the request.
Until then, viewing or downloading a QR never redeems it.

## Deploying

The live stack runs on one VPS (see `deploy.env.example`), behind the nginx vhosts and
systemd units in `deploy/`. The units cover the API, the back office, the back-office API
and nightly Postgres backups; the two browser-facing Next sites are static exports served
by nginx, and the account web is not deployed yet.

- `./deploy.sh` — deploy the application stack.
- `./deploy-marketing-vps.sh` — deploy only the marketing site: builds `marketing/`,
  rsyncs the export to `/var/www/pace/marketing/`, then verifies the public `/contact/`
  page. Use `--dry-run` to preview the file changes.
- `./deploy_demo_vps.sh` — provision the sandbox workspace at
  `backoffice-demo.pacevenues.com`.
- `./deploy_vsp.sh` — deprecated typo-named helper; it forwards to
  `deploy-marketing-vps.sh`.

## Netlify

The root `netlify.toml` sets the build base to `app`, runs `npm run build`, and publishes
`out` (relative to the base); `app/netlify.toml` carries the same settings for sites
configured to discover it there. Node 22 and the PWA `sw.js` / `manifest.webmanifest`
no-cache headers are preserved. Only the customer app is published this way — the API and
back office need separate hosting, and the frontend environment variables must point at
the hosted API for remote devices to see live data.

## Not part of this repository

The root `.gitignore` starts with `/*` and then allows only the application stack, so the
following directories exist on disk but are **not tracked by Git**: `website/` (the Heart
of England venue site — a separate project with its own git repo and Netlify site, not
Pace product code), `deploy/` (nginx vhosts and systemd units), `Documents/`,
`timesheets/`, `Issues/`, `assets/`, `Flyers/`, `output/`, and the top-level
`deploy.env.example` and `deploy-marketing-vps.sh`. If any of these should be versioned,
add an explicit `!/path` allow-list entry to `.gitignore`.
