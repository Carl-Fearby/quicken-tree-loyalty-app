import {sql} from './db';
import {contentKeys,readDataset,replaceDataset,flatten} from './relational-content';
export type VersionedContent = {version:string;updatedAt:string;data:unknown};
export type ContentDataset = VersionedContent & {key:string};
const conflict=()=>Object.assign(new Error('This content has changed. Reload it before saving.'),{statusCode:409});
const canonical=(key:string)=>key==='mainMenu'?'menu':key;
const menuAvailabilityKey='menuAvailability';
async function read(tx:any,key:string):Promise<ContentDataset|null>{
 if(key===menuAvailabilityKey){
  const [revision]=await tx`select * from content_revisions where dataset_key=${menuAvailabilityKey}`;
  if(!revision)return null;
  const [catalogue]=await tx`select "itemAvailability_present" as present from menu_catalogue where id='menu'`;
  const availability=catalogue?.present?await tx`select id,map_key,order_ahead_only as "orderAheadOnly" from menu_item_availability where parent_id='menu' order by position`:[];
  const days=availability.length?await tx`select parent_id,weekday from menu_item_availability_days order by position`:[];
  const itemAvailability=Object.fromEntries(availability.map((item:any)=>[item.map_key,{...(item.orderAheadOnly?{orderAheadOnly:item.orderAheadOnly}:{}),days:days.filter((day:any)=>day.parent_id===item.id).map((day:any)=>Number(day.weekday))}]));
  const unavailable=await tx`select item_name from menu_unavailable_items where parent_id='menu' order by position`;
  return {key,version:`${key}-${revision.version}`,updatedAt:revision.updated_at.toISOString(),data:{itemAvailability,outOfStockItems:unavailable.map((item:any)=>item.item_name)}};
 }
 const [row]=await tx`select * from content_revisions where dataset_key=${canonical(key)}`;
 if(!row)return null;
 const value=await readDataset(tx,canonical(key));
 const data=key==='mainMenu'?{sections:value?.menuItems?.['Main Menu']??[]}:key==='menu'&&value?(({itemAvailability,outOfStockItems,...catalogue})=>catalogue)(value):value;
 return {key,version:`${key}-${row.version}`,updatedAt:row.updated_at.toISOString(),data};
}
export async function currentDataset(key:string){return sql.begin('isolation level repeatable read read only',tx=>read(tx,key));}
export async function contentManifest(){const rows=await sql`select * from content_revisions order by dataset_key`;return {datasets:rows.flatMap(row=>[row.dataset_key,...(row.dataset_key==='menu'?['mainMenu']:[])].map(key=>({key,version:`${key}-${row.version}`,updatedAt:row.updated_at.toISOString()})))};}
export async function currentContent():Promise<VersionedContent|null>{return sql.begin('isolation level repeatable read read only',async tx=>{
 const [generation]=await tx`select * from content_generation where id=true`;if(!generation)return null;
 const data:Record<string,unknown>={};for(const key of [...contentKeys,'mainMenu',menuAvailabilityKey]){const value=await read(tx,key);if(value)data[key]=value.data;}
 return {version:`content-${generation.version}`,updatedAt:generation.updated_at.toISOString(),data};
});}
export async function publishDataset(key:string,data:any,expectedVersion?:string){return sql.begin(async tx=>{
 await tx`select pg_advisory_xact_lock(71234001)`;
 const current=await read(tx,key);if(!current)throw Object.assign(new Error('Unknown dataset.'),{statusCode:404});
 if(expectedVersion&&current.version!==expectedVersion)throw conflict();
 if(key==='mainMenu'){const menu=await readDataset(tx,'menu');data={...menu,menuItems:{...menu.menuItems,'Main Menu':data.sections}};}
 await replaceDataset(tx,canonical(key),data);return (await read(tx,key))!;
});}
export async function publishContent(data:any,expectedVersion?:string){
 const input={...data};if(input.mainMenu){if(!input.menu)throw Error('Menu is required with mainMenu.');input.menu={...input.menu,menuItems:{...input.menu.menuItems,'Main Menu':input.mainMenu.sections}};delete input.mainMenu;}
 for(const [key,value]of Object.entries(input))flatten(key,value);
 await sql.begin(async tx=>{await tx`select pg_advisory_xact_lock(71234001)`;const [generation]=await tx`select version from content_generation where id=true`;if(expectedVersion&&expectedVersion!==`content-${generation.version}`)throw conflict();for(const [key,value]of Object.entries(input))await replaceDataset(tx,key,value);});
 return currentContent();
}
