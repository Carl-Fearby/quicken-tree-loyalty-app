create table if not exists member_credentials (
  member_id uuid primary key references members(id) on delete cascade,
  password_salt text not null,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists member_refresh_sessions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists member_refresh_sessions_member_active
  on member_refresh_sessions(member_id, expires_at desc)
  where revoked_at is null;
