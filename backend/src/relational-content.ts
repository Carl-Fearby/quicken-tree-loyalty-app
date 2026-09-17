import {createHash} from 'node:crypto';
import type {Sql, TransactionSql} from 'postgres';
import {models,walkModels,type Model} from './content-model';
type DB = Sql | TransactionSql;
type Value = any;
const q=(name:string)=>'"'+name.replaceAll('"','""')+'"';
export const contentKeys=Object.keys(models);
const menuAvailabilityTables=new Set(['menu_item_availability','menu_item_availability_days','menu_unavailable_items']);
const fail=(message:string)=>Object.assign(new Error(message),{statusCode:400});
export function flatten(key:string,data:Value){
 const root=models[key];if(!root)throw fail(`Unknown dataset: ${key}`);
 const tables:Record<string,Record<string,Value>[] >={};
 const visit=(model:Model,input:Value,id:string,parentId:string|null,position:number,mapKey:string|null)=>{
  const value=model.scalar?{value:input}:input;
  if(!value||typeof value!=='object'||(Array.isArray(value)&&!model.tuple))throw fail(`Invalid ${model.table} record.`);
  const allowed=new Set([...Object.keys(model.fields),...Object.keys(model.children??{})]);
  if(Object.keys(value).some(k=>!allowed.has(k)))throw fail(`Unknown field in ${model.table}; refusing to discard data.`);
  const row:Record<string,Value>={id,parent_id:parentId,position,map_key:mapKey};
  for(const [prop,f] of Object.entries(model.fields)){
   const v=value[prop];if(v===undefined&&f.optional){row[f.column]=null;continue;}
   const valid=f.type==='integer'?Number.isSafeInteger(v):f.type==='numeric'?typeof v==='number'&&Number.isFinite(v):typeof v===f.type.replace('text','string');
   if(!valid)throw fail(`Invalid ${model.table}.${f.column}.`);row[f.column]=v;
  }
  (tables[model.table]??=[]).push(row);
  for(const [prop,child] of Object.entries(model.children??{})){
   const input=value[prop];
   if(child.optional){row[`${prop}_present`]=input!==undefined;if(input===undefined)continue;}
   if(child.kind==='array'&&!Array.isArray(input))throw fail(`${model.table}.${prop} must be an array.`);
   if(child.kind!=='array'&&(!input||typeof input!=='object'||Array.isArray(input)))throw fail(`${model.table}.${prop} must be an object.`);
   const entries=child.kind==='object'?[[null,input]]:child.kind==='array'?input.map((v:Value,i:number)=>[String(i),v]):Object.entries(input);
   const used=new Map<string,number>();
   entries.forEach(([k,v]:[string|null,Value],i:number)=>{
    const natural=child.kind==='map'?k:child.kind==='object'?prop:typeof v==='object'?(Array.isArray(v)?v[0]:v.id??v.code??v.name??v.title??v.label??v.date??i):v;
    const identity=String(natural),occurrence=used.get(identity)??0;used.set(identity,occurrence+1);
    const childId=createHash('sha256').update(`${id}/${prop}/${identity}/${occurrence}`).digest('hex').slice(0,32);
    visit(child.model,v,childId,id,i,child.kind==='map'?k:null);
   });
  }
 };
 visit(root,data,key,null,0,null);return tables;
}
export async function createContentSchema(db:DB){
 await db`create table if not exists content_revisions (dataset_key text primary key, version bigint not null default 1, updated_at timestamptz not null default now())`;
 await db`create table if not exists content_generation (id boolean primary key default true check(id), version bigint not null default 1, updated_at timestamptz not null default now())`;
 await db`insert into content_generation(id) values(true) on conflict do nothing`;
 await db`insert into content_revisions(dataset_key) values('menuAvailability') on conflict do nothing`;
 const definitions:{model:Model,parent?:Model}[]=[];walkModels((model,parent)=>definitions.push({model,parent}));
 for(const {model,parent} of definitions){
  const fields=Object.values(model.fields).map(f=>`${q(f.column)} ${f.type}${f.optional?'':' NOT NULL'}`);
  for(const [prop,child]of Object.entries(model.children??{}))if(child.optional)fields.push(`${q(`${prop}_present`)} boolean NOT NULL DEFAULT false`);
  await db.unsafe(`CREATE TABLE IF NOT EXISTS ${q(model.table)} (id text PRIMARY KEY, parent_id text ${parent?`NOT NULL REFERENCES ${q(parent.table)}(id) ON DELETE CASCADE`:''}, position integer NOT NULL CHECK(position>=0), map_key text${fields.length?', '+fields.join(', '):''})`);
  if(parent)await db.unsafe(`CREATE INDEX IF NOT EXISTS ${q(model.table+'_parent')} ON ${q(model.table)}(parent_id,position)`);
 }
 // Frequent menu stock/service changes have their own lightweight version.
 await db.unsafe(`CREATE OR REPLACE FUNCTION invalidate_content_revision() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN UPDATE content_revisions SET version=version+1,updated_at=clock_timestamp() WHERE dataset_key=TG_ARGV[0]; UPDATE content_generation SET version=version+1,updated_at=clock_timestamp() WHERE id=true; RETURN NULL; END $$`);
 await db.unsafe(`CREATE OR REPLACE FUNCTION invalidate_menu_availability_revision() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN UPDATE content_revisions SET version=version+1,updated_at=clock_timestamp() WHERE dataset_key='menuAvailability'; UPDATE content_generation SET version=version+1,updated_at=clock_timestamp() WHERE id=true; RETURN NULL; END $$`);
 for(const [key,root]of Object.entries(models)){
  const visit=async(model:Model):Promise<void>=>{
   await db.unsafe(`DROP TRIGGER IF EXISTS content_changed ON ${q(model.table)}`);
   await db.unsafe(`DROP TRIGGER IF EXISTS menu_availability_changed ON ${q(model.table)}`);
   const availability=key==='menu'&&menuAvailabilityTables.has(model.table);
   await db.unsafe(`CREATE TRIGGER ${availability?'menu_availability_changed':'content_changed'} AFTER INSERT OR UPDATE OR DELETE ON ${q(model.table)} FOR EACH STATEMENT EXECUTE FUNCTION ${availability?'invalidate_menu_availability_revision()':`invalidate_content_revision('${key}')`}`);
   for(const child of Object.values(model.children??{}))await visit(child.model);
  };await visit(root);
 }
}
export async function replaceDataset(db:DB,key:string,data:Value){
 const tables=flatten(key,data); // Entire payload validates before any write.
 await db`insert into content_revisions(dataset_key) values(${key}) on conflict do nothing`;
 const root=models[key];
 await db.unsafe(`DELETE FROM ${q(root.table)}`);
 for(const [table,rows]of Object.entries(tables))for(const row of rows){
  const columns=Object.keys(row);await db.unsafe(`INSERT INTO ${q(table)} (${columns.map(q).join(',')}) VALUES (${columns.map((_,i)=>'$'+(i+1)).join(',')})`,columns.map(k=>row[k]));
 }
}
export async function readDataset(db:DB,key:string):Promise<Value|null>{
 const root=models[key];if(!root)return null;
 const rows:Record<string,Value[]>={};
 const load=async(model:Model):Promise<void>=>{rows[model.table]=await db.unsafe(`SELECT * FROM ${q(model.table)} ORDER BY position,id`);for(const child of Object.values(model.children??{}))await load(child.model);};await load(root);

 const build=(model:Model,row:Value):Value=>{
  const result:Value=model.tuple?[]:{};
  for(const [prop,f]of Object.entries(model.fields))if(!f.optional||row[f.column]!==null)result[prop]=row[f.column]===undefined?(f.type==='text'?'':f.type==='boolean'?false:0):f.type==='numeric'?Number(row[f.column]):row[f.column];
  for(const [prop,child]of Object.entries(model.children??{})){
   if(child.optional&&!row[`${prop}_present`])continue;
   const children=rows[child.model.table].filter(c=>c.parent_id===row.id);
   result[prop]=child.kind==='array'?children.map(c=>build(child.model,c)):child.kind==='map'?Object.fromEntries(children.map(c=>[c.map_key,build(child.model,c)])):build(child.model,children[0]??{});
  }
  return model.scalar?result.value:result;
 };return build(root,rows[root.table][0]??{});
}
