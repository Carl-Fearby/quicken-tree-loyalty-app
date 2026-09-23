alter table menu_catalogue add column if not exists "dishImages_present" boolean not null default true;
update menu_catalogue set "dishImages_present"=true where id='menu';
create table if not exists menu_item_images (
  id text primary key,
  parent_id text not null references menu_catalogue(id) on delete cascade,
  position integer not null default 0,
  map_key text not null unique,
  image_data text not null
);
