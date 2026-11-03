# Pace account web

**Role:** the small web surface where an account holder signs in and manages their
password.
**Port:** 4200 · **Package:** `pace-account-web`

Part of the Pace platform; see the [root README](../README.md) for how the six surfaces
fit together.

## Role

A minimal Next.js app with two routes:

- `/` — `AccountPortal`, the sign-in and account view.
- `/reset-password` — the reset flow reached from an emailed link.

It shares the tenant branding helper (`app/lib/tenant-brand.ts`) with the guest app, so
venue name, logos and accent colour come from the same `NEXT_PUBLIC_VENUE_*` values.

## Local development

```sh
cd frontend-management
npm ci
npm run dev -- --port 4200
```

`./start.sh` from the repository root starts it on 4200.

## Configuration

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Pace API origin for account calls, default `http://localhost:4000` |
| `NEXT_PUBLIC_VENUE_*` | Tenant name, location, logos and accent colour |

## What it talks to

The member auth endpoints in `backend/` (`/auth/*`, plus password reset), using the same
`qt_refresh` cookie session as the guest app. It has no database access of its own.

## Tests

No test script is defined.

## Deploy

This surface is not yet part of the nginx/systemd deployment: `deploy/systemd/` has units
for the API, the back office and the back-office API only. At present it runs locally on
4200, and wiring it into `deploy/` plus the nginx vhosts is outstanding.

## Known limits

- Smallest surface in the repository (a handful of files) and the least exercised.
- Duplicates the tenant-brand helper rather than importing it from `app/`, because the two
  projects install separately.
