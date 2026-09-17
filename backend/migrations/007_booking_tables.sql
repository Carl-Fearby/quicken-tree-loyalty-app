create table if not exists booking_tables (
  id integer primary key,
  name text not null unique,
  seat_count integer not null check (seat_count between 2 and 10)
);

-- Keep the existing thirty table numbers. Never overwrite configured capacities.
insert into booking_tables (id, name, seat_count)
select n, 'Table ' || n, 2 + ((n - 1) % 9)
from generate_series(1, 30) as n
on conflict (id) do nothing;
