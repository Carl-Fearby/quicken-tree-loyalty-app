import {randomUUID} from 'node:crypto';
import {sql} from './db';

const items=[
 {name:'Chicken Wings or Cauli Wings',description:'Wings Wednesday · choose a small or large portion, then Hot or BBQ.',price:'Small £9.00 · Large £15.00'},
 {name:'Wings Wednesday',description:'Wings Wednesday special · choose Hot or BBQ. Add as many £1 wings as you like.',price:'£1.00 each'}
];

try {
 const result=await sql.begin(async transaction=>{
  const [menu]=await transaction`select id from menus where map_key=${'Main Menu'}`;
  if(!menu)throw Error('Main Menu was not found.');
  const [section]=await transaction`select id from menu_sections where parent_id=${menu.id} and title=${'Nibbles'}`;
  if(!section)throw Error('The Nibbles sub-menu was not found.');
  const [last]=await transaction`select coalesce(max(position),-1)::integer as position from menu_items where parent_id=${section.id}`;
  let position=last.position;let created=0;
  for(const item of items){const [existing]=await transaction`select id from menu_items where parent_id=${section.id} and name=${item.name}`;if(existing)continue;position+=1;await transaction`insert into menu_items(id,parent_id,position,name,description,price_label) values(${randomUUID()},${section.id},${position},${item.name},${item.description},${item.price})`;created+=1;}
  return {created};
 });
 console.log(result.created?`Restored ${result.created} Wings Wednesday item${result.created===1?'':'s'} to Nibbles.`:'Wings Wednesday items are already present.');
} finally {
 await sql.end();
}
