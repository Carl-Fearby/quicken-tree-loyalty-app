import {randomUUID} from 'node:crypto';
import {sql} from './db';
import {createContentSchema} from './relational-content';

const items=[
 {name:'Chicken Wings or Cauli Wings',description:'Wings Wednesday · choose a small or large portion, then Hot or BBQ.',price:'Small £9.00 · Large £15.00'},
 {name:'Wings Wednesday',description:'Wings Wednesday special · choose Hot or BBQ. Add as many £1 wings as you like.',price:'£1.00 each'}
];
const wingOptionGroups=[
 {label:'Choose a size',minSelections:1,maxSelections:1,options:[['Small',0],['Large',600]]},
 {label:'Choose a flavour',minSelections:1,maxSelections:1,options:[['Hot',0],['BBQ',0]]}
] as const;
async function replaceItemOptions(transaction:any,itemName:string){
 const [setPosition]=await transaction`select coalesce(max(position),-1)::integer as position from menu_item_option_sets where parent_id='menu'`;
 await transaction`delete from menu_item_option_sets where parent_id='menu' and map_key=${itemName}`;
 const setId=randomUUID();
 await transaction`insert into menu_item_option_sets(id,parent_id,position,map_key) values(${setId},'menu',${setPosition.position+1},${itemName})`;
 for(const [groupPosition,group] of wingOptionGroups.entries()){
  const groupId=randomUUID();
  await transaction`insert into menu_item_option_groups(id,parent_id,position,label,min_selections,max_selections) values(${groupId},${setId},${groupPosition},${group.label},${group.minSelections},${group.maxSelections})`;
  for(const [optionPosition,[label,priceDeltaPence]] of group.options.entries())await transaction`insert into menu_item_options(id,parent_id,position,label,price_delta_pence) values(${randomUUID()},${groupId},${optionPosition},${label},${priceDeltaPence})`;
 }
}

try {
 const result=await sql.begin(async transaction=>{
  await createContentSchema(transaction);
  const [menu]=await transaction`select id from menus where map_key=${'Main Menu'}`;
  if(!menu)throw Error('Main Menu was not found.');
  const [section]=await transaction`select id from menu_sections where parent_id=${menu.id} and title=${'Nibbles'}`;
  if(!section)throw Error('The Nibbles sub-menu was not found.');
  const [last]=await transaction`select coalesce(max(position),-1)::integer as position from menu_items where parent_id=${section.id}`;
  let position=last.position;let created=0;
  for(const item of items){const [existing]=await transaction`select id from menu_items where parent_id=${section.id} and name=${item.name}`;if(!existing){position+=1;await transaction`insert into menu_items(id,parent_id,position,name,description,price_label) values(${randomUUID()},${section.id},${position},${item.name},${item.description},${item.price})`;created+=1;}if(item.name==='Chicken Wings or Cauli Wings')await replaceItemOptions(transaction,item.name);}
  return {created};
 });
 console.log(result.created?`Restored ${result.created} Wings Wednesday item${result.created===1?'':'s'} to Nibbles.`:'Wings Wednesday items are already present.');
} finally {
 await sql.end();
}
