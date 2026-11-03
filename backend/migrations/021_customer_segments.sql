create table if not exists customer_segments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  definition jsonb not null default '{}'::jsonb,
  created_by uuid references management_users(id) on delete set null,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists customer_segments_name_lower on customer_segments(lower(name)) where archived=false;
