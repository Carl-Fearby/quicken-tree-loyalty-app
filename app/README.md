# Pace customer app

**Role:** the guest-facing mobile app — an installable PWA for booking a table, browsing
menus, ordering ahead and collecting loyalty points.
**Port:** 3000 · **Package:** `pace-customer-app`

Part of the Pace platform; see the [root README](../README.md) for how the six surfaces
fit together.

## Role

This is what the venue's customers use on their phone. It is a Next.js app exported as
static files (`output: 'export'`) — there is no server component to deploy. It renders
the guest journey as one screen machine:

`home → menu → cart → order-summary → book → details → checkout → bookings → rewards → profile`

`app/components/QuickenTreeApp/index.tsx` holds the view state and the screen components
live under `app/components/screens/`. `app/admin/page.tsx` renders the same app inside
phone frames (`IphoneWrapper`, `AndroidContainer`) for demoing on a desktop, which is why
device chrome shows up in a mobile app.

Content (menus, events, rewards catalogue, availability) is versioned per dataset and
cached in IndexedDB via Dexie, with the version manifest checked on load. That keeps
menus and rewards readable offline and only re-downloads what changed.

## Local development

```sh
cd app
npm ci
npm run dev -- --port 3000
```

`./start.sh` from the repository root starts this alongside the API and back office.

## Configuration

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_CONTENT_API_URL` | Pace API origin, e.g. `http://localhost:4000`. Defaults to `/api` for cached reads and `http://localhost:4000` for auth. |
| `NEXT_PUBLIC_VENUE_NAME` | Tenant display name (default `The Quicken Tree`) |
| `NEXT_PUBLIC_VENUE_SHORT_NAME` | Tenant short name (default `Quicken Tree`) |
| `NEXT_PUBLIC_VENUE_LOCATION` | Venue location line |
| `NEXT_PUBLIC_VENUE_LOGO_RED` / `NEXT_PUBLIC_VENUE_LOGO_WHITE` | Logo paths |
| `NEXT_PUBLIC_VENUE_PRIMARY_COLOR` | Tenant accent colour (default `#c5233b`) |

The `NEXT_PUBLIC_VENUE_*` values are **tenant branding, not Pace product branding** —
see `app/lib/tenant-brand.ts`. A white-label build overrides them without touching the UI,
so the defaults naming The Quicken Tree are intentional.

Because `NEXT_PUBLIC_*` values are inlined at build time, the API origin and tenant
branding are fixed per build: changing either requires a rebuild, and the deployed origin
must be in the API's `CORS_ORIGIN`.

## What it talks to

The Pace API in `backend/` only. Guests sign in with a member account; the access token is
kept in memory and sessions are renewed through the API's `qt_refresh` HttpOnly cookie, so
requests that need a session must send credentials. Guest credentials are unrelated to
back-office sign-in.

## Tests

No test script is defined for this project. `npm run build` is the check that the static
export still compiles.

## Deploy

Two targets, both static:

- **Netlify** — the root `netlify.toml` builds `app/` and publishes `out/`, with Node 22
  and no-cache headers for `sw.js` and `manifest.webmanifest`.
- **VPS** — `app.pacevenues.com` serves the exported `out/` directory behind nginx, built
  by `./deploy.sh` from the repository root.

## Known limits

- No server-side code: anything needing a secret or a server session belongs in the API.
- Reward QR scanning is not implemented; the app cannot claim a back-office reward token
  yet (see the root README).
- Offline behaviour depends on the cached dataset versions, so new content appears only
  after the manifest changes.
