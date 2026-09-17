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
