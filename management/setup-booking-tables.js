import {readFile} from 'node:fs/promises';
import postgres from 'postgres';
if(!process.env.DATABASE_URL) throw Error('Set DATABASE_URL in management/.env first.');
const url=new URL(process.env.DATABASE_URL);
const local=['localhost','127.0.0.1','::1','[::1]'].includes(url.hostname);
const sql=postgres(process.env.DATABASE_URL,{connect_timeout:5,ssl:process.env.DATABASE_SSL==='disable'?false:process.env.DATABASE_SSL==='require'||!local?'require':false});
try {
 await sql.begin(async tx=>{
  const [existing]=await tx`select to_regclass('public.booking_tables') as name`;
  if(!existing.name)await tx.unsafe(await readFile(new URL('../backend/migrations/007_booking_tables.sql',import.meta.url),'utf8'));
  await tx.unsafe(await readFile(new URL('../backend/migrations/008_booking_table_numbers.sql',import.meta.url),'utf8'));
  await tx.unsafe(await readFile(new URL('../backend/migrations/009_booking_assignment_settings.sql',import.meta.url),'utf8'));
 await tx.unsafe(await readFile(new URL('../backend/migrations/010_daily_opening_hours.sql',import.meta.url),'utf8'));
 await tx.unsafe(await readFile(new URL('../backend/migrations/011_booking_table_assignments.sql',import.meta.url),'utf8'));
 });
 console.log('Booking tables configured. Existing seat counts preserved.');
} finally {await sql.end();}
