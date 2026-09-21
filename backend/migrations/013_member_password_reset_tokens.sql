create table if not exists member_password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists member_password_reset_tokens_active
  on member_password_reset_tokens(member_id, expires_at desc)
  where used_at is null;
