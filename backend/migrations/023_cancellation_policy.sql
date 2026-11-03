alter table booking_system_settings drop constraint if exists booking_system_settings_integer_value_check;
alter table booking_system_settings add constraint booking_system_settings_integer_value_check
  check (integer_value between 0 and 10080);

insert into booking_system_settings(setting_key, integer_value)
values ('free_cancellation_hours', 24)
on conflict(setting_key) do nothing;

alter table bookings add column if not exists cancelled_at timestamptz;
alter table bookings add column if not exists cancellation_source text;
alter table bookings add column if not exists cancellation_reason text;
alter table bookings add column if not exists cancellation_outcome text;

alter table bookings drop constraint if exists bookings_cancellation_source_check;
alter table bookings add constraint bookings_cancellation_source_check
  check (cancellation_source is null or cancellation_source in ('customer','staff','system'));
alter table bookings drop constraint if exists bookings_cancellation_outcome_check;
alter table bookings add constraint bookings_cancellation_outcome_check
  check (cancellation_outcome is null or cancellation_outcome in ('refunded','retained','not_applicable'));
