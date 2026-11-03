insert into booking_system_settings(setting_key, integer_value)
values ('deposits_enabled', 1)
on conflict(setting_key) do nothing;

create table if not exists booking_deposit_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  channel text not null default 'both' check(channel in ('app','backoffice','both')),
  min_party_size integer not null default 1 check(min_party_size between 1 and 20),
  max_party_size integer check(max_party_size between 1 and 20 and max_party_size >= min_party_size),
  days smallint[] not null default array[0,1,2,3,4,5,6]::smallint[],
  starts_at time not null default '00:00',
  ends_at time not null default '23:59:59',
  amount_pence integer not null check(amount_pence between 0 and 100000),
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into booking_deposit_rules(name,channel,min_party_size,days,starts_at,ends_at,amount_pence,priority)
select 'Standard booking deposit','both',1,array[0,1,2,3,4,5,6]::smallint[],'00:00','23:59:59',1000,0
where not exists(select 1 from booking_deposit_rules);

create or replace function resolve_booking_deposit(
  service_date date,
  service_time time,
  party_size integer,
  booking_channel text
) returns table(rule_id uuid, rule_name text, amount_pence integer)
language sql stable as $$
  select r.id,r.name,r.amount_pence
  from booking_deposit_rules r
  where coalesce((select integer_value=1 from booking_system_settings where setting_key='deposits_enabled'),false)
    and r.active
    and r.channel in ('both',booking_channel)
    and party_size>=r.min_party_size
    and (r.max_party_size is null or party_size<=r.max_party_size)
    and extract(dow from service_date)::smallint=any(r.days)
    and service_time>=r.starts_at
    and service_time<=r.ends_at
  order by r.priority desc,r.created_at,r.id
  limit 1
$$;
