create extension if not exists pgcrypto;

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  display_name text not null,
  member_since date not null default current_date,
  tier text not null default 'Quicken Member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists member_preferences (
  member_id uuid primary key references members(id) on delete cascade,
  tastes jsonb not null default '[]'::jsonb,
  dietary_needs jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists loyalty_accounts (
  member_id uuid primary key references members(id) on delete cascade,
  points integer not null default 0 check (points >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists loyalty_ledger (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  points_delta integer not null,
  reason text not null,
  reference_type text,
  reference_id text,
  created_at timestamptz not null default now()
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete set null,
  booking_date date not null,
  booking_time time not null,
  guest_count integer not null check (guest_count > 0),
  experience text not null default 'Table',
  status text not null default 'confirmed' check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  total_pence integer not null default 0 check (total_pence >= 0),
  contact_name text not null,
  contact_email text,
  notes text,
  dietary_needs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bookings_member_date on bookings(member_id, booking_date);

create table if not exists booking_guests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  display_name text not null,
  position smallint not null,
  unique (booking_id, position)
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references bookings(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'paid', 'cancelled', 'fulfilled')),
  total_pence integer not null default 0 check (total_pence >= 0),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  item_name text not null,
  item_description text,
  unit_price_pence integer not null check (unit_price_pence >= 0),
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now()
);

create table if not exists order_line_assignments (
  id uuid primary key default gen_random_uuid(),
  order_line_id uuid not null references order_lines(id) on delete cascade,
  booking_guest_id uuid references booking_guests(id) on delete set null,
  serving_number smallint not null check (serving_number > 0),
  is_shared boolean not null default true,
  unique (order_line_id, serving_number),
  check ((booking_guest_id is null) = is_shared)
);

create table if not exists payment_method_references (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  provider text not null,
  provider_reference text not null,
  brand text,
  last4 char(4),
  expires_at date,
  created_at timestamptz not null default now(),
  unique (provider, provider_reference)
);

create table if not exists staff_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null,
  role text not null check (role in ('content_editor', 'manager', 'admin')),
  created_at timestamptz not null default now()
);
