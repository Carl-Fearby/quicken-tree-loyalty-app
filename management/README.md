# Pace back office

**Role:** the staff application — bookings diary, customers, rewards, waitlist and venue
configuration.
**Ports:** 4100 (UI) and 4101 (its own API) · **Package:** `pace-management`

Part of the Pace platform; see the [root README](../README.md) for how the six surfaces
fit together.

## Role

Two processes that ship together:

- **`next dev` on 4100** — the back-office UI under `app/`: `diary`, `customers` (with
  `[id]` detail and `segments`), `rewards`, `waitlist`, `profile`, `login`, plus a
  `configuration/` tree for `attendance`, `cancellation`, `database`, `tables`,
  `menu-symbols`, `rewards`, `deposits`, `users`, `menu`, `hours`, `duration` and
  `communications`.
- **`server.js` on 4101** — a hand-written `node:http` API that queries PostgreSQL
  directly with `postgres.js`. It does **not** go through `backend/`; it is the separate,
  staff-facing API.

This surface owns most of the operational depth: deposits, cancellation policy, no-show
handling, customer segments and the communications centre are implemented here and in the
migrations they share with the public API.

## Local development

```sh
cd management
npm ci
cp .env.example .env   # set DATABASE_URL
npm run dev            # UI on 4100
npm run api:dev        # API on 4101, in a second terminal
```

`./start.sh` from the repository root starts both. One-off setup scripts exist for the
data these screens expect:

```sh
npm run setup:booking-tables   # creates 30 tables; later runs preserve edits
npm run setup:rewards
npm run setup:kitchen-hours
npm run setup:users
```

## Configuration

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (also read by `server.js`) |
| `PORT` | API port, default `4101` |
| `MANAGEMENT_*` | Staff/session and integration settings — see `.env.example` |

In development the database target can be switched between `local`, `seeded` and
`remote`; the remote option opens an SSH tunnel rather than exposing Postgres directly.
That switch is development-only.

## Authentication

Staff accounts live in `management_users` with scrypt-hashed passwords, roles and per-area
permissions (`configuration.rewards`, `configuration.hours`, `configuration.deposits`,
`configuration.attendance`, `configuration.communications`, `configuration.database`).
Sessions are a `pace_management_session` HttpOnly cookie lasting 12 hours, and login is
rate limited. This is entirely separate from guest accounts in `backend/`: an app member
has no back-office access, and a staff session is not valid on the member API.

## What it talks to

PostgreSQL, directly — not the public API. That keeps staff writes transactional against
the same tables the API reads, but it does mean schema changes must keep both code paths
in step.

## Rewards

Run `npm run setup:rewards` once per database. The **Rewards** tab generates individual
rewards worth 0–1,000 points, lists active/used/expired tokens and offers downloadable PNG
QR codes. Expiry defaults to three calendar months, clamped to the last day of the month,
ending at 23:59:59.999 UTC; it applies to unclaimed QR rewards, not points already
credited.

QR payloads are `quicken-tree:reward:v1:<token>` with a cryptographically random code of
`QT` plus 12 uppercase letters and digits (for example `QT8F4M7R2K9P6A`). New codes exclude
`I`, `O`, `0` and `1` to avoid transcription errors and always contain both letters and
numbers. Previously issued tokens stay valid. Tokens are retained so they can be
reprinted, and QR rendering happens locally — tokens are never sent to an external QR
service.

Claiming is **not wired up yet**. The authenticated claim endpoint must take the member ID
from the signed-in session and call `claim_reward_token(token, member_id)`, which enforces
expiry and single use, credits points and records the ledger entry atomically. There is no
public claim endpoint and no app scanner, and viewing or downloading a QR never redeems it.

Manual point adjustments of 1–1,000 require a reason and update `loyalty_accounts` and
`loyalty_ledger` atomically; request IDs prevent duplicate credits after a retry.

## Kitchen hours

Run `npm run setup:kitchen-hours` per database. Defaults are 21:00 Monday–Saturday and
18:00 Sunday, editable under **Settings → Opening & kitchen hours** in venue-local time.
Bookings must start before kitchen closing and finish by venue close; database triggers
enforce that for new bookings, reschedules, duration changes and reactivations, including
writes from the customer API.

## Database area

The **Configuration → Database** area browses the public schema: exact row counts, column
types and primary keys, 50 rows per page, full JSON records. It can delete a row by
primary key or empty a table without dropping it, after typing the table name; there is no
undo, and referenced rows block deletion (remove dependents first). Every field is
visible, including password hashes, salts, token hashes and payment-provider references.

Deletions briefly lock public tables to stop concurrent writes bypassing dependency
checks, with a three-second lock timeout and fifteen-second statement timeout. Counts and
bulk deletes are expensive on large databases. This area edits records directly; it does
not recalculate business aggregates such as order totals.

Booking tables live in `booking_tables` with a unique positive `table_number` and
`seat_count` of 2–10. **Booking management → Configure tables** adds, removes, renumbers
or edits seats; numbers may have gaps (401, 402, 405, 501), the diary sorts numerically,
and internal IDs stay stable when renumbering.

## Tests

```sh
npm test                                     # unit checks
MANAGEMENT_INTEGRATION=1 node --env-file=.env --test test/rewards.test.js
MANAGEMENT_INTEGRATION=1 node --env-file=.env --test test/kitchen-hours.test.js
```

The integration suites use an isolated temporary schema and remove it afterwards. They
cover concurrent claims, expiry, rollback, zero-point rewards, QR PNG generation, retry
protection and kitchen-hours enforcement. They need a real database, so they do not run
as part of `npm test` alone.

## Deploy

`backoffice.pacevenues.com` (UI) and the `pace-backoffice` / `pace-management-api`
systemd units in `deploy/systemd/`, behind the shared nginx vhost. The public sandbox at
`backoffice-demo.pacevenues.com` is provisioned by `./deploy_demo_vps.sh` using
`demo-fixtures.js`, `demo-sanitize.sql`, `demo-gateway.js` and `provision-demo-template.sh`
— the demo runs against sanitised data, never the live venue database.

## Known limits

- `server.js` is a single large file with inline routing; changes there touch both the
  route table and the SQL in one place, so keep it small and tested.
- Two APIs over one schema means permissions and validation are implemented twice.
