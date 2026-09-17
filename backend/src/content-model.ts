/** Explicit relational content model. JSON is an API format, never a storage column. */
export type Field = {column: string; type: 'text' | 'integer' | 'numeric' | 'boolean'; optional?: boolean};
export type Model = {table: string; fields: Record<string, Field>; children?: Record<string, {model: Model; kind: 'object' | 'array' | 'map'; optional?: boolean}>; tuple?: boolean; scalar?: boolean};
const field = (column: string, type: Field['type'] = 'text', optional = false): Field => ({column,type,optional});
const leaf = (table: string, column = 'name', type: Field['type'] = 'text'): Model => ({table,scalar:true,fields:{value:field(column,type)}});
const array = (model: Model, optional = false) => ({model,kind:'array' as const,optional});
const object = (model: Model) => ({model,kind:'object' as const});
const map = (model: Model, optional = false) => ({model,kind:'map' as const,optional});
const section: Model = {table:'menu_sections',fields:{title:field('title')},children:{items:array({table:'menu_items',tuple:true,fields:{'0':field('name'),'1':field('description'),'2':field('price_label')}})}};
export const models: Record<string,Model> = {
 menu:{table:'menu_catalogue',fields:{},children:{
  menuItems:map({table:'menus',fields:{},children:{value:array(section)},scalar:true}),
  categories:array({table:'menu_categories',fields:{label:field('label'),source:field('menu_name'),service:field('service_name'),orderAheadOnly:field('order_ahead_only','boolean',true)},children:{sections:array(leaf('menu_category_sections','section_position','integer'),true)}}),
  itemAvailability:map({table:'menu_item_availability',fields:{orderAheadOnly:field('order_ahead_only','boolean',true)},children:{days:array(leaf('menu_item_availability_days','weekday','integer'))}},true),
  dietaryTags:map({table:'menu_item_dietary_labels',fields:{},scalar:true,children:{value:array(leaf('menu_item_dietary_tags','tag_code'))}}),
  dietaryTagNames:map(leaf('dietary_tags','label')),
  outOfStockItems:array(leaf('menu_unavailable_items','item_name')),
  serviceMessages:map(leaf('menu_service_messages','message')),
  // A menu can be priced per dish or as a configurable set of courses. The
  // map key is the menu's map_key, so this also supports future adult offers.
  courseOffers:map({table:'menu_course_offers',fields:{heading:field('heading'),description:field('description')},children:{
   options:array({table:'menu_course_options',fields:{label:field('label'),courses:field('course_count','integer'),pricePence:field('price_pence','integer')}}),
   courses:array({table:'menu_course_rules',fields:{section:field('section_title'),minSelections:field('min_selections','integer'),maxSelections:field('max_selections','integer')}})
  }}),
  // Reusable configurable choices for any individually-priced menu item.
  itemOptions:map({table:'menu_item_option_sets',fields:{},children:{groups:array({table:'menu_item_option_groups',fields:{label:field('label'),minSelections:field('min_selections','integer'),maxSelections:field('max_selections','integer')},children:{options:array(leaf('menu_item_options','label'))}})}}),
  menuServicePeriods:array({table:'menu_service_periods',fields:{id:field('code'),label:field('label'),start:field('starts_at'),end:field('ends_at')},children:{days:array(leaf('menu_service_days','weekday','integer'),true),categories:array(leaf('menu_service_categories','category_label'))}})
 }},
 appointments:{table:'booking_configuration',fields:{},children:{
  openingHours:map({table:'opening_hours',fields:{open:field('opens_at','numeric'),close:field('closes_at','numeric')}}),
  guestOptions:array(leaf('booking_guest_options','label')),
  experiences:array({table:'booking_experiences',fields:{name:field('name'),price:field('price_pounds','numeric'),start:field('starts_at','numeric'),end:field('ends_at','numeric')},children:{days:array(leaf('booking_experience_days','weekday','integer'))}})
 }},
 appConfig:{table:'venue_configuration',fields:{venue:field('name'),location:field('location')},children:{contact:object({table:'venue_contacts',fields:{phone:field('phone'),email:field('email')}}),menuNotification:object({table:'menu_notifications',fields:{context:field('context'),title:field('title'),body:field('body')}})}},
 points:{table:'loyalty_configuration',fields:{points:field('demo_points','integer'),nextRewardAt:field('next_reward_points','integer'),tier:field('tier'),benefits:field('benefits')},children:{promotions:object({table:'loyalty_promotions',fields:{},children:{doublePoints:array({table:'loyalty_double_points',fields:{label:field('label'),start:field('starts_at'),end:field('ends_at'),displayHours:field('display_hours'),displayDays:field('display_days')},children:{days:array(leaf('loyalty_promotion_days','weekday','integer'))}})}})}},
 profile:{table:'profile_configuration',fields:{storageKey:field('storage_key')},children:{
  default:object({table:'profile_defaults',fields:{name:field('name'),email:field('email'),memberSince:field('member_since'),tier:field('tier')},children:{tastes:array(leaf('profile_default_tastes')),dietaryNeeds:array(leaf('profile_default_dietary_needs'))}}),
  venue:object({table:'profile_venue',fields:{name:field('name'),location:field('location')}}),
  tasteOptions:array(leaf('taste_options')),dietaryRequirementOptions:array(leaf('dietary_requirement_options')),allergenOptions:array(leaf('allergen_options'))
 }},
 rewards:{table:'reward_catalogue',fields:{},children:{rewards:array({table:'rewards',fields:{icon:field('icon'),title:field('title'),meta:field('description'),code:field('code')}})}},
 events:{table:'event_catalogue',fields:{},children:{events:array({table:'events',fields:{date:field('event_date'),day:field('display_day'),number:field('display_number'),month:field('display_month'),title:field('title'),description:field('description'),notification:field('notification'),festive:field('festive','boolean',true)}})}}
};
export function walkModels(fn:(model:Model,parent?:Model)=>void){const walk=(model:Model,parent?:Model)=>{fn(model,parent);for(const child of Object.values(model.children??{}))walk(child.model,model);};for(const model of Object.values(models))walk(model);}
