import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {flatten} from './relational-content';
const load=(file:string)=>JSON.parse(readFileSync(new URL(`../seed-data/${file}.json`,import.meta.url),'utf8'));
test('source datasets normalize into scalar columns without JSON blobs',()=>{
 const mapping={menu:'menu',appointments:'appointments',appConfig:'app-config',points:'points-and-tier',profile:'profile',rewards:'rewards',events:'events'};
 for(const [key,file]of Object.entries(mapping))for(const rows of Object.values(flatten(key,load(file))))for(const row of rows)for(const value of Object.values(row))assert.ok(value===null||['string','boolean','number'].includes(typeof value));
});
test('menu hierarchy has parent keys and independent item records',()=>{const rows=flatten('menu',load('menu'));assert.ok(rows.menu_items.length>50);assert.ok(rows.menu_items.every(item=>rows.menu_sections.some(section=>section.id===item.parent_id)));assert.ok(rows.menu_sections.every(section=>rows.menus.some(menu=>menu.id===section.parent_id)));});
test('dish images travel with the versioned menu dataset',async()=>{
 const menu={...load('menu'),courseOffers:{},dishImages:{'Demo dish':'data:image/webp;base64,AAAA'}};
 const rows=flatten('menu',menu);
 assert.equal(rows.menu_item_images[0].image_data,menu.dishImages['Demo dish']);
 const {readDataset}=await import('./relational-content');
 const db={unsafe:async(query:string)=>rows[query.match(/FROM "([^"]+)"/)![1]]??[]};
 assert.deepEqual((await readDataset(db as any,'menu')).dishImages,menu.dishImages);
});
test('unknown and malformed fields reject before destructive replacement',()=>{assert.throws(()=>flatten('events',{events:[],unexpected:'keep me'}),/Unknown field/);assert.throws(()=>flatten('events',{events:'invalid'}),/array/);assert.throws(()=>flatten('unknown',{}),/Unknown dataset/);});
test('unchanged records retain IDs across reorder',()=>{const data=load('events');const first=flatten('events',data).events;const second=flatten('events',{events:[...data.events].reverse()}).events;for(const item of first)assert.equal(second.find(row=>row.title===item.title)?.id,item.id);});
test('all dataset responses reconstruct exactly from normalized rows',async()=>{
 const {readDataset}=await import('./relational-content');
 const mapping={menu:'menu',appointments:'appointments',appConfig:'app-config',points:'points-and-tier',profile:'profile',rewards:'rewards',events:'events'};
 for(const [key,file]of Object.entries(mapping)){
  const input=load(file);const rows=flatten(key,input);
  const db={unsafe:async(query:string)=>rows[query.match(/FROM "([^"]+)"/)![1]]??[]};
  assert.deepEqual(await readDataset(db as any,key),input,key);
 }
});
test('empty catalogues return empty data rather than resurrect bundled records',async()=>{
 const {readDataset}=await import('./relational-content');
 const db={unsafe:async()=>[]};
 assert.deepEqual(await readDataset(db as any,'events'),{events:[]});
 assert.deepEqual((await readDataset(db as any,'menu')).menuItems,{});
});
