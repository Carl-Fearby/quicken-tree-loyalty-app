create table if not exists feature_flags (
  feature_key text primary key,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into feature_flags (feature_key, enabled)
values ('rewards', true)
on conflict (feature_key) do nothing;
