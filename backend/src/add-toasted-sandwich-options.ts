import {randomUUID} from 'node:crypto';
import {sql} from './db';
import {createContentSchema} from './relational-content';

const sandwiches=[['One Filling',1],['Two Fillings',2],['Three Fillings',3]] as const;
const fillings=['Sausage','Bacon','Egg','Tomato'];

try {
 await sql.begin(async transaction=>{
  await createContentSchema(transaction);
  for(const [itemName,fillingCount] of sandwiches){
   let [set]=await transaction`select id from menu_item_option_sets where parent_id='menu' and map_key=${itemName}`;
   if(!set){set={id:randomUUID()};await transaction`insert into menu_item_option_sets(id,parent_id,position,map_key) values(${set.id},'menu',0,${itemName})`;}
   await transaction`delete from menu_item_option_groups where parent_id=${set.id}`;
   const groups=[['Choose your bread',1,1,['White bread','Brown bread']],['Choose your fillings',fillingCount,fillingCount,fillings]] as const;
   for(const [position,[label,minSelections,maxSelections,options]] of groups.entries()){
    const groupId=randomUUID();
    await transaction`insert into menu_item_option_groups(id,parent_id,position,label,min_selections,max_selections) values(${groupId},${set.id},${position},${label},${minSelections},${maxSelections})`;
    for(const [optionPosition,option] of options.entries())await transaction`insert into menu_item_options(id,parent_id,position,label) values(${randomUUID()},${groupId},${optionPosition},${option})`;
   }
  }
  // This is a direct relational seed rather than a full catalogue publish, so
  // explicitly invalidate clients' cached menu after the option sets change.
  await transaction`update content_revisions set version=version+1, updated_at=clock_timestamp() where dataset_key='menu'`;
  await transaction`update content_generation set version=version+1, updated_at=clock_timestamp() where id=true`;
 });
 console.log('Toasted sandwich options are ready.');
} finally { await sql.end(); }
