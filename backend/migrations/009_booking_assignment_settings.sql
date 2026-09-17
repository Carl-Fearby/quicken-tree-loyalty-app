create table if not exists booking_system_settings (
  setting_key text primary key,
  integer_value integer not null check (integer_value between 30 and 360)
);

insert into booking_system_settings (setting_key, integer_value)
values ('default_booking_duration_minutes', 90)
on conflict (setting_key) do nothing;

alter table bookings add column if not exists assigned_table_id integer references booking_tables(id) on delete set null;
alter table bookings add column if not exists booking_duration_minutes integer;
update bookings set booking_duration_minutes = 90 where booking_duration_minutes is null;
alter table bookings alter column booking_duration_minutes set default 90;
alter table bookings alter column booking_duration_minutes set not null;

do $$ begin
  if not exists(select 1 from pg_constraint where conname='bookings_duration_minutes_range' and conrelid='bookings'::regclass) then
    alter table bookings add constraint bookings_duration_minutes_range check (booking_duration_minutes between 30 and 360);
  end if;
end $$;

create index if not exists bookings_table_schedule on bookings (assigned_table_id, booking_date, booking_time) where assigned_table_id is not null and status <> 'cancelled';
