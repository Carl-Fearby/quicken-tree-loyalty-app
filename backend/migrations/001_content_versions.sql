create table if not exists content_versions (
  version bigint generated always as identity primary key,
  payload jsonb not null,
  is_current boolean not null default false,
  published_at timestamptz not null default now()
);

create unique index if not exists one_current_content_version
  on content_versions (is_current)
  where is_current;
