import { readFile } from 'node:fs/promises';
import postgres from 'postgres';

if (!process.env.DATABASE_URL) throw Error('Set DATABASE_URL in management/.env first.');
const url = new URL(process.env.DATABASE_URL);
const local = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname);
const sql = postgres(process.env.DATABASE_URL, {
  connect_timeout: 5,
  ssl:
    process.env.DATABASE_SSL === 'disable'
      ? false
      : process.env.DATABASE_SSL === 'require' || !local
        ? 'require'
        : false,
});

try {
  await sql.unsafe(
    await readFile(new URL('../backend/migrations/017_management_users.sql', import.meta.url), 'utf8'),
  );
  console.log('Back-office users and sessions configured.');
} finally {
  await sql.end();
}
