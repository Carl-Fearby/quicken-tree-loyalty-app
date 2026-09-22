create table if not exists management_users (
  id uuid primary key,
  email text not null unique,
  display_name text not null,
  password_hash text not null,
  role text not null default 'staff' check (role in ('admin', 'staff')),
  active boolean not null default true,
  configuration_access boolean not null default false,
  booking_access text not null default 'read' check (booking_access in ('none', 'read', 'write')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists management_users_email_lower
  on management_users (lower(email));

create table if not exists management_sessions (
  id uuid primary key,
  user_id uuid not null references management_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists management_sessions_expiry
  on management_sessions (expires_at);

create table if not exists management_permission_definitions (
  permission_key text primary key,
  label text not null,
  description text not null,
  levels text[] not null,
  position integer not null default 0
);

create table if not exists management_user_permissions (
  user_id uuid not null references management_users(id) on delete cascade,
  permission_key text not null references management_permission_definitions(permission_key) on delete cascade,
  access_level text not null,
  primary key (user_id, permission_key)
);

insert into management_permission_definitions (permission_key, label, description, levels, position) values
  ('bookings','Booking diary','View or manage bookings and table assignments.',array['none','read','write'],0),
  ('customers','Customers tab','Show the Customers tab and view customer profiles and loyalty balances.',array['none','read'],1),
  ('rewards','Rewards','Create rewards and add points to customers.',array['none','write'],2),
  ('configuration.tables','Restaurant tables','Manage restaurant tables and capacities.',array['none','write'],10),
  ('configuration.duration','Booking duration','Manage the default booking duration.',array['none','write'],11),
  ('configuration.hours','Opening & kitchen hours','Manage venue and kitchen hours.',array['none','write'],12),
  ('configuration.menu','Menu maintenance','Manage menus, sections, dishes and availability.',array['none','write'],13),
  ('configuration.symbols','Dietary & allergen symbols','Manage dietary and allergen keys.',array['none','write'],14),
  ('configuration.rewards','Rewards settings','Turn customer rewards on or off.',array['none','write'],15),
  ('configuration.users','User management','Create users and delegate permissions.',array['none','write'],16),
  ('configuration.database','Database management','Inspect and modify database records.',array['none','write'],17)
on conflict (permission_key) do update set
  label=excluded.label,description=excluded.description,levels=excluded.levels,position=excluded.position;

delete from management_permission_definitions where permission_key in ('configuration','users');

alter table management_users add column if not exists configuration_access boolean not null default false;
alter table management_users add column if not exists booking_access text not null default 'read';
alter table management_users drop constraint if exists management_users_booking_access_check;
alter table management_users add constraint management_users_booking_access_check
  check (booking_access in ('none', 'read', 'write'));

update management_users
set configuration_access = true, booking_access = 'write'
where role = 'admin';

insert into management_users (id, email, display_name, password_hash, role, configuration_access, booking_access)
select
  gen_random_uuid(),
  'carlfearby@me.com',
  'Carl Fearby',
  'scrypt:d6df8a5f0b2895143f2ea76558990501:f874205f60ebbb25b77d86d9ada6ef8c733d11f95400e3990b008e29af47f9c795414ad658238c11d79193fdbd796a741c5ada0c6c3ffe622fd7fcde119a47e4',
  'admin',
  true,
  'write'
where not exists (select 1 from management_users);

insert into management_user_permissions (user_id, permission_key, access_level)
select
  u.id,
  d.permission_key,
  case
    when u.role='admin' then d.levels[array_length(d.levels,1)]
    when d.permission_key='bookings' then u.booking_access
    when d.permission_key like 'configuration.%' and u.configuration_access then 'write'
    else 'none'
  end
from management_users u
cross join management_permission_definitions d
on conflict (user_id, permission_key) do nothing;
