# Pace hospitality platform

This repository contains three independently installed Node projects:

- `app/`: customer Next.js PWA, exported as static files.
- `backend/`: hosting-independent API and Swagger documentation.
- `management/`: menu and database management interface.

Install dependencies with `npm ci` in each directory. Configure local environment
files using each project's README, then run `./start.sh` from this directory.
The app runs on port 3000, API/Swagger on 4000, and management on 4100.
Local credentials, database backups and dependencies are excluded from Git.

## Netlify

The root `netlify.toml` sets the build base to `app`, runs `npm run build`,
and publishes `app/out` (`out` relative to the base). The app-level configuration
contains the same settings for sites already configured to discover it there.
Node 22 and the PWA cache headers are preserved. Only the customer app is
published; the API and management interface require separate hosting.

The existing frontend environment variables remain configured in Netlify.
Backend URLs must point to the hosted API for remote devices to use live data.
