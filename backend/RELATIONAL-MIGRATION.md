# Relational content migration — prepared, not yet applied

The live database is unchanged. Automated approval review blocked the database dry run. TypeScript and offline model tests pass; PostgreSQL migration, API smoke checks and UI verification remain required before this can be considered complete.

## Structure

- `menus → menu_sections → menu_items`: one row per menu, section and dish; foreign keys enforce ownership.
- Separate menu categories, category sections, dietary tags, availability, service periods, service days and service categories.
- Separate opening hours, guest options, booking experiences and experience days.
- Separate venue contacts and notifications, events, reward catalogue, loyalty settings and promotion days.
- Separate taste, dietary and allergen options.
- Member tastes, member dietary needs and booking dietary needs become child rows, with their original values and order verified before removing JSON columns.
- `content_revisions` and `content_generation` contain only synchronization metadata. There is no archived JSON payload table after migration.

Scalar display text such as “S (6) £9 · L (12) £15” remains a price label: it is not silently interpreted as one price. Order lines retain their original item names and prices as historical snapshots. Member, booking, order, reward redemption and ledger records are retained. Configuration demo defaults remain explicitly named as defaults; they are not customer balances.

## Replacement rules

Each full dataset publication validates all fields before making changes, then removes the former dataset's dependent configuration rows and inserts its replacement in one transaction. Failed writes roll back the complete replacement. New rows receive stable IDs based on their parent and natural identity; unmodified items retain IDs across reordering. The API reconstructs JSON for clients. Old main-menu data is replaced by the September menu already used in the app. `mainMenu` remains a compatibility response generated from the single menu catalogue.

Database triggers update revision metadata after direct management edits, so clients download changed datasets. The app reads synchronized content and commits downloaded datasets together. The existing legacy adapter keeps the old schema usable before migration; restart the API after migration to switch to the relational implementation.

## Apply after database dry-run approval

1. Stop the API and management server before the final migration to avoid concurrent edits during backup.
2. From `backend`, run `npm run migrate:relational -- --dry-run`. It runs schema creation, round-trip comparisons and replacement/rollback checks, then rolls everything back.
3. Run `npm run migrate:relational`. It first creates a protected full PostgreSQL dump under ignored `backend/backups/`, then migrates in one transaction. A backup failure stops migration. Old JSON tables are dropped only after content and preference comparisons pass.
4. Restart the API and management server. Confirm table counts, menu records, manifest and JSON endpoints; test optimistic version conflicts and replacement against rolled-back fixtures. Check the customer app loads the normalized menu and events.
5. Keep the backup until final review. Restore only with services stopped, into a clean database, using `pg_restore`; restoring an older backup discards subsequent changes.

Fresh installations must apply migrations 001–005 and seed legacy content before running this migration. Do not execute 006 by itself; the migration runner owns its transaction and validation. The legacy adapter can be removed after rollout is verified.

## Offline checks

`npm run typecheck`

`node --import tsx --test src/content-model.test.ts`
