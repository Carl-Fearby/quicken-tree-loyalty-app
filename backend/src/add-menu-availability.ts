import assert from 'node:assert/strict';
import {chmodSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {config} from './config';
import {createContentSchema,readDataset,replaceDataset} from './relational-content';
import {sql} from './db';

try {
 const url=new URL(config.DATABASE_URL);
 const folder=fileURLToPath(new URL('../backups/',import.meta.url));
 mkdirSync(folder,{recursive:true,mode:0o700});
 const backup=folder+'before-menu-availability-'+new Date().toISOString().replaceAll(':','-')+'.dump';
 const dump=spawnSync('pg_dump',['--format=custom','--file',backup],{env:{...process.env,PGHOST:url.hostname,PGPORT:url.port||'5432',PGDATABASE:decodeURIComponent(url.pathname.slice(1)),PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password),PGSSLMODE:url.searchParams.get('sslmode')||(['localhost','127.0.0.1'].includes(url.hostname)?'disable':'require')},encoding:'utf8'});
 if(dump.status!==0)throw Error('Backup failed. No availability changes were made.');
 chmodSync(backup,0o600);
 await sql.begin(async transaction=>{
  await transaction`alter table menu_categories add column if not exists order_ahead_only boolean not null default false`;
  await transaction`alter table menu_catalogue add column if not exists "itemAvailability_present" boolean not null default false`;
  await createContentSchema(transaction);
  const menu=await readDataset(transaction,'menu');
  if(!menu)throw Error('Menu content was not found.');
  const sunday=menu.categories.find((category:any)=>category.label==='Sunday');
  if(!sunday)throw Error('Sunday menu category was not found.');
  sunday.orderAheadOnly=true;
  menu.itemAvailability={...(menu.itemAvailability??{}),
   'Chicken Wings or Cauli Wings':{days:[3]},
   'Wings Wednesday':{days:[3]}
  };
  await replaceDataset(transaction,'menu',menu);
  assert.deepEqual(await readDataset(transaction,'menu'),menu,'Menu availability round-trip failed. Changes were rolled back.');
 });
 console.log(`Backup written to ${backup}`);
 console.log('Added relational menu availability: Sunday is order-ahead-only and wings are Wednesdays only.');
} finally {
 await sql.end();
}
