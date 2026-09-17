import {test} from 'node:test';
import assert from 'node:assert/strict';
import postgres from 'postgres';
import {remove} from '../db.js';
test('PostgreSQL deletion, dependency protection and rollback',{skip:!process.env.MANAGEMENT_INTEGRATION},async()=>{
 const url=new URL(process.env.DATABASE_URL);
 const sql=postgres(process.env.DATABASE_URL,{max:1,ssl:['localhost','127.0.0.1'].includes(url.hostname)?false:'require',connection:{lock_timeout:3000,statement_timeout:15000}});
 const suffix=Date.now();const parent=`management_test_parent_${suffix}`,child=`management_test_child_${suffix}`;
 const rollback=new Error('ROLLBACK_TEST_FIXTURES');
 try {await assert.rejects(sql.begin(async tx=>{
  await tx.unsafe(`CREATE TABLE public."${parent}" (id integer PRIMARY KEY)`);
  await tx.unsafe(`CREATE TABLE public."${child}" (id integer PRIMARY KEY,parent_id integer REFERENCES public."${parent}" ON DELETE CASCADE)`);
  await tx.unsafe(`INSERT INTO public."${parent}" VALUES (1),(2)`);
  await tx.unsafe(`INSERT INTO public."${child}" VALUES (1,1)`);
  const adapter={begin:fn=>tx.savepoint(fn)};
  await assert.rejects(remove(adapter,parent,{id:1},false),/Related rows exist/);
  await assert.rejects(remove(adapter,parent,null,true),/Related rows exist/);
  assert.equal((await remove(adapter,parent,{id:2},false)).deleted,1);
  assert.equal((await remove(adapter,child,null,true)).deleted,1);
  assert.equal((await remove(adapter,parent,null,true)).deleted,1);
  throw rollback;
 }),error=>error===rollback);}finally{await sql.end();}
});
