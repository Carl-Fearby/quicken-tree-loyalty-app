create table if not exists content_datasets (
  dataset_key text primary key,
  version bigint not null default 1,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

insert into content_datasets (dataset_key, payload)
select entry.key, entry.value
from content_versions current_content
cross join lateral jsonb_each(current_content.payload) as entry(key, value)
where current_content.is_current
on conflict (dataset_key) do nothing;
