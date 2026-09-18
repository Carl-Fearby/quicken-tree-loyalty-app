# PostgreSQL management

Standalone local application, independent of the customer app and API. Node.js 22+ and PostgreSQL are required.

```sh
cd management
npm install
cp .env.example .env
# Set DATABASE_URL in .env to the PostgreSQL database you want to manage.
npm start
```

Open http://localhost:4100. Use `npm run dev` for server reloads and `npm test` for unit checks.

- Browse public-schema tables, exact record counts, column types and primary keys.
- View 50 rows per page and inspect complete JSON records.
- Delete individual rows by primary key, or empty a table without dropping it.
- Type the table name to confirm either action. There is no undo.
- Referenced rows block deletion, including cascading and set-null relationships. Remove dependent rows first. No automatic cascading deletion occurs.
- All database fields are visible, including password hashes, salts, token hashes and payment provider references. Inspect shows the full stored values.

The server binds only to 127.0.0.1 and validates Host and Origin. It has no login and is intended for a trusted local computer only. Do not expose it through a proxy or tunnel. Credentials live only in the ignored `.env` file. TLS is required by default for non-local databases; use DATABASE_SSL only as appropriate for your database.

Deletion transactions briefly lock public tables to prevent concurrent writes from bypassing dependency checks. A three-second lock timeout and fifteen-second statement timeout prevent indefinite waits. Counts and broad deletions can be expensive on very large databases. This tool does not adjust business aggregates such as order totals; it directly manages database records.

Booking management stores tables in `booking_tables`, with a unique positive `table_number` and a `seat_count` of 2–10. Run `npm run setup:booking-tables` before starting the updated manager. Initial setup creates thirty tables; later runs preserve edits and removals. Open **Booking management → Configure tables** for the modal to add, remove, renumber tables or edit seats. Numbers may have gaps, such as 401, 402, 405, 501. The diary sorts numerically and displays seat counts. Internal IDs remain stable when renumbering. Booking assignment is not yet implemented.

## Rewards

Run `npm run setup:rewards` once per database after the existing operational migrations. The **Rewards** tab sits between Booking diary and Settings. It generates individual rewards worth 0–1,000 points, lists active/used/expired tokens, and provides downloadable PNG QR codes. Expiry defaults to three calendar months (clamped to the last day of the month); the selected date ends at 23:59:59.999 UTC. Expiry applies to unclaimed QR rewards, not points already credited to an account.

Customer search supports name or email. Manual additions of 1–1,000 points require a reason and atomically update `loyalty_accounts` and `loyalty_ledger`. Request IDs prevent duplicate credits or token creation after a retry. Token history shows the latest 500 tokens; credit history shows the latest 100 entries.

QR payloads are `quicken-tree:reward:v1:<token>` with a cryptographically random code: `QT` followed by 12 uppercase letters and digits (for example, `QT8F4M7R2K9P6A`). New codes exclude I, O, 0 and 1 to avoid transcription errors and always contain both letters and numbers. The code is shown in the reward list and QR preview. Previously issued tokens remain valid. Tokens are retained in the local management database for reprinting. QR rendering happens locally, without sending tokens to an external QR service. The future authenticated app claim endpoint must derive the member ID from the signed-in session and call `claim_reward_token(token, member_id)`. That database function enforces expiry and single use, credits points, and records the ledger entry atomically. No public claim endpoint or app scanner is included yet. Viewing/downloading a QR never redeems it.

Run `MANAGEMENT_INTEGRATION=1 node --env-file=.env --test test/rewards.test.js` for database tests. These use an isolated temporary schema and remove it afterwards, covering concurrent claims, expiry, rollback, zero-point rewards, QR PNG generation, and retry protection.

## Kitchen booking hours

Run `npm run setup:kitchen-hours` for each database after the booking migrations. It preserves existing kitchen settings and defaults to 21:00 Monday–Saturday and 18:00 Sunday. Configure each day under **Settings → Opening & kitchen hours**; times use the venue's local booking time.

Bookings must start before kitchen closing and finish by venue closing. The diary marks the closed period and the booking form excludes invalid starts. Database triggers enforce the same restrictions for new bookings, rescheduling, duration changes and reactivating cancelled bookings, including writes from the customer API. Existing bookings are preserved. Run `MANAGEMENT_INTEGRATION=1 node --env-file=.env --test test/kitchen-hours.test.js` for isolated database coverage.
