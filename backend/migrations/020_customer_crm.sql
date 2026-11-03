alter table members add column if not exists phone text;

create table if not exists customer_notes (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_by uuid references management_users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists customer_notes_member_created on customer_notes(member_id,created_at desc);

create table if not exists customer_tag_definitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#566474',
  created_by uuid references management_users(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists customer_tag_definitions_name_lower on customer_tag_definitions(lower(name));

create table if not exists customer_tags (
  member_id uuid not null references members(id) on delete cascade,
  tag_id uuid not null references customer_tag_definitions(id) on delete cascade,
  assigned_by uuid references management_users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key(member_id,tag_id)
);

create table if not exists customer_consents (
  member_id uuid not null references members(id) on delete cascade,
  channel text not null check(channel in ('email','sms','push')),
  purpose text not null default 'marketing',
  status text not null check(status in ('unknown','opted_in','opted_out')),
  source text not null,
  wording_version text,
  updated_by uuid references management_users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key(member_id,channel,purpose)
);

create table if not exists customer_audit_events (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete set null,
  actor_user_id uuid references management_users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists customer_audit_member_created on customer_audit_events(member_id,created_at desc);
