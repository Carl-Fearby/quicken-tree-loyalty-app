import {randomUUID} from 'node:crypto';
import {sql} from './db';
import {createContentSchema} from './relational-content';

const menuName='Kids Menu';
const sections=[
 {title:'Starters',items:[
  ['Garlic Ciabatta','Garlic ciabatta',''],
  ['Halloumi Fries & Ketchup','Halloumi fries served with ketchup',''],
  ['Mini Chipolatas & Ketchup','Mini chipolatas served with ketchup',''],
  ['Salad Sticks & Hummus','Fresh salad sticks with hummus','']
 ]},
 {title:'Mains',items:[
  ['Cheeseburger','Fries with peas, beans or salad sticks',''],
  ['Fish Goujons','Fries with peas, beans or salad sticks',''],
  ['Chicken Bites','Fries with peas, beans or salad sticks',''],
  ["Mac ’n’ Cheese",'Served with salad sticks',''],
  ['Sausage & Mash','Peas and gravy',''],
  ['Kids Roast','Choice of one meat with all the trimmings · Sundays only','']
 ]},
 {title:'Desserts',items:[
  ['Triple Chocolate Brownie','Chocolate sauce and vanilla ice cream',''],
  ['Selection of Ice Creams','Served with sauce',''],
  ['Mini Pancakes','Nutella, whipped cream and fresh strawberries','']
 ]}
];
const kidsSideOptions=['Beans','Peas','Salad Sticks'];
const kidsSideChoiceItems=new Set(['Cheeseburger','Fish Goujons','Chicken Bites','Mac ’n’ Cheese','Sausage & Mash','Kids Roast']);
async function replaceItemOptions(transaction:any,itemName:string){
 const [setPosition]=await transaction`select coalesce(max(position),-1)::integer as position from menu_item_option_sets where parent_id='menu'`;
 await transaction`delete from menu_item_option_sets where parent_id='menu' and map_key=${itemName}`;
 const setId=randomUUID();
 await transaction`insert into menu_item_option_sets(id,parent_id,position,map_key) values(${setId},'menu',${setPosition.position+1},${itemName})`;
 const groupId=randomUUID();
 await transaction`insert into menu_item_option_groups(id,parent_id,position,label,min_selections,max_selections) values(${groupId},${setId},0,${'Choose a side'},1,1)`;
 for(const [position,label] of kidsSideOptions.entries())await transaction`insert into menu_item_options(id,parent_id,position,label,price_delta_pence) values(${randomUUID()},${groupId},${position},${label},0)`;
}

try {
 const result=await sql.begin(async transaction=>{
  await createContentSchema(transaction);
  let [menu]=await transaction`select id from menus where map_key=${menuName}`;
  if(!menu){const [last]=await transaction`select coalesce(max(position),-1)::integer as position from menus`;menu={id:randomUUID()};await transaction`insert into menus(id,parent_id,position,map_key) values(${menu.id},'menu',${last.position+1},${menuName})`;}
  let [category]=await transaction`select id from menu_categories where label=${'Kids'}`;
  if(!category){const [last]=await transaction`select coalesce(max(position),-1)::integer as position from menu_categories`;category={id:randomUUID()};await transaction`insert into menu_categories(id,parent_id,position,label,menu_name,service_name,sections_present,order_ahead_only) values(${category.id},'menu',${last.position+1},${'Kids'},${menuName},${'Main'},false,false)`;}
  // Keep family choices near the start of the customer-facing navigation,
  // rather than wherever the menu happened to be inserted during setup.
  const [kidsCategory]=await transaction`select position from menu_categories where id=${category.id}`;
  if(kidsCategory.position!==1){
   await transaction`update menu_categories set position=position+1 where parent_id='menu' and id<>${category.id} and position>=1`;
   await transaction`update menu_categories set position=1 where id=${category.id}`;
  }
  let added=0;
  for(const [sectionPosition,definition] of sections.entries()){
   let [section]=await transaction`select id from menu_sections where parent_id=${menu.id} and title=${definition.title}`;
   if(!section){section={id:randomUUID()};await transaction`insert into menu_sections(id,parent_id,position,title) values(${section.id},${menu.id},${sectionPosition},${definition.title})`;}
   for(const [itemPosition,[name,description,price]] of definition.items.entries()){
   const [existing]=await transaction`select id from menu_items where parent_id=${section.id} and name=${name}`;
    if(!existing){await transaction`insert into menu_items(id,parent_id,position,name,description,price_label) values(${randomUUID()},${section.id},${itemPosition},${name},${description},${price})`;added+=1;}
    if(kidsSideChoiceItems.has(name))await replaceItemOptions(transaction,name);
   }
  }
  const [existingAvailability]=await transaction`select id from menu_item_availability where parent_id=${'menu'} and map_key=${'Kids Roast'}`;
  if(!existingAvailability){const [last]=await transaction`select coalesce(max(position),-1)::integer as position from menu_item_availability where parent_id=${'menu'}`;const availabilityId=randomUUID();await transaction`insert into menu_item_availability(id,parent_id,position,map_key,order_ahead_only) values(${availabilityId},'menu',${last.position+1},${'Kids Roast'},false)`;await transaction`insert into menu_item_availability_days(id,parent_id,position,weekday) values(${randomUUID()},${availabilityId},0,0)`;}
  // Kids meals follow the standard food service windows, including Sunday lunch.
  for(const serviceCode of ['day','evening','sunday-lunch']){
   const [service]=await transaction`select id from menu_service_periods where parent_id='menu' and code=${serviceCode}`;
   if(!service)continue;
   const [linked]=await transaction`select id from menu_service_categories where parent_id=${service.id} and category_label=${'Kids'}`;
   if(!linked){const [last]=await transaction`select coalesce(max(position),-1)::integer as position from menu_service_categories where parent_id=${service.id}`;await transaction`insert into menu_service_categories(id,parent_id,position,category_label) values(${randomUUID()},${service.id},${last.position+1},${'Kids'})`;}
  }
  const courseOffer={heading:'Kids set menu',description:'Choose any 2 courses for £10 or all 3 courses for £12.',options:[['2 courses',2,1000],['3 courses',3,1200]],courses:[['Starters',0,1],['Mains',0,1],['Desserts',0,1]]};
  let [offer]=await transaction`select id from menu_course_offers where parent_id='menu' and map_key=${menuName}`;
  if(!offer){offer={id:randomUUID()};await transaction`insert into menu_course_offers(id,parent_id,position,map_key,heading,description) values(${offer.id},'menu',0,${menuName},${courseOffer.heading},${courseOffer.description})`;}else await transaction`update menu_course_offers set heading=${courseOffer.heading},description=${courseOffer.description} where id=${offer.id}`;
  await transaction`delete from menu_course_options where parent_id=${offer.id}`;
  await transaction`delete from menu_course_rules where parent_id=${offer.id}`;
  for(const [position,[label,courses,pricePence]] of courseOffer.options.entries())await transaction`insert into menu_course_options(id,parent_id,position,label,course_count,price_pence) values(${randomUUID()},${offer.id},${position},${label},${courses},${pricePence})`;
  for(const [position,[section,minSelections,maxSelections]] of courseOffer.courses.entries())await transaction`insert into menu_course_rules(id,parent_id,position,section_title,min_selections,max_selections) values(${randomUUID()},${offer.id},${position},${section},${minSelections},${maxSelections})`;
  return {added};
 });
 console.log(result.added?`Added Kids Menu with ${result.added} dishes.`:'Kids Menu is already present.');
} finally {await sql.end();}
