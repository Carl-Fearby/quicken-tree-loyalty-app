import { randomUUID } from 'node:crypto';
import { sql } from './db';

type Dish = { name: string; description: string; section: string; menu: string };

await sql`alter table menu_catalogue add column if not exists "dishImages_present" boolean not null default true`;
await sql`create table if not exists menu_item_images(id text primary key,parent_id text not null references menu_catalogue(id) on delete cascade,position integer not null default 0,map_key text not null unique,image_data text not null)`;

function imageFor({ name, description, section, menu }: Dish) {
  const title = name.toLowerCase();
  const text = `${name} ${description}`.toLowerCase();
  if (menu === 'Drinks') {
    if (/affogato/.test(text)) return 'dessert';
    if (/coffee|espresso|latte|mocha|americano|cappuccino/.test(text)) return 'coffee';
    if (/tea|chocolate/.test(text)) return 'tea';
    if (/juice|prosecco|fizz|bubbles/.test(text)) return 'cocktail';
    return 'beer';
  }
  if (menu === 'Bottomless Brunch' && section === 'Bottomless Brunch') return 'cocktail';
  if (/pancake|waffle/.test(title)) return 'pancakes';
  if (/avocado|shakshuka|shashuka/.test(title)) return 'avocado';
  if (/pizza/.test(title)) return 'pizza';
  if (/spaghetti|penne|carbonara|lasagne/.test(title)) return 'pasta';
  if (/burger/.test(title)) return 'burger';
  if (/fish & chips|whitebait/.test(title)) return 'fish-chips';
  if (/ice cream|brownie|dessert|toffee pudding|affogato/.test(title)) return 'dessert';
  if (/salad|asparagus|burrata|aubergine|halloumi/.test(title) || section === 'Fresh Salads') return 'salad';
  if (/seafood|prawn|salmon|crab|mackerel|scampi/.test(title)) return 'seafood';
  if (/steak|ribeye|sirloin|mixed grill|ribs|peppercorn|stilton|diane/.test(title) || section === 'From the Grill') return 'steak';
  if (/roast|gammon|turkey|yorkshire|cauliflower cheese|pigs in blankets|lamb shank|pie/.test(title) || section === 'Traditional Roasts') return 'roast';
  if (/chicken|wings|duck/.test(title)) return 'chicken';
  if (/chips|fries|onion rings|coleslaw|ciabatta/.test(title)) return 'fish-chips';
  if (/seafood|prawn|salmon|crab|mackerel|scampi/.test(text)) return 'seafood';
  if (/steak|ribeye|sirloin/.test(text)) return 'steak';
  if (menu === 'Breakfast') return 'breakfast';
  if (menu === 'Sunday Lunch') return 'roast';
  return 'chicken';
}

const dishes = await sql<Dish[]>`
  select i.name,i.description,s.title as section,m.map_key as menu
  from menu_items i
  join menu_sections s on s.id=i.parent_id
  join menus m on m.id=s.parent_id
  order by m.position,s.position,i.position
`;
if (!dishes.length) throw Error('No menu dishes found in the target database. Image seeding stopped.');

const added = await sql.begin(async (transaction) => {
  let count = 0;
  for (const dish of dishes) {
    const image = `/dish-images/${imageFor(dish)}.webp`;
    const rows = await transaction`
      insert into menu_item_images(id,parent_id,position,map_key,image_data)
      values(${randomUUID()},'menu',0,${dish.name},${image})
      on conflict(map_key) do update set image_data=excluded.image_data
      where menu_item_images.image_data like '/dish-images/%.webp'
        and menu_item_images.image_data<>excluded.image_data
      returning id
    `;
    count += rows.length;
  }
  if (count) {
    await transaction`update menu_catalogue set "dishImages_present"=true where id='menu'`;
    await transaction`update content_revisions set version=version+1,updated_at=clock_timestamp() where dataset_key='menu'`;
    await transaction`update content_generation set version=version+1,updated_at=clock_timestamp() where id=true`;
  }
  return count;
});

console.log(`Added or refreshed ${added} demo image mappings across ${dishes.length} dishes. Uploaded images were kept.`);
await sql.end();
