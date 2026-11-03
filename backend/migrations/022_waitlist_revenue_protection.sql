alter table bookings add column if not exists deposit_status text not null default 'none';
alter table bookings add column if not exists deposit_amount_pence integer not null default 0;
alter table bookings drop constraint if exists bookings_deposit_status_check;
alter table bookings add constraint bookings_deposit_status_check check(deposit_status in ('none','demo_required','demo_paid','demo_card_guarantee','demo_refunded'));
alter table bookings drop constraint if exists bookings_status_check;
alter table bookings add constraint bookings_status_check check(status in ('pending','confirmed','cancelled','completed','no_show'));

create table if not exists waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete set null,
  service_date date not null,
  guest_name text not null,
  contact_email text,
  contact_phone text,
  party_size integer not null check(party_size between 1 and 20),
  status text not null default 'waiting' check(status in ('waiting','nearly_ready','ready','seated','cancelled','expired')),
  priority integer not null default 0,
  quoted_wait_minutes integer check(quoted_wait_minutes between 0 and 360),
  notes text,
  assigned_table_id integer references booking_tables(id) on delete set null,
  seated_booking_id uuid references bookings(id) on delete set null,
  created_by uuid references management_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists waitlist_service_status on waitlist_entries(service_date,status,priority desc,created_at);
