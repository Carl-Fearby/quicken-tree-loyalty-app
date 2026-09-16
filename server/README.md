# Quicken Tree API

Portable Node.js + TypeScript API for the Quicken Tree app. It uses standard PostgreSQL and can run on any container, VM, or Node-compatible platform.

## Local setup

1. Provision a PostgreSQL database. For production, use Supabase Postgres; locally, use any PostgreSQL 15+ instance.
2. Create `server/.env` from the values below:

   ```dotenv
   DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/postgres?sslmode=require
   API_ADMIN_TOKEN=replace-with-a-long-random-secret-of-at-least-24-characters
   PORT=4000
   CORS_ORIGIN=http://localhost:3000
   ```

3. Apply the schema:

   ```sh
   psql "$DATABASE_URL" -f server/migrations/001_content_versions.sql
   ```

4. Seed the current app JSON as version one:

   ```sh
   npm run api:seed
   ```

5. Start the API:

   ```sh
   npm run api:dev
   ```

Set `NEXT_PUBLIC_CONTENT_API_URL=http://localhost:4000` in the frontend environment when running separately. The full platform-neutral contract is in `api/openapi.yaml`.

## Endpoints

- `GET /health` — liveness check.
- `GET /content?version=content-12` — returns `changed: false` when the device cache is current; otherwise returns the full latest content.
- `GET /content-admin` — authenticated live content read.
- `PUT /content-admin` — authenticated publish with version-based optimistic locking.

The initial schema deliberately only covers versioned app content. Customer accounts, bookings, orders, loyalty balances, audit records and staff roles will be added as related tables in the next migration rather than buried inside the content JSON.
