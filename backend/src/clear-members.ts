import {chmodSync, mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {config} from './config';
import {sql} from './db';

const url = new URL(config.DATABASE_URL);
const backupDirectory = fileURLToPath(new URL('../backups/', import.meta.url));
mkdirSync(backupDirectory, {recursive: true, mode: 0o700});
const backupFile = `${backupDirectory}before-clearing-members-${new Date().toISOString().replaceAll(':', '-')}.dump`;
const backup = spawnSync('pg_dump', ['--format=custom', '--file', backupFile], {
  env: {
    ...process.env,
    PGHOST: url.hostname,
    PGPORT: url.port || '5432',
    PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGSSLMODE: url.searchParams.get('sslmode') || (['localhost', '127.0.0.1'].includes(url.hostname) ? 'disable' : 'require'),
  },
});
if (backup.status !== 0) throw new Error('Backup failed. No member data was deleted.');
chmodSync(backupFile, 0o600);

const result = await sql.begin(async transaction => {
  await transaction`select pg_advisory_xact_lock(71234002)`;
  const [members] = await transaction`select count(*)::integer as count from members`;
  const [bookings] = await transaction`select count(*)::integer as count from bookings where member_id is not null`;
  const deleted = await transaction`delete from members`;
  const [remaining] = await transaction`select count(*)::integer as count from members`;
  if (remaining.count !== 0) throw new Error('Member deletion did not complete.');
  return {members: members.count, bookingsDetached: bookings.count, deleted: deleted.count};
});

console.log(JSON.stringify({backupFile, ...result}));
await sql.end();
