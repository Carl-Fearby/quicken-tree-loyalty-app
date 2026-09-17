# Quicken Tree API

Portable Node.js + TypeScript API for the Quicken Tree app. It uses standard PostgreSQL and can run on any container, VM, or Node-compatible platform.

## Local setup

1. Provision a PostgreSQL database. For production, use Supabase Postgres; locally, use any PostgreSQL 15+ instance.
2. Create `.env` from the values below:

   ```dotenv
   DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/postgres?sslmode=require
   API_ADMIN_TOKEN=replace-with-a-long-random-secret-of-at-least-24-characters
   PORT=4000
   CORS_ORIGIN=http://localhost:3000
   ```

3. Install the API dependencies and apply the schemas:

   ```sh
   cd /Users/F7905607/Dropbox/Projects/hoe/backend
   npm install
   psql "$DATABASE_URL" -f migrations/001_content_versions.sql
   psql "$DATABASE_URL" -f migrations/002_operational_data.sql
   psql "$DATABASE_URL" -f migrations/003_versioned_content_datasets.sql
   psql "$DATABASE_URL" -f migrations/004_reward_redemptions.sql
   psql "$DATABASE_URL" -f migrations/005_member_auth.sql
   ```

4. Seed the current app JSON as version one and the demo member's operational data:

   ```sh
   npm run seed
   ```

5. Start the API:

   ```sh
   npm run dev
   ```

Set `NEXT_PUBLIC_CONTENT_API_URL=http://localhost:4000` in the frontend environment when running separately. The full platform-neutral contract is in `../app/api/openapi.yaml`.

## Endpoints

Browse the live OpenAPI documentation at `http://localhost:4000/docs`. Its contract covers:

- cacheable datasets: manifest, conditional download, and authenticated independent publishing;
- live member profile and dietary/taste preferences;
- loyalty balance, ledger, reward catalogue and reward redemption;
- booking CRUD, cancellation and named guests;
- order-ahead lines, per-serving guest assignment and checkout confirmation; and
- tokenised payment-method references (never card numbers).

Authentication uses a short-lived access JWT in the `Authorization: Bearer` header and a rotating, HttpOnly refresh cookie. The frontend keeps the access token in memory, not browser storage. Set a distinct `AUTH_JWT_SECRET` of at least 32 characters in production; the local development fallback is the existing admin secret.

`content_datasets` holds independently versioned configuration such as menus, availability, events and rewards. The operational tables keep member-specific data transactional. The app should cache both locally for offline use, but only cacheable datasets use the version manifest to avoid unnecessary downloads.
