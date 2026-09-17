import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,chmodSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {config} from './config';
import {sql} from './db';
import {createContentSchema,replaceDataset,readDataset,flatten} from './relational-content';
const dry=process.argv.includes('--dry-run');
const rollback=new Error('DRY_RUN_ROLLBACK');
if(!dry){
 const url=new URL(config.DATABASE_URL);
 const folder=fileURLToPath(new URL('../backups/',import.meta.url));mkdirSync(folder,{recursive:true,mode:0o700});
 const file=folder+'before-relational-'+new Date().toISOString().replaceAll(':','-')+'.dump';
 const backup=spawnSync('pg_dump',['--format=custom','--file',file],{env:{...process.env,PGHOST:url.hostname,PGPORT:url.port||'5432',PGDATABASE:decodeURIComponent(url.pathname.slice(1)),PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password),PGSSLMODE:url.searchParams.get('sslmode')||(['localhost','127.0.0.1'].includes(url.hostname)?'disable':'require')},encoding:'utf8'});
 if(backup.status!==0)throw Error('Backup failed. No migration attempted. Check pg_dump installation and database access.');
 chmodSync(file,0o600);console.log('Pre-migration backup written to '+file);
}

try{await sql.begin(async tx=>{
 await tx`select pg_advisory_xact_lock(71234001)`;
 const [legacy]=await tx`select to_regclass('public.content_datasets') as name`;
 if(!legacy.name){console.log('Relational content is already installed.');return;}
 await tx`lock table content_datasets,content_versions in access exclusive mode`;
 const rows=await tx`select dataset_key,payload from content_datasets order by dataset_key`;
 const input=Object.fromEntries(rows.map(r=>[r.dataset_key,r.payload]));
 if(input.mainMenu){input.menu.menuItems['Main Menu']=input.mainMenu.sections;delete input.mainMenu;}
 if(!input.events)input.events=JSON.parse(readFileSync(new URL('../seed-data/events.json',import.meta.url),'utf8'));
 for(const [key,value]of Object.entries(input))flatten(key,value);
 await createContentSchema(tx);
 for(const [key,value]of Object.entries(input)){await replaceDataset(tx,key,value);assert.deepEqual(await readDataset(tx,key),value,`Round-trip failed: ${key}`);}
 // Verify replacement removes old children and failed writes leave no partial catalogue.
 const before=await readDataset(tx,'events');
 const testRollback=new Error('TEST_ROLLBACK');
 await assert.rejects(tx.savepoint(async nested=>{await replaceDataset(nested,'events',{events:[]});assert.deepEqual(await readDataset(nested,'events'),{events:[]});throw testRollback;}),e=>e===testRollback);
 assert.deepEqual(await readDataset(tx,'events'),before);
 const preferences=await tx`select member_id,tastes,dietary_needs from member_preferences order by member_id`;
 const bookings=await tx`select id,dietary_needs from bookings order by id`;
 await tx.unsafe(readFileSync(new URL('../migrations/006_relational_preferences.sql',import.meta.url),'utf8'));
 for(const row of preferences){
  const tastes=await tx`select name from member_tastes where member_id=${row.member_id} order by position`;
  const needs=await tx`select name from member_dietary_needs where member_id=${row.member_id} order by position`;
  assert.deepEqual(tastes.map(r=>r.name),row.tastes);assert.deepEqual(needs.map(r=>r.name),row.dietary_needs);
 }
 for(const row of bookings){const needs=await tx`select name from booking_dietary_needs where booking_id=${row.id} order by position`;assert.deepEqual(needs.map(r=>r.name),row.dietary_needs);}
 await tx`drop table content_datasets`;
 await tx`drop table content_versions`;
 console.log(`Verified ${Object.keys(input).length} datasets; replaced JSON catalogues and normalized preferences.`);
 if(dry)throw rollback;
});}catch(error){if(error!==rollback)throw error;console.log('Dry run passed; all changes rolled back.');}finally{await sql.end();}
