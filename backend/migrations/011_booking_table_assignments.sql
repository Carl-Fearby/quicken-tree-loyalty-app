create table if not exists booking_table_assignments (
  booking_id uuid not null references bookings(id) on delete cascade,
  table_id integer not null references booking_tables(id) on delete restrict,
  primary key (booking_id, table_id)
);

insert into booking_table_assignments (booking_id, table_id)
select id, assigned_table_id
from bookings
where assigned_table_id is not null
on conflict do nothing;

create index if not exists booking_table_assignments_table_booking
  on booking_table_assignments (table_id, booking_id);
